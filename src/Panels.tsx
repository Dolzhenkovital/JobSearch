import { useRef, useState, type ChangeEvent } from "react";
import {
  ArrowRight,
  Check,
  CheckCheck,
  Cloud,
  Download,
  FileText,
  FolderSync,
  Globe2,
  HardDrive,
  KeyRound,
  LoaderCircle,
  LogOut,
  Mail,
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
  MAX_IMPORT_BYTES,
  parseBackup,
  safeUrl,
} from "./domain";
import { download, Empty, ExternalLink, Field, formatTime, Modal } from "./ui";
import type { useWorkspace } from "./useWorkspace";
import type { Job, Packet, Profile, Settings, Store } from "./types";

type Workspace = ReturnType<typeof useWorkspace>;
type Notify = (message: string) => void;
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
  const [tab, setTab] = useState(initialTab),
    [settings, setSettings] = useState(workspace.store.settings);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false),
    [authMessage, setAuthMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const [restore, setRestore] = useState<Store | null>(null);
  const field = (key: keyof Settings, value: string | boolean) =>
    setSettings((previous) => ({ ...previous, [key]: value }));
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
        setAuthMessage(
          "Перевірте пошту й підтвердьте адресу. Після підтвердження увійдіть тут.",
        );
      else notify("Вхід виконано. Завантажуємо ваш простір.");
    } catch (error) {
      setAuthMessage((error as Error).message || "Не вдалося увійти.");
    } finally {
      setBusy(false);
    }
  }
  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > MAX_IMPORT_BYTES)
        throw new Error("Максимальний розмір — 5 МБ.");
      setRestore(parseBackup(await file.text()));
    } catch (error) {
      notify((error as Error).message);
    }
  }
  return (
    <Modal
      title="Налаштування"
      subtitle="Пошук і ваш особистий простір"
      onClose={onClose}
    >
      <div
        className="modal-tabs"
        role="tablist"
        aria-label="Розділи налаштувань"
      >
        {[
          ["search", "Пошук", SlidersHorizontal],
          ["sync", "Синхронізація", Cloud],
          ["data", "Мої дані", HardDrive],
        ].map(([id, title, Icon]) => (
          <button
            key={String(id)}
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(String(id))}
          >
            {typeof Icon !== "string" && <Icon size={17} />}
            <span>{String(title)}</span>
          </button>
        ))}
      </div>
      <div className="modal-body">
        {tab === "search" && (
          <form
            id="settings-form"
            onSubmit={(event) => {
              event.preventDefault();
              workspace.update((s) => ({ ...s, settings }));
              notify("Налаштування збережено");
              onClose();
            }}
          >
            <div className="info-box">
              <SlidersHorizontal size={20} />
              <p>
                Налаштуйте пошук під себе. Порожні поля не обмежують результати.
              </p>
            </div>
            <Field
              label="Місто або регіон"
              hint="Наприклад: Montréal, Laval або QC. Фільтр перевіряє назву місця в оголошенні."
            >
              <input
                value={settings.city}
                onChange={(event) => field("city", event.target.value)}
                placeholder="Де ви хочете працювати?"
                maxLength={120}
              />
            </Field>
            <Field
              label="Назви посад"
              hint="Через кому. Використайте варіанти назв так, як їх пишуть роботодавці."
            >
              <textarea
                rows={3}
                value={settings.roles}
                onChange={(event) => field("roles", event.target.value)}
                placeholder="Наприклад: comptable, administrative assistant"
                maxLength={1000}
              />
            </Field>
            <div className="form-grid">
              <Field
                label="Мінімальна оплата, CAD / год"
                hint="Вакансії без погодинної суми залишаються у списку."
              >
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={settings.minHourly}
                  onChange={(event) => field("minHourly", event.target.value)}
                  placeholder="Без обмеження"
                />
              </Field>
              <Field label="Мова нових документів">
                <select
                  value={settings.documentLanguage}
                  onChange={(event) =>
                    field("documentLanguage", event.target.value)
                  }
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="uk">Українська</option>
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
              <span>Застосовувати ці умови до списку вакансій</span>
            </label>
            <p className="form-note">
              Мова вакансії та рівень володіння мовами не впливають на відбір.
            </p>
          </form>
        )}
        {tab === "sync" && (
          <>
            <div className="sync-heading">
              <span className="round-icon">
                <FolderSync size={26} />
              </span>
              <h3>Один простір на всіх пристроях</h3>
              <p>
                Увійдіть з однаковим email на комп’ютері й телефоні. Профіль,
                обране, заявки та документи синхронізуються.
              </p>
            </div>
            {!workspace.configured ? (
              <div className="notice">
                <strong>Завершуємо підключення сховища</strong>
                <p>
                  Сайт уже працює. Для синхронізації власник має підключити
                  безкоштовний проєкт Supabase. До цього зміни залишаються на
                  цьому пристрої.
                </p>
                <ExternalLink href="https://github.com/Dolzhenkovital/JobSearch/blob/main/docs/deployment.md">
                  Інструкція для власника
                </ExternalLink>
              </div>
            ) : workspace.user ? (
              <div className="account-card">
                <div className="account-line">
                  <ShieldCheck size={23} />
                  <div>
                    <strong>{workspace.user.email}</strong>
                    <p>
                      {workspace.status === "synced"
                        ? "Усі зміни синхронізовані"
                        : workspace.status === "conflict"
                          ? "Потрібно вибрати версію змін"
                          : workspace.status === "offline"
                            ? "Чекаємо на з’єднання"
                            : "Синхронізація…"}
                    </p>
                    <small>
                      Останнє оновлення: {formatTime(workspace.lastSync)}
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
                    Оновити
                  </button>
                  <button
                    className="button ghost"
                    onClick={async () => {
                      const { error } = await cloud!.auth.signOut();
                      if (error) notify("Не вдалося вийти. Спробуйте ще раз.");
                      else notify("Ви вийшли з акаунта");
                    }}
                  >
                    <LogOut size={17} />
                    Вийти
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={login}>
                <Field label="Email">
                  <input
                    autoComplete="email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                  />
                </Field>
                <Field label="Пароль">
                  <input
                    autoComplete={
                      register ? "new-password" : "current-password"
                    }
                    type="password"
                    minLength={register ? 10 : 1}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={
                      register ? "Щонайменше 10 символів" : "Ваш пароль"
                    }
                  />
                </Field>
                <button className="button primary full-width" disabled={busy}>
                  {busy ? (
                    <LoaderCircle size={18} className="spin" />
                  ) : (
                    <KeyRound size={18} />
                  )}{" "}
                  {register ? "Створити акаунт" : "Увійти"}
                </button>
                <button
                  type="button"
                  className="switch-auth"
                  onClick={() => {
                    setRegister(!register);
                    setAuthMessage("");
                  }}
                >
                  {register
                    ? "Уже є акаунт? Увійти"
                    : "Перший вхід? Створити акаунт"}
                </button>
                {authMessage && (
                  <div className="notice" role="status">
                    {authMessage}
                  </div>
                )}
                <small className="muted">
                  Після входу відкриється ваша хмарна копія. Новий акаунт
                  збереже поточний локальний простір.
                </small>
              </form>
            )}
            <div className="privacy-note">
              <ShieldCheck size={17} />
              <span>
                Особисті дані доступні лише вашому акаунту. Публічний сайт не
                містить вашого CV.
              </span>
            </div>
          </>
        )}
        {tab === "data" && (
          <>
            <h3>Резервна копія</h3>
            <p className="muted">
              Збережіть профіль, налаштування, вакансії та документи одним
              файлом. Копія містить особисті дані — тримайте її в безпечному
              місці.
            </p>
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
                  <strong>Завантажити копію</strong>
                  <small>Усі дані поточного простору</small>
                </span>
                <ArrowRight size={19} />
              </button>
              <button
                className="data-action"
                onClick={() => input.current?.click()}
              >
                <Upload size={22} />
                <span>
                  <strong>Відновити з файлу</strong>
                  <small>Резервна копія JobSearch, до 5 МБ</small>
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
                <strong>Відновити цю копію?</strong>
                <p>
                  Вакансій: {restore.jobs.length}. Заявок:{" "}
                  {Object.keys(restore.applications).length}. Документів:{" "}
                  {restore.packets.length}. Поточні дані буде замінено, а після
                  входу — синхронізовано.
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
                      workspace.update(() => restore);
                      setRestore(null);
                      notify(
                        "Копію відновлено. Попередню версію завантажено окремо.",
                      );
                    }}
                  >
                    Відновити
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => setRestore(null)}
                  >
                    Скасувати
                  </button>
                </div>
              </div>
            )}
            <div className="info-box">
              <HardDrive size={20} />
              <p>
                Без входу дані доступні лише у цьому браузері. Очищення даних
                браузера видаляє локальну копію.
              </p>
            </div>
          </>
        )}
      </div>
      <footer className="modal-footer">
        <span>
          <ShieldCheck size={15} />
          Ваш приватний простір
        </span>
        {tab === "search" ? (
          <button type="submit" form="settings-form" className="button primary">
            <Check size={17} />
            Зберегти
          </button>
        ) : (
          <button className="button secondary" onClick={onClose}>
            Готово
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
      if (file.size > MAX_IMPORT_BYTES)
        throw new Error("Максимальний розмір CV — 5 МБ.");
      let text: string;
      if (/\.docx$/i.test(file.name)) {
        const mammoth = await import("mammoth");
        text = (
          await mammoth.extractRawText({
            arrayBuffer: await file.arrayBuffer(),
          })
        ).value;
      } else if (/\.txt$/i.test(file.name)) text = await file.text();
      else
        throw new Error(
          "Виберіть DOCX або TXT. Текст із PDF можна вставити у поле CV.",
        );
      if (text.length > 200000)
        throw new Error("Забагато тексту для одного CV.");
      if (!text.trim()) throw new Error("У файлі не знайдено тексту.");
      change("cv", text);
      notify("Текст CV прочитано. Перевірте його й збережіть профіль.");
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
            <h2>Ваш професійний профіль</h2>
            <p>Факти, на які спиратимуться ваші документи.</p>
          </div>
          <span className="soft-label">Версія {profile.version}</span>
        </div>
        <div className="form-grid">
          <Field label="Ім’я та прізвище">
            <input
              value={draft.name}
              autoComplete="name"
              onChange={(event) => change("name", event.target.value)}
              placeholder="Як вас представляти роботодавцю"
              maxLength={200}
            />
          </Field>
          <Field label="Професійний заголовок">
            <input
              value={draft.headline}
              onChange={(event) => change("headline", event.target.value)}
              placeholder="Ваша спеціальність або напрямок"
              maxLength={300}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              autoComplete="email"
              value={draft.email}
              onChange={(event) => change("email", event.target.value)}
              placeholder="you@example.com"
            />
          </Field>
          <Field label="Телефон">
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
        <Field label="Коротко про ваш досвід">
          <textarea
            rows={3}
            value={draft.summary}
            onChange={(event) => change("summary", event.target.value)}
            placeholder="Кілька речень про досвід, сильні сторони та результати."
            maxLength={10000}
          />
        </Field>
        <Field
          label="Підтверджені навички"
          hint="Через кому. Підсвічуємо точні текстові збіги з вакансією — це підказка, а не оцінка шансів."
        >
          <input
            value={draft.skills}
            onChange={(event) => change("skills", event.target.value)}
            placeholder="Excel, coordination, service à la clientèle…"
            maxLength={3000}
          />
        </Field>
        <div className="cv-heading">
          <h3>Ваше CV</h3>
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
            Імпортувати DOCX / TXT
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
          label="Текст CV"
          hint="Файл обробляється у браузері. Зберігається витягнутий текст, без оригінального оформлення."
        >
          <textarea
            className="cv-input"
            rows={15}
            value={draft.cv}
            onChange={(event) => change("cv", event.target.value)}
            placeholder="Вставте повний текст CV або імпортуйте документ…"
            maxLength={200000}
          />
        </Field>
        <div className="form-bottom">
          <span className="muted">
            Зміни набудуть чинності після збереження.
          </span>
          <button className="button primary">
            <Save size={17} />
            Зберегти профіль
          </button>
        </div>
      </form>
      <aside className="profile-aside">
        <div className="guide-card">
          <span className="round-icon">
            <ShieldCheck size={24} />
          </span>
          <h3>Досвід залишається вашим</h3>
          <p>
            Адаптуємо акценти під вакансію. Посади, дати, освіту й досягнення
            зберігаємо такими, як ви їх підтвердили.
          </p>
          <div className="guide-step">
            <Check size={17} />
            <span>Один актуальний профіль</span>
          </div>
          <div className="guide-step">
            <Check size={17} />
            <span>Окремі документи для кожної заявки</span>
          </div>
          <div className="guide-step">
            <Check size={17} />
            <span>Перевірка перед надсиланням</span>
          </div>
        </div>
        <div className="small-tip">
          <Sparkles size={19} />
          <p>
            Додайте конкретні результати з вашого досвіду. Це допоможе
            підготувати переконливу заявку.
          </p>
        </div>
      </aside>
    </div>
  );
}

