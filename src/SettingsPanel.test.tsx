// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import { initialStore } from "./domain";
import { SettingsPanel } from "./Panels";
import type { useWorkspace } from "./useWorkspace";

vi.mock("./cloud", () => ({ cloud: null }));

let root: Root;
let container: HTMLDivElement;
let workspace: ReturnType<typeof useWorkspace>;
const onClose = vi.fn();
const notify = vi.fn();

async function render() {
  await act(async () => {
    root.render(
      <SettingsPanel workspace={workspace} onClose={onClose} notify={notify} />,
    );
  });
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
