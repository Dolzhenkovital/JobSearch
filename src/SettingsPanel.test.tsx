// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import {
  initialStore,
  MAX_BACKUP_FILE_BYTES,
  serializeBackup,
  storedBytes,
  WORKSPACE_LIMITS,
} from "./domain";
import { t } from "./i18n";
import { SettingsPanel } from "./Panels";
import type { Job } from "./types";
import type { useWorkspace } from "./useWorkspace";

vi.mock("./cloud", () => ({ cloud: null }));

let root: Root;
let container: HTMLDivElement;
let workspace: ReturnType<typeof useWorkspace>;
const onClose = vi.fn();
const notify = vi.fn();

async function render(initialTab?: string) {
  await act(async () => {
    root.render(
      <SettingsPanel
        workspace={workspace}
        onClose={onClose}
        notify={notify}
        initialTab={initialTab}
      />,
    );
  });
}
const button = (label: string) =>
  [...container.querySelectorAll("button")].find(
    (element) => element.textContent === label,
  );
const checkbox = (label: string) =>
  [...container.querySelectorAll("label")]
    .find((element) => element.textContent === label)
    ?.querySelector("input");
async function click(element: HTMLElement | null | undefined) {
  await act(async () => element!.click());
}
function field<T extends HTMLInputElement | HTMLSelectElement>(label: string): T {
  const wrapper = [...container.querySelectorAll("label")].find(
    (element) => element.querySelector("span")?.textContent === label,
  );
  return wrapper!.querySelector("input,select") as T;
}
async function editCity(value: string) {
  await act(async () => {
    const input = field<HTMLInputElement>("Місто або регіон");
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
      input,
      value,
    );
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  workspace = {
    store: initialStore(),
    update: vi.fn((change) => {
      workspace.store = change(workspace.store);
    }),
    user: { id: "synthetic-owner-a" } as User,
    status: "synced",
    conflict: null,
    resolve: vi.fn(),
    sync: vi.fn(),
    signOut: vi.fn(async () => "signedOut" as const),
    unsynced: false,
    lastSync: null,
    error: "",
    clearError: vi.fn(),
    configured: true,
  };
  vi.clearAllMocks();
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("restoring a backup", () => {
  const job: Job = {
    id: "synthetic:0",
    title: "Office coordinator",
    employer: "Example Co",
    location: "",
    salary: "",
    url: "",
    source: "Job Bank",
    description: "",
    completeness: "full",
    publishedAt: null,
    firstSeenAt: "2026-10-01T12:00:00Z",
    checkedAt: "2026-10-01T12:00:00Z",
    availability: "unknown",
  };
  async function choose(file: File) {
    await act(async () => {
      root.render(
        <SettingsPanel
          workspace={workspace}
          onClose={onClose}
          notify={notify}
          initialTab="data"
        />,
      );
    });
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, "files", { value: [file] });
    const read = vi.spyOn(file, "text");
    await act(async () => {
      input.dispatchEvent(new Event("change", { bubbles: true }));
      await read.mock.results[0]?.value;
    });
    return read;
  }

  it("offers to restore the downloaded backup of a workspace at the size limit", async () => {
    const backup = initialStore();
    backup.jobs = Array.from({ length: 30 }, (_, i) => ({
      ...job,
      id: `synthetic:${i}`,
    }));
    let missing = WORKSPACE_LIMITS.bytes - storedBytes(backup);
    for (const item of backup.jobs) {
      item.description = "x".repeat(Math.min(missing, 200000));
      missing -= item.description.length;
    }
    expect(storedBytes(backup)).toBe(WORKSPACE_LIMITS.bytes);
    const file = new File([serializeBackup(backup)], "JobSearch-backup.json", {
      type: "application/json",
    });
    // The indented file is larger than the workspace it holds.
    expect(file.size).toBeGreaterThan(WORKSPACE_LIMITS.bytes);
    await choose(file);
    expect(notify).not.toHaveBeenCalled();
    expect(container.textContent).toContain(t("data.restoreConfirm.title"));
    expect(container.textContent).toContain(
      t("data.restoreConfirm.text", { jobs: 30, applications: 0, packets: 0 }),
    );
  });

  it("turns away a file above the backup file bound without reading it", async () => {
    const file = new File(
      [new Uint8Array(MAX_BACKUP_FILE_BYTES + 1)],
      "JobSearch-backup.json",
    );
    const read = await choose(file);
    expect(read).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(t("error.fileTooLarge"));
    expect(container.textContent).not.toContain(t("data.restoreConfirm.title"));
  });
});

describe("settings while cloud data changes", () => {
  it("refreshes untouched fields without reopening the dialog", async () => {
    await render();
    workspace.store = {
      ...workspace.store,
      settings: { ...workspace.store.settings, documentLanguage: "en" },
    };
    await render();
    expect(field<HTMLSelectElement>("Мова нових документів").value).toBe("en");
    expect(workspace.update).not.toHaveBeenCalled();
  });

  it("preserves an unsaved edit and saves it without reverting remote fields", async () => {
    await render();
    await editCity("Synthetic city");
    workspace.store = {
      ...workspace.store,
      settings: {
        ...workspace.store.settings,
        city: "Remote city",
        documentLanguage: "en",
      },
    };
    await render();
    expect(field<HTMLInputElement>("Місто або регіон").value).toBe("Synthetic city");
    expect(field<HTMLSelectElement>("Мова нових документів").value).toBe("en");
    // A further update can arrive after rendering but before the save callback.
    workspace.store = {
      ...workspace.store,
      settings: { ...workspace.store.settings, roles: "Remote role" },
    };
    await act(async () => {
      container.querySelector("form")!.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    expect(workspace.store.settings).toMatchObject({
      city: "Synthetic city",
      documentLanguage: "en",
      roles: "Remote role",
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("discards another account's draft and does not resurrect it after switching back", async () => {
    await render();
    await editCity("Account A draft");
    workspace.user = { id: "synthetic-owner-b" } as User;
    workspace.store = initialStore();
    workspace.store.settings.city = "Account B city";
    await render();
    expect(field<HTMLInputElement>("Місто або регіон").value).toBe("Account B city");
    workspace.user = { id: "synthetic-owner-a" } as User;
    workspace.store = initialStore();
    await render();
    expect(field<HTMLInputElement>("Місто або регіон").value).toBe("");
  });
});

describe("sign-out and the local copy", () => {
  const remove = "Видалити локальну копію даних із цього браузера";
  const discard = "Так, видалити несинхронізовані зміни";

  it("signs out only after a confirmation and keeps the local copy by default", async () => {
    await render("sync");
    await click(button("Вийти"));
    expect(workspace.signOut).not.toHaveBeenCalled();
    expect(checkbox(remove)!.checked).toBe(false);
    await click(button("Вийти"));
    expect(workspace.signOut).toHaveBeenCalledWith(false, false);
    expect(notify).toHaveBeenCalledWith("Ви вийшли з акаунта");
  });

  it("removes a synced local copy when asked", async () => {
    vi.mocked(workspace.signOut).mockResolvedValue("removed");
    await render("sync");
    await click(button("Вийти"));
    await click(checkbox(remove));
    expect(checkbox(discard)).toBeUndefined();
    await click(button("Вийти"));
    expect(workspace.signOut).toHaveBeenCalledWith(true, false);
    expect(notify).toHaveBeenCalledWith(
      "Ви вийшли з акаунта. Локальну копію видалено.",
    );
  });

  it("requires an explicit confirmation before deleting unsynced changes", async () => {
    workspace.unsynced = true;
    await render("sync");
    await click(button("Вийти"));
    await click(checkbox(remove));
    expect(button("Вийти")!.disabled).toBe(true);
    await click(button("Вийти"));
    expect(workspace.signOut).not.toHaveBeenCalled();
    await click(checkbox(discard));
    await click(button("Вийти"));
    expect(workspace.signOut).toHaveBeenCalledWith(true, true);
  });

  it("asks again when the stored copy turns out to be unsynced", async () => {
    vi.mocked(workspace.signOut).mockResolvedValueOnce("unsynced");
    await render("sync");
    await click(button("Вийти"));
    await click(checkbox(remove));
    await click(button("Вийти"));
    expect(workspace.signOut).toHaveBeenCalledWith(true, false);
    expect(notify).not.toHaveBeenCalled();
    expect(checkbox(discard)!.checked).toBe(false);
    expect(button("Вийти")!.disabled).toBe(true);
  });

  it("does not carry a deletion confirmation over to another account", async () => {
    workspace.unsynced = true;
    await render("sync");
    await click(button("Вийти"));
    await click(checkbox(remove));
    await click(checkbox(discard));
    workspace.user = { id: "synthetic-owner-b" } as User;
    await render("sync");
    expect(checkbox(remove)).toBeUndefined();
    await click(button("Вийти"));
    expect(checkbox(remove)!.checked).toBe(false);
    expect(workspace.signOut).not.toHaveBeenCalled();
  });
});
