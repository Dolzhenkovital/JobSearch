import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { publicCloudConfig } from "./src/publicCloudConfig.ts";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_SUPABASE_");
  publicCloudConfig(
    env.VITE_SUPABASE_URL || "",
    env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
  );
  return {
    plugins: [react()],
    base: "/JobSearch/",
    build: { sourcemap: false },
  };
});
