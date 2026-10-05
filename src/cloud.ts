import { createClient } from "@supabase/supabase-js";
import { validateStore } from "./domain";
import { t } from "./i18n";
import type { Store } from "./types";
import { publicCloudConfig } from "./publicCloudConfig";

const url = import.meta.env.VITE_SUPABASE_URL || "";
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const config = publicCloudConfig(url, key);
// Auth may consume the recovery hash before React mounts and subscribes to its events.
export const recoveryRedirect = typeof location !== 'undefined' &&
  new URLSearchParams(location.hash.slice(1)).get('type') === 'recovery';
export const cloud = url && key && config
  ? createClient(config.url, config.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export type Remote = { store: Store; revision: number };
export type SyncDecision = "pull" | "push" | "conflict";
export function syncDecision(
  dirty: boolean,
  baseRevision: number,
  remoteRevision: number,
): SyncDecision {
  if (!dirty) return "pull";
  return baseRevision === remoteRevision ? "push" : "conflict";
}
export async function fetchRemote(userId: string): Promise<Remote | null> {
  if (!cloud) throw new Error(t("error.cloudNotConnected"));
  const { data, error } = await cloud
    .from("workspaces")
    .select("payload, revision")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data
    ? {
        store: validateStore(data.payload),
        revision: data.revision,
      }
    : null;
}
/** The cloud refused a push because the payload exceeds the `workspace_size` constraint. */
export const workspaceTooLarge = (failure: unknown): boolean =>
  String((failure as { message?: string })?.message).includes("workspace_size");
export async function pushRemote(
  store: Store,
  revision: number,
): Promise<number> {
  if (!cloud) throw new Error(t("error.cloudNotConnected"));
  const { data, error } = await cloud.rpc("save_workspace", {
    workspace_payload: store,
    expected_revision: revision,
  });
  if (error) throw error;
  if (typeof data !== "number")
    throw new Error(t("error.unexpectedStorage"));
  return data;
}
