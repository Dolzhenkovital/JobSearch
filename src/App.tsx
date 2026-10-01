import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownWideNarrow,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Cloud,
  Coffee,
  FileText,
  FolderHeart,
  Globe2,
  LayoutDashboard,
  LoaderCircle,
  MapPin,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Upload,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import {
  combineJobs,
  matchingTerms,
  parseAtom,
  parseFeed,
  preferenceReasons,
  safeUrl,
} from "./domain";
import {
  createPacket,
  DocumentsPanel,
  JobForm,
  ProfilePanel,
  SettingsPanel,
} from "./Panels";
import {
  download,
  Empty,
  ExternalLink,
  Field,
  formatDate,
  formatTime,
  Modal,
} from "./ui";
import { useWorkspace } from "./useWorkspace";
import type { Feed, Job, Packet, Stage, View } from "./types";

const navigation = [
  { id: "discover", name: "Вакансії", icon: Search },
  { id: "saved", name: "Обране", icon: Bookmark },
  { id: "applications", name: "Мої заявки", icon: BriefcaseBusiness },
  { id: "profile", name: "Мій профіль", icon: UserRound },
  { id: "documents", name: "Документи", icon: FileText },
  { id: "sources", name: "Джерела", icon: Globe2 },
] as const;
const stages: Record<Stage, string> = {
  saved: "Збережено",
  reviewing: "Розглядаю",
  prepared: "Документи готові",
  submitted: "Подано",
  interview: "Співбесіда",
  offer: "Пропозиція",
  rejected: "Відмова",
  withdrawn: "Відкликано",
};
const pageDescriptions: Record<View, string> = {
  discover: "Можливості, з яких починається ваш наступний крок.",
  saved: "Цікаві вакансії — поруч, коли ви готові діяти.",
  applications: "Кожна заявка, наступний крок і результат в одному місці.",
  profile: "Ваш досвід — основа для переконливої заявки.",
  documents: "Окремий пакет документів для кожної можливості.",
  sources: "Звідки надходять вакансії та як додати більше можливостей.",
};

