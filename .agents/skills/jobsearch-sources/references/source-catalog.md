# Source catalog

Research snapshot: 2026-09-30. Recheck official sources before implementation. No user account, provider key, or ongoing polling integration was configured during this research.

| Source | Evidence and capability | Practical boundary |
| --- | --- | --- |
| Job Bank / Guichet-Emplois | Public search pages expose an RSS-labelled feed. A direct read of the sample below returned HTTP 200, an Atom `feed`, 100 entries, and updates dated 2026-09-30. | The two inspected summaries contained job number, location, employer, and salary, not the full description. Filtering, retention window, polling permissions, pagination, and closure semantics still need validation. |
| Indeed MCP | Official docs describe Job Search, Job Detail, Get Resume, and company research. Docs updated 2026-09-12 state availability only through Claude Connector. | Documentation reviewed; authenticated access was not tested. No general server-to-server MCP entitlement has been established. |
| Indeed app in ChatGPT | Official announcement and help describe job discovery through an account connection, with applications continuing on Indeed. | Country/account availability and access from our backend are unverified. The integration is not evidence of a reusable public job-search API. |
| Indeed email alerts | Official help documents alerts matching searches and adjustable frequency. | Discovery input; an alert may omit important details. Candidate-authorized mailbox access is a separate integration. |
| Jobillico email alerts | Official candidate FAQ documents daily or weekly alerts with links to new jobs. | No public candidate-search API was verified. Evaluate relevant regional/role coverage with a sample. |
| Greenhouse Job Board API | Official documentation states that Job Board GET endpoints do not require authentication. | Per-employer board token; not a Canada-wide index. Documentation reviewed, live boards not sampled here. Submission is a separate authenticated capability. |
| Lever Postings API | Official repository documents published jobs per employer site, lists, and individual details. | Need the employer's site identifier; no universal full-text job search. Documentation reviewed, live boards not sampled here. |
| Adzuna search API | Official docs provide an API-key-based search interface and explicitly say the standard response contains a description snippet. | Canadian role/location coverage, issued credentials, applicable access terms, and full-detail options were not tested. Do not assume full descriptions or unrestricted reuse. |

## Job Bank sample

Discovery page: https://www.jobbank.gc.ca/jobsearch/?fglo=1&mid=22446&page=1&sort=M

Sample request used for the transport check:

```text
https://www.jobbank.gc.ca/jobsearch/feed/jobSearchRSSfeed?d=50&mid=22446&sort=D&rows=20
```

The request returned 100 entries despite `rows=20`. Treat query parameters as observed inputs, not a verified API contract. The sample is not the candidate's chosen location. Copy the feed link from an actual configured search and test that its returned locations, dates, and keywords match the intended filter. Remove session identifiers from reusable configuration where the endpoint works without them.

Atom entries use XML namespaces and may contain HTML in `summary`. Parse both structures; sanitize HTML for display. Preserve entry identity and link separately. A nonempty feed or recent entry timestamps do not demonstrate complete market coverage.

## Official references

- [Indeed MCP](https://docs.indeed.com/mcp)
- [Indeed API catalog](https://docs.indeed.com/api-guides/)
- [Indeed job-posting integrations](https://docs.indeed.com/job-postings/): employer job management and a front-end publisher plugin are distinct from candidate search.
- [Indeed ChatGPT announcement](https://www.indeed.com/news/releases/indeed-launches-app-in-chatgpt)
- [Indeed AI-platform availability](https://www.indeed.com/help/employers/articles/indeed-jobs-ai-assistants-and-llms?co=US&hl=en)
- [Indeed alert setup](https://support.indeed.com/hc/en-us/articles/204488890-Starting-Stopping-and-Managing-Job-Alerts)
- [Indeed terms](https://emplois.ca.indeed.com/legal?hl=fr): automated access restrictions require review; do not treat a public page as an unrestricted scraping interface.
- [Jobillico alerts](https://www.jobillico.com/fr/faq/pref-alerte-emploi)
- [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html)
- [Lever Postings API](https://github.com/lever/postings-api)
- [Adzuna search](https://developer.adzuna.com/docs/search)
- [Adzuna access terms](https://developer.adzuna.com/docs/terms_of_service)

For a source trial, capture access method, documentation check date, actual response evidence, description completeness, filter behavior, unique useful vacancies, latency, and known storage/attribution constraints. Report unknowns without replacing them with marketing claims.
