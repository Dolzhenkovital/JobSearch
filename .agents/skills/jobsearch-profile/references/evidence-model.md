# Candidate evidence model

Use the adjacent empty profile template for structure. It is intentionally incomplete and must not be treated as a candidate record. Store a populated copy in private storage.

## Source entries

Each source has `source_id`, a kind such as `cv`, `certificate`, or `user_statement`, a private reference, and the date it was supplied or confirmed. Record version/hash where useful. A page, section, paragraph, or dated user message can be its locator. The public repository holds only synthetic examples and blank templates.

## Fact entries

Each fact has:

- `fact_id`: stable identity, retained when the same fact is clarified.
- `category`: for example employment, achievement, responsibility, skill, or education.
- `statement`: the supported claim, without embellishment.
- `source_refs`: source IDs plus locators supporting the claim.
- `status`: `source_stated`, `user_confirmed`, `unverified`, or `conflicted`.
- `details`: structured values only where useful, such as employer, original title, dates, metric, unit, or qualification wording.
- `supersedes`: prior version/fact reference when a correction affects history.

`source_stated` means present in a supplied source, not independently verified by an employer. `user_confirmed` records an actual user confirmation. `unverified` and `conflicted` facts cannot support final application claims until resolved; matching may use them only as questions.

Do not convert absence into contradiction. Do not treat an AI-generated draft, a job requirement, or a search result about a similarly named person as candidate evidence.

## Corrections and derived wording

Keep semantic aliases and faithful translations traceable to the original fact. A derived summary can cite multiple fact IDs but must not increase claimed scope. Store tailored versions separately from the baseline profile. A vacancy may change which facts are prominent; it must not rewrite the factual history.

Record preference origins too. A suggested role family becomes an accepted preference only when the user selects it. Empty locations or target roles remain unset; an ingestion smoke-test location must never populate the candidate profile automatically.
