# Rendering and document verification

Use this guide only for file delivery. Text-only drafts do not require document tooling.

## Choose available tooling

If available, use the document skill's render/export workflow. Otherwise create the requested editable document with installed tooling, export a PDF when requested or useful for QA, and rasterize pages with an available renderer. Avoid installing a full office suite merely to run a check without first inspecting the available environment.

On Windows, an existing Microsoft Word installation can provide a COM export fallback when LibreOffice is unavailable. Use a separate hidden Word automation instance, open the generated document, export to PDF, close only the document and instance created for this task, and release them in cleanup even after failure. Do not terminate the user's Word processes or close their documents.

An available Poppler `pdftoppm` or Python PDF renderer can turn the exported PDF into page images. Keep intermediary files in private work storage.

## Check the artifact

- Inspect every rendered page at a readable scale. Check clipping, blank pages, awkward page breaks, orphaned headings, bullets, accents, typography, contact details, and URLs.
- Extract text to check names, dates, employer, intended role, duplicated/lost content, and reading order.
- Check the CV and letter together for consistent facts and correct target employer. Do not carry a previous employer's name into a reused letter template.
- Compare claims with the candidate evidence map. Document style improvements cannot introduce new achievements or qualifications.
- After a layout correction, render the affected final files again before reporting QA complete.

Record content and layout outcomes separately. If export or image inspection is unavailable, deliver the editable source when useful and disclose exactly which check remains unverified. Do not mark the packet visually verified based on file existence, page-count metadata, or extracted text alone.
