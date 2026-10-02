---
name: jobsearch-profile
description: "Create or update JobSearch's private candidate profile from CVs and user-confirmed facts, including work history, achievements, education, and job preferences. Use before matching or drafting when the factual baseline is missing or changes."
---

# JobSearch candidate profile

Maintain a versioned factual baseline for vacancy matching and application writing. Preserve the original documents and distinguish their statements from user confirmations and unresolved interpretations.

## Current application boundary

The app's `Profile` in `src/types.ts` contains contact fields, headline, summary, a skills string, CV text, and an incrementing version. `ProfilePanel` in `src/Panels.tsx` imports DOCX/TXT as text; PDF text can be pasted. Import does not preserve the original file, extract a fact ledger, or confirm every claim.

The [evidence model](references/evidence-model.md) and [empty template](assets/profile-template.json) describe a richer private baseline for skill work. They are not app backup formats. Keep provenance and source snapshots privately; map explicitly if integrating that structure into the version-1 workspace.

For the planned external-LLM workflow, supply only relevant supported facts with their IDs and unresolved statuses. An LLM response is proposed wording, not a new source of candidate facts. Keep contact data separate from fit-assessment inputs when it is unnecessary, and preserve the exact baseline version used for each run.

## Inputs and storage

Use the current CV and information supplied or authorized for this task. A historical summary or a remembered CV may guide questions, but it is not current candidate evidence. Do not search unrelated private files to populate the profile.

For a new profile, use [the empty template](assets/profile-template.json) in ignored private storage; the template is not a completed profile. Read [the evidence model](references/evidence-model.md) when structuring facts. Keep personally identifying contact details separate from the evidence needed for matching when practical.

## Build or amend the baseline

- Record each substantive claim with a stable fact ID, its source document or user statement, source location, and confirmation status. Preserve exact dates, titles, qualifications, and stated metrics.
- Keep `source_stated`, `user_confirmed`, `unverified`, and `conflicted` distinct. A current CV can support a source-stated fact; do not force the user to reconfirm every unchanged line.
- Keep overlapping employment dates, unexplained gaps, and ambiguous qualifications visible for clarification. Do not repair them by inventing dates, combining employers, or promoting a title.
- Track achievements and their evidence separately from generic responsibilities. Do not create percentages, team sizes, budgets, or outcomes to make a CV stronger.
- Keep skill synonyms/translations separate from original claims. A synonym can aid retrieval; it does not demonstrate additional expertise.
- Preserve foreign education and any comparative-assessment wording as supplied. Do not rewrite an assessment into a Canadian degree, professional licence, or equivalence the evidence does not establish.

Record target role families, location/commute preferences, work arrangement, schedule, and compensation only as supplied. Keep unset values null or empty. Do not infer a city from account settings, repository paths, or sample source queries. Related role families may be proposed without silently making them accepted preferences. The UI currently stores only city, roles, minimum hourly pay, and filter activation; commute, schedule, and work arrangement are not implemented settings. Its default French document language is presentation configuration, not evidence of a candidate preference or proficiency.

Language proficiency is outside the current filtering and ranking scope. Do not ask for levels, create a language rejection rule, or infer new language credentials. Preserve an existing statement when appropriate for the requested document; document-language selection remains independent of job eligibility.

Ask only about ambiguities that affect the current decision or document. Continue independent extraction and implementation while answers are pending. A missing preference does not block creating the profile structure.

## Version and hand off

Record the profile version, update time, changed fact IDs, and unresolved questions. User corrections supersede earlier claims with provenance; preserve the prior version when it has already supported an application packet. The app currently increments a number and replaces the current profile; a packet's `profileVersion` does not constitute a historical profile snapshot.

If changing profile persistence, preserve old backups and account synchronization. Inspect `parseBackup` and cloud ownership/conflict handling through `jobsearch-build`; editing a public default profile or copying a real CV into `public/` is not a profile update.

Pass relevant evidence to matching or drafting. Treat conflicted/unverified facts as questions, not ready-to-use CV claims. Return a concise change summary and the private profile location, without reproducing unnecessary contact information or committing candidate data to the repository.
