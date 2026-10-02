# External-LLM matching, documents, and administration

User-defined direction: 2026-10-02. The application implements vacancy assessment and CV/cover-letter adaptation through Supabase Edge Function `jobsearch-api`. Two explicit actions send the selected vacancy and current profile; there is no automatic batch assessment. The clipboard prompt remains a manual fallback. See [deployment evidence](../../../../docs/admin-llm.md) for the configured/live boundary.

Use this reference alongside `jobsearch-match` for evidence comparisons and `jobsearch-documents` for writing/review. Administrators configure API Base URL, write-only API Key, Model, Responses/Chat Completions format, Reasoning Effort and Monthly Token Budget. The budget is per user and UTC calendar month; 0 is unlimited. Provider/model/credentials are still operational choices. Verify the selected provider's current structured-output support, data handling, effort values and costs; OpenAI compatibility is not guaranteed by an API label.

## Intended user flow

1. Select a saved vacancy and the current candidate profile. Preserve the source description, completeness, fact evidence, relevant preferences, and their versions.
2. Request an LLM assessment. Show the decision, requirement-by-requirement evidence, transferable experience, known conflicts, unknowns, and source limitations. A snippet permits preliminary triage only.
3. For a sufficiently complete description, request tailored CV and cover-letter text in the selected document language. The accepted evidence assessment may guide emphasis; it does not establish new facts.
4. Save a draft packet with the input snapshots, evaluation/generation rules, provider/model identity, factual traceability, and change summary. Let the user edit it and review both content and rendered files.
5. Set approval only through the user's review action. Export/review and application submission remain separate; record submission only from the actual user report or supported receipt.

Automatic transmission to employers is outside this next stage. Integration, successful live generation, and a reviewed packet are separate milestones.

## Provider boundary

