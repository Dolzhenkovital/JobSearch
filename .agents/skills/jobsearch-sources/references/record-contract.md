# Vacancy record contract

This is a handoff contract for skills and future implementation, not an existing database schema. Equivalent field names are acceptable in an established application if the semantics are preserved. Unknown values are null, not empty claims or inferred facts.

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
