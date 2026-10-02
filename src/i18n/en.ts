import type { MessageKey } from "./uk";

export const en: Record<MessageKey, string> = {
  "app.tagline": "your next step",
  "app.description":
    "Your job-search space: vacancies, CV and applications in one place.",
  "language.label": "Interface language",
  "env.stage": "Test environment",

  "common.refresh": "Refresh",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.done": "Done",
  "common.edit": "Edit",
  "common.delete": "Delete",
  "common.restore": "Restore",
  "common.processing": "Processing…",
  "common.downloadCopy": "Download a copy",
  "common.email": "Email",

  "date.notSet": "Not specified",
  "date.never": "Not updated yet",

  "nav.discover": "Jobs",
  "nav.saved": "Saved",
  "nav.applications": "My applications",
  "nav.profile": "My profile",
  "nav.documents": "Documents",
  "nav.sources": "Sources",
  "nav.aria": "Main navigation",
  "menu.open": "Open menu",
  "menu.close": "Close menu",
  "modal.close": "Close window",
  "toast.close": "Close message",
  "notice.hide": "Hide message",

  "stage.saved": "Saved",
  "stage.reviewing": "Reviewing",
  "stage.prepared": "Documents ready",
  "stage.submitted": "Submitted",
  "stage.interview": "Interview",
  "stage.offer": "Offer",
  "stage.rejected": "Rejected",
  "stage.withdrawn": "Withdrawn",

  "page.eyebrow": "WORK THAT SUITS YOU",
  "page.discover.title": "Find your next step",
  "page.discover.description": "Opportunities where your next step begins.",
  "page.saved.description":
    "Interesting jobs stay close for when you are ready to act.",
  "page.applications.description":
    "Every application, next step and outcome in one place.",
  "page.profile.description":
    "Your experience is the basis of a convincing application.",
  "page.documents.description":
    "A separate document packet for every opportunity.",
  "page.sources.description":
    "Where the jobs come from and how to add more opportunities.",

  "brand.tagline": "YOUR NEXT STEP",
  "sidebar.mySpace": "MY SPACE",
  "sidebar.tip.title1": "Small steps.",
  "sidebar.tip.title2": "New opportunities.",
  "sidebar.tip.text1": "Save a job that interests you.",
  "sidebar.tip.text2": "The next step is yours.",
  "sidebar.tip.toSaved": "Go to saved",
  "sidebar.tip.addCv": "Add my CV",
  "breadcrumb.mySpace": "My space",
  "account.mine": "My account",
  "account.private": "Private space",
  "account.device": "On this device",
  "footer.tagline": "Your next step",
  "footer.privacy": "Built with your data in mind",

  "sync.connect": "Connect sync",
  "sync.signIn": "Sign in to sync",
  "sync.synced": "Everything is synced",
  "sync.conflict": "Different versions of changes",
  "sync.offline": "Changes on this device",
  "sync.syncing": "Syncing…",
  "sync.heading": "One space on all your devices",
  "sync.text":
    "Sign in with the same email on your computer and phone. Your profile, saved jobs, applications and documents are synced.",
  "sync.unconfigured.title": "Storage connection is being completed",
  "sync.unconfigured.text":
    "The site already works. For sync, the owner has to connect a free Supabase project. Until then, changes stay on this device.",
  "sync.ownerGuide": "Guide for the owner",
  "sync.state.synced": "All changes are synced",
  "sync.state.conflict": "You need to choose a version of the changes",
  "sync.state.offline": "Waiting for a connection",
  "sync.lastUpdate": "Last update: {time}",
  "sync.privacy":
    "Personal data is available only to your account. The public site does not contain your CV.",

  "conflict.title": "There are new changes on another device",
  "conflict.text":
    "We will save a backup before you choose. Which version should stay in the shared space?",
  "conflict.remote": "From the other device",
  "conflict.local": "From this device",

  "hero.pill": "YOUR SEARCH STARTS HERE",
  "hero.title1": "Less chaos.",
  "hero.title2": "More opportunities.",
  "hero.text1": "Jobs, your experience and next steps —",
  "hero.text2": "together in one convenient space.",
  "hero.refine": "Refine my search",
  "hero.configure": "Set up my search",

  "stats.aria": "Search overview",
  "stats.feed.label": "In the Job Bank feed",
  "stats.feed.detail": "Latest available sample",
  "stats.saved.label": "Saved by you",
  "stats.saved.detail": "Opportunities that caught your interest",
  "stats.active.label": "Active applications",
  "stats.active.detail": "According to your marks",
  "stats.packets.label": "Document packets",
  "stats.packets.detail": "CVs and cover letters",

  "jobs.savedTitle": "Saved opportunities",
  "jobs.loading": "Loading jobs…",
  "jobs.showMore": "Show more ({count})",
  "search.aria": "Search jobs",
  "search.placeholder": "Job title, company or city…",
  "search.clear": "Clear search",
  "filter.sourceAria": "Job source",
  "filter.allSources": "All sources",
  "filter.myConditions": "My conditions",
  "results.conditions": "My conditions: {conditions}",
  "results.fromHourly": "from ${amount}/h",
  "results.noLimits": "no limits",
  "results.all":
    "All fields are shown. Specify the city and job titles in settings.",
  "sort.aria": "Sort jobs",
  "sort.newest": "Newest first",
  "sort.skills": "By skill matches",

  "feed.loadError":
    "Could not load the feed. Saved jobs are available; try refreshing later.",
  "feed.unavailable":
    "The Job Bank update is temporarily unavailable. Saved jobs stay in your space.",
  "feed.copyFrom": "Showing the copy from {time}.",
  "feed.source": "Source:",
  "feed.footnote":
    "Updated {time}. The feed contains a limited sample of postings, not the whole market. Check the original for current status.",

  "empty.saved.title": "Save what interests you",
  "empty.saved.text":
    "Click the bookmark on a job and it will stay here, even after the feed is updated.",
  "empty.matches.title": "No matches yet",
  "empty.matches.text":
    "This is a limited sample of recent postings. Change the filters, open a search in the sources or add a job manually.",
  "empty.viewJobs": "Browse jobs",
  "empty.openSources": "Open sources",

  "job.add": "Add a job",
  "job.untitled": "Untitled",
  "job.noEmployer": "Employer not specified",
  "job.published": "Published {date}",
  "job.found": "Found {date}",
  "job.savedAria": "Saved job {title}",
  "job.saveAria": "Save {title}",
  "job.noLocation": "Location not specified",
  "job.noSalary": "Pay not specified",
  "job.full": "Full description",
  "job.snippet": "Short description",
  "job.skillMatches": "Skill matches: {count}",
  "job.closed": "Closed",
  "job.canPrepare": "Documents can be prepared",
  "job.checkOriginal": "Check the requirements in the original",
  "job.view": "View",
  "source.manual": "Added manually",
  "source.rss": "RSS import",

  "details.original": "Original posting",
  "details.description": "Job description",
  "details.cancelEdit": "Cancel editing",
  "details.addFull": "Add the full description",
  "details.snippetNotice":
    "The feed has only brief data. Open the original and add the full description with requirements to prepare documents.",
  "details.fullText": "Full text of the posting",
  "details.fullCheckbox": "The text contains the full description and requirements",
  "details.saveDescription": "Save description",
  "details.noDescription": "No description added yet.",
  "details.matches": "Matches with your profile",
  "details.matchesNote":
    "Exact text matches of your confirmed skills. They do not verify proficiency or every requirement of the job.",
  "details.noMatches":
    "No exact text matches yet. This does not mean your experience is unsuitable.",
  "details.addSkills":
    "Add confirmed skills to your profile to see text matches.",
  "details.myStatus": "Status of my application",
  "details.notSaved": "Not saved yet",
  "details.notes": "My notes",
  "details.notesPlaceholder": "A question, contact or next step…",
  "details.submittedNote":
    "By marking “Submitted” you confirm that you sent the application yourself.",
  "details.bookmark": "Save",
  "details.prepare": "Prepare documents",

  "pipeline.inList": "In your list",
  "pipeline.interviews": "Interviews",
  "pipeline.offers": "Offers",
  "applications.empty.title": "Your search has its own route",
  "applications.empty.text":
    "Save a job, prepare documents and track the next steps. You mark submitted applications yourself.",
  "applications.find": "Find a job",
  "applications.statusAria": "Application status for {title}",
  "applications.note":
    "Opening a posting and preparing documents do not send an application to the employer.",
  "table.job": "Job",
  "table.status": "Status",
  "table.updated": "Updated",

  "sources.intro.title": "More paths to your job",
  "sources.intro.text":
    "Use the Job Bank feed or save jobs from other sites into one shared list.",
  "sources.jobbank.subtitle": "Government of Canada job portal",
  "sources.jobbank.description":
    "Postings in the latest sample: {count}. Updated {time}. The full description opens on the employer’s site or Job Bank.",
  "sources.status.unavailable": "Update unavailable",
  "sources.status.stale": "Previous copy",
  "sources.status.ok": "Feed is working",
  "sources.status.checking": "Checking the feed",
  "sources.external": "External search",
  "sources.indeed.subtitle": "Search and email alerts",
  "sources.indeed.description":
    "Find a job or set up alerts on Indeed. Add the link and text here, and your profile and documents stay in one place.",
  "sources.jobillico.subtitle": "Jobs and employers in Canada",
  "sources.jobillico.description":
    "Browse Jobillico postings and email alerts. Interesting offers can be added manually together with the full description.",
  "sources.openSearch": "Open search",
  "sources.info":
    "Indeed and Jobillico currently open a search on their own sites. There is no automatic sign-in to their accounts, mail reading or scraping here.",
  "import.title": "Do you have a job feed?",
  "import.text":
    "Import a downloaded RSS/Atom file. The jobs will appear in your space; importing again does not create duplicates.",
  "import.button": "Import XML",

  "toast.aiDraftSaved":
    "The new AI draft is saved. Check the facts, currency and layout.",
  "toast.jobSaved": "The job is saved in your space",
  "toast.bookmarkRemoved": "Removed from saved",
  "toast.bookmarkAdded": "Added to saved",
  "toast.markedSubmitted":
    "Marked as submitted by you. The site did not send the application.",
  "toast.stageUpdated": "Status updated",
  "toast.addCvFirst": "First add your CV to the profile",
  "toast.addFullDescription":
    "Add the full job description before preparing documents",
  "toast.packetDraftCreated":
    "A draft packet is created. Adapt the text and check the facts.",
  "toast.profileSaved": "Profile saved",
  "toast.imported": "Jobs imported: {count}",
  "toast.importedPartly":
    "Jobs imported: {count}. Skipped: {skipped} — your space holds up to {max} jobs, and entries with oversized fields are not imported.",
  "toast.settingsSaved": "Settings saved",
  "toast.restored":
    "The copy is restored. The previous version was downloaded separately.",
  "toast.cvImported": "The CV text is read. Check it and save the profile.",
  "toast.docx": "DOCX downloaded. Check the final layout before sending.",
  "toast.docxFailed": "Could not create the DOCX. Try the text file.",
  "toast.promptCopied":
    "The prompt is copied. Check which data you send to the AI service you choose.",
  "toast.promptDownloaded": "The prompt is downloaded as a file.",
  "toast.packetApproved":
    "The packet is marked as reviewed by you. The application has not been sent yet.",
  "toast.recoveryAccepted":
    "The mail service accepted the recovery email request.",
  "toast.accountDeleted": "The account and its cloud data are deleted.",
  "toast.llmSaved": "LLM settings saved.",

  "settings.title": "Settings",
  "settings.subtitle": "Search and your personal space",
  "settings.tabsAria": "Settings sections",
  "settings.tab.search": "Search",
  "settings.tab.sync": "Sync",
  "settings.tab.data": "My data",
  "settings.search.info":
    "Tune the search to your needs. Empty fields do not limit the results.",
  "settings.city.label": "City or region",
  "settings.city.hint":
    "For example: Montréal, Laval or QC. The filter checks the place name in the posting.",
  "settings.city.placeholder": "Where do you want to work?",
  "settings.roles.label": "Job titles",
  "settings.roles.hint":
    "Comma-separated. Use title variants the way employers write them.",
  "settings.roles.placeholder":
    "For example: comptable, administrative assistant",
  "settings.minHourly.label": "Minimum pay, CAD / hour",
  "settings.minHourly.hint": "Jobs without an hourly amount stay in the list.",
  "settings.minHourly.placeholder": "No limit",
  "settings.documentLanguage": "Language of new documents",
  "settings.apply": "Apply these conditions to the job list",
  "settings.languageNote":
    "The language of a job and language proficiency do not affect the selection.",
  "settings.footer": "Your private space",

  "auth.checkEmail":
    "Check your mail and confirm the address. After confirming, sign in here.",
  "auth.signedIn": "Signed in. Loading your space.",
  "auth.failed": "Could not sign in.",
  "auth.signOutFailed": "Could not sign out. Try again.",
  "auth.signedOut": "You signed out of the account",
  "auth.signOut": "Sign out",
  "auth.password": "Password",
  "auth.passwordNew": "At least 10 characters",
  "auth.passwordCurrent": "Your password",
  "auth.create": "Create account",
  "auth.signIn": "Sign in",
  "auth.haveAccount": "Already have an account? Sign in",
  "auth.first": "First time? Create an account",
  "auth.note":
    "After signing in, your cloud copy opens. A new account keeps the current local space.",

  "data.title": "Backup",
  "data.text":
    "Save your profile, settings, jobs and documents as one file. The copy contains personal data, so keep it in a safe place.",
  "data.download.detail": "All data of the current space",
  "data.restore": "Restore from a file",
  "data.restore.detail": "JobSearch backup, a file up to 10 MB",
  "data.restoreConfirm.title": "Restore this copy?",
  "data.restoreConfirm.text":
    "Jobs: {jobs}. Applications: {applications}. Documents: {packets}. The current data will be replaced and, after sign-in, synced.",
  "data.info":
    "Without signing in, the data is available only in this browser. Clearing browser data deletes the local copy.",

  "profile.title": "Your professional profile",
  "profile.subtitle": "The facts your documents will rely on.",
  "profile.version": "Version {version}",
  "profile.name.label": "First and last name",
  "profile.name.placeholder": "How to introduce you to an employer",
  "profile.headline.label": "Professional headline",
  "profile.headline.placeholder": "Your speciality or field",
  "profile.phone": "Phone",
  "profile.summary.label": "Your experience in brief",
  "profile.summary.placeholder":
    "A few sentences about your experience, strengths and results.",
  "profile.skills.label": "Confirmed skills",
  "profile.skills.hint":
    "Comma-separated. We highlight exact text matches with a job; this is a hint, not an estimate of your chances.",
  "profile.cv.title": "Your CV",
  "profile.cv.import": "Import DOCX / TXT",
  "profile.cv.label": "CV text",
  "profile.cv.hint":
    "The file is processed in the browser. The extracted text is stored, without the original formatting.",
  "profile.cv.placeholder": "Paste the full CV text or import a document…",
  "profile.saveNote": "Changes take effect after saving.",
  "profile.save": "Save profile",
  "guide.title": "Your experience stays yours",
  "guide.text":
    "We adapt the emphasis to the job. Positions, dates, education and achievements stay exactly as you confirmed them.",
  "guide.step1": "One current profile",
  "guide.step2": "Separate documents for every application",
  "guide.step3": "Review before sending",
  "guide.tip":
    "Add specific results from your experience. It helps to prepare a convincing application.",

  "jobForm.subtitle": "Save a posting from any site",
  "jobForm.title.label": "Job title *",
  "jobForm.title.placeholder": "Title from the posting",
  "jobForm.employer.label": "Employer *",
  "jobForm.employer.placeholder": "Company name",
  "jobForm.location.label": "City / region",
  "jobForm.location.placeholder": "For example: Laval, QC",
  "jobForm.url.label": "Link to the original",
  "jobForm.salary.label": "Pay, as in the posting",
  "jobForm.salary.placeholder": "For example: $25–30 hourly",
  "jobForm.description.placeholder":
    "Duties, requirements and working conditions…",
  "jobForm.full": "I added the full description, including the requirements",

  "docs.empty.title": "Every job gets its own application",
  "docs.empty.text":
    "Add your CV to the profile, open a job with a full description and click “Prepare documents”.",
  "docs.empty.button": "Go to jobs",
  "docs.myPackets": "My packets",
  "docs.verifiedByYou": "Reviewed by you",
  "docs.draft": "Draft",
  "docs.verified": "Reviewed",
  "docs.frozen":
    "A snapshot of the documents at the moment they were marked “Submitted” ({time}). The text is protected from changes. For a new version, open the job and prepare a new packet.",
  "docs.outdated":
    "The profile or the job changed after this packet was created. Check the documents or create a new version.",
  "docs.info.llm":
    "This packet was adapted by an external LLM. Check every statement, dates, qualifications and the final layout. The sources and request history are available in the job.",
  "docs.info.base":
    "The packet starts from your original CV and a basic letter. In the job you can run “Adapt CV and letter” through the configured LLM or copy a prompt for your own assistant.",
  "docs.tab.letter": "Cover letter",
  "docs.aiPrompt": "AI prompt",
  "docs.cvAria": "Text of the adapted CV",
  "docs.letterAria": "Text of the cover letter",
  "docs.exporting": "Preparing…",
  "docs.print": "Print / PDF",
  "docs.approve": "I have reviewed it",
  "docs.note":
    "The text is saved while you edit. The DOCX has simple formatting; check the final layout in Word or before printing. The “reviewed” mark does not mean the application was submitted.",

  "recovery.title": "New password",
  "recovery.subtitle": "Restoring access to JobSearch",
  "recovery.repeat": "Repeat the password",
  "recovery.mismatch": "The passwords do not match.",
  "recovery.updated": "Password updated. You can continue working.",
  "recovery.failed":
    "Could not update the password. Check the password requirements or get a new recovery email.",
  "recovery.save": "Save new password",

  "ai.title": "AI assessment and adaptation",
  "ai.signIn": "Sign in to keep AI results and use the monthly limit.",
  "ai.unconfigured": "An administrator has to configure the external LLM.",
  "ai.note":
    "The button sends the profile and job text to the configured LLM. The facts and finished documents must be checked.",
  "ai.match": "Assess the fit",
  "ai.tailor": "Adapt CV and letter",
  "ai.refreshHistory": "Refresh AI history",
  "ai.refreshService": "Refresh AI service",
  "ai.busy":
    "The LLM is processing the request. The result will be saved in your history.",
  "ai.usage": "This month: {used} tokens · reserve {reserved} · limit {limit}",
  "ai.unlimited": "unlimited",
  "ai.noScore": "Not enough evidence",
  "ai.score": "{score}% fit",
  "ai.stale.match":
    "The profile, job or preferences changed. This is an assessment of the previous version.",
  "ai.provisional": "A preliminary assessment based on the short description.",
  "ai.coverage":
    "Evidence coverage: {coverage}%. The score counts known criteria: supported = 100%, transferable experience = 60%, contradiction = 0%; required items have double weight. Unknown data and languages are excluded from the percentage. This is not a hiring forecast.",
  "ai.showSources": "Show sources",
  "ai.questions": "Questions to clarify",
  "ai.draft.title": "Adapted documents — draft",
  "ai.stale.draft":
    "The input data changed. This draft uses the saved profile version {version}; check that it is still current.",
  "ai.needsCheck": "Needs checking",
  "ai.viewTexts": "View texts and sources",
  "ai.saveAsPacket": "Save as a new packet",
  "ai.history": "Request history ({count})",
  "ai.history.match": "Assessment",
  "ai.history.tailor": "Documents",
  "ai.history.done": "Completed",
  "ai.history.pending": "Processing",
  "ai.history.tokens": "{tokens} tokens",
  "ai.history.estimated": "(estimated from the reserve)",
  "ai.status.supported": "Supported by a source",
  "ai.status.transferable": "Transferable experience",
  "ai.status.unknown": "Unknown",
  "ai.status.contradicted": "Confirmed mismatch",
  "ai.status.excluded": "Not assessed",
  "ai.decision.prioritize": "Worth prioritizing",
  "ai.decision.consider": "Worth considering",
  "ai.decision.needs_information": "Needs clarification",
  "ai.decision.deprioritize": "Significant mismatches",

  "admin.title": "Administration",
  "admin.subtitle": "Users, external LLM and mail",
  "admin.tab.users": "Users",
  "admin.tab.llm": "External LLM",
  "admin.tab.smtp": "Mail",
  "admin.users.title": "Registered accounts",
  "admin.users.empty": "There are no users in this list.",
  "admin.role.admin": "Administrator",
  "admin.role.user": "User",
  "admin.registered": "Registered: {date}",
  "admin.confirmed": "Email confirmed",
  "admin.unconfirmed": "Email not confirmed",
  "admin.lastSignIn": "Last sign-in: {date}",
  "admin.recoveryEmail": "Recovery email",
  "admin.prev": "Previous",
  "admin.next": "Next",
  "admin.page": "Page {page}",
  "admin.delete.aria": "Deletion confirmation",
  "admin.delete.title": "Delete {email}?",
  "admin.delete.text":
    "The account, its cloud space and AI history will be deleted permanently. Local copies on devices may remain.",
  "admin.delete.confirmLabel": "Type the email to confirm",
  "admin.delete.button": "Delete the account permanently",
  "admin.llm.baseUrl.hint":
    "Base HTTPS address, for example https://api.openai.com/v1",
  "admin.llm.key.hintSaved":
    "The key is stored on the server. Leave empty to keep it.",
  "admin.llm.key.hintNew":
    "The key is stored on the server and is never returned to the browser.",
  "admin.llm.key.placeholderSaved": "The stored key is not displayed",
  "admin.llm.key.placeholderNew": "Enter the API Key",
  "admin.llm.model.placeholder": "Your provider’s model identifier",
  "admin.llm.effort.hint":
    "Available levels depend on the model. Default does not send this parameter.",
  "admin.llm.effort.default": "Default (model default)",
  "admin.llm.budget.hint":
    "Per user per UTC calendar month. Input + output tokens, including reasoning. 0 = unlimited.",
  "admin.llm.note":
    "Before a call, a conservative input estimate and the maximum response are reserved. After completion the provider’s usage is counted; if the outcome is unknown, the reserve is charged. The provider must support JSON Schema for the chosen model and format.",
  "admin.llm.save": "Save LLM",

  "smtp.title": "Mail for sign-up and recovery",
  "smtp.note":
    "The settings are applied to Supabase Auth. Saving does not send a test email. Fill in these fields once you have chosen a mail provider.",
  "smtp.token.hint":
    "Needed to apply the settings to this project. This is a Supabase management token, not an SMTP password or a public key.",
  "smtp.token.note":
    "The token is used only for this operation, is not stored in the database or browser storage and is cleared after applying. Limit its access to this project and to reading/changing the Auth config.",
  "smtp.token.link": "Open Supabase tokens",
  "smtp.load": "Load current settings",
  "smtp.loaded.custom": "Custom SMTP settings are loaded.",
  "smtp.loaded.none": "Custom SMTP is not set yet.",
  "smtp.notLoaded": "The current Supabase parameters are not loaded yet.",
  "smtp.port.hint": "Usually 587 or 465; use your provider’s port.",
  "smtp.password.hintSaved":
    "The password is already stored in Supabase. An empty field keeps it; changing the host or login requires a new password.",
  "smtp.password.hintNew":
    "The password will be stored in the Supabase mail settings and will not be returned to the interface.",
  "smtp.senderEmail": "Sender email",
  "smtp.senderName": "Sender name",
  "smtp.apply": "Apply SMTP",
  "smtp.applied":
    "SMTP is applied in Supabase. Email delivery has to be checked separately.",

  "workspace.saveFailed":
    "The browser could not save the changes. Make a backup in settings.",
  "workspace.syncUnavailable":
    "Sync is unavailable. Local changes are saved; we will try again.",
  "workspace.tooLarge":
    "The cloud did not accept the changes: your space exceeds 5 MB. The changes stay on this device. Save a backup in settings and shorten the texts of documents or jobs.",
  "workspace.localCorrupted":
    "The local copy is damaged. It was not overwritten. Restore a backup through settings.",
  "workspace.cloudOpenFailed":
    "Could not open the cloud copy. Changes stay on the device.",
  "workspace.readFailed":
    "The saved space could not be read. The original copy is kept for recovery; sync is paused.",
  "workspace.backupFailed": "Could not create a copy. Export the data first.",
  "workspace.changeRejected": "The change was not saved. {reason}",
  "workspace.limit.jobs": "Too many jobs: your space holds up to {max}.",
  "workspace.limit.applications":
    "Too many saved jobs and applications: your space holds up to {max}.",
  "workspace.limit.packets":
    "Too many document packets: your space holds up to {max}.",
  "workspace.limit.size":
    "Your space is too large: all data together must fit within 5 MB.",

  "error.format": "Invalid data format.",
  "error.textField": "An invalid or oversized text field.",
  "error.date": "Invalid date.",
  "error.jobId": "Invalid job identifier.",
  "error.jobState": "Invalid job state.",
  "error.urlScheme": "The link must start with https:// or http://.",
  "error.feedRead": "Could not read the job update.",
  "error.fileTooLarge": "The file is too large. The maximum is 10 MB.",
  "error.backupVersion": "This backup version is not supported.",
  "error.profileVersion": "Invalid profile version.",
  "error.salaryAmount": "Invalid pay amount.",
  "error.settings": "Invalid settings.",
  "error.lists": "Invalid list of jobs or documents.",
  "error.applicationState": "Invalid application state.",
  "error.packetVersion": "Invalid packet version.",
  "error.packetRequirements": "Add a CV and the full job description.",
  "error.jobClosed": "This job is closed.",
  "error.xml": "An invalid or oversized XML file.",
  "error.rss": "Could not read the RSS/Atom file.",
  "error.feedEmpty": "The feed contains no jobs.",
  "error.maxSize": "The maximum size is 5 MB.",
  "error.cvMaxSize": "The maximum CV size is 5 MB.",
  "error.cvType":
    "Choose a DOCX or TXT file. Text from a PDF can be pasted into the CV field.",
  "error.cvTooLong": "Too much text for one CV.",
  "error.cvEmpty": "No text was found in the file.",
  "error.url": "Check the link: http:// or https:// is required.",
  "error.titleEmployer": "Enter the job title and the employer.",
  "error.fullText": "Add the full text of the job.",
  "error.workspaceVersion": "Invalid space version.",
  "error.workspaceRead": "Could not read the saved space.",
  "error.cloudChanged":
    "The cloud copy was changed. Save a backup before signing in again.",
  "error.cloudNotConnected": "Cloud storage is not connected yet.",
  "error.unexpectedStorage": "Unexpected response from storage.",

  "service.notConnected": "Sync is not connected.",
  "service.default":
    "The service is temporarily unavailable. Saved data stays in your space.",
  "service.smtp_management_required":
    "Enter the Supabase Management Token to apply SMTP.",
  "service.smtp_management_failed":
    "Could not read the mail settings. Check the token’s access to this project.",
  "service.smtp_update_failed":
    "Supabase rejected the mail settings. Check the parameters and the token’s permissions.",
  "service.smtp_update_uncertain":
    "The result of applying is unknown. Load the current settings first and check them before retrying.",
  "service.smtp_password_required":
    "Enter the SMTP password. A new server or login requires a new password.",
  "service.invalid_smtp_host":
    "Enter the SMTP server domain without a protocol or port number.",
  "service.invalid_smtp_port": "The port number must be between 1 and 65535.",
  "service.authentication_required": "Sign in to a confirmed account.",
  "service.admin_required": "This action is available to administrators only.",
  "service.llm_unconfigured":
    "An administrator has not configured the LLM yet.",
  "service.budget_exceeded":
    "Not enough monthly limit for this request. The limit includes a reserve for the response.",
  "service.request_in_progress":
    "Another request of yours is still processing. Refresh the history a little later.",
  "service.config_conflict":
    "The settings have already changed. Refresh them before saving.",
  "service.action_rate_limited":
    "This action was performed just now. Try again in a minute.",
  "service.admin_delete_protected":
    "Deleting an administrator through this panel is not allowed.",
  "service.recovery_email_failed":
    "Could not send the email. Check SMTP and the Supabase mail limits.",
  "service.delete_failed": "Could not delete the account.",
  "service.invalid_base_url":
    "Enter a public HTTPS API Base URL without parameters, credentials or a non-standard port.",
  "service.base_url_not_endpoint":
    "Enter the base API address, for example https://api.openai.com/v1, without /responses or /chat/completions.",
  "service.new_host_needs_key":
    "A different API host requires entering its API Key.",
  "service.provider_address_blocked":
    "The API host has no allowed public address.",
  "service.provider_rate_limited":
    "The provider limited the request rate. Try again later.",
  "service.provider_auth_failed":
    "The provider rejected the API Key. Contact the administrator.",
  "service.provider_parameters_rejected":
    "The provider rejected the parameters. Check the model, API Format, Reasoning Effort and JSON Schema support.",
  "service.provider_incomplete":
    "The provider did not complete the response. No packet was created.",
  "service.provider_refused": "The provider refused to process the request.",
  "service.provider_interrupted":
    "The connection to the provider was interrupted. The request is not retried automatically; possible token usage is recorded.",
  "service.interrupted":
    "The request was interrupted. Possible usage is counted from the reserve; there is no automatic retry.",
  "service.invalid_output":
    "The LLM response has an invalid format. The draft was not accepted.",
  "service.unsupported_evidence":
    "The LLM returned statements without correct references to facts. The draft was not accepted.",
  "service.unsupported_job_quote":
    "The LLM referred to text that is not in the job posting.",
  "service.letter_too_long":
    "The LLM exceeded the 250-word limit for the letter.",
  "service.full_open_job_required":
    "Adaptation requires an open job with a full description.",
  "service.profile_required": "First add your CV to the profile.",
  "service.input_too_large":
    "Too much text for one request. Shorten irrelevant parts of the CV or description.",
};
