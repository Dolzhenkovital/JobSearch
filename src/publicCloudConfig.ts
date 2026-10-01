/** Validate before Vite substitutes configuration into public browser assets. */
export function publicCloudConfig(url: string, key: string) {
  if (!url && !key) return null;
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || !key) {
    throw new Error(
      "Provide both the Supabase project URL and its publishable key.",
    );
  }
  let publicKey = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
  if (!publicKey && key.split(".").length === 3) {
    try {
      const payload = key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      publicKey = JSON.parse(atob(payload)).role === "anon";
    } catch {
      publicKey = false;
    }
  }
  if (!publicKey) {
    // Deliberately never include the supplied value in a build log.
    throw new Error(
      "Only a Supabase publishable key or legacy anon key may be included in the public website.",
    );
  }
  return { url, key };
}
