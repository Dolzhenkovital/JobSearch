# Existing application and integration checks

Use this guide for engineering work; inspect the current source before relying on this map. For a dated status assessment and priorities, read [project state](../../../../docs/project-state.md). For previously recorded live checks and configuration, read [deployment](../../../../docs/deployment.md).

## Find the relevant implementation

| Concern | Repository files | Boundary to preserve |
| --- | --- | --- |
| Persisted contracts | `src/types.ts`, `src/domain.ts` | `Store.schemaVersion = 1`; `parseBackup` validates browser caches, downloaded backups, and remote payloads. |
| Discovery and workflow | `src/App.tsx` | Feed health, saved jobs, status transitions, packet creation, and freezing on user-reported submission. |
| Forms and document export | `src/Panels.tsx` | Settings draft reconciliation, DOCX/TXT import, plain-text editing, DOCX export, print/PDF. |
| Cloud access | `src/cloud.ts`, `src/useWorkspace.ts` | One private payload per authenticated account; expected-revision writes and recoverable conflicts. |
| Public build configuration | `src/publicCloudConfig.ts`, `vite.config.ts`, `.env.example` | Only public project URL and publishable/legacy anon key; reject privileged credentials before bundling. |
| Database ownership | `supabase/migrations/202610010001_workspace.sql`, `supabase/verify_workspace.sql` | Row-level security, authenticated owner identity, revision-checked `save_workspace` RPC. |
| Admin and recovery | `src/AdminPanel.tsx`, `src/PasswordRecovery.tsx`, `supabase/functions/_shared/handler.ts` | Server role checks, write-only provider key, recovery email, typed deletion confirmation, protected admin accounts. |
| SMTP configuration | `src/SmtpPanel.tsx`, `supabase/functions/_shared/smtp.ts` | Management API for the server-selected project, transient admin token, SMTP-only field whitelist, no automatic email dispatch. |
| External inference | `src/AiPanel.tsx`, `src/service.ts`, `supabase/functions/_shared/llm.ts` | Two explicit actions, versioned source snapshots, validated draft outputs, no automatic retries or employer submission. |
| Usage and inference history | `supabase/migrations/202610020001_admin_llm.sql` | Owner-only read access, service-only writes, atomic per-user UTC-month reservations, idempotent request IDs. |
| Public source collector | `scripts/collect_jobbank.py`, `scripts/test_collect_jobbank.py` | Public discovery metadata only; preserve last good feed on failure. |
| Publishing and scheduled collection | `.github/workflows/pages.yml` | Collect before build; deploy only `dist`; generated `public/jobs.json` remains ignored. |

Source paths in this table are relative to the repository root.

## Persistence compatibility

Changes to `Profile`, `Job`, `Application`, `Packet`, or `Settings` affect local caches, JSON backups, and Supabase payloads. `parseBackup` reconstructs known fields; adding only a TypeScript field can lose it on reload. Define defaults and a compatible migration/validation path. If introducing a new schema version, coordinate the database RPC's version check with client compatibility.

The specialist profile and packet JSON templates describe private evidence artifacts; they are not `Store` import formats. Preserve originals and historical inputs rather than storing only a mutable current profile. A packet's current `profileVersion` and description hash do not by themselves preserve the original input snapshots or generation rules.

LLM runs live in separate owner-scoped `llm_runs` rows; packets retain optional `llmRunId`/`llmRulesVersion`, including through `parseBackup`. Workspace JSON backup includes packet texts and these references, but does not export server run history. AI history is fetched per vacancy (latest 30); it is not in the workspace revision payload. Avoid comparing JSONB snapshots with order-sensitive `JSON.stringify`; use `stableJson`.

## Synchronization invariants

- Guest and account caches are separate. Existing remote data takes precedence over an empty guest workspace; guest adoption is appropriate only for a new empty account.
- Apply pending reads/writes only to the same account/session generation. Sign-out or account change must prevent late responses from installing another account's data.
- A write uses the revision on which the local edits were based. Divergent dirty local and remote copies require an explicit conflict choice, not a silent overwrite.
- Keep edits made during an upload dirty for a later save. Preserve local changes during offline failures and preserve damaged-cache originals for recovery.
- Before choosing a conflict version, retain a recoverable local backup. Current resolution selects a whole workspace; automatic field-level conflict merging is not implemented.
- The open settings form derives untouched fields from current workspace settings. Its unsaved edits are a patch applied to the latest settings, and that patch is discarded on account change. Do not restore a stale full settings object.

The current sync loop uses a short save debounce, focus/online refresh, and a 45-second poll while the page is open. It is not a Supabase Realtime subscription or a background mobile service.

## Evidence appropriate to a change

| Check | What it establishes |
| --- | --- |
| `npm test` | Domain rules, public-key validation, mocked lifecycle/form behavior, and migration behavior against local PGlite. Inspect affected tests before choosing additional checks. |
| Python unittest suite | Collector parsing with synthetic inputs; it does not establish transport access or successful scheduled retrieval. |
| `npm run build` | Type checking and public bundle production; it does not establish deployment, login, or live database ownership. |
| Bounded public read | Page availability and actual feed status, `fetchedAt`, `lastAttemptAt`, count, and completeness. Do not run the collector merely to inspect a previously deployed snapshot. |
| Observed scheduled-run log | A real scheduled retrieval only if its log/result shows successful source acquisition; job success alone may contain stale fallback. |
| Authorized live database/session checks | Own-row access, another-account isolation, anonymous denial, increasing revisions, and rejection of stale writes. `verify_workspace.sql` uses synthetic records and rollback. |
| Two live sessions/devices | Changes reach the other open workspace, offline edits survive, conflicts are explicit, and logout isolates accounts. Record whether the check used two tabs, separate browsers, or physical devices. |

For live checks, use a bounded synthetic change and restore it. Existing evidence may be reported with its date and scope without rerunning unrelated operations. A newly changed sync path needs relevant fresh validation; if that cannot be exercised, report the remaining gap precisely.

## Public/private boundary

Build-time `VITE_` values become public browser assets. Keep service-role/secret keys, management tokens, account passwords, private CVs, fact profiles, email exports, packets, and live private source caches out of code and deployment artifacts. The intentional exception is the sanitized public Job Bank discovery snapshot generated into ignored `public/jobs.json` and copied into `dist`.

Check `git diff`, untracked files, and the staged diff before publishing. Ignoring a path does not remove tracked content. Do not deploy the repository root or copy private evidence files into `public/`.
