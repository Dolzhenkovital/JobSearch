---
name: jobsearch-match
description: "Evaluate and rank JobSearch vacancies against candidate evidence and stated preferences, including external-LLM assessment contracts and result review. Use for explainable shortlists, transferable skills, gaps, and missing information; not for writing application documents."
---

# JobSearch vacancy matching

Explain whether a vacancy is worth the candidate's attention using the actual requirements, candidate facts, and stated preferences. Do not present a fit score as a probability of interview or hiring.

## Current application boundary

`matchingTerms` in `src/domain.ts` counts literal candidate-skill text occurrences in the job title/description after language exclusions. The UI can sort by that count. `preferenceReasons` compares configured city, role text, and stated hourly pay when preference filters are enabled. These are preliminary hints, not semantic evidence assessment, credential checks, or saved match reports.

The explicit AI action in `src/AiPanel.tsx` calls `jobsearch-api` and saves private `llm_runs`, separate from `Store`. `validateMatch` checks evidence IDs and exact job excerpts, excludes language, and computes a visible heuristic plus evidence coverage. This does not establish semantic truth. The [report shape](references/match-report.md) remains a richer private handoff format, not a direct workspace import.

## External-LLM assessment

For external-LLM input/output, server-side credentials, per-user budget, persistence, and failures, read [the integration workflow](../jobsearch-build/references/external-llm.md). Check admin configuration and current deployment evidence before claiming a provider/model is operational.

Ask the model for a structured requirement-to-evidence report using supplied fact IDs and source excerpts, then validate the returned references and factual reasoning. Do not promote model confidence to proof, a hiring probability, or candidate evidence. Keep missing facts unknown and language excluded. Preserve the run's input snapshots, method/rules version, and provider/model metadata with the private report.

## Establish the inputs

Use a versioned candidate profile and an attributable vacancy description. If the profile is missing or conflicted, use `jobsearch-profile` when available or collect only the necessary evidence. Do not fill gaps from assumptions about the candidate.

With a snippet, produce only a preliminary triage result and request or retrieve full text for a complete assessment. Keep document readiness separate from apparent fit. Record the description version, profile version, source, completeness, and check time. Do not equate a user-selected `full` checkbox with verified presence of duties, requirements, and terms.

## Compare requirements with evidence

Extract requirements with supporting excerpts or source locations. Distinguish explicit requirements, preferences, responsibilities, and unclear statements. Do not turn every keyword or an employer's ideal profile into a mandatory filter.

For each relevant requirement, classify candidate evidence as:

- `supported`: direct factual support, with fact IDs.
- `transferable`: related experience, with fact IDs and an explicit explanation of the remaining difference.
- `unknown`: no adequate evidence yet.
- `contradicted`: affirmative evidence of a mismatch, not merely an absent CV keyword.
- `excluded_by_preference`: intentionally outside the evaluation scope.

Unknown experience is not confirmed absence of experience. Check essential qualifications and professional credentials when the vacancy calls for them, but do not make legal eligibility conclusions from job titles or foreign education alone.

Apply user-stated non-negotiable preferences only when the relevant vacancy facts are known. Missing salary, ambiguous location, or an unspecified schedule creates a question. A strong skills match cannot conceal a known conflict with an explicit non-negotiable preference.

Language requirements are `excluded_by_preference` for this project: they must not change scores, rank, eligibility decisions, or readiness, and must not trigger proficiency questions. The language of the ad may guide output presentation only. Do not claim a specific proficiency or certificate in documents without candidate evidence.

## Prioritize clearly

Use decisions such as `prioritize`, `consider`, `needs_information`, or `deprioritize`, with concrete reasons and next actions. A vacancy with incomplete source text can be promising while remaining provisional. Preserve explicit closure evidence and do not prepare a routine submission to a confirmed closed vacancy.

Use numeric scores only if they serve the requested comparison. Publish the dimensions and weights, show missing-data coverage separately, and label scores as heuristic. Do not reward verbosity, duplicate listings, unsupported keyword insertion, or irrelevant personal characteristics.

Use [the report shape](references/match-report.md) for a handoff to document drafting or the application UI. Save the evaluation method/rules version and input snapshot references so later changes can be explained. Select a few supported examples that could strengthen an application and separately list unresolved questions. Match recommendations may guide emphasis; they do not create new candidate facts.

## Validate a matching change

Use representative cases for the logic being changed: a strong direct match, transferable experience, an unknown required credential, a known preference conflict, and incomplete source text. Where ranking code changes, check that changing only the advertised language requirement leaves ranking unchanged. Report the actual evidence and limits of the comparison.
