// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initialStore, STORAGE_KEY, WORKSPACE_LIMITS } from "./domain";
import { t } from "./i18n";
import type { Job } from "./types";
import { useWorkspace } from "./useWorkspace";

const backend = vi.hoisted(() => ({
  fetch: vi.fn(),
  push: vi.fn(),
  signOut: vi.fn(),
  listener: null as null | ((event: string, session: unknown) => void),
}));
vi.mock("./cloud", async (original) => {
  const module = await original<typeof import("./cloud")>();
  return {
    ...module,
    fetchRemote: backend.fetch,
    pushRemote: backend.push,
    cloud: {
      auth: {
        getSession: async () => ({
          data: { session: { user: { id: "test-owner" } } },
        }),
        onAuthStateChange: (listener: typeof backend.listener) => {
          backend.listener = listener;
          return { data: { subscription: { unsubscribe() {} } } };
        },
        signOut: backend.signOut,
      },
    },
  };
});

let root: Root;
let workspace: ReturnType<typeof useWorkspace>;
function Harness() {
  workspace = useWorkspace();
  return null;
}
async function mount() {
  root = createRoot(document.createElement("div"));
  await act(async () => {
    root.render(<Harness />);
  });
}
const accountKey = `${STORAGE_KEY}:test-owner`;
const guestKey = `${STORAGE_KEY}:guest`;
const named = (name: string) => {
  const store = initialStore();
  store.profile.name = name;
  return store;
};
const stored = (key: string) => JSON.parse(localStorage.getItem(key)!);
const keysWith = (prefix: string) =>
  Object.keys(localStorage).filter((key) => key.startsWith(prefix));
/** Deliver an auth event the way the Supabase client does and let the hook settle. */
async function authenticate(userId: string | null) {
  await act(async () => {
    backend.listener?.(
      userId ? "SIGNED_IN" : "SIGNED_OUT",
      userId ? { user: { id: userId } } : null,
    );
    await vi.advanceTimersByTimeAsync(0);
  });
}
beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  backend.fetch.mockReset();
  backend.push.mockReset();
  backend.signOut.mockReset();
  backend.signOut.mockImplementation(async () => {
    backend.listener?.("SIGNED_OUT", null);
    return { error: null };
  });
  // React's act warning flag applies only to this synthetic test environment.
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});
afterEach(async () => {
  await act(async () => {
    root?.unmount();
  });
  vi.useRealTimers();
});

describe("workspace synchronization lifecycle", () => {
  it("loads existing cloud data instead of uploading the empty guest profile", async () => {
    const remote = initialStore();
    remote.profile.name = "Synthetic cloud profile";
    backend.fetch.mockResolvedValue({ store: remote, revision: 4 });
    await mount();
    expect(workspace.store.profile.name).toBe("Synthetic cloud profile");
    expect(workspace.status).toBe("synced");
    expect(backend.push).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(accountKey)!).revision).toBe(4);
  });
  it("keeps edits made during an upload dirty for a subsequent save", async () => {
    const store = initialStore();
    backend.fetch.mockResolvedValue({ store, revision: 2 });
    await mount();
    let finish!: (revision: number) => void;
    backend.push.mockImplementation(
      () =>
        new Promise<number>((resolve) => {
          finish = resolve;
        }),
    );
    await act(async () => {
      workspace.update((s) => ({
        ...s,
        profile: { ...s.profile, name: "First edit" },
      }));
    });
    let uploading!: Promise<void>;
    await act(async () => {
      uploading = workspace.sync();
    });
    await act(async () => {
      workspace.update((s) => ({
        ...s,
        profile: { ...s.profile, name: "Edit while uploading" },
      }));
    });
    await act(async () => {
      finish(3);
      await uploading;
    });
    const cached = JSON.parse(localStorage.getItem(accountKey)!);
    expect(cached.revision).toBe(3);
    expect(cached.dirty).toBe(true);
    expect(cached.store.profile.name).toBe("Edit while uploading");
  });
  it("preserves offline edits and requires an explicit conflict choice", async () => {
    const local = initialStore();
    local.profile.name = "Local edit";
    localStorage.setItem(
      accountKey,
      JSON.stringify({ store: local, revision: 2, dirty: true }),
    );
    const remote = initialStore();
    remote.profile.name = "Second device";
    backend.fetch.mockResolvedValue({ store: remote, revision: 3 });
    await mount();
    expect(workspace.status).toBe("conflict");
    expect(workspace.store.profile.name).toBe("Local edit");
    expect(backend.push).not.toHaveBeenCalled();
    await act(async () => {
      workspace.resolve("remote");
    });
    expect(workspace.store.profile.name).toBe("Second device");
    expect(
      JSON.parse(localStorage.getItem(`${accountKey}:conflict-backup`)!).store
        .profile.name,
    ).toBe("Local edit");
  });
  it("does not install a pending account response after signing out", async () => {
    backend.fetch.mockResolvedValue({ store: initialStore(), revision: 1 });
    await mount();
    let finish!: (value: unknown) => void;
    backend.fetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    let fetching!: Promise<void>;
    await act(async () => {
      fetching = workspace.sync();
    });
    await act(async () => {
      backend.listener?.("SIGNED_OUT", null);
      await vi.advanceTimersByTimeAsync(0);
    });
    const privateStore = initialStore();
    privateStore.profile.name = "Private account content";
    await act(async () => {
      finish({ store: privateStore, revision: 2 });
      await fetching;
    });
    expect(workspace.user).toBeNull();
    expect(workspace.store.profile.name).toBe("");
    expect(workspace.status).toBe("local");
  });
});

