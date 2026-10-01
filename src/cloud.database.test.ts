import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const db = new PGlite();
const alice = "00000000-0000-0000-0000-000000000001";
const bob = "00000000-0000-0000-0000-000000000002";
async function asUser(id: string) {
  await db.exec("reset role; set role authenticated;");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
}
async function save(revision: number, label: string) {
  return db.query<{ revision: number }>(
    "select public.save_workspace($1::jsonb, $2::bigint) as revision",
    [JSON.stringify({ schemaVersion: 1, label }), revision],
  );
}

describe("workspace migration on PostgreSQL", () => {
  beforeAll(async () => {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      insert into auth.users values ('${alice}'), ('${bob}');
      create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, public to anon, authenticated;
      grant execute on function auth.uid() to authenticated;`);
    await db.exec(
      readFileSync(
        new URL(
          "../supabase/migrations/202610010001_workspace.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
  }, 30000);
  afterAll(async () => {
    await db.close();
  });

  it("stores a workspace, pulls it on another session and rejects stale writes", async () => {
    await asUser(alice);
    expect((await save(0, "first device")).rows[0].revision).toBe(1);
    await asUser(alice);
    expect(
      (await db.query("select payload, revision from public.workspaces")).rows,
    ).toEqual([
      { payload: { schemaVersion: 1, label: "first device" }, revision: 1 },
    ]);
    expect((await save(1, "second device")).rows[0].revision).toBe(2);
    await expect(save(1, "stale first device")).rejects.toThrow(
      "workspace_conflict",
    );
    await expect(save(0, "duplicate initialization")).rejects.toThrow(
      "workspace_conflict",
    );
    expect(
      (
        await db.query<{ payload: { label: string } }>(
          "select payload from public.workspaces",
        )
      ).rows[0].payload.label,
    ).toBe("second device");
  });
  it("prevents another account from reading or modifying the first account", async () => {
    await asUser(bob);
    expect((await db.query("select * from public.workspaces")).rows).toEqual(
      [],
    );
    expect(
      (
        await db.query(
          "update public.workspaces set revision = 99 where user_id = $1 returning user_id",
          [alice],
        )
      ).rows,
    ).toEqual([]);
    await expect(
      db.query(
        "insert into public.workspaces(user_id, payload) values ($1, $2)",
        [alice, "{}"],
      ),
    ).rejects.toThrow();
    expect((await save(0, "separate account")).rows[0].revision).toBe(1);
    expect(
      (await db.query("select user_id from public.workspaces")).rows,
    ).toEqual([{ user_id: bob }]);
  });
  it("rejects unsigned access and unsupported payload versions", async () => {
    await asUser(alice);
    await expect(
      db.query(
        "select public.save_workspace('{\"schemaVersion\":999}'::jsonb, 2)",
      ),
    ).rejects.toThrow("invalid_workspace");
    await db.exec("reset role; set role anon;");
    await expect(db.query("select * from public.workspaces")).rejects.toThrow(
      "permission denied",
    );
    await expect(save(0, "unsigned")).rejects.toThrow("permission denied");
  });
});
