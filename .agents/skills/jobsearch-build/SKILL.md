---
name: jobsearch-build
description: "Analyze, plan, and implement JobSearch's React/Supabase application, external-LLM workflow, cross-device synchronization, and application tracking. Use for project-state reviews and engineering work across stages; use the specialist skills for source, profile, matching, or document work."
---

# JobSearch delivery

Build a private assistant that helps a candidate find suitable Canadian vacancies and prepare accurate application documents. Optimize for useful applications and time saved reviewing them.

## Work in the existing application

This repository already contains a React/TypeScript/Vite application deployed through GitHub Pages, a Python Job Bank discovery collector, and Supabase account storage. Start with `AGENTS.md`, the relevant code, and [the implementation guide](references/implementation-guide.md). Keep this stack unless the requested work warrants a change.

For a project-state review, read [the dated assessment](../../../docs/project-state.md) and [deployment evidence](../../../docs/deployment.md), then verify facts relevant to the request. Distinguish code support, local tests, public runtime observations, and previously documented authenticated checks. A successful workflow alone does not establish source freshness: the collector can preserve a stale snapshot and exit successfully.

## Established product decisions

- Start with one candidate. Do not add a public marketplace, multi-tenant billing, or mass applications without a request.
- Language proficiency is not a search filter, ranking feature, rejection reason, or onboarding question. Document language is a separate presentation setting.
- City, target roles, commute, schedule, and salary preferences remain configurable. Unknown values are not defaults to invent; discovery experiments may proceed with clearly labelled sample queries.
- Discovering a vacancy, obtaining its complete description, evaluating fit, preparing documents, and submitting an application are separate events.
- Cross-device synchronization is a required outcome. Local storage is an offline/unconfigured fallback. Keep account ownership, revision-conflict handling, and recovery intact.
- External-LLM assessment and CV/letter adaptation use explicit user actions through Supabase `jobsearch-api`. Admin settings select provider/model/format/effort and a per-user monthly token budget (0 unlimited). Verify configuration and a real provider call separately from code/deployment. The clipboard prompt is the manual fallback.
- Skills describe workflows; they do not themselves supply connectors, run a scheduler, or prove the service works.

## Choose the next useful slice

For assessment, adaptation, admin settings, usage accounting, or provider integration, read [the external-LLM workflow](references/external-llm.md). Preserve source inputs, provenance, saved reports/packets, and cross-device isolation. A request to update instructions alone does not authorize deployment or paid provider calls; follow the actual task scope.

Load only the relevant specialist:

| Work | Skill |
| --- | --- |
| Source access, polling, email ingestion, descriptions, duplicates, freshness | `jobsearch-sources` |
| CV import, factual history, preferences, corrections | `jobsearch-profile` |
| Requirement extraction, evidence comparison, shortlist | `jobsearch-match` |
| CV, lettre de motivation, DOCX/PDF, document revisions | `jobsearch-documents` |

These sibling skills are supplied with this repository. In a relocated or partial installation, locate their `SKILL.md` before relying on them; their absence need not block independent work.

Keep source adapters independent of matching and document generation. A connector failure must not prevent reviewing saved vacancies or adding one manually. Store versions of the candidate profile and vacancy description used for each report and document packet. Reuse results only while those inputs and the relevant generation rules are unchanged. A version number/hash identifies an input; retain the actual source snapshot when reproducibility is needed.

The current `Store` is a version-1 browser/cloud payload, not the richer schemas in the specialist templates. When extending it, update types, import validation, defaults, persisted-data compatibility, and related tests together. Never import a specialist template directly as a workspace backup.

## Application tracking

Use meaningful states such as `saved`, `reviewing`, `prepared`, `submitted`, `interview`, `rejected`, `offer`, and `withdrawn`. Keep vacancy availability separate from application progress.

Record the vacancy identifier, document packet version, timestamps, and the evidence for a status change. Opening an application URL or generating a CV does not establish submission. The app currently records manual submission as `user_reported` and freezes existing packets for that vacancy; it has no receipt integration or selected submitted-packet ID. A future receipt integration may use `platform_receipt`, but add its persistence contract and evidence before claiming support.

Preparing files or drafting a follow-up does not authorize sending messages or applications. If the user authorizes an external submission, honor its stated scope and check its actual outcome before changing status. Do not retry an ambiguous submission until its outcome is reconciled.

## Verify behavior that matters

For related application changes, run `npm test`, `python -m unittest discover -s scripts -p "test_*.py"`, and `npm run build`. After UI changes, inspect desktop and mobile browser behavior. For synchronization or database changes, use the ownership/conflict checks in the implementation guide; mocked lifecycle tests and local PostgreSQL checks do not establish a live cross-device result.

Choose checks for the slice being changed: repeated imports do not duplicate jobs, source failures remain distinguishable from empty results, missing data remains unknown, language does not affect ranking, evidence supports document claims, and a ready packet refers to the intended vacancy and profile versions. Use synthetic or redacted fixtures in Git.

For a pilot, record useful coverage, the fraction with complete descriptions, duplicates, shortlist relevance judged by the candidate, and time to an approved document packet. Distinguish observed measurements from estimates; small samples do not establish hiring probability.

Keep real profiles, CVs, email exports, generated packets, tokens, and live vacancy caches in ignored private storage or an explicitly configured private location. Report what was built, what was actually exercised, and the next dependency. Do not equate mock data or a successful page load with a working integration.