describe("workspace limits", () => {
  const job = (id: string): Job => ({
    id,
    title: "Synthetic coordinator",
    employer: "Example Co",
    location: "",
    salary: "",
    url: "",
    source: "Job Bank",
    description: "",
    completeness: "snippet",
    publishedAt: null,
    firstSeenAt: "2026-10-01T12:00:00Z",
    checkedAt: "2026-10-01T12:00:00Z",
    availability: "unknown",
  });

  it("rejects a change past the job limit and keeps the stored workspace", async () => {
    const full = initialStore();
    full.jobs = Array.from({ length: WORKSPACE_LIMITS.jobs }, (_, i) =>
      job(`synthetic:${i}`),
    );
    backend.fetch.mockResolvedValue({ store: full, revision: 5 });
    await mount();
    const cached = localStorage.getItem(accountKey);
    let failure: unknown;
    await act(async () => {
      try {
        workspace.update((s) => ({ ...s, jobs: [...s.jobs, job("extra")] }));
      } catch (error) {
        failure = error;
      }
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect((failure as Error).message).toBe(
      t("workspace.changeRejected", {
        reason: t("workspace.limit.jobs", { max: WORKSPACE_LIMITS.jobs }),
      }),
    );
    expect(workspace.store).toBe(full);
    expect(localStorage.getItem(accountKey)).toBe(cached);
    expect(workspace.status).toBe("synced");
    expect(backend.push).not.toHaveBeenCalled();
    // A full workspace still accepts changes that do not add a job.
    await act(async () => {
      workspace.update((s) => ({
        ...s,
        jobs: [...s.jobs.slice(1), job("replacement")],
      }));
    });
    expect(workspace.store.jobs).toHaveLength(WORKSPACE_LIMITS.jobs);
    expect(JSON.parse(localStorage.getItem(accountKey)!).dirty).toBe(true);
  });
  it("rejects a field that reading the workspace would refuse", async () => {
    backend.fetch.mockResolvedValue({ store: initialStore(), revision: 1 });
    await mount();
    expect(() =>
      workspace.update((s) => ({
        ...s,
        jobs: [{ ...job("long"), title: "x".repeat(1001) }],
      })),
    ).toThrow(
      t("workspace.changeRejected", { reason: t("error.textField") }),
    );
    expect(workspace.store.jobs).toEqual([]);
  });
  it("names an oversized workspace when the cloud refuses the upload", async () => {
    backend.fetch.mockResolvedValue({ store: initialStore(), revision: 2 });
    await mount();
    await act(async () => {
      workspace.update((s) => ({
        ...s,
        profile: { ...s.profile, name: "Local edit" },
      }));
    });
    backend.push.mockRejectedValue({
      code: "23514",
      message:
        'new row for relation "workspaces" violates check constraint "workspace_size"',
    });
    await act(async () => {
      await workspace.sync();
    });
    expect(workspace.error).toBe(t("workspace.tooLarge"));
    expect(workspace.status).toBe("offline");
    expect(workspace.conflict).toBeNull();
    const cached = JSON.parse(localStorage.getItem(accountKey)!);
    expect(cached).toMatchObject({ revision: 2, dirty: true });
    expect(cached.store.profile.name).toBe("Local edit");

    backend.push.mockRejectedValue(new TypeError("Failed to fetch"));
    await act(async () => {
      workspace.clearError();
      await workspace.sync();
    });
    expect(workspace.error).toBe(t("workspace.syncUnavailable"));
  });
});

describe("guest data adoption", () => {
  const seedGuest = () =>
    localStorage.setItem(
      guestKey,
      JSON.stringify({ store: named("Guest CV"), revision: 0, dirty: true }),
    );

  it("moves guest data into a new account and never into a second one", async () => {
    seedGuest();
    backend.fetch.mockResolvedValue(null);
    backend.push.mockResolvedValue(1);
    await mount();
    await authenticate("test-owner");
    expect(backend.push).toHaveBeenCalledTimes(1);
    expect(backend.push.mock.calls[0][0].profile.name).toBe("Guest CV");
    expect(stored(accountKey)).toMatchObject({ revision: 1, dirty: false });
    expect(localStorage.getItem(guestKey)).toBeNull();

    await authenticate(null);
    expect(workspace.user).toBeNull();
    expect(workspace.store.profile.name).toBe("");

    await authenticate("second-owner");
    expect(workspace.user?.id).toBe("second-owner");
    expect(workspace.store.profile.name).toBe("");
    expect(backend.push).toHaveBeenCalledTimes(2);
    expect(backend.push.mock.calls[1][0].profile.name).toBe("");
    expect(stored(`${STORAGE_KEY}:second-owner`).store.profile.name).toBe("");
  });

  it("keeps adopted data with its account when the first upload fails", async () => {
    seedGuest();
    backend.fetch.mockResolvedValue(null);
    backend.push.mockRejectedValue(new Error("synthetic network failure"));
    await mount();
    await authenticate("test-owner");
    expect(workspace.status).toBe("offline");
    expect(workspace.store.profile.name).toBe("Guest CV");
    expect(localStorage.getItem(guestKey)).toBeNull();

    await authenticate(null);
    expect(workspace.store.profile.name).toBe("");
    backend.push.mockReset();
    backend.push.mockResolvedValue(1);
    await authenticate("second-owner");
    expect(workspace.store.profile.name).toBe("");
    expect(backend.push).toHaveBeenCalledTimes(1);
    expect(backend.push.mock.calls[0][0].profile.name).toBe("");
    // The first account still holds its unsynced copy for the next sign-in.
    expect(stored(accountKey)).toMatchObject({ dirty: true });
    expect(stored(accountKey).store.profile.name).toBe("Guest CV");
  });

  it("claims guest data edited offline before the cloud could be read", async () => {
    seedGuest();
    backend.fetch.mockRejectedValue(new Error("synthetic network failure"));
    await mount();
    await authenticate("test-owner");
    expect(workspace.status).toBe("offline");
    // Nothing is written for the account yet, so the guest copy must stay.
    expect(localStorage.getItem(accountKey)).toBeNull();
    expect(stored(guestKey).store.profile.name).toBe("Guest CV");
    await act(async () => {
      workspace.update((s) => ({
        ...s,
        profile: { ...s.profile, headline: "Offline edit" },
      }));
    });
    expect(stored(accountKey).store.profile).toMatchObject({
      name: "Guest CV",
      headline: "Offline edit",
    });
    expect(localStorage.getItem(guestKey)).toBeNull();
  });

  it("leaves guest data on the device when an existing cloud copy wins", async () => {
    seedGuest();
    backend.fetch.mockResolvedValue({ store: named("Cloud CV"), revision: 4 });
    await mount();
    await authenticate("test-owner");
    expect(workspace.store.profile.name).toBe("Cloud CV");
    expect(backend.push).not.toHaveBeenCalled();
    expect(stored(guestKey).store.profile.name).toBe("Guest CV");
    await authenticate(null);
    expect(workspace.store.profile.name).toBe("Guest CV");
  });
});

describe("local copy on sign-out", () => {
  const otherKey = `${STORAGE_KEY}:other-owner`;
  async function signOut(removeLocal: boolean, discardUnsynced?: boolean) {
    let result!: Awaited<ReturnType<typeof workspace.signOut>>;
    await act(async () => {
      result = await workspace.signOut(removeLocal, discardUnsynced);
      await vi.advanceTimersByTimeAsync(0);
    });
    return result;
  }
  async function mountSynced() {
    backend.fetch.mockResolvedValue({ store: named("Account CV"), revision: 2 });
    await mount();
    await authenticate("test-owner");
    expect(workspace.status).toBe("synced");
  }
  async function edit() {
    // The upload never completes, so the edit stays unsynced.
    backend.push.mockImplementation(() => new Promise<number>(() => {}));
    await act(async () => {
      workspace.update((s) => ({
        ...s,
        profile: { ...s.profile, name: "Unsynced edit" },
      }));
    });
  }

  it("keeps the local copy unless its removal is requested", async () => {
    await mountSynced();
    expect(workspace.unsynced).toBe(false);
    expect(await signOut(false)).toBe("signedOut");
    expect(workspace.user).toBeNull();
    expect(stored(accountKey).store.profile.name).toBe("Account CV");
  });

  it("removes a synced copy with its backups and nothing else", async () => {
    const other = JSON.stringify({
      store: named("Other account"),
      revision: 1,
      dirty: false,
    });
    localStorage.setItem(otherKey, other);
    localStorage.setItem(`${accountKey}:conflict-backup`, "synthetic backup");
    localStorage.setItem(`${accountKey}:recovery:1a2b`, "synthetic recovery");
    await mountSynced();
    expect(await signOut(true)).toBe("removed");
    expect(workspace.user).toBeNull();
    expect(workspace.store.profile.name).toBe("");
    expect(keysWith(accountKey)).toEqual([]);
    expect(localStorage.getItem(otherKey)).toBe(other);
  });

  it("deletes unsynced changes only after an explicit confirmation", async () => {
    await mountSynced();
    await edit();
    expect(workspace.unsynced).toBe(true);
    expect(await signOut(true)).toBe("unsynced");
    expect(backend.signOut).not.toHaveBeenCalled();
    expect(workspace.user?.id).toBe("test-owner");
    expect(stored(accountKey).store.profile.name).toBe("Unsynced edit");

    expect(await signOut(true, true)).toBe("removed");
    expect(workspace.user).toBeNull();
    expect(keysWith(accountKey)).toEqual([]);
  });

  it("treats an unreadable stored copy as unsynced", async () => {
    await mountSynced();
    localStorage.setItem(accountKey, "{damaged");
    expect(await signOut(true)).toBe("unsynced");
    expect(backend.signOut).not.toHaveBeenCalled();
    expect(localStorage.getItem(accountKey)).toBe("{damaged");
  });

  it("keeps a copy that became unsynced while signing out", async () => {
    await mountSynced();
    let finish!: (value: { error: null }) => void;
    backend.signOut.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    let leaving!: ReturnType<typeof workspace.signOut>;
    await act(async () => {
      leaving = workspace.signOut(true);
    });
    await edit();
    let result!: Awaited<typeof leaving>;
    await act(async () => {
      finish({ error: null });
      result = await leaving;
    });
    expect(result).toBe("kept");
    expect(workspace.user).toBeNull();
    expect(workspace.store.profile.name).toBe("");
    expect(stored(accountKey)).toMatchObject({ dirty: true });
    expect(stored(accountKey).store.profile.name).toBe("Unsynced edit");
  });

  it("changes nothing when the sign-out request fails", async () => {
    await mountSynced();
    backend.signOut.mockResolvedValue({ error: new Error("synthetic failure") });
    expect(await signOut(true)).toBe("failed");
    expect(workspace.user?.id).toBe("test-owner");
    expect(stored(accountKey).store.profile.name).toBe("Account CV");
  });
});

describe("damaged cache recovery copies", () => {
  const recoveryPrefix = `${guestKey}:recovery:`;
  const copies = () =>
    keysWith(recoveryPrefix)
      .map((key) => localStorage.getItem(key))
      .sort();
  async function remount() {
    await act(async () => {
      root.unmount();
    });
    await mount();
    await authenticate("test-owner");
  }

  it("keeps one copy per distinct damaged content across repeated reads", async () => {
    backend.fetch.mockResolvedValue({ store: initialStore(), revision: 1 });
    localStorage.setItem(guestKey, "{damaged");
    await mount();
    await authenticate("test-owner");
    await remount();
    expect(copies()).toEqual(["{damaged"]);
    // The damaged original itself is not replaced.
    expect(localStorage.getItem(guestKey)).toBe("{damaged");

    localStorage.setItem(guestKey, "{damaged differently");
    await remount();
    expect(copies()).toEqual(["{damaged", "{damaged differently"]);
  });

  it("collapses the time-keyed duplicates written by earlier versions", async () => {
    backend.fetch.mockResolvedValue({ store: initialStore(), revision: 1 });
    localStorage.setItem(guestKey, "{damaged");
    for (const time of [1759400000001, 1759400000002, 1759400000003])
      localStorage.setItem(`${recoveryPrefix}${time}`, "{damaged");
    localStorage.setItem(`${recoveryPrefix}1759300000000`, "{older damage");
    await mount();
    await authenticate("test-owner");
    expect(copies()).toEqual(["{damaged", "{older damage"]);
  });
});
