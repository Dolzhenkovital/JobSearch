# Vacancy record contract

The canonical fields below are a handoff contract for skills and future extensions, not the current database schema. Equivalent field names are acceptable if the semantics are preserved. Canonical unknown values are null; do not convert the application's current empty strings into factual claims.

## Current runtime mapping

`src/types.ts` defines `Job` and `Feed`; `validateJob`, `parseFeed`, `parseAtom`, and `combineJobs` in `src/domain.ts` consume them. Update those boundaries when changing the collector output.

| Runtime field/behavior | Meaning and limitation |
| --- | --- |
| `id` | `jobbank:<posting number>` for Job Bank; manual/imported identities have their own prefix. Stable within a source; no canonical cross-source occurrence model exists. |
| `title`, `employer`, `location`, `salary` | Plain strings; missing values may be empty. Salary retains source wording; structured currency/period/origin is not stored. |
| `description`, `completeness` | Current values are `snippet` or `full`; the collector always produces snippets. Manual full text is user supplied, and its checkbox alone does not prove content completeness. |
| `publishedAt` | Nullable source publication timestamp. Atom `updated` is not used as publication time. |
| `firstSeenAt` | Collector retains it from the previous snapshot for a recurring source ID. It is not a publication date. |
| `checkedAt` | Time the record was observed during discovery/import. It does not establish employer-page availability. |
| `availability` | `active`, `closed`, or `unknown`; the collector emits `unknown`. Feed disappearance does not change it to closed. |
| Description version | Packets currently use `contentVersion(description)`. A `Job` has no persisted version/history/provenance object. |

The public `Feed` contains `schemaVersion: 1`, `fetchedAt`, `lastAttemptAt`, `status`, `message`, and `jobs`. `success` may contain zero jobs. A failed collector read retains the previous successful timestamp and records `stale` when a prior snapshot exists, otherwise `error`. The script writes the result without a failing exit code; inspect the payload/log rather than relying on workflow status.

The UI's RSS/Atom file importer currently rejects an empty file feed, while the automated collector accepts a valid empty Atom result. Neither outcome proves that saved vacancies have closed. `combineJobs` preserves privately completed descriptions when a public snippet is refreshed; preserve that behavior in adapter changes.

Per-query run history, independent availability-check outcomes, source occurrences, cross-source deduplication, and structured terms below are extensions. Introduce them with persistence compatibility and synthetic fixtures rather than claiming they already exist.

## Canonical vacancy

| Field | Meaning |
| --- | --- |
| `job_id` | Local stable identity across known duplicate source occurrences. |
| `title`, `employer`, `locations` | Source-stated values; distinguish employer from a recruiting agency when known. |
| `employer_requisition_id` | Employer's own identifier, when supplied. |
| `employment_type`, `work_arrangement`, `schedule` | Stated terms with unknowns preserved. |
| `compensation` | Range, currency, pay period, and stated/estimated origin. Keep original text; normalization may add derived values with assumptions. |
| `description.text` | Plain text or sanitized content for analysis, stored privately under applicable source conditions. |
| `description.completeness` | `missing`, `snippet`, or `full`; a long snippet is still a snippet. |
| `description.version` | Stable version or content hash for meaningful text changes. |
| `description.source_ref` | Source occurrence or candidate-supplied document reference used for this version. |
| `availability` | `active`, `closed`, or `unknown`, with supporting evidence and time. |
| `source_occurrences` | One or more source-specific identities and provenance records. |

## Source occurrence

Keep `source_name`, `source_job_id` if available, `source_url`, `employer_url` when known, acquisition method, and source-native publication/update timestamps. Store `first_seen_at`, `last_seen_at`, `last_checked_at`, and check outcome independently.

`last_seen_at` means observed in a successful response. `last_checked_at` may describe a failed check and must not imply that availability was refreshed. Retain the time and evidence of the last successful availability check separately. Store timestamps with an explicit timezone; display them in the user's chosen timezone.

Keep ambiguous cross-source matches as possible duplicates. Include the matching reason and avoid merging records that differ in employer requisition or location without supporting evidence.

## Source run

Record source/query identity, start/end times, outcome, counts, pagination/window coverage, and retry information. Outcomes can be `success`, `partial`, `error`, `throttled`, or `auth_required`. A successful run with zero records is distinct from a failed fetch. Avoid storing access tokens, session cookies, full private emails, or candidate contact details in run logs.

## Downstream implications

- Matching consumes a specific description version and reports completeness.
- Document generation requires enough full source material to establish the role and requirements before marking a packet ready for review.
- A missing feed entry, HTTP timeout, or throttling response does not establish closure.
- A retained old snapshot can remain reviewable even when current availability is unknown.
- Source changes invalidate only the downstream decisions or documents affected by those changes; keep the historical versions used for past applications.
