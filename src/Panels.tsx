import { useRef, useState, type ChangeEvent } from "react";
import {
  ArrowRight,
  Check,
  CheckCheck,
  Cloud,
  Download,
  FileText,
  FolderSync,
  HardDrive,
  KeyRound,
  LoaderCircle,
  LogOut,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Upload,
} from "lucide-react";
import { cloud } from "./cloud";
import {
  aiPrompt,
  contentVersion,
  createPacket,
  DOCUMENT_LANGUAGES,
  MANUAL_SOURCE,
  MAX_IMPORT_BYTES,
  parseBackup,
  safeUrl,
} from "./domain";
import { useI18n } from "./i18n";
import { download, Empty, ExternalLink, Field, formatTime, Modal } from "./ui";
import type { useWorkspace } from "./useWorkspace";
import type { Job, Packet, Profile, Settings, Store } from "./types";

type Workspace = ReturnType<typeof useWorkspace>;
type Notify = (message: string) => void;
// Language names stay in their own language so they are recognizable in any interface.
const DOCUMENT_LANGUAGE_NAMES: Record<Settings["documentLanguage"], string> = {
  fr: "Français",
  en: "English",
  de: "Deutsch",
  uk: "Українська",
};
const SETTINGS_TABS = [
  { id: "search", title: "settings.tab.search", icon: SlidersHorizontal },
  { id: "sync", title: "settings.tab.sync", icon: Cloud },
  { id: "data", title: "settings.tab.data", icon: HardDrive },
] as const;
export function SettingsPanel({
  workspace,
  onClose,
  notify,
  initialTab = "search",
}: {
  workspace: Workspace;
  onClose: () => void;
  notify: Notify;
  initialTab?: string;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState(initialTab);
  const accountId = workspace.user?.id || null;
  const [draft, setDraft] = useState<{
    owner: string | null;
    changes: Partial<Settings>;
  }>({ owner: accountId, changes: {} });
  // Keep only edited fields so an open form follows incoming cloud changes.
  // Reset drafts on account changes before rendering another user's settings.
  if (draft.owner !== accountId)
    setDraft({ owner: accountId, changes: {} });
  const changes = draft.owner === accountId ? draft.changes : {};
  const settings = { ...workspace.store.settings, ...changes };
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false),
    [authMessage, setAuthMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const [restore, setRestore] = useState<Store | null>(null);
  const [rejected, setRejected] = useState("");
  // The dialog covers the toast, so a rejected change is also shown inside it.
  const reject = (error: unknown) => {
    setRejected((error as Error).message);
    notify((error as Error).message);
  };
  // The open sign-out confirmation: whether to delete this browser's copy, and
  // whether deleting changes the cloud has not received was explicitly confirmed.
  const [signOutChoice, setLeaving] = useState<{
    owner: string;
    remove: boolean;
    discard: boolean;
    unsynced: boolean;
  } | null>(null);
  // One account's choices never confirm deleting another account's data.
  const leaving = signOutChoice?.owner === accountId ? signOutChoice : null;
  const unsynced = workspace.unsynced || !!leaving?.unsynced;
  const field = (key: keyof Settings, value: string | boolean) =>
    setDraft((previous) => ({
      owner: accountId,
      changes: {
        ...(previous.owner === accountId ? previous.changes : {}),
        [key]: value,
      },
    }));
  async function login(event: React.FormEvent) {
    event.preventDefault();
    if (!cloud) return;
    setBusy(true);
    setAuthMessage("");
    try {
      const { error, data } = register
        ? await cloud.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${location.origin}${import.meta.env.BASE_URL}`,
            },
          })
        : await cloud.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setPassword("");
      if (register && !data.session)
        setAuthMessage(t("auth.checkEmail"));
      else notify(t("auth.signedIn"));
    } catch (error) {
      setAuthMessage((error as Error).message || t("auth.failed"));
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    if (!leaving) return;
    setBusy(true);
    try {
      const result = await workspace.signOut(leaving.remove, leaving.discard);
      if (result === "unsynced") {
        // The stored copy changed after this form was rendered: ask before deleting it.
        setLeaving({ ...leaving, discard: false, unsynced: true });
        return;
      }
      if (result !== "failed") setLeaving(null);
      notify(
        t(
          result === "failed"
            ? "auth.signOutFailed"
            : result === "removed"
              ? "auth.signedOutRemoved"
              : result === "kept"
                ? "auth.signedOutKept"
                : "auth.signedOut",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error(t("error.maxSize"));
      setRestore(parseBackup(await file.text()));
    } catch (error) {
      notify((error as Error).message);
    }
  }
  return (
    <Modal
      title={t("settings.title")}
      subtitle={t("settings.subtitle")}
      onClose={onClose}
      alert={rejected}
    >
      <div
        className="modal-tabs"
        role="tablist"
        aria-label={t("settings.tabsAria")}
      >
        {SETTINGS_TABS.map(({ id, title, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            <Icon size={17} />
            <span>{t(title)}</span>
          </button>
        ))}
      </div>
      <div className="modal-body">
        {tab === "search" && (
          <form
            id="settings-form"
            onSubmit={(event) => {
              event.preventDefault();
              try {
                workspace.update((s) => ({
                  ...s,
                  settings: { ...s.settings, ...changes },
                }));
              } catch (error) {
                reject(error);
                return;
              }
              notify(t("toast.settingsSaved"));
              onClose();
            }}
          >
            <div className="info-box">
              <SlidersHorizontal size={20} />
              <p>{t("settings.search.info")}</p>
            </div>
            <Field
              label={t("settings.city.label")}
              hint={t("settings.city.hint")}
            >
              <input
                value={settings.city}
                onChange={(event) => field("city", event.target.value)}
                placeholder={t("settings.city.placeholder")}
                maxLength={120}
              />
            </Field>
            <Field
              label={t("settings.roles.label")}
              hint={t("settings.roles.hint")}
            >
              <textarea
                rows={3}
                value={settings.roles}
                onChange={(event) => field("roles", event.target.value)}
                placeholder={t("settings.roles.placeholder")}
                maxLength={1000}
              />
            </Field>
            <div className="form-grid">
              <Field
                label={t("settings.minHourly.label")}
                hint={t("settings.minHourly.hint")}
              >
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={settings.minHourly}
                  onChange={(event) => field("minHourly", event.target.value)}
                  placeholder={t("settings.minHourly.placeholder")}
                />
              </Field>
              <Field label={t("settings.documentLanguage")}>
                <select
                  value={settings.documentLanguage}
                  onChange={(event) =>
                    field("documentLanguage", event.target.value)
                  }
                >
                  {DOCUMENT_LANGUAGES.map((code) => (
                    <option key={code} value={code}>
                      {DOCUMENT_LANGUAGE_NAMES[code]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={settings.applyPreferences}
                onChange={(event) =>
                  field("applyPreferences", event.target.checked)
                }
              />
              <span>{t("settings.apply")}</span>
            </label>
            <p className="form-note">{t("settings.languageNote")}</p>
          </form>
        )}
        {tab === "sync" && (
          <>
            <div className="sync-heading">
              <span className="round-icon">
                <FolderSync size={26} />
              </span>
              <h3>{t("sync.heading")}</h3>
              <p>{t("sync.text")}</p>
            </div>
            {!workspace.configured ? (
              <div className="notice">
                <strong>{t("sync.unconfigured.title")}</strong>
                <p>{t("sync.unconfigured.text")}</p>
                <ExternalLink href="https://github.com/Dolzhenkovital/JobSearch/blob/main/docs/deployment.md">
                  {t("sync.ownerGuide")}
                </ExternalLink>
              </div>
            ) : workspace.user ? (
              <div className="account-card">
                <div className="account-line">
                  <ShieldCheck size={23} />
                  <div>
                    <strong>{workspace.user.email}</strong>
                    <p>
                      {t(
                        workspace.status === "synced"
                          ? "sync.state.synced"
                          : workspace.status === "conflict"
                            ? "sync.state.conflict"
                            : workspace.status === "offline"
                              ? "sync.state.offline"
                              : "sync.syncing",
                      )}
                    </p>
                    <small>
                      {t("sync.lastUpdate", {
                        time: formatTime(workspace.lastSync),
                      })}
                    </small>
                  </div>
                </div>
                <div className="button-row">
                  <button
                    className="button secondary"
                    onClick={() => {
                      void workspace.sync();
                    }}
                  >
                    <FolderSync size={17} />
                    {t("common.refresh")}
                  </button>
                  {!leaving && (
                    <button
                      className="button ghost"
                      onClick={() =>
                        setLeaving({
                          owner: workspace.user!.id,
                          remove: false,
                          discard: false,
                          unsynced: false,
                        })
                      }
                    >
                      <LogOut size={17} />
                      {t("auth.signOut")}
                    </button>
                  )}
                </div>
                {leaving && (
                  <div className="notice sign-out-confirm">
                    <strong>{t("signOut.title")}</strong>
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={leaving.remove}
                        onChange={(event) =>
                          setLeaving({
                            ...leaving,
                            remove: event.target.checked,
                            discard: false,
                          })
                        }
                      />
                      <span>{t("signOut.remove")}</span>
                    </label>
                    <p>{t("signOut.removeHint")}</p>
                    {leaving.remove && unsynced && (
                      <>
                        <p role="alert">
                          <strong>{t("signOut.unsynced")}</strong>
                        </p>
                        <label className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={leaving.discard}
                            onChange={(event) =>
                              setLeaving({
                                ...leaving,
                                discard: event.target.checked,
                              })
                            }
                          />
                          <span>{t("signOut.discard")}</span>
                        </label>
                      </>
                    )}
                    <div className="button-row">
                      <button
                        className="button primary"
                        disabled={
                          busy || (leaving.remove && unsynced && !leaving.discard)
                        }
                        onClick={() => {
                          void signOut();
                        }}
                      >
                        <LogOut size={17} />
                        {t("auth.signOut")}
                      </button>
                      <button
                        className="button secondary"
                        disabled={busy}
                        onClick={() => setLeaving(null)}
                      >
                        {t("common.cancel")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={login}>
                <Field label={t("common.email")}>
                  <input
                    autoComplete="email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                  />
                </Field>
                <Field label={t("auth.password")}>
                  <input
                    autoComplete={
                      register ? "new-password" : "current-password"
                    }
                    type="password"
                    minLength={register ? 10 : 1}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={t(
                      register ? "auth.passwordNew" : "auth.passwordCurrent",
                    )}
                  />
                </Field>
                <button className="button primary full-width" disabled={busy}>
                  {busy ? (
                    <LoaderCircle size={18} className="spin" />
                  ) : (
                    <KeyRound size={18} />
                  )}{" "}
                  {t(register ? "auth.create" : "auth.signIn")}
                </button>
                <button
                  type="button"
                  className="switch-auth"
                  onClick={() => {
                    setRegister(!register);
                    setAuthMessage("");
                  }}
                >
                  {t(register ? "auth.haveAccount" : "auth.first")}
                </button>
                {authMessage && (
                  <div className="notice" role="status">
                    {authMessage}
                  </div>
                )}
                <small className="muted">{t("auth.note")}</small>
              </form>
            )}
            <div className="privacy-note">
              <ShieldCheck size={17} />
              <span>{t("sync.privacy")}</span>
            </div>
          </>
        )}
        {tab === "data" && (
          <>
            <h3>{t("data.title")}</h3>
            <p className="muted">{t("data.text")}</p>
            <div className="data-actions">
              <button
                className="data-action"
                onClick={() =>
                  download(
                    `JobSearch-backup-${new Date().toISOString().slice(0, 10)}.json`,
                    JSON.stringify(workspace.store, null, 2),
                    "application/json",
                  )
                }
              >
                <Download size={22} />
                <span>
                  <strong>{t("common.downloadCopy")}</strong>
                  <small>{t("data.download.detail")}</small>
                </span>
                <ArrowRight size={19} />
              </button>
              <button
                className="data-action"
                onClick={() => input.current?.click()}
              >
                <Upload size={22} />
                <span>
                  <strong>{t("data.restore")}</strong>
                  <small>{t("data.restore.detail")}</small>
                </span>
                <ArrowRight size={19} />
              </button>
            </div>
            <input
              ref={input}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={importBackup}
            />
            {restore && (
              <div className="notice">
                <strong>{t("data.restoreConfirm.title")}</strong>
                <p>
                  {t("data.restoreConfirm.text", {
                    jobs: restore.jobs.length,
                    applications: Object.keys(restore.applications).length,
                    packets: restore.packets.length,
                  })}
                </p>
                <div className="button-row">
                  <button
                    className="button primary"
                    onClick={() => {
                      download(
                        `JobSearch-before-restore-${Date.now()}.json`,
                        JSON.stringify(workspace.store, null, 2),
                        "application/json",
                      );
                      try {
                        workspace.update(() => restore);
                        setRejected("");
                        notify(t("toast.restored"));
                      } catch (error) {
                        reject(error);
                      }
                      setRestore(null);
                    }}
                  >
                    {t("common.restore")}
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => setRestore(null)}
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </div>
            )}
            <div className="info-box">
              <HardDrive size={20} />
              <p>{t("data.info")}</p>
            </div>
          </>
        )}
      </div>
      <footer className="modal-footer">
        <span>
          <ShieldCheck size={15} />
          {t("settings.footer")}
        </span>
        {tab === "search" ? (
          <button type="submit" form="settings-form" className="button primary">
            <Check size={17} />
            {t("common.save")}
          </button>
        ) : (
          <button className="button secondary" onClick={onClose}>
            {t("common.done")}
          </button>
        )}
      </footer>
    </Modal>
  );
}

export function ProfilePanel({
  profile,
  onSave,
  notify,
}: {
  profile: Profile;
  onSave: (value: Profile) => void;
  notify: Notify;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(profile);
  const fileInput = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const change = (key: keyof Profile, value: string) =>
    setDraft((p) => ({ ...p, [key]: value }));
  async function importCv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImporting(true);
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error(t("error.cvMaxSize"));
      let text: string;
      if (/\.docx$/i.test(file.name)) {
        const mammoth = await import("mammoth");
        text = (
          await mammoth.extractRawText({
            arrayBuffer: await file.arrayBuffer(),
          })
        ).value;
      } else if (/\.txt$/i.test(file.name)) text = await file.text();
      else throw new Error(t("error.cvType"));
      if (text.length > 200000) throw new Error(t("error.cvTooLong"));
      if (!text.trim()) throw new Error(t("error.cvEmpty"));
      change("cv", text);
      notify(t("toast.cvImported"));
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setImporting(false);
    }
  }
  return (
    <div className="profile-layout">
      <form
        className="surface profile-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSave({ ...draft, version: profile.version + 1 });
        }}
      >
        <div className="section-heading">
          <div>
            <h2>{t("profile.title")}</h2>
            <p>{t("profile.subtitle")}</p>
          </div>
          <span className="soft-label">
            {t("profile.version", { version: profile.version })}
          </span>
        </div>
        <div className="form-grid">
          <Field label={t("profile.name.label")}>
            <input
              value={draft.name}
              autoComplete="name"
              onChange={(event) => change("name", event.target.value)}
              placeholder={t("profile.name.placeholder")}
              maxLength={200}
            />
          </Field>
          <Field label={t("profile.headline.label")}>
            <input
              value={draft.headline}
              onChange={(event) => change("headline", event.target.value)}
              placeholder={t("profile.headline.placeholder")}
              maxLength={300}
            />
          </Field>
          <Field label={t("common.email")}>
            <input
              type="email"
              autoComplete="email"
              value={draft.email}
              onChange={(event) => change("email", event.target.value)}
              placeholder="you@example.com"
            />
          </Field>
          <Field label={t("profile.phone")}>
            <input
              type="tel"
              autoComplete="tel"
              value={draft.phone}
              onChange={(event) => change("phone", event.target.value)}
              placeholder="+1 …"
              maxLength={100}
            />
          </Field>
        </div>
        <Field label={t("profile.summary.label")}>
          <textarea
            rows={3}
            value={draft.summary}
            onChange={(event) => change("summary", event.target.value)}
            placeholder={t("profile.summary.placeholder")}
            maxLength={10000}
          />
        </Field>
        <Field
          label={t("profile.skills.label")}
          hint={t("profile.skills.hint")}
        >
          <input
            value={draft.skills}
            onChange={(event) => change("skills", event.target.value)}
            placeholder="Excel, coordination, service à la clientèle…"
            maxLength={3000}
          />
        </Field>
        <div className="cv-heading">
          <h3>{t("profile.cv.title")}</h3>
          <button
            type="button"
            className="button secondary small"
            onClick={() => fileInput.current?.click()}
            disabled={importing}
          >
            {importing ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <Upload size={16} />
            )}
            {t("profile.cv.import")}
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          hidden
          accept=".docx,.txt"
          onChange={importCv}
        />
        <Field
          label={t("profile.cv.label")}
          hint={t("profile.cv.hint")}
        >
          <textarea
            className="cv-input"
            rows={15}
            value={draft.cv}
            onChange={(event) => change("cv", event.target.value)}
            placeholder={t("profile.cv.placeholder")}
            maxLength={200000}
          />
        </Field>
        <div className="form-bottom">
          <span className="muted">{t("profile.saveNote")}</span>
          <button className="button primary">
            <Save size={17} />
            {t("profile.save")}
          </button>
        </div>
      </form>
      <aside className="profile-aside">
        <div className="guide-card">
          <span className="round-icon">
            <ShieldCheck size={24} />
          </span>
          <h3>{t("guide.title")}</h3>
          <p>{t("guide.text")}</p>
          <div className="guide-step">
            <Check size={17} />
            <span>{t("guide.step1")}</span>
          </div>
          <div className="guide-step">
            <Check size={17} />
            <span>{t("guide.step2")}</span>
          </div>
          <div className="guide-step">
            <Check size={17} />
            <span>{t("guide.step3")}</span>
          </div>
        </div>
        <div className="small-tip">
          <Sparkles size={19} />
          <p>{t("guide.tip")}</p>
        </div>
      </aside>
    </div>
  );
}

export function JobForm({
  onSave,
  onClose,
  alert,
}: {
  onSave: (job: Job) => boolean;
  onClose: () => void;
  alert?: string;
}) {
  const [draft, setDraft] = useState({
    title: "",
    employer: "",
    location: "",
    salary: "",
    url: "",
    description: "",
    full: false,
  });
  const { t } = useI18n();
  const [error, setError] = useState("");
  const field = (key: keyof typeof draft, value: string | boolean) =>
    setDraft((p) => ({ ...p, [key]: value }));
  return (
    <Modal
      title={t("job.add")}
      subtitle={t("jobForm.subtitle")}
      onClose={onClose}
      alert={alert}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          const url = draft.url ? safeUrl(draft.url) : "";
          if (draft.url && !url) {
            setError(t("error.url"));
            return;
          }
          if (!draft.title.trim() || !draft.employer.trim()) {
            setError(t("error.titleEmployer"));
            return;
          }
          if (draft.full && !draft.description.trim()) {
            setError(t("error.fullText"));
            return;
          }
          const now = new Date().toISOString();
          const jb = url.match(
            /^https:\/\/(?:www\.)?jobbank\.gc\.ca\/jobsearch\/jobposting\/(\d+)/,
          );
          const saved = onSave({
            id: jb
              ? `jobbank:${jb[1]}`
              : `manual:${contentVersion(url || `${draft.title}|${draft.employer}|${draft.location}`)}`,
            title: draft.title.trim(),
            employer: draft.employer.trim(),
            location: draft.location,
            salary: draft.salary,
            url,
            source: jb ? "Job Bank" : MANUAL_SOURCE,
            description: draft.description,
            completeness: draft.full ? "full" : "snippet",
            publishedAt: null,
            firstSeenAt: now,
            checkedAt: now,
            availability: "unknown",
          });
          // Keep the form open when the workspace rejects the job, so the text is not lost.
          if (saved) onClose();
        }}
      >
        <div className="modal-body">
          <Field label={t("jobForm.title.label")}>
            <input
              autoFocus
              required
              value={draft.title}
              onChange={(e) => field("title", e.target.value)}
              maxLength={300}
              placeholder={t("jobForm.title.placeholder")}
            />
          </Field>
          <div className="form-grid">
            <Field label={t("jobForm.employer.label")}>
              <input
                required
                value={draft.employer}
                onChange={(e) => field("employer", e.target.value)}
                maxLength={300}
                placeholder={t("jobForm.employer.placeholder")}
              />
            </Field>
            <Field label={t("jobForm.location.label")}>
              <input
                value={draft.location}
                onChange={(e) => field("location", e.target.value)}
                maxLength={300}
                placeholder={t("jobForm.location.placeholder")}
              />
            </Field>
          </div>
          <Field label={t("jobForm.url.label")}>
            <input
              type="url"
              value={draft.url}
              onChange={(e) => field("url", e.target.value)}
              placeholder="https://…"
              maxLength={4000}
            />
          </Field>
          <Field label={t("jobForm.salary.label")}>
            <input
              value={draft.salary}
              onChange={(e) => field("salary", e.target.value)}
              placeholder={t("jobForm.salary.placeholder")}
              maxLength={300}
            />
          </Field>
          <Field label={t("details.description")}>
            <textarea
              rows={8}
              value={draft.description}
              onChange={(e) => field("description", e.target.value)}
              placeholder={t("jobForm.description.placeholder")}
              maxLength={200000}
            />
          </Field>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={draft.full}
              onChange={(e) => field("full", e.target.checked)}
            />
            <span>{t("jobForm.full")}</span>
          </label>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="button secondary" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button className="button primary">
            <Check size={17} />
            {t("job.add")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function DocumentsPanel({
  packets,
  jobs,
  profile,
  settings,
  onUpdate,
  onPrepare,
  notify,
  onPrint,
}: {
  packets: Packet[];
  jobs: Job[];
  profile: Profile;
  settings: Settings;
  onUpdate: (p: Packet) => boolean;
  onPrepare: () => void;
  notify: Notify;
  onPrint: (p: Packet) => void;
}) {
  const { t } = useI18n();
  const [selected, setSelected] = useState(packets[0]?.id || "");
  const [activeDoc, setActiveDoc] = useState<"cv" | "letter">("cv");
  const [exporting, setExporting] = useState(false);
  const packet = packets.find((p) => p.id === selected) || packets[0];
  const job = jobs.find((j) => j.id === packet?.jobId);
  async function docxExport() {
    if (!packet) return;
    setExporting(true);
    try {
      const { Document, Packer, Paragraph, TextRun } = await import("docx");
      const text = activeDoc === "cv" ? packet.cv : packet.letter;
      const document = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 },
              },
            },
            children: text
              .split("\n")
              .map(
                (line) =>
                  new Paragraph({
                    children: [
                      new TextRun({ text: line, font: "Calibri", size: 22 }),
                    ],
                    spacing: { after: 110 },
                  }),
              ),
          },
        ],
      });
      download(
        `JobSearch-${activeDoc}-${packet.id.slice(0, 8)}.docx`,
        await Packer.toBlob(document),
      );
      notify(t("toast.docx"));
    } catch {
      notify(t("toast.docxFailed"));
    } finally {
      setExporting(false);
    }
  }
  if (!packet)
    return (
      <div className="surface">
        <Empty
          icon={<FileText size={31} />}
          title={t("docs.empty.title")}
          text={t("docs.empty.text")}
        >
          <button className="button primary" onClick={onPrepare}>
            {t("docs.empty.button")}
            <ArrowRight size={17} />
          </button>
        </Empty>
      </div>
    );
  const outdated =
    packet.profileVersion !== profile.version ||
    (job && packet.descriptionVersion !== contentVersion(job.description));
  return (
    <div className="documents-layout">
      <aside className="packet-list surface">
        <h3>
          {t("docs.myPackets")} <span>{packets.length}</span>
        </h3>
        {packets.map((p) => (
          <button
            key={p.id}
            className={`packet-item ${p.id === packet.id ? "selected" : ""}`}
            onClick={() => setSelected(p.id)}
          >
            <FileText size={20} />
            <span>
              <strong>{p.title}</strong>
              <small>{p.employer}</small>
              <em>
                {t(p.approvedAt ? "docs.verifiedByYou" : "docs.draft")} ·{" "}
                {formatTime(p.createdAt)}
              </em>
            </span>
          </button>
        ))}
      </aside>
      <section className="surface document-editor">
        <div className="section-heading">
          <div>
            <h2>{packet.title}</h2>
            <p>{packet.employer}</p>
          </div>
          <span className={`soft-label ${packet.approvedAt ? "green" : ""}`}>
            {t(packet.approvedAt ? "docs.verified" : "docs.draft")}
          </span>
        </div>
        {packet.frozenAt && (
          <div className="notice">
            {t("docs.frozen", { time: formatTime(packet.frozenAt) })}
          </div>
        )}
        {outdated && (
          <div className="notice">{t("docs.outdated")}</div>
        )}
        <div className="info-box">
          <Sparkles size={20} />
          <p>{t(packet.llmRunId ? "docs.info.llm" : "docs.info.base")}</p>
        </div>
        <div className="document-toolbar">
          <div className="segmented">
            <button
              className={activeDoc === "cv" ? "active" : ""}
              onClick={() => setActiveDoc("cv")}
            >
              CV
            </button>
            <button
              className={activeDoc === "letter" ? "active" : ""}
              onClick={() => setActiveDoc("letter")}
            >
              {t("docs.tab.letter")}
            </button>
          </div>
          <button
            className="button secondary small"
            disabled={!job}
            onClick={async () => {
              if (!job) return;
              try {
                await navigator.clipboard.writeText(
                  aiPrompt(job, profile, settings.documentLanguage),
                );
                notify(t("toast.promptCopied"));
              } catch {
                download(
                  "JobSearch-AI-request.txt",
                  aiPrompt(job, profile, settings.documentLanguage),
                );
                notify(t("toast.promptDownloaded"));
              }
            }}
          >
            <Sparkles size={16} />
            {t("docs.aiPrompt")}
          </button>
        </div>
        <textarea
          aria-label={t(activeDoc === "cv" ? "docs.cvAria" : "docs.letterAria")}
          className="document-text"
          readOnly={!!packet.frozenAt}
          value={packet[activeDoc]}
          onChange={(event) =>
            onUpdate({
              ...packet,
              [activeDoc]: event.target.value,
              approvedAt: null,
            })
          }
          maxLength={200000}
        />
        <div className="document-actions">
          <button
            className="button secondary small"
            disabled={exporting}
            onClick={docxExport}
          >
            <Download size={16} />
            {exporting ? t("docs.exporting") : "DOCX"}
          </button>
          <button
            className="button secondary small"
            onClick={() =>
              download(`JobSearch-${activeDoc}.txt`, packet[activeDoc])
            }
          >
            TXT
          </button>
          <button
            className="button secondary small"
            onClick={() => onPrint(packet)}
          >
            {t("docs.print")}
          </button>
          <button
            className="button primary small approve-button"
            disabled={
              !!packet.frozenAt || !packet.cv.trim() || !packet.letter.trim()
            }
            onClick={() => {
              if (onUpdate({ ...packet, approvedAt: new Date().toISOString() }))
                notify(t("toast.packetApproved"));
            }}
          >
            <CheckCheck size={17} />
            {t("docs.approve")}
          </button>
        </div>
        <p className="form-note">{t("docs.note")}</p>
      </section>
    </div>
  );
}

export { createPacket };
