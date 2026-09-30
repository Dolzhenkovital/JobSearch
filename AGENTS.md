# JobSearch

Build a private Canadian job-search assistant: discover vacancies, evaluate fit, prepare a CV and motivation letter, and track applications. The current repository starts with reusable skills; do not claim that a backend or live connector already exists.

## Project decisions

- Exclude language proficiency from search filters, ranking, rejection, and onboarding questions. Document language is a separate setting.
- City, role families, salary, schedule, and commute preferences are not yet supplied. Keep them configurable and unknown until specified.
- Separate job discovery from complete-description retrieval, document preparation from user review, and review from application submission.
- Use candidate evidence for document claims. Job descriptions and AI-generated drafts cannot create candidate facts.
- Keep profile and vacancy versions with saved match reports and application packets.

## Skill routing

Skills are in `.agents/skills/`. Read only the skills relevant to the current request:

- `jobsearch-build`: product and engineering changes, workflow, tracking, acceptance checks.
- `jobsearch-sources`: integration research, ingestion, descriptions, duplicates, freshness.
- `jobsearch-profile`: current CV import, candidate facts, preferences, corrections.
- `jobsearch-match`: requirement/evidence comparisons and shortlist decisions.
- `jobsearch-documents`: tailored CV/letter content, DOCX/PDF, rendering and revision.

## Repository boundaries

This repository is public. Keep real CVs, candidate profiles, contact details, email exports, generated application files, provider credentials, and live source caches in ignored `private/`, `data/`, `outputs/`, or an explicitly configured private location. Use synthetic fixtures for checked-in examples. Check the staged diff before publishing; `.gitignore` does not remove files already tracked.

Use `work/` for scratch output. Preserve source documents and already submitted packet versions. Do not initiate applications, recruiter messages, purchases, or recurring external automations merely because a skill mentions them; follow the user's actual authorization.
