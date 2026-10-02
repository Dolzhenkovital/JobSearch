# Match report handoff

Adapt presentation to the request, but preserve these distinctions in a saved report:

The app currently displays keyword hints and has no persisted match-report type. Save skill-generated reports in private storage. If adding reports to `Store`, implement version-compatible persistence and cloud synchronization rather than assuming this document defines an existing database table.

1. **Inputs:** local vacancy ID, source URL, description version/completeness, availability evidence/time, candidate profile version, private input snapshot references, evaluation time, and evaluation method/rules version.
2. **Decision:** `prioritize`, `consider`, `needs_information`, or `deprioritize`, with concrete reasons. Mark snippet-based assessments provisional.
3. **Requirements:** source excerpt/locator, required/preferred/unclear classification, evidence status, supporting fact IDs, and explanation.
4. **Preferences:** known matches/conflicts, unknown values, and explicit user non-negotiables. Exclude language from evaluation.
5. **Useful application evidence:** supported examples with fact IDs, plus honest transferable-skill connections.
6. **Questions:** only missing information that could change the decision or the proposed document claims.
7. **Document readiness:** `ready_for_drafting`, `provisional_only`, or `needs_information`, independently of apparent fit. A closed vacancy should carry an explicit availability warning and no routine submission recommendation.

If a score is requested, provide dimensions, weights, handling of missing values, and data coverage. Do not label it an ATS score or probability of selection.

Retain reports already used for a reviewed/submitted packet. Mark a report stale when its relevant candidate facts, vacancy requirements, user preferences, or evaluation rules change. A matching profile version/hash identifies the inputs; their retained snapshots provide the underlying evidence.

For an external-LLM report, also retain the request/run ID, provider/model identity, generation configuration reference, response validation outcome, and measured usage where available. Keep these in private metadata. Validate each cited fact against the claimed support; a syntactically valid fact ID is not sufficient evidence. A late response refers to the inputs it actually evaluated, even if the current workspace has changed.

For example, a requirement for a specific software package with no candidate evidence is `unknown`. Experience with a different package can be `transferable`, with that difference stated; it is not proof of expertise in the requested package. A confirmed lack of a genuinely mandatory credential is different from an unmentioned credential.

An ad's language requirement is `excluded_by_preference` in this project. Changing only that requirement must not change ranking, eligibility, readiness, or questions about proficiency. This exclusion does not authorize adding any language claim to the CV.
