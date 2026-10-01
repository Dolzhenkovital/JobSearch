import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  cloud,
  fetchRemote,
  pushRemote,
  syncDecision,
  type Remote,
} from "./cloud";
import { initialStore, parseBackup, STORAGE_KEY } from "./domain";
import type { Store } from "./types";

type Cache = { store: Store; revision: number; dirty: boolean };
const cacheKey = (id: string | null) => `${STORAGE_KEY}:${id || "guest"}`;
function read(id: string | null): Cache {
  const raw = localStorage.getItem(cacheKey(id));
  if (!raw) return { store: initialStore(), revision: 0, dirty: false };
  try {
    const value = JSON.parse(raw);
    if (
      !Number.isSafeInteger(value.revision) ||
      value.revision < 0 ||
      typeof value.dirty !== "boolean"
    )
      throw new Error("Некоректна версія простору.");
    return {
      store: parseBackup(JSON.stringify(value.store)),
      revision: value.revision,
      dirty: value.dirty,
    };
  } catch {
    // Preserve the exact original before a later edit can replace a damaged cache.
    localStorage.setItem(`${cacheKey(id)}:recovery:${Date.now()}`, raw);
    throw new Error("Не вдалося прочитати збережений простір.");
  }
}
export function useWorkspace() {
  const [error, setError] = useState("");
  const [cache, setCache] = useState<Cache>(() => {
    try {
      return read(null);
    } catch {
      return { store: initialStore(), revision: 0, dirty: false };
    }
  });
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<
    "local" | "syncing" | "synced" | "offline" | "conflict"
  >("local");
  const [conflict, setConflict] = useState<Remote | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const live = useRef(cache),
    owner = useRef<string | null>(null),
    busy = useRef(false),
    paused = useRef(false),
    epoch = useRef(0);
  const persist = useCallback((value: Cache) => {
    live.current = value;
    setCache(value);
    try {
      localStorage.setItem(cacheKey(owner.current), JSON.stringify(value));
    } catch {
      setError(
        "Браузер не зміг зберегти зміни. Зробіть резервну копію у налаштуваннях.",
      );
    }
  }, []);
  const update = useCallback(
    (fn: (store: Store) => Store) => {
      persist({ ...live.current, store: fn(live.current.store), dirty: true });
      if (owner.current) setStatus("syncing");
    },
    [persist],
  );

  const sync = useCallback(async () => {
    const userId = owner.current;
    if (!cloud || !userId || busy.current || paused.current) return;
    const generation = epoch.current;
    busy.current = true;
    setStatus("syncing");
    try {
      const remote = await fetchRemote(userId);
      if (generation !== epoch.current) return;
      const current = live.current;
      const decision = syncDecision(
        current.dirty,
        current.revision,
        remote?.revision || 0,
      );
      if (decision === "conflict") {
        if (remote) {
          paused.current = true;
          setConflict(remote);
          setStatus("conflict");
        } else
          throw new Error(
            "Хмарну копію змінено. Збережіть резервну копію перед повторним входом.",
          );
      } else if (decision === "pull") {
        if (remote)
          persist({
            store: remote.store,
            revision: remote.revision,
            dirty: false,
          });
        setStatus("synced");
        setLastSync(new Date().toISOString());
      } else {
        const snapshot = current.store;
        const revision = await pushRemote(snapshot, remote?.revision || 0);
        if (generation !== epoch.current) return;
        persist({
          store: live.current.store,
          revision,
          dirty: live.current.store !== snapshot,
        });
        setStatus(live.current.dirty ? "syncing" : "synced");
        setLastSync(new Date().toISOString());
      }
    } catch (failure) {
      if (generation !== epoch.current) return;
      if (
        String((failure as { message?: string })?.message).includes(
          "workspace_conflict",
        )
      ) {
        try {
          const remote = await fetchRemote(userId);
          if (generation === epoch.current && remote) {
            paused.current = true;
            setConflict(remote);
            setStatus("conflict");
          }
        } catch {
          setStatus("offline");
        }
      } else {
        setStatus("offline");
        setError(
          "Синхронізація недоступна. Локальні зміни збережені; спробуємо знову.",
        );
      }
    } finally {
      if (generation === epoch.current) busy.current = false;
    }
  }, [persist]);

  useEffect(() => {
    try {
      read(null);
    } catch {
      setError(
        "Локальна копія пошкоджена. Її не перезаписано. Відновіть резервну копію через налаштування.",
      );
    }
    if (!cloud) return;
    let disposed = false;
    const connect = (next: User | null) => {
      if (
        disposed ||
        next?.id === owner.current ||
        (!next && owner.current === null)
      )
        return;
      epoch.current++;
      busy.current = false;
      paused.current = false;
      setConflict(null);
      owner.current = next?.id || null;
      setUser(next);
      try {
        let stored = read(owner.current);
        // Guest data is adopted only when this account has no local cache. The
        // initial remote read decides whether an existing cloud copy takes precedence.
        if (next && !localStorage.getItem(cacheKey(next.id)))
          stored = { store: read(null).store, revision: 0, dirty: false };
        live.current = stored;
        setCache(stored);
        if (!next) {
          setStatus("local");
          return;
        }
        setStatus("syncing");
        const generation = epoch.current;
        void fetchRemote(next.id)
          .then((remote) => {
            if (disposed || generation !== epoch.current) return;
            if (!remote) persist({ ...live.current, dirty: true });
            void sync();
          })
          .catch(() => {
            if (generation === epoch.current) {
              setStatus("offline");
              setError(
                "Не вдалося відкрити хмарну копію. Зміни залишаються на пристрої.",
              );
            }
          });
      } catch {
        // Never display the previous account's workspace after an account switch fails.
        const empty = { store: initialStore(), revision: 0, dirty: false };
        live.current = empty;
        setCache(empty);
        paused.current = true;
        setError(
          "Збережений простір не вдалося прочитати. Початкову копію збережено для відновлення; синхронізацію призупинено.",
        );
        setStatus("offline");
      }
    };
    const {
      data: { subscription },
    } = cloud.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => connect(session?.user || null), 0);
    });
    void cloud.auth
      .getSession()
      .then(({ data }) => connect(data.session?.user || null));
    return () => {
      disposed = true;
      subscription.unsubscribe();
    };
  }, [persist, sync]);
  useEffect(() => {
    if (!user || !cache.dirty) return;
    const timer = setTimeout(() => {
      void sync();
    }, 1400);
    return () => clearTimeout(timer);
  }, [cache, user, sync]);
  useEffect(() => {
    const onFocus = () => {
      void sync();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    const timer = setInterval(onFocus, 45000);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
    };
  }, [sync]);
  const resolve = (choice: "remote" | "local") => {
    if (!conflict) return;
    try {
      localStorage.setItem(
        `${cacheKey(owner.current)}:conflict-backup`,
        JSON.stringify(live.current),
      );
    } catch {
      setError("Не вдалося створити копію. Спочатку експортуйте дані.");
      return;
    }
    persist(
      choice === "remote"
        ? { store: conflict.store, revision: conflict.revision, dirty: false }
        : { ...live.current, revision: conflict.revision, dirty: true },
    );
    paused.current = false;
    setConflict(null);
    void sync();
  };
  return {
    store: cache.store,
    update,
    user,
    status,
    conflict,
    resolve,
    sync,
    lastSync,
    error,
    clearError: () => setError(""),
    configured: !!cloud,
  };
}
