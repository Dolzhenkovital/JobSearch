---
name: jobsearch-build
description: "Plan and implement the JobSearch service, its workflow, application tracking, and acceptance checks. Use for product or engineering work spanning the job-search pipeline; use the specialist skills for individual stages."
---

# JobSearch delivery

Build a private assistant that helps a candidate find suitable Canadian vacancies and prepare accurate application documents. Optimize for useful applications and time saved reviewing them.

## Established product decisions

- Start with one candidate. Do not add a public marketplace, multi-tenant billing, or mass applications without a request.
- Language proficiency is not a search filter, ranking feature, rejection reason, or onboarding question. Document language is a separate presentation setting.
- City, target roles, commute, schedule, and salary preferences remain configurable. Unknown values are not defaults to invent; discovery experiments may proceed with clearly labelled sample queries.
- Discovering a vacancy, obtaining its complete description, evaluating fit, preparing documents, and submitting an application are separate events.
- Skills describe workflows; they do not themselves supply connectors, run a scheduler, or prove the service works.

## Choose the next useful slice

Inspect the checkout and current user request before selecting a stack or creating infrastructure. Preserve existing choices when they fit. If no application exists, prefer a small end-to-end slice with manual vacancy import, a private candidate profile, a fit report, and a reviewable document packet. Add automatic sources once the flow is useful.

Load only the relevant specialist:

| Work | Skill |
| --- | --- |
| Source access, polling, email ingestion, descriptions, duplicates, freshness | `jobsearch-sources` |
| CV import, factual history, preferences, corrections | `jobsearch-profile` |
| Requirement extraction, evidence comparison, shortlist | `jobsearch-match` |
| CV, lettre de motivation, DOCX/PDF, document revisions | `jobsearch-documents` |

These sibling skills are supplied with this repository. In a relocated or partial installation, locate their `SKILL.md` before relying on them; their absence need not block independent work.

Keep source adapters independent of matching and document generation. A connector failure must not prevent reviewing saved vacancies or adding one manually. Store versions of the candidate profile and vacancy description used for each report and document packet. Reuse results only while those inputs and the relevant generation rules are unchanged.

## Application tracking

Use meaningful states such as `saved`, `reviewing`, `prepared`, `submitted`, `interview`, `rejected`, `offer`, and `withdrawn`. Keep vacancy availability separate from application progress.

Record the vacancy identifier, document packet version, timestamps, and the evidence for a status change. Opening an application URL or generating a CV does not establish submission. A user report may establish `submitted` with evidence type `user_reported`; a confirmed platform receipt may establish it with type `platform_receipt`.

Preparing files or drafting a follow-up does not authorize sending messages or applications. If the user authorizes an external submission, honor its stated scope and check its actual outcome before changing status. Do not retry an ambiguous submission until its outcome is reconciled.

## Verify behavior that matters

Choose checks for the slice being changed: repeated imports do not duplicate jobs, source failures remain distinguishable from empty results, missing data remains unknown, language does not affect ranking, evidence supports document claims, and a ready packet refers to the intended vacancy and profile versions. Use synthetic or redacted fixtures in Git.

For a pilot, record useful coverage, the fraction with complete descriptions, duplicates, shortlist relevance judged by the candidate, and time to an approved document packet. Distinguish observed measurements from estimates; small samples do not establish hiring probability.

Keep real profiles, CVs, email exports, generated packets, tokens, and live vacancy caches in ignored private storage or an explicitly configured private location. Report what was built, what was actually exercised, and the next dependency. Do not equate mock data or a successful page load with a working integration.
