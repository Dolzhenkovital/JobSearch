import { expect, it } from "vitest";
import { publicCloudConfig } from "./publicCloudConfig";
const url = "https://synthetic-project.supabase.co";
const token = (role: string) =>
  `e30.${btoa(JSON.stringify({ role }))}.synthetic`;

it("accepts only supported public key types and optional unconfigured mode", () => {
  expect(publicCloudConfig("", "")).toBeNull();
  expect(publicCloudConfig(url, "sb_publishable_synthetic")).toBeTruthy();
  expect(publicCloudConfig(url, token("anon"))).toBeTruthy();
});
it("rejects privileged credentials without disclosing them in the error", () => {
  for (const key of [
    "sb_secret_synthetic",
    token("service_role"),
    "sbp_synthetic",
  ]) {
    expect(() => publicCloudConfig(url, key)).toThrow(
      "Only a Supabase publishable key",
    );
    try {
      publicCloudConfig(url, key);
    } catch (error) {
      expect(String(error)).not.toContain(key);
    }
  }
});
it("rejects partial configuration and unapproved hostnames", () => {
  expect(() => publicCloudConfig(url, "")).toThrow();
  expect(() => publicCloudConfig("", "sb_publishable_synthetic")).toThrow();
  expect(() =>
    publicCloudConfig("https://example.org", "sb_publishable_synthetic"),
  ).toThrow();
});