export function JobForm({
  onSave,
  onClose,
}: {
  onSave: (job: Job) => void;
  onClose: () => void;
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
  const [error, setError] = useState("");
  const field = (key: string, value: string | boolean) =>
    setDraft((p) => ({ ...p, [key]: value }));
  return (
    <Modal
      title="Додати вакансію"
      subtitle="Збережіть оголошення з будь-якого майданчика"
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          const url = draft.url ? safeUrl(draft.url) : "";
          if (draft.url && !url) {
            setError("Перевірте посилання: потрібне http:// або https://.");
            return;
          }
          if (!draft.title.trim() || !draft.employer.trim()) {
            setError("Вкажіть назву посади та роботодавця.");
            return;
          }
          if (draft.full && !draft.description.trim()) {
            setError("Додайте повний текст вакансії.");
            return;
          }
          const now = new Date().toISOString();
          const jb = url.match(
            /^https:\/\/(?:www\.)?jobbank\.gc\.ca\/jobsearch\/jobposting\/(\d+)/,
          );
          onSave({
            id: jb
              ? `jobbank:${jb[1]}`
              : `manual:${contentVersion(url || `${draft.title}|${draft.employer}|${draft.location}`)}`,
            title: draft.title.trim(),
            employer: draft.employer.trim(),
            location: draft.location,
            salary: draft.salary,
            url,
            source: jb ? "Job Bank" : "Додано вручну",
            description: draft.description,
            completeness: draft.full ? "full" : "snippet",
            publishedAt: null,
            firstSeenAt: now,
            checkedAt: now,
            availability: "unknown",
          });
          onClose();
        }}
      >
        <div className="modal-body">
          <Field label="Назва посади *">
            <input
              autoFocus
              required
              value={draft.title}
              onChange={(e) => field("title", e.target.value)}
              maxLength={300}
              placeholder="Назва з оголошення"
            />
          </Field>
          <div className="form-grid">
            <Field label="Роботодавець *">
              <input
                required
                value={draft.employer}
                onChange={(e) => field("employer", e.target.value)}
                maxLength={300}
                placeholder="Назва компанії"
              />
            </Field>
            <Field label="Місто / регіон">
              <input
                value={draft.location}
                onChange={(e) => field("location", e.target.value)}
                maxLength={300}
                placeholder="Наприклад: Laval, QC"
              />
            </Field>
          </div>
          <Field label="Посилання на оригінал">
            <input
              type="url"
              value={draft.url}
              onChange={(e) => field("url", e.target.value)}
              placeholder="https://…"
              maxLength={4000}
            />
          </Field>
          <Field label="Оплата, як в оголошенні">
            <input
              value={draft.salary}
              onChange={(e) => field("salary", e.target.value)}
              placeholder="Наприклад: $25–30 hourly"
              maxLength={300}
            />
          </Field>
          <Field label="Опис вакансії">
            <textarea
              rows={8}
              value={draft.description}
              onChange={(e) => field("description", e.target.value)}
              placeholder="Обов’язки, вимоги та умови роботи…"
              maxLength={200000}
            />
          </Field>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={draft.full}
              onChange={(e) => field("full", e.target.checked)}
            />
            <span>Я додав(-ла) повний опис, включно з вимогами</span>
          </label>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="button secondary" onClick={onClose}>
            Скасувати
          </button>
          <button className="button primary">
            <Check size={17} />
            Додати вакансію
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
  onUpdate: (p: Packet) => void;
  onPrepare: () => void;
  notify: Notify;
  onPrint: (p: Packet) => void;
}) {
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
      notify(
        "DOCX завантажено. Перевірте остаточну верстку перед надсиланням.",
      );
    } catch {
      notify("Не вдалося створити DOCX. Спробуйте текстовий файл.");
    } finally {
      setExporting(false);
    }
  }
  if (!packet)
    return (
      <div className="surface">
        <Empty
          icon={<FileText size={31} />}
          title="Кожній вакансії — своя заявка"
          text="Додайте CV у профіль, відкрийте вакансію з повним описом і натисніть «Підготувати документи»."
        >
          <button className="button primary" onClick={onPrepare}>
            Перейти до вакансій
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
          Мої пакети <span>{packets.length}</span>
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
                {p.approvedAt ? "Перевірено вами" : "Чернетка"} ·{" "}
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
            {packet.approvedAt ? "Перевірено" : "Чернетка"}
          </span>
        </div>
        {packet.frozenAt && (
          <div className="notice">
            Знімок документів на момент позначки «Подано» (
            {formatTime(packet.frozenAt)}). Текст захищено від змін. Для нової
            версії відкрийте вакансію та підготуйте новий пакет.
          </div>
        )}
        {outdated && (
          <div className="notice">
            Профіль або вакансія змінилися після створення цього пакета.
            Перевірте документи або створіть нову версію.
          </div>
        )}
        <div className="info-box">
          <Sparkles size={20} />
          <p>
            Пакет починається з вашого вихідного CV та базового листа. Для
            змістовної AI-адаптації скопіюйте запит, опрацюйте його у своєму
            AI-помічнику та вставте перевірений результат нижче. Автоматичного
            платного API тут немає.
          </p>
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
              Lettre / лист
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
                notify(
                  "Запит скопійовано. Перевірте, які дані надсилаєте обраному AI-сервісу.",
                );
              } catch {
                download(
                  "JobSearch-AI-request.txt",
                  aiPrompt(job, profile, settings.documentLanguage),
                );
                notify("Запит завантажено у файл.");
              }
            }}
          >
            <Sparkles size={16} />
            Запит для AI
          </button>
        </div>
        <textarea
          aria-label={
            activeDoc === "cv"
              ? "Текст адаптованого CV"
              : "Текст супровідного листа"
          }
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
            {exporting ? "Готуємо…" : "DOCX"}
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
            Друк / PDF
          </button>
          <button
            className="button primary small approve-button"
            disabled={
              !!packet.frozenAt || !packet.cv.trim() || !packet.letter.trim()
            }
            onClick={() => {
              onUpdate({ ...packet, approvedAt: new Date().toISOString() });
              notify(
                "Пакет позначено як перевірений вами. Заявку ще не надіслано.",
              );
            }}
          >
            <CheckCheck size={17} />Я перевірив(-ла)
          </button>
        </div>
        <p className="form-note">
          Текст зберігається під час редагування. DOCX має просте оформлення;
          остаточну верстку перевірте у Word або перед друком. Позначка
          «перевірено» не означає подання заявки.
        </p>
      </section>
    </div>
  );
}

export { createPacket };
