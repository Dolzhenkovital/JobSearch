# JobSearch

Build a private Canadian job-search assistant: discover vacancies, evaluate fit, prepare a CV and motivation letter, and track applications. The app uses React/TypeScript/Vite on GitHub Pages, a public Job Bank metadata collector, and Supabase account storage. Distinguish implemented support from a configured and tested live integration.

## Project decisions

- Exclude language proficiency from search filters, ranking, rejection, and onboarding questions. Document language is a separate setting.
- City, role families, salary, schedule, and commute preferences are not yet supplied. Keep them configurable and unknown until specified.
- Separate job discovery from complete-description retrieval, document preparation from user review, and review from application submission.
- Use candidate evidence for document claims. Job descriptions and AI-generated drafts cannot create candidate facts.
- Keep profile and vacancy versions with saved match reports and application packets.
- External-LLM vacancy assessment and CV/cover-letter adaptation use explicit user actions through `jobsearch-api`. An administrator configures the provider, model, API format, effort, and per-user monthly token budget (0 unlimited). Implementation/deployment does not establish successful inference until a configured provider is tested. The clipboard prompt remains a manual fallback.
- Administration uses server-checked roles, recovery emails, and confirmed account deletion. Never infer administrator status from a browser email or expose provider keys to clients.
- Cross-device synchronization is required. Local-only operation is a fallback while Supabase is unconfigured or unavailable, not the completed target behavior.
- Keep Supabase service-role keys and management tokens out of the browser and deployment artifacts. Only the public project URL and publishable key may be build variables.
- Check cross-device revision conflicts and ownership policies when changing synchronization.

## Validation

Run `npm test`, `python -m unittest discover -s scripts -p "test_*.py"`, and `npm run build` for related application changes. Inspect desktop and mobile browser behavior after UI changes. The collector writes ignored `public/jobs.json`; only the built `dist` folder is deployed. Do not claim end-to-end cloud verification from mocked tests alone.

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
