// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initialStore, STORAGE_KEY } from "./domain";
import { useWorkspace } from "./useWorkspace";

const backend = vi.hoisted(() => ({
  fetch: vi.fn(),
  push: vi.fn(),
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
beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  backend.fetch.mockReset();
  backend.push.mockReset();
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