export default function App() {
  const workspace = useWorkspace();
  const { store, update } = workspace;
  const [view, setView] = useState<View>("discover");
  const [feed, setFeed] = useState<Feed | null>(null),
    [loading, setLoading] = useState(true),
    [feedError, setFeedError] = useState("");
  const [query, setQuery] = useState(""),
    [sourceFilter, setSourceFilter] = useState("all"),
    [sort, setSort] = useState("newest"),
    [limit, setLimit] = useState(12);
  const [settingsTab, setSettingsTab] = useState<string | null>(null),
    [addJob, setAddJob] = useState(false),
    [selectedId, setSelectedId] = useState<string | null>(null),
    [mobileNav, setMobileNav] = useState(false);
  const [toast, setToast] = useState(""),
    [printPacket, setPrintPacket] = useState<Packet | null>(null);
  const importFeed = useRef<HTMLInputElement>(null);
  const notify = (message: string) => setToast(message);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 6500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    setLimit(12);
  }, [query, sourceFilter, view, store.settings]);
  async function refreshFeed() {
    setLoading(true);
    setFeedError("");
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}jobs.json`, {
        cache: "no-cache",
      });
      if (!response.ok) throw new Error();
      setFeed(parseFeed(await response.json()));
    } catch {
      setFeedError(
        "Не вдалося завантажити стрічку. Збережені вакансії доступні; спробуйте оновити пізніше.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refreshFeed();
  }, []);
  const jobs = useMemo(
    () => combineJobs(feed?.jobs || [], store.jobs, store.applications),
    [feed, store.jobs, store.applications],
  );
  const saved = Object.values(store.applications);
  const selected = jobs.find((job) => job.id === selectedId);
  const filtered = useMemo(
    () =>
      jobs
        .filter((job) => {
          if (view === "saved" && !store.applications[job.id]) return false;
          if (sourceFilter !== "all" && job.source !== sourceFilter)
            return false;
          if (
            query &&
            !`${job.title} ${job.employer} ${job.location}`
              .toLocaleLowerCase()
              .includes(query.toLocaleLowerCase())
          )
            return false;
          return (
            !store.settings.applyPreferences ||
            preferenceReasons(job, store.settings).length === 0
          );
        })
        .sort((a, b) =>
          sort === "skills"
            ? matchingTerms(b, store.profile).length -
              matchingTerms(a, store.profile).length
            : new Date(b.publishedAt || b.firstSeenAt).getTime() -
              new Date(a.publishedAt || a.firstSeenAt).getTime(),
        ),
    [jobs, query, sort, sourceFilter, view, store],
  );
  function navigate(next: View) {
    setView(next);
    setMobileNav(false);
    setQuery("");
    setSourceFilter("all");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function saveJob(job: Job) {
    update((s) => ({
      ...s,
      jobs: [...s.jobs.filter((j) => j.id !== job.id), job],
      applications: s.applications[job.id]
        ? { ...s.applications, [job.id]: { ...s.applications[job.id], job } }
        : s.applications,
    }));
    notify("Вакансію збережено у вашому просторі");
  }
  function toggleSaved(job: Job) {
    if (
      store.applications[job.id] &&
      store.applications[job.id].stage !== "saved"
    ) {
      setSelectedId(job.id);
      return;
    }
    const removing = !!store.applications[job.id];
    update((s) => {
      const applications = { ...s.applications };
      if (applications[job.id]) delete applications[job.id];
      else
        applications[job.id] = {
          job,
          stage: "saved",
          note: "",
          updatedAt: new Date().toISOString(),
        };
      return { ...s, applications };
    });
    notify(removing ? "Прибрано з обраного" : "Додано в обране");
  }
  function changeStage(job: Job, stage: Stage) {
    const now = new Date().toISOString();
    update((s) => ({
      ...s,
      packets:
        stage === "submitted"
          ? s.packets.map((p) =>
              p.jobId === job.id && !p.frozenAt ? { ...p, frozenAt: now } : p,
            )
          : s.packets,
      applications: {
        ...s.applications,
        [job.id]: {
          ...(s.applications[job.id] || { job, note: "" }),
          stage,
          updatedAt: now,
          ...(stage === "submitted"
            ? { submittedAt: now, evidence: "user_reported" as const }
            : {}),
        },
      },
    }));
    notify(
      stage === "submitted"
        ? "Позначено як подану вами. Сайт не надсилав заявку."
        : "Статус оновлено",
    );
  }
  function prepare(job: Job) {
    if (!store.profile.cv.trim()) {
      setSelectedId(null);
      navigate("profile");
      notify("Спочатку додайте CV у профіль");
      return;
    }
    if (job.completeness !== "full") {
      setSelectedId(job.id);
      notify("Додайте повний опис вакансії перед підготовкою документів");
      return;
    }
    try {
      const packet = createPacket(
        job,
        store.profile,
        store.settings.documentLanguage,
      );
      update((s) => ({
        ...s,
        packets: [packet, ...s.packets],
        applications: {
          ...s.applications,
          [job.id]: s.applications[job.id] || {
            job,
            stage: "reviewing",
            note: "",
            updatedAt: new Date().toISOString(),
          },
        },
      }));
      setSelectedId(null);
      navigate("documents");
      notify("Чернетку пакета створено. Адаптуйте текст і перевірте факти.");
    } catch (error) {
      notify((error as Error).message);
    }
  }
  const syncLabel = !workspace.configured
    ? "Підключити синхронізацію"
    : !workspace.user
      ? "Увійти для синхронізації"
      : workspace.status === "synced"
        ? "Усе синхронізовано"
        : workspace.status === "conflict"
          ? "Є різні версії змін"
          : workspace.status === "offline"
            ? "Зміни на пристрої"
            : "Синхронізація…";
  return (
    <>
      <div className="app-shell">
        {mobileNav && (
          <button
            className="nav-scrim"
            aria-label="Закрити меню"
            onClick={() => setMobileNav(false)}
          />
        )}
        <aside className={`sidebar ${mobileNav ? "is-open" : ""}`}>
          <a
            className="brand"
            href="#"
            onClick={(event) => {
              event.preventDefault();
              navigate("discover");
            }}
          >
            <span className="brand-icon">
              <BriefcaseBusiness size={22} />
            </span>
            <span>
              Job<span className="brand-light">Search</span>
              <small>ВАШ НАСТУПНИЙ КРОК</small>
            </span>
          </a>
          <div className="sidebar-label">МІЙ ПРОСТІР</div>
          <nav aria-label="Головна навігація">
            {navigation.map(({ id, name, icon: Icon }) => (
              <button
                key={id}
                className={`nav-item ${view === id ? "active" : ""}`}
                aria-current={view === id ? "page" : undefined}
                onClick={() => navigate(id)}
              >
                <Icon size={19} />
                <span>{name}</span>
                {id === "saved" && saved.length > 0 && <b>{saved.length}</b>}
                {id === "documents" && store.packets.length > 0 && (
                  <b>{store.packets.length}</b>
                )}
              </button>
            ))}
          </nav>
          <div className="sidebar-spacer" />
          <div className="sidebar-tip">
            <span className="mini-spark">
              <Sparkles size={20} />
            </span>
            <h3>
              Маленькі кроки.
              <br />
              Нові можливості.
            </h3>
            <p>
              Збережіть цікаву вакансію.
              <br />
              Наступний крок — за вами.
            </p>
            <button
              onClick={() => navigate(store.profile.cv ? "saved" : "profile")}
            >
              {store.profile.cv ? "До обраного" : "Додати моє CV"}
              <ArrowUpRight size={15} />
            </button>
          </div>
          <button
            className="sidebar-settings"
            onClick={() => setSettingsTab("search")}
          >
            <Settings2 size={18} />
            Налаштування
          </button>
          <button
            className="sidebar-account"
            onClick={() => setSettingsTab("sync")}
          >
            <span className="avatar">
              {store.profile.name ? (
                store.profile.name.charAt(0).toUpperCase()
              ) : (
                <UserRound size={18} />
              )}
            </span>
            <span>
              <strong>{store.profile.name || "Мій акаунт"}</strong>
              <small>
                <span
                  className={`status-dot ${workspace.status === "synced" ? "online" : ""}`}
                />
                {workspace.user ? "Приватний простір" : "На цьому пристрої"}
              </small>
            </span>
            <ChevronRight size={17} />
          </button>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="breadcrumb">
              <button
                className="icon-button mobile-menu"
                aria-label="Відкрити меню"
                onClick={() => setMobileNav(true)}
              >
                <Menu size={21} />
              </button>
              <span>Мій простір</span>
              <ChevronRight size={14} />
              <strong>{navigation.find((n) => n.id === view)?.name}</strong>
            </div>
            <div className="top-actions">
              <button
                className="sync-button"
                onClick={() => setSettingsTab("sync")}
              >
                <Cloud size={17} />
                <span>{syncLabel}</span>
              </button>
              <button
                className="icon-button top-settings"
                aria-label="Налаштування"
                onClick={() => setSettingsTab("search")}
              >
                <Settings2 size={19} />
              </button>
            </div>
          </header>
          <main id="main-content">
            <div className="page-heading">
              <div>
                <p className="eyebrow">РОБОТА, ЯКА ВАМ ПІДХОДИТЬ</p>
                <h1>
                  {view === "discover"
                    ? "Знайдіть свій наступний крок"
                    : navigation.find((n) => n.id === view)?.name}
                </h1>
                <p className="page-description">{pageDescriptions[view]}</p>
              </div>
              <button
                className="button primary add-top"
                onClick={() => setAddJob(true)}
              >
                <Plus size={18} />
                Додати вакансію
              </button>
            </div>
            {workspace.error && (
              <div className="notice dismissible" role="alert">
                <span>{workspace.error}</span>
                <button
                  className="icon-button"
                  aria-label="Приховати повідомлення"
                  onClick={workspace.clearError}
                >
                  <X size={17} />
                </button>
              </div>
            )}
            {workspace.conflict && (
              <div className="notice conflict-banner">
                <strong>На іншому пристрої є нові зміни</strong>
                <p>
                  Збережемо резервну копію перед вибором. Яку версію залишити у
                  спільному просторі?
                </p>
                <div className="button-row">
                  <button
                    className="button secondary"
                    onClick={() =>
                      download(
                        "JobSearch-conflict-backup.json",
                        JSON.stringify(store, null, 2),
                        "application/json",
                      )
                    }
                  >
                    <DownloadIcon />
                    Завантажити копію
                  </button>
                  <button
                    className="button primary"
                    onClick={() => workspace.resolve("remote")}
                  >
                    З іншого пристрою
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => workspace.resolve("local")}
                  >
                    З цього пристрою
                  </button>
                </div>
              </div>
            )}
            {view === "discover" && (
              <>
                <section className="welcome-banner">
                  <div>
                    <span className="pill light">
                      <span className="tiny-dot" />
                      ВАШ ПОШУК ПОЧИНАЄТЬСЯ ТУТ
                    </span>
                    <h2>
                      Менше хаосу.
                      <br />
                      Більше можливостей.
                    </h2>
                    <p>
                      Вакансії, ваш досвід і наступні кроки —
                      <br className="desktop-break" /> разом у зручному
                      просторі.
                    </p>
                    <button
                      className="hero-button"
                      onClick={() => setSettingsTab("search")}
                    >
                      {store.settings.city || store.settings.roles
                        ? "Уточнити мій пошук"
                        : "Налаштувати мій пошук"}
                      <ArrowRight size={17} />
                    </button>
                  </div>
                  <div className="hero-art" aria-hidden="true">
                    <div className="orbit orbit-one" />
                    <div className="orbit orbit-two" />
                    <span className="art-star star-one">✳</span>
                    <span className="art-star star-two">✧</span>
                    <div className="art-card back-card">
                      <div className="art-line" />
                      <div className="art-line short" />
                    </div>
                    <div className="art-card front-card">
                      <span className="art-briefcase">
                        <BriefcaseBusiness size={31} />
                      </span>
                      <div className="art-line" />
                      <div className="art-line short" />
                      <div className="art-card-bottom">
                        <span />
                        <span />
                        <i>
                          <Check size={17} />
                        </i>
                      </div>
                    </div>
                    <span className="art-check">
                      <Check size={25} />
                    </span>
                  </div>
                </section>
                <section className="stats-grid" aria-label="Огляд пошуку">
                  <Stat
                    icon={<Globe2 size={20} />}
                    value={feed?.jobs.length ?? "—"}
                    label="У стрічці Job Bank"
                    detail="Остання доступна вибірка"
                  />
                  <Stat
                    icon={<Bookmark size={20} />}
                    value={saved.length}
                    label="Збережено вами"
                    detail="Можливості, що зацікавили"
                  />
                  <Stat
                    icon={<BriefcaseBusiness size={20} />}
                    value={
                      saved.filter((a) =>
                        ["submitted", "interview", "offer"].includes(a.stage),
                      ).length
                    }
                    label="Активні заявки"
                    detail="За вашими позначками"
                  />
                  <Stat
                    icon={<FileText size={20} />}
                    value={store.packets.length}
                    label="Пакети документів"
                    detail="CV та супровідні листи"
                  />
                </section>
              </>
            )}
            {(view === "discover" || view === "saved") && (
              <>
                <div className="section-title-row">
                  <h2>
                    {view === "saved" ? "Збережені можливості" : "Вакансії"}{" "}
                    <span className="count-badge">{filtered.length}</span>
                  </h2>
                  <button
                    className="quiet-button"
                    onClick={refreshFeed}
                    disabled={loading}
                  >
                    <RefreshCw size={15} className={loading ? "spin" : ""} />
                    <span>Оновити</span>
                  </button>
                </div>
                <div className="filterbar">
                  <div className="search-input">
                    <Search size={19} />
                    <input
                      aria-label="Пошук вакансій"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Посада, компанія або місто…"
                    />
                    {query && (
                      <button
                        className="icon-button"
                        aria-label="Очистити пошук"
                        onClick={() => setQuery("")}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <select
                    aria-label="Джерело вакансій"
                    value={sourceFilter}
                    onChange={(event) => setSourceFilter(event.target.value)}
                  >
                    <option value="all">Усі джерела</option>
                    {[...new Set(jobs.map((j) => j.source))].map((source) => (
                      <option key={source}>{source}</option>
                    ))}
                  </select>
                  <button
                    className={`button filter-button ${store.settings.applyPreferences ? "is-active" : ""}`}
                    onClick={() => setSettingsTab("search")}
                  >
                    <SlidersHorizontal size={17} />
                    Мої умови
                    {store.settings.applyPreferences && (
                      <span className="tiny-dot" />
                    )}
                  </button>
                </div>
                <div className="results-meta">
                  <span>
                    {store.settings.applyPreferences
                      ? `Мої умови: ${[store.settings.city, store.settings.roles, store.settings.minHourly && `від $${store.settings.minHourly}/год`].filter(Boolean).join(" · ") || "без обмежень"}`
                      : "Показано всі напрямки. Уточніть місто та посади в налаштуваннях."}
                  </span>
                  <label>
                    <ArrowDownWideNarrow size={14} />
                    <select
                      aria-label="Сортування вакансій"
                      value={sort}
                      onChange={(event) => setSort(event.target.value)}
                    >
                      <option value="newest">Спочатку нові</option>
                      <option value="skills">За збігами навичок</option>
                    </select>
                  </label>
                </div>
                {feedError && (
                  <div className="notice" role="alert">
                    {feedError}
                  </div>
                )}
                {feed && feed.status !== "success" && (
                  <div className="notice">
                    {feed.message || "Стрічка тимчасово недоступна."}{" "}
                    {feed.fetchedAt &&
                      `Показано копію від ${formatTime(feed.fetchedAt)}.`}
                  </div>
                )}
                {loading && !jobs.length ? (
                  <div className="loading-state">
                    <LoaderCircle className="spin" size={28} />
                    <p>Завантажуємо вакансії…</p>
                  </div>
                ) : !filtered.length ? (
                  <div className="surface">
                    <Empty
                      icon={
                        view === "saved" ? (
                          <Bookmark size={30} />
                        ) : (
                          <Search size={30} />
                        )
                      }
                      title={
                        view === "saved" && !saved.length
                          ? "Збережіть те, що зацікавило"
                          : "Поки немає збігів"
                      }
                      text={
                        view === "saved" && !saved.length
                          ? "Натисніть закладку на вакансії — вона залишиться тут, навіть після оновлення стрічки."
                          : "Це обмежена вибірка останніх оголошень. Змініть фільтри, відкрийте пошук у джерелах або додайте вакансію вручну."
                      }
                    >
                      <button
                        className="button secondary"
                        onClick={() =>
                          navigate(view === "saved" ? "discover" : "sources")
                        }
                      >
                        {view === "saved"
                          ? "Переглянути вакансії"
                          : "Відкрити джерела"}
                        <ArrowRight size={16} />
                      </button>
                    </Empty>
                  </div>
                ) : (
                  <div className="jobs-grid">
                    {filtered.slice(0, limit).map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        saved={!!store.applications[job.id]}
                        matches={matchingTerms(job, store.profile)}
                        onSelect={() => setSelectedId(job.id)}
                        onSave={() => toggleSaved(job)}
                      />
                    ))}
                  </div>
                )}
                {filtered.length > limit && (
                  <button
                    className="button secondary load-more"
                    onClick={() => setLimit((n) => n + 12)}
                  >
                    Показати ще {Math.min(12, filtered.length - limit)} вакансій
                  </button>
                )}
                <div className="feed-footnote">
                  <Globe2 size={15} />
                  <p>
                    Джерело:{" "}
                    <a
                      href="https://www.jobbank.gc.ca/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Job Bank / Guichet-Emplois
                    </a>
                    . Оновлено {formatTime(feed?.fetchedAt)}. Стрічка містить
                    обмежену вибірку оголошень, а не весь ринок. Актуальність
                    перевіряйте в оригіналі.
                  </p>
                </div>
              </>
            )}
            {view === "profile" && (
              <ProfilePanel
                key={`${workspace.user?.id || "guest"}:${store.profile.version}`}
                profile={store.profile}
                onSave={(profile) => {
                  update((s) => ({ ...s, profile }));
                  notify("Профіль збережено");
                }}
                notify={notify}
              />
            )}
            {view === "documents" && (
              <DocumentsPanel
                key={store.packets.map((p) => p.id).join(",")}
                packets={store.packets}
                jobs={jobs}
                profile={store.profile}
                settings={store.settings}
                onUpdate={(packet) =>
                  update((s) => ({
                    ...s,
                    packets: s.packets.map((p) =>
                      p.id === packet.id ? packet : p,
                    ),
                    applications:
                      s.applications[packet.jobId] &&
                      ["saved", "reviewing", "prepared"].includes(
                        s.applications[packet.jobId].stage,
                      )
                        ? {
                            ...s.applications,
                            [packet.jobId]: {
                              ...s.applications[packet.jobId],
                              stage: packet.approvedAt
                                ? "prepared"
                                : s.applications[packet.jobId].stage ===
                                    "prepared"
                                  ? "reviewing"
                                  : s.applications[packet.jobId].stage,
                              updatedAt: new Date().toISOString(),
                            },
                          }
                        : s.applications,
                  }))
                }
                onPrepare={() => navigate("discover")}
                notify={notify}
                onPrint={(packet) => {
                  setPrintPacket(packet);
                  requestAnimationFrame(() =>
                    setTimeout(() => window.print(), 80),
                  );
                }}
              />
            )}
            {view === "applications" && (
              <>
                <div className="pipeline-summary">
                  <span>
                    <strong>{saved.length}</strong> у вашому списку
                  </span>
                  <span>
                    <strong>
                      {saved.filter((a) => a.stage === "interview").length}
                    </strong>{" "}
                    співбесід
                  </span>
                  <span>
                    <strong>
                      {saved.filter((a) => a.stage === "offer").length}
                    </strong>{" "}
                    пропозицій
                  </span>
                </div>
                {!saved.length ? (
                  <div className="surface">
                    <Empty
                      icon={<BriefcaseBusiness size={32} />}
                      title="Ваш пошук має свій маршрут"
                      text="Збережіть вакансію, підготуйте документи й відстежуйте наступні кроки. Подані заявки позначаєте ви."
                    >
                      <button
                        className="button primary"
                        onClick={() => navigate("discover")}
                      >
                        Знайти вакансію
                        <ArrowRight size={17} />
                      </button>
                    </Empty>
                  </div>
                ) : (
                  <div className="surface applications-table">
                    <div className="table-header">
                      <span>Вакансія</span>
                      <span>Статус</span>
                      <span>Оновлено</span>
                    </div>
                    {saved.map((application) => (
                      <div className="application-row" key={application.job.id}>
                        <button
                          className="application-name"
                          onClick={() => setSelectedId(application.job.id)}
                        >
                          <span className="company-avatar">
                            {application.job.employer
                              .slice(0, 2)
                              .toUpperCase() || "JB"}
                          </span>
                          <span>
                            <strong>{application.job.title}</strong>
                            <small>{application.job.employer}</small>
                          </span>
                        </button>
                        <select
                          aria-label={`Статус заявки ${application.job.title}`}
                          value={application.stage}
                          onChange={(event) =>
                            changeStage(
                              application.job,
                              event.target.value as Stage,
                            )
                          }
                        >
                          {Object.entries(stages).map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <span className="muted">
                          {formatDate(application.updatedAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="form-note">
                  <ShieldCheck size={14} /> Відкриття оголошення та підготовка
                  документів не надсилають заявку роботодавцю.
                </p>
              </>
            )}
            {view === "sources" && (
              <>
                <div className="source-intro">
                  <Globe2 size={27} />
                  <div>
                    <h2>Більше шляхів до вашої роботи</h2>
                    <p>
                      Використовуйте стрічку Job Bank або зберігайте вакансії з
                      інших майданчиків у спільний список.
                    </p>
                  </div>
                </div>
                <div className="sources-grid">
                  <SourceCard
                    initials="JB"
                    title="Job Bank"
                    subtitle="Державний портал Канади"
                    status={
                      feedError || feed?.status === "error"
                        ? "Оновлення недоступне"
                        : feed?.status === "stale"
                          ? "Попередня копія"
                          : feed?.status === "success"
                            ? "Стрічка працює"
                            : "Перевіряємо стрічку"
                    }
                    description={`Остання вибірка: ${feed?.jobs.length || 0} оголошень. Оновлення — ${formatTime(feed?.fetchedAt)}. Повний опис відкривається на сайті роботодавця або Job Bank.`}
                    url={`https://www.jobbank.gc.ca/jobsearch/jobsearch?searchstring=${encodeURIComponent(store.settings.roles.split(",")[0] || "")}&locationstring=${encodeURIComponent(store.settings.city)}`}
                    primary
                  />
                  <SourceCard
                    initials="in"
                    title="Indeed"
                    subtitle="Пошук та email-сповіщення"
                    status="Зовнішній пошук"
                    description="Знайдіть вакансію або налаштуйте сповіщення в Indeed. Додайте посилання та текст сюди — профіль і документи залишаться в одному місці."
                    url={`https://ca.indeed.com/jobs?q=${encodeURIComponent(store.settings.roles.split(",")[0] || "")}&l=${encodeURIComponent(store.settings.city)}`}
                  />
                  <SourceCard
                    initials="ji"
                    title="Jobillico"
                    subtitle="Вакансії та роботодавці Канади"
                    status="Зовнішній пошук"
                    description="Переглядайте оголошення та email-сповіщення Jobillico. Цікаві пропозиції можна додати вручну разом із повним описом."
                    url="https://www.jobillico.com/recherche-emploi"
                  />
                </div>
                <div className="surface import-source">
                  <div className="round-icon">
                    <Upload size={24} />
                  </div>
                  <div>
                    <h3>У вас є стрічка вакансій?</h3>
                    <p>
                      Імпортуйте завантажений RSS/Atom-файл. Вакансії з’являться
                      у вашому просторі; повторний імпорт не створює дублікати.
                    </p>
                  </div>
                  <button
                    className="button secondary"
                    onClick={() => importFeed.current?.click()}
                  >
                    <Upload size={17} />
                    Імпортувати XML
                  </button>
                  <input
                    ref={importFeed}
                    type="file"
                    hidden
                    accept=".xml,.rss,.atom"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (!file) return;
                      try {
                        if (file.size > 5 * 1024 * 1024)
                          throw new Error("Максимальний розмір — 5 МБ.");
                        const imported = parseAtom(await file.text());
                        update((s) => ({
                          ...s,
                          jobs: [
                            ...new Map(
                              [...s.jobs, ...imported].map((job) => [
                                job.id,
                                job,
                              ]),
                            ).values(),
                          ],
                        }));
                        notify(`Імпортовано вакансій: ${imported.length}`);
                        navigate("discover");
                      } catch (error) {
                        notify((error as Error).message);
                      }
                    }}
                  />
                </div>
                <div className="info-box">
                  <CircleHelp size={20} />
                  <p>
                    Indeed і Jobillico поки відкривають пошук на своїх сайтах.
                    Автоматичного входу до їхніх акаунтів, читання пошти чи
                    скрапінгу тут немає.
                  </p>
                </div>
              </>
            )}
            <footer className="page-footer">
              <span>
                JobSearch <span className="footer-dot">·</span> Ваш наступний
                крок
              </span>
              <span>
                <ShieldCheck size={14} />З думкою про ваші дані
              </span>
            </footer>
          </main>
        </div>
      </div>
      {settingsTab && (
        <SettingsPanel
          workspace={workspace}
          onClose={() => setSettingsTab(null)}
          notify={notify}
          initialTab={settingsTab}
        />
      )}
      {addJob && <JobForm onSave={saveJob} onClose={() => setAddJob(false)} />}
      {selected && (
        <JobDetails
          job={selected}
          application={store.applications[selected.id]}
          profile={store.profile}
          onClose={() => setSelectedId(null)}
          onSave={saveJob}
          onBookmark={() => toggleSaved(selected)}
          onPrepare={() => prepare(selected)}
          onStage={(stage) => changeStage(selected, stage)}
          onNote={(note) =>
            update((s) => ({
              ...s,
              applications: {
                ...s.applications,
                [selected.id]: {
                  ...(s.applications[selected.id] || {
                    job: selected,
                    stage: "saved" as const,
                  }),
                  note,
                  updatedAt: new Date().toISOString(),
                },
              },
            }))
          }
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          <span>{toast}</span>
          <button
            aria-label="Закрити повідомлення"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {printPacket && (
        <div className="print-area">
          <article>
            <pre>{printPacket.cv}</pre>
          </article>
          <article>
            <pre>{printPacket.letter}</pre>
          </article>
        </div>
      )}
    </>
  );
}