GitHub Pages is a public static client. `jobsearch-api` validates the caller with Supabase Auth and checks admin membership in the database. Its service-role credential exists only in the Edge runtime; the provider key is stored in a private, RLS-enabled table accessible through service-only RPCs. It is never returned to a client, including administrators. Do not place either secret in `VITE_`, Git, browser storage or logs. See Supabase [function secrets](https://supabase.com/docs/guides/functions/secrets) and [function authentication](https://supabase.com/docs/guides/functions/auth).

`supabase/functions/_shared/llm.ts` owns payloads, schemas, prompts and `RULES_VERSION`. Responses uses `text.format`; Chat Completions uses `response_format`. Default effort omits the parameter. Requests use HTTPS public host checks, no redirects, fixed output caps and a timeout; they do not automatically retry. [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs) and [reasoning](https://developers.openai.com/api/docs/guides/reasoning) were checked on 2026-10-02. Host validation is a preflight DNS check, not a network-level egress sandbox.

Authenticate the account at the adapter, bind input/report/packet access to that account, and preserve the database ownership/revision checks. Client-supplied IDs alone are not authorization. Keep per-account usage limits, bounded requests, and safe error handling in the adapter. Do not place a management or service-role key in the browser to enable inference.

If a separately authorized user-operated LLM or external endpoint is used instead, document its actual input/output route. The current clipboard prompt is a useful manual fallback; it is not evidence of an integrated external API.

Minimize the matching payload to relevant candidate facts, job text, and stated preferences. Add contact details to documents from the private profile when needed; they need not be sent for fit assessment. Preserve real inputs, responses, and provider traces only in private account storage. Do not log full CVs, emails, secrets, or full request bodies in public CI.

## Inputs and outputs

Define a provider-independent contract and an explicit adapter to the selected API. Validate responses against that contract before installing them in the workspace.

**Shared input envelope:** request ID/operation, owner-bound input references, candidate profile version and fact IDs, vacancy ID and description version/completeness, relevant preferences, document language, and rules/prompt version. Retain actual private snapshots so hashes/version numbers remain interpretable. The selected model and generation configuration identify a run; they do not guarantee deterministic reproduction.

| Operation | Required result | Guardrails |
| --- | --- | --- |
| Match | Decision, requirements with source excerpts/locators, evidence status and fact IDs, reasons, unknowns, preferences, document readiness, input/rules versions. | Follow `jobsearch-match`. Omitted experience is unknown, not contradicted. Language requirements do not affect rank, eligibility, readiness, or proficiency questions. |
| Tailor documents | Editable CV/letter text, change summary, claim-to-fact evidence map, unresolved material questions, input/generation versions. | Follow `jobsearch-documents`. Only source-stated/user-confirmed facts support claims; faithful translations cannot add experience, tools, credentials, metrics, or language proficiency. |

Keep source/job text and model output as data. Delimit source inputs and prevent text embedded in an ad or CV from triggering tool actions, file access, account changes, or unrelated transmissions. The generation endpoint does not need employer-submission tools.

Check schema/size, accepted enums, known fact IDs, intended employer/role, and the association with the requested inputs. Validate substantive claims against their actual facts, not merely the existence of a cited ID. Schema validation or a model's own assertion of correctness is not factual verification. Keep the result provisional where evidence is insufficient, and keep human review explicit.

## Save without losing history or edits

LLM input/result snapshots and usage are saved in separate `llm_runs`/`llm_usage` tables with owner-only reads and service-only writes. Evidence IDs currently refer to lines of supplied profile text; they are not a verified fact ledger. The workspace packet stores optional `llmRunId` and `llmRulesVersion`; `parseBackup` preserves them. A JSON workspace backup does not include the separate server run history. Private templates remain richer references, not ready-made workspace payloads.

Associate each result with a stable request ID and relevant input/rules/model versions. Before applying a late response, confirm the active account and requested input versions still match. If the user changed the CV/job/preferences or edited a packet while inference was running, retain the result as a separate stale draft or require an explicit choice; do not replace their newer work silently.

Reuse an assessment/draft only while relevant input and rule versions match. Preserve older reports, approved packets, and already submitted files. Fact changes or changed requirements invalidate the affected current review; an old approval cannot certify newly generated content.

## Failures and usage

Distinguish unavailable/unauthorized provider, rate limit, timeout, malformed output, insufficient evidence, and stale input. Keep saved jobs, manual editing, and existing packets usable. Preserve incomplete attempts as private diagnostics when useful; failed generation must not set `prepared`, approval, or submission.

Reservation is atomic per user; one pending run is allowed. A request ID replays its saved state without dispatching again. Actual provider input/output usage settles the reservation (reasoning is already part of output); unknown usage conservatively charges the reserve. Pending runs older than five minutes settle as uncertain on the next status/generation call. No automatic paid retry occurs. A fresh explicit action creates a new request and may incur another charge. Provider-side billing idempotency is not assumed.

Admin account listing excludes workspace content. Password reset sends a recovery link; it never creates or exposes a password. Deletion requires an exact email confirmation and protects all administrators. Admin actions are recorded with actor/target/action metadata and rate limited per target/action.

The admin mail tab applies SMTP settings to Supabase Auth via the Management API. It accepts a transient Management Token (or the server's optional `JOBSEARCH_MANAGEMENT_TOKEN`); never persist a browser-supplied token. `_shared/smtp.ts` whitelists SMTP fields and redacts passwords and unrelated Auth secrets. The server fixes the target project. SMTP configuration and actual email delivery require separate verification; a save does not send a test email.

Measure latency, token usage and actual cost when available, plus useful assessments and time to an approved packet. Keep provider pricing dated and verified after provider/model selection; do not prescribe a paid tier or claim a cost figure before that decision.

## Acceptance for this stage

- Evidence-backed results distinguish direct support, transferability, unknowns, known mismatch, and excluded language requirements; changing only a language requirement leaves the decision unchanged.
- With a full synthetic job/profile, assessment and tailored CV/letter use the correct employer, exact supported candidate facts, and selected document language. Snippet input cannot produce a final ready packet.
- Unsupported generated claims, bogus fact IDs, instruction-bearing job text, malformed responses, source failures, and rate limits do not become trusted claims or overwrite saved work.
- A response after account switch, input change, or concurrent edit cannot install into another account or silently replace a newer draft. Saved reports/packets retain their versions and synchronize across authorized sessions.
- No provider secret appears in public assets, Git, browser persistence, or logs. Live ownership and revision behavior remain intact.
- Relevant application suites and build pass; new UI is inspected on desktop/mobile. Mocked provider responses establish contract handling only. A bounded, authorized live call is necessary to claim that the chosen external provider works; rendered document QA and user approval remain separate checks.

Implement the smallest usable route from matching through a reviewable packet. Do not broaden this step into multi-provider orchestration, automatic applications, or mass processing without a corresponding request.
