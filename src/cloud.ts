import { createClient } from "@supabase/supabase-js";
import { parseBackup } from "./domain";
import type { Store } from "./types";
import { publicCloudConfig } from "./publicCloudConfig";

const url = import.meta.env.VITE_SUPABASE_URL || "";
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const config = publicCloudConfig(url, key);
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
  if (!cloud) throw new Error("Хмарне сховище ще не підключене.");
  const { data, error } = await cloud
    .from("workspaces")
    .select("payload, revision")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data
    ? {
        store: parseBackup(JSON.stringify(data.payload)),
        revision: data.revision,
      }
    : null;
}
export async function pushRemote(
  store: Store,
  revision: number,
): Promise<number> {
  if (!cloud) throw new Error("Хмарне сховище ще не підключене.");
  const { data, error } = await cloud.rpc("save_workspace", {
    workspace_payload: store,
    expected_revision: revision,
  });
  if (error) throw error;
  if (typeof data !== "number")
    throw new Error("Неочікувана відповідь сховища.");
  return data;
}
