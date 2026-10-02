---
name: jobsearch-documents
description: "Tailor JobSearch CVs and cover letters to a vacancy using candidate evidence, including external-LLM drafting and response review. Produce reviewable text or DOCX/PDF packets, explain changes, and verify facts and layout."
---

# JobSearch application documents

Create an accurate, vacancy-specific CV and motivation letter that the candidate can review and use. Adapt emphasis and expression while preserving the factual baseline.

## Current application boundary

`createPacket` in `src/domain.ts` is the manual fallback: it requires CV text and a nonempty full description for a vacancy not explicitly closed, copies the source CV, and creates a basic letter. The separate explicit AI action in `src/AiPanel.tsx` calls `jobsearch-api`; a successful tailored run can be saved as a new, unapproved packet with `llmRunId`/`llmRulesVersion`. `DocumentsPanel` supports manual editing, copied prompts, DOCX/TXT export, and browser print/PDF. No automatic application submission exists.

The app stores `profileVersion` and a hash in `descriptionVersion`, warns when current inputs differ, and uses a user's review action to set `approvedAt`. Text edits clear that approval. User-reported submission freezes existing packets for the vacancy. These features do not establish fact verification, rendered layout QA, a saved PDF, or which particular packet was actually sent.

Use this skill for evidence-based adaptation and verified file delivery. The private [manifest template](assets/packet-manifest-template.json) is richer than the app's `Packet`; do not import it directly as a workspace backup.

## External-LLM adaptation

Read [the integration workflow](../jobsearch-build/references/external-llm.md) for calls, response contracts, and persistence. Provider/model choice and live access remain unresolved until configured and tested. Prompts live in `supabase/functions/_shared/llm.ts`; change their `RULES_VERSION` when behavior changes. Server validation checks references, sizes and numeric claims, not full semantic entailment; human factual review remains necessary.

Supply the full job description, relevant supported facts, requested document language/template, and the versioned assessment when available. Request editable texts plus a separate claim-to-fact map, change summary, and material questions. Validate the returned claims against the baseline before using them. Never feed an unreviewed prior model draft back as authoritative candidate evidence.

Treat generated text as a draft. Keep provider/model/run metadata privately with the manifest, preserve user edits during long-running requests, and retain historical approved/submitted versions. Success from the LLM does not set user approval, prove visual QA, or establish submission.

## Establish readiness

Use the current candidate profile, complete vacancy description, any fit report, and the user's existing document/template preferences. Identify the intended role and employer. Treat a fit report as advice; verify its suggested claims against the underlying fact IDs.

A snippet permits an explicitly provisional draft, not a packet labelled ready for submission. Inspect actual source content even when the UI marks it `full`. Missing material job details or conflicts in facts used by the document must be resolved or omitted transparently. Missing unrelated preferences need not block writing.

Follow the requested output language or the established document language. Language is a presentation choice here, not a new proficiency assessment. Do not ask about language levels or manufacture fluency claims.

## Tailor the content

- Select relevant responsibilities and achievements from source-stated or user-confirmed facts. Retain the meaning of job titles, dates, qualifications, and metrics. Use faithful translations where needed.
- Adjust the profile summary, ordering, emphasis, and skill wording to match the role. Use vacancy terminology only when the candidate evidence supports it.
- Keep transferable skills honest: explain the connection without claiming the candidate already performed a different role or used an unverified tool.
- Write the letter around the role, a few concrete supported examples, and a credible reason for applying. Research employer-specific assertions when useful; otherwise omit invented praise, values, projects, and named contacts.
- Do not invent a recipient name or address. Do not add a photo, birth date, family status, legal status, or new personal disclosures unless relevant and explicitly requested.
- Keep dates and claims consistent across the CV and letter. Preserve supplied foreign education/assessment wording; do not silently upgrade credentials.

Return a short change summary: what was emphasized, reduced, or rephrased, and which questions remain. Keep factual traceability in a private evidence map outside the employer-facing documents. Do not insert internal fact IDs, fit scores, or uncertainty notes into a final CV or letter.

## Produce and check files

For text-only requests, deliver reusable text without forcing file generation. For file requests, use a stable editable template and the format requested by the user; offer both DOCX and PDF when that serves the application. Prefer simple selectable text, conventional headings, and predictable reading order; do not promise an ATS score or universal compatibility.

Use an available document/PDF skill for format-specific mechanics when it improves the result. This skill also works without those optional skills: follow [the rendering guide](references/rendering-guide.md), generate files with available tooling, render them, and inspect the pages. Preserve the user's supplied layout unless an adaptation is needed and explained.

Check clipping, overflow, blank pages, orphaned headings, page breaks, contact details, links, and consistent typography. Check extracted text for reading order and facts. Keep page length appropriate to the content and established preference; do not shrink text merely to meet an arbitrary page count.

If rendering cannot be verified, keep the editable source and label layout unverified. Successful file generation alone is not visual QA. Do not claim that a PDF exists or has been checked without actually creating and inspecting it.

## Package and hand off

Store the packet in ignored private storage. Use [the manifest template](assets/packet-manifest-template.json) when saving a packet so the vacancy/profile snapshot references, generation rules version, included files, evidence map, review state, and checks remain associated. Save revisions rather than overwriting an already submitted packet. A packet number/hash without retained inputs is not a reproducible evidence trail.

Keep `draft`, `ready_for_review`, and `approved_by_user` distinct. Set user approval only from an actual user action or statement. Preparing or approving documents does not by itself authorize sending an application. Report the files created, key adaptations, verification performed, and any material unresolved issue.

Do not retroactively label every frozen app packet as submitted. Record the actual packet/files and submission evidence when supplied. Approval, factual checks, visual checks, and submission evidence remain independent; a stale-input warning requires review of the affected content even if `approvedAt` is present.