function DownloadIcon() {
  return <ArrowDownWideNarrow size={16} />;
}
function Stat({
  icon,
  value,
  label,
  detail,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  detail: string;
}) {
  return (
    <div className="stat-card">
      <span className="stat-icon">{icon}</span>
      <div>
        <div className="stat-main">
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
        <small>{detail}</small>
      </div>
    </div>
  );
}
function JobCard({
  job,
  saved,
  matches,
  onSelect,
  onSave,
}: {
  job: Job;
  saved: boolean;
  matches: string[];
  onSelect: () => void;
  onSave: () => void;
}) {
  return (
    <article className="job-card">
      <div className="job-top">
        <div className="company-identity">
          <span className={`company-avatar tone-${job.employer.length % 4}`}>
            {job.employer.slice(0, 2).toUpperCase() || "JB"}
          </span>
          <div>
            <span className="company-name">
              {job.employer || "Роботодавець не вказаний"}
            </span>
            <span className="job-source">
              {job.source} <span>·</span>{" "}
              {job.publishedAt
                ? `Опубліковано ${formatDate(job.publishedAt)}`
                : `Знайдено ${formatDate(job.firstSeenAt)}`}
            </span>
          </div>
        </div>
        <button
          className={`bookmark-button ${saved ? "saved" : ""}`}
          aria-label={
            saved ? `Збережена вакансія ${job.title}` : `Зберегти ${job.title}`
          }
          aria-pressed={saved}
          onClick={onSave}
        >
          <Bookmark size={20} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <button className="job-title" onClick={onSelect}>
        {job.title}
      </button>
      <div className="job-location">
        <MapPin size={15} />
        {job.location || "Місце не вказано"}
      </div>
      <div className="job-salary">
        <Wallet size={16} />
        {job.salary || "Оплату не вказано"}
      </div>
      <div className="job-tags">
        <span className={job.completeness === "full" ? "tag tag-green" : "tag"}>
          {job.completeness === "full" ? "Повний опис" : "Короткий опис"}
        </span>
        {matches.length > 0 && (
          <span className="tag tag-mint">
            <Sparkles size={12} />
            Збігів навичок: {matches.length}
          </span>
        )}
        {job.availability === "closed" && <span className="tag">Закрита</span>}
      </div>
      <div className="job-bottom">
        <span>
          {job.completeness === "full"
            ? "Можна підготувати документи"
            : "Перевірте вимоги в оригіналі"}
        </span>
        <button onClick={onSelect}>
          Переглянути
          <ArrowUpRight size={16} />
        </button>
      </div>
    </article>
  );
}
function SourceCard({
  initials,
  title,
  subtitle,
  status,
  description,
  url,
  primary,
}: {
  initials: string;
  title: string;
  subtitle: string;
  status: string;
  description: string;
  url: string;
  primary?: boolean;
}) {
  return (
    <article className="surface source-card">
      <span className={`source-logo ${primary ? "green" : ""}`}>
        {initials}
      </span>
      <h3>{title}</h3>
      <small>{subtitle}</small>
      <span className={`tag ${primary ? "tag-green" : ""}`}>
        <span className="tiny-dot" />
        {status}
      </span>
      <p>{description}</p>
      <ExternalLink href={url} className="button secondary">
        Відкрити пошук
      </ExternalLink>
    </article>
  );
}
function JobDetails({
  job,
  application,
  profile,
  onClose,
  onSave,
  onBookmark,
  onPrepare,
  onStage,
  onNote,
}: {
  job: Job;
  application?: import("./types").Application;
  profile: import("./types").Profile;
  onClose: () => void;
  onSave: (job: Job) => void;
  onBookmark: () => void;
  onPrepare: () => void;
  onStage: (stage: Stage) => void;
  onNote: (note: string) => void;
}) {
  const [editing, setEditing] = useState(false),
    [description, setDescription] = useState(job.description),
    [full, setFull] = useState(job.completeness === "full");
  const matches = matchingTerms(job, profile);
  return (
    <Modal title={job.title} subtitle={job.employer} onClose={onClose} wide>
      <div className="modal-body job-details">
        <div className="detail-meta">
          <span>
            <MapPin size={17} />
            {job.location || "Місце не вказано"}
          </span>
          <span>
            <Wallet size={17} />
            {job.salary || "Оплату не вказано"}
          </span>
        </div>
        <div className="detail-links">
          {safeUrl(job.url) && (
            <ExternalLink href={job.url} className="button secondary small">
              Оригінал оголошення
            </ExternalLink>
          )}
          <span className="tag">{job.source}</span>
          <span className="muted">Знайдено {formatDate(job.firstSeenAt)}</span>
        </div>
        <section className="detail-section">
          <div className="section-title-row">
            <h3>Опис вакансії</h3>
            <button className="text-link" onClick={() => setEditing(!editing)}>
              {editing
                ? "Скасувати редагування"
                : job.completeness === "full"
                  ? "Редагувати"
                  : "Додати повний опис"}
            </button>
          </div>
          {job.completeness !== "full" && !editing && (
            <div className="notice">
              У стрічці є лише короткі дані. Відкрийте оригінал та додайте
              повний опис із вимогами для підготовки документів.
            </div>
          )}
          {editing ? (
            <>
              <Field label="Повний текст оголошення">
                <textarea
                  rows={12}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={200000}
                />
              </Field>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={full}
                  onChange={(event) => setFull(event.target.checked)}
                />
                <span>Текст містить повний опис та вимоги</span>
              </label>
              <button
                className="button primary small"
                disabled={!description.trim()}
                onClick={() => {
                  onSave({
                    ...job,
                    description,
                    completeness: full ? "full" : "snippet",
                  });
                  setEditing(false);
                }}
              >
                <Check size={16} />
                Зберегти опис
              </button>
            </>
          ) : (
            <div className="description-text">
              {job.description || "Опис поки не додано."}
            </div>
          )}
        </section>
        <section className="detail-section">
          <h3>
            <Sparkles size={17} />
            Збіги з вашим профілем
          </h3>
          {matches.length ? (
            <>
              <div className="job-tags">
                {matches.map((match) => (
                  <span className="tag tag-green" key={match}>
                    {match}
                  </span>
                ))}
              </div>
              <p className="form-note">
                Точні текстові збіги підтверджених навичок. Вони не перевіряють
                рівень володіння або всі вимоги вакансії.
              </p>
            </>
          ) : (
            <p className="muted">
              {profile.skills
                ? "Точних текстових збігів поки немає. Це не означає, що ваш досвід не підходить."
                : "Додайте підтверджені навички у профіль, щоб бачити текстові збіги."}
            </p>
          )}
        </section>
        <section className="detail-section">
          <div className="form-grid">
            <Field label="Статус моєї заявки">
              <select
                value={application?.stage || ""}
                onChange={(event) => onStage(event.target.value as Stage)}
              >
                <option value="" disabled>
                  Ще не збережено
                </option>
                {Object.entries(stages).map(([key, title]) => (
                  <option value={key} key={key}>
                    {title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Мої нотатки">
              <textarea
                rows={3}
                value={application?.note || ""}
                onChange={(event) => onNote(event.target.value)}
                placeholder="Питання, контакт або наступний крок…"
                maxLength={10000}
              />
            </Field>
          </div>
          <p className="form-note">
            Позначаючи «Подано», ви підтверджуєте, що надіслали заявку
            самостійно.
          </p>
        </section>
      </div>
      <footer className="modal-footer">
        <button className="button secondary" onClick={onBookmark}>
          <Bookmark size={17} fill={application ? "currentColor" : "none"} />
          {application ? "Збережено" : "В обране"}
        </button>
        <button
          className="button primary"
          disabled={job.availability === "closed"}
          onClick={onPrepare}
        >
          <FileText size={17} />
          Підготувати документи
        </button>
      </footer>
    </Modal>
  );
}
