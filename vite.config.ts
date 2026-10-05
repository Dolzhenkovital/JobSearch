import { loadEnv, type Plugin } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { publicCloudConfig } from "./src/publicCloudConfig.ts";

/** Keep search engines away from the stage copy published next to production. */
const noindex = (): Plugin => ({
  name: "jobsearch-noindex",
  transformIndexHtml: () => [
    {
      tag: "meta",
      attrs: { name: "robots", content: "noindex, nofollow" },
      injectTo: "head",
    },
  ],
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  publicCloudConfig(
    env.VITE_SUPABASE_URL || "",
    env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
  );
  // Production is served from /JobSearch/, the stage copy from /JobSearch/stage/.
  const base = process.env.JOBSEARCH_BASE || "/JobSearch/";
  if (!/^\/([A-Za-z0-9._-]+\/)*$/.test(base))
    throw new Error("JOBSEARCH_BASE must start and end with a slash.");
  return {
    plugins: [react(), ...(env.VITE_APP_ENV === "stage" ? [noindex()] : [])],
    base,
    // Keep small font subsets as files: inlined data: URIs are blocked by the page's font-src 'self'.
    build: { sourcemap: false, assetsInlineLimit: 0 },
    // Scratch checkouts under ignored .claude/worktrees are not part of this application's suite.
    test: { setupFiles: ["src/test.setup.ts"], include: ["src/**/*.test.{ts,tsx}"] },
  };
});
