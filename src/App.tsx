import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  FileText,
  Globe2,
  Languages,
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
  contentVersion,
  matchingTerms,
  parseAtom,
  parseFeed,
  preferenceReasons,
  safeUrl,
  sourceLabel,
  STAGES,
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
import { LANGUAGES, LANGUAGE_NAMES, useI18n, type Language } from "./i18n";
import { useWorkspace } from "./useWorkspace";
import type { Feed, Job, Packet, Stage, View } from "./types";
import { AdminPanel } from './AdminPanel';
import { AiPanel } from './AiPanel';
import { PasswordRecovery } from './PasswordRecovery';
import { serviceCall, type ServiceStatus, type LlmRun, type TailorResult } from './service';

const navigation = [
  { id: "discover", icon: Search },
  { id: "saved", icon: Bookmark },
  { id: "applications", icon: BriefcaseBusiness },
  { id: "profile", icon: UserRound },
  { id: "documents", icon: FileText },
  { id: "sources", icon: Globe2 },
] as const;
const stageBuild = import.meta.env.VITE_APP_ENV === "stage";

export default function App() {
  const { t, language, setLanguage } = useI18n();
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
  const [adminOpen,setAdminOpen]=useState(false);
  const [serviceState,setServiceState]=useState<{owner:string;value:ServiceStatus|null;error:string}|null>(null);
  const serviceRequest=useRef(0);
  const accountId=workspace.user?.id||null;
  const liveAccount=useRef(accountId);liveAccount.current=accountId;
  const serviceStatus=serviceState?.owner===accountId?serviceState.value:null;
  const refreshService=useCallback(async()=>{
    const sequence=++serviceRequest.current;
    if(!accountId){setServiceState(null);return;}
    try{const value=await serviceCall<ServiceStatus>('status');if(sequence===serviceRequest.current)setServiceState({owner:accountId,value,error:''});}
    catch(e){if(sequence===serviceRequest.current)setServiceState({owner:accountId,value:null,error:(e as Error).message});}
  },[accountId]);
  // The counter is a request sequence, not a DOM ref: bumping it in cleanup invalidates late responses.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{void refreshService();return()=>{serviceRequest.current++;};},[refreshService]);
  function saveAiPacket(run:LlmRun){
    if(!accountId||liveAccount.current!==accountId||run.user_id!==accountId||run.operation!=='tailor'||run.status!=='succeeded'||!run.result)return;
    const result=run.result as TailorResult;
    const now=new Date().toISOString();
    const contact=[store.profile.name,store.profile.email,store.profile.phone].filter(Boolean).join('\n');
    const packet:Packet={id:crypto.randomUUID(),jobId:run.input.job.id,title:run.input.job.title,employer:run.input.job.employer,
      cv:[contact,result.cv].filter(Boolean).join('\n\n'),letter:[contact,result.letter].filter(Boolean).join('\n\n'),
      profileVersion:run.input.profileVersion,descriptionVersion:contentVersion(run.input.job.description),createdAt:now,approvedAt:null,
      llmRunId:run.id,llmRulesVersion:run.rules_version};
    update(s=>{
      if(s.packets.some(p=>p.llmRunId===run.id))return s;
      const job=jobs.find(j=>j.id===run.input.job.id);
      const existing=s.applications[run.input.job.id];
      return {...s,packets:[packet,...s.packets],applications:!job||existing?s.applications:{...s.applications,
        [job.id]:{job,stage:'reviewing',note:'',updatedAt:now}}};
    });
    setSelectedId(null);navigate('documents');notify(t('toast.aiDraftSaved'));
  }
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
      setFeedError(t("feed.loadError"));
    } finally {
      setLoading(false);
    }
  }
  // Load the public feed once on mount; later refreshes are explicit.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void refreshFeed(), []);
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
    notify(t("toast.jobSaved"));
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
    notify(t(removing ? "toast.bookmarkRemoved" : "toast.bookmarkAdded"));
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
      t(stage === "submitted" ? "toast.markedSubmitted" : "toast.stageUpdated"),
    );
  }
  function prepare(job: Job) {
    if (!store.profile.cv.trim()) {
      setSelectedId(null);
      navigate("profile");
      notify(t("toast.addCvFirst"));
      return;
    }
    if (job.completeness !== "full") {
      setSelectedId(job.id);
      notify(t("toast.addFullDescription"));
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
      notify(t("toast.packetDraftCreated"));
    } catch (error) {
      notify((error as Error).message);
    }
  }
  const syncLabel = t(
    !workspace.configured
      ? "sync.connect"
      : !workspace.user
        ? "sync.signIn"
        : workspace.status === "synced"
          ? "sync.synced"
          : workspace.status === "conflict"
            ? "sync.conflict"
            : workspace.status === "offline"
              ? "sync.offline"
              : "sync.syncing",
  );
  const conditions = [
    store.settings.city,
    store.settings.roles,
    store.settings.minHourly &&
      t("results.fromHourly", { amount: store.settings.minHourly }),
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <>
      <div className="app-shell">
        {mobileNav && (
          <button
            className="nav-scrim"
            aria-label={t("menu.close")}
            onClick={() => setMobileNav(false)}
          />
        )}
        <aside className={`sidebar ${mobileNav ? "is-open" : ""}`}>
          <a
            className="brand"
            href={import.meta.env.BASE_URL}
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
              <small>{t("brand.tagline")}</small>
            </span>
          </a>
          <div className="sidebar-label">{t("sidebar.mySpace")}</div>
          <nav aria-label={t("nav.aria")}>
            {navigation.map(({ id, icon: Icon }) => (
              <button
                key={id}
                className={`nav-item ${view === id ? "active" : ""}`}
                aria-current={view === id ? "page" : undefined}
                onClick={() => navigate(id)}
              >
                <Icon size={19} />
                <span>{t(`nav.${id}`)}</span>
                {id === "saved" && saved.length > 0 && <b>{saved.length}</b>}
                {id === "documents" && store.packets.length > 0 && (
                  <b>{store.packets.length}</b>
                )}
              </button>
            ))}
          </nav>
          <div className="sidebar-spacer" />
          {serviceStatus?.isAdmin&&<button className="sidebar-settings" onClick={()=>setAdminOpen(true)}><ShieldCheck size={18}/>{t("admin.title")}</button>}
          <div className="sidebar-tip">
            <span className="mini-spark">
              <Sparkles size={20} />
            </span>
            <h3>
              {t("sidebar.tip.title1")}
              <br />
              {t("sidebar.tip.title2")}
            </h3>
            <p>
              {t("sidebar.tip.text1")}
              <br />
              {t("sidebar.tip.text2")}
            </p>
            <button
              onClick={() => navigate(store.profile.cv ? "saved" : "profile")}
            >
              {t(store.profile.cv ? "sidebar.tip.toSaved" : "sidebar.tip.addCv")}
              <ArrowUpRight size={15} />
            </button>
          </div>
          <button
            className="sidebar-settings"
            onClick={() => setSettingsTab("search")}
          >
            <Settings2 size={18} />
            {t("settings.title")}
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
              <strong>{store.profile.name || t("account.mine")}</strong>
              <small>
                <span
                  className={`status-dot ${workspace.status === "synced" ? "online" : ""}`}
                />
                {t(workspace.user ? "account.private" : "account.device")}
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
                aria-label={t("menu.open")}
                onClick={() => setMobileNav(true)}
              >
                <Menu size={21} />
              </button>
              <span className="breadcrumb-root">{t("breadcrumb.mySpace")}</span>
              <ChevronRight size={14} className="breadcrumb-root" />
              <strong>{t(`nav.${view}`)}</strong>
              {stageBuild && (
                <span className="env-badge" title={t("env.stage")}>
                  STAGE
                </span>
              )}
            </div>
            <div className="top-actions">
              <label className="language-select">
                <Languages size={16} />
                <select
                  aria-label={t("language.label")}
                  value={language}
                  onChange={(event) =>
                    setLanguage(event.target.value as Language)
                  }
                >
                  {LANGUAGES.map((code) => (
                    <option key={code} value={code}>
                      {LANGUAGE_NAMES[code]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="sync-button"
                onClick={() => setSettingsTab("sync")}
              >
                <Cloud size={17} />
                <span>{syncLabel}</span>
              </button>
              <button
                className="icon-button top-settings"
                aria-label={t("settings.title")}
                onClick={() => setSettingsTab("search")}
              >
                <Settings2 size={19} />
              </button>
            </div>
          </header>
          <main id="main-content">
            <div className="page-heading">
              <div>
                <p className="eyebrow">{t("page.eyebrow")}</p>
                <h1>
                  {view === "discover"
                    ? t("page.discover.title")
                    : t(`nav.${view}`)}
                </h1>
                <p className="page-description">
                  {t(`page.${view}.description`)}
                </p>
              </div>
              <button
                className="button primary add-top"
                onClick={() => setAddJob(true)}
              >
                <Plus size={18} />
                {t("job.add")}
              </button>
            </div>
            {workspace.error && (
              <div className="notice dismissible" role="alert">
                <span>{workspace.error}</span>
                <button
                  className="icon-button"
                  aria-label={t("notice.hide")}
                  onClick={workspace.clearError}
                >
                  <X size={17} />
                </button>
              </div>
            )}
            {workspace.conflict && (
              <div className="notice conflict-banner">
                <strong>{t("conflict.title")}</strong>
                <p>{t("conflict.text")}</p>
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
                    {t("common.downloadCopy")}
                  </button>
                  <button
                    className="button primary"
                    onClick={() => workspace.resolve("remote")}
                  >
                    {t("conflict.remote")}
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => workspace.resolve("local")}
                  >
                    {t("conflict.local")}
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
                      {t("hero.pill")}
                    </span>
                    <h2>
                      {t("hero.title1")}
                      <br />
                      {t("hero.title2")}
                    </h2>
                    <p>
                      {t("hero.text1")}
                      <br className="desktop-break" /> {t("hero.text2")}
                    </p>
                    <button
                      className="hero-button"
                      onClick={() => setSettingsTab("search")}
                    >
                      {t(
                        store.settings.city || store.settings.roles
                          ? "hero.refine"
                          : "hero.configure",
                      )}
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
                <section className="stats-grid" aria-label={t("stats.aria")}>
                  <Stat
                    icon={<Globe2 size={20} />}
                    value={feed?.jobs.length ?? "—"}
                    label={t("stats.feed.label")}
                    detail={t("stats.feed.detail")}
                  />
                  <Stat
                    icon={<Bookmark size={20} />}
                    value={saved.length}
                    label={t("stats.saved.label")}
                    detail={t("stats.saved.detail")}
                  />
                  <Stat
                    icon={<BriefcaseBusiness size={20} />}
                    value={
                      saved.filter((a) =>
                        ["submitted", "interview", "offer"].includes(a.stage),
                      ).length
                    }
                    label={t("stats.active.label")}
                    detail={t("stats.active.detail")}
                  />
                  <Stat
                    icon={<FileText size={20} />}
                    value={store.packets.length}
                    label={t("stats.packets.label")}
                    detail={t("stats.packets.detail")}
                  />
                </section>
              </>
            )}
            {(view === "discover" || view === "saved") && (
              <>
                <div className="section-title-row">
                  <h2>
                    {t(view === "saved" ? "jobs.savedTitle" : "nav.discover")}{" "}
                    <span className="count-badge">{filtered.length}</span>
                  </h2>
                  <button
                    className="quiet-button"
                    onClick={refreshFeed}
                    disabled={loading}
                  >
                    <RefreshCw size={15} className={loading ? "spin" : ""} />
                    <span>{t("common.refresh")}</span>
                  </button>
                </div>
                <div className="filterbar">
                  <div className="search-input">
                    <Search size={19} />
                    <input
                      aria-label={t("search.aria")}
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={t("search.placeholder")}
                    />
                    {query && (
                      <button
                        className="icon-button"
                        aria-label={t("search.clear")}
                        onClick={() => setQuery("")}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <select
                    aria-label={t("filter.sourceAria")}
                    value={sourceFilter}
                    onChange={(event) => setSourceFilter(event.target.value)}
                  >
                    <option value="all">{t("filter.allSources")}</option>
                    {[...new Set(jobs.map((j) => j.source))].map((source) => (
                      <option key={source} value={source}>
                        {sourceLabel(source)}
                      </option>
                    ))}
                  </select>
                  <button
                    className={`button filter-button ${store.settings.applyPreferences ? "is-active" : ""}`}
                    onClick={() => setSettingsTab("search")}
                  >
                    <SlidersHorizontal size={17} />
                    {t("filter.myConditions")}
                    {store.settings.applyPreferences && (
                      <span className="tiny-dot" />
                    )}
                  </button>
                </div>
                <div className="results-meta">
                  <span>
                    {store.settings.applyPreferences
                      ? t("results.conditions", {
                          conditions: conditions || t("results.noLimits"),
                        })
                      : t("results.all")}
                  </span>
                  <label>
                    <ArrowDownWideNarrow size={14} />
                    <select
                      aria-label={t("sort.aria")}
                      value={sort}
                      onChange={(event) => setSort(event.target.value)}
                    >
                      <option value="newest">{t("sort.newest")}</option>
                      <option value="skills">{t("sort.skills")}</option>
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
                    {t("feed.unavailable")}{" "}
                    {feed.fetchedAt &&
                      t("feed.copyFrom", { time: formatTime(feed.fetchedAt) })}
                  </div>
                )}
                {loading && !jobs.length ? (
                  <div className="loading-state">
                    <LoaderCircle className="spin" size={28} />
                    <p>{t("jobs.loading")}</p>
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
                      title={t(
                        view === "saved" && !saved.length
                          ? "empty.saved.title"
                          : "empty.matches.title",
                      )}
                      text={t(
                        view === "saved" && !saved.length
                          ? "empty.saved.text"
                          : "empty.matches.text",
                      )}
                    >
                      <button
                        className="button secondary"
                        onClick={() =>
                          navigate(view === "saved" ? "discover" : "sources")
                        }
                      >
                        {t(
                          view === "saved"
                            ? "empty.viewJobs"
                            : "empty.openSources",
                        )}
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
                    {t("jobs.showMore", {
                      count: Math.min(12, filtered.length - limit),
                    })}
                  </button>
                )}
                <div className="feed-footnote">
                  <Globe2 size={15} />
                  <p>
                    {t("feed.source")}{" "}
                    <a
                      href="https://www.jobbank.gc.ca/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Job Bank / Guichet-Emplois
                    </a>
                    . {t("feed.footnote", { time: formatTime(feed?.fetchedAt) })}
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
                  notify(t("toast.profileSaved"));
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
                    {t("pipeline.inList")}: <strong>{saved.length}</strong>
                  </span>
                  <span>
                    {t("pipeline.interviews")}:{" "}
                    <strong>
                      {saved.filter((a) => a.stage === "interview").length}
                    </strong>
                  </span>
                  <span>
                    {t("pipeline.offers")}:{" "}
                    <strong>
                      {saved.filter((a) => a.stage === "offer").length}
                    </strong>
                  </span>
                </div>
                {!saved.length ? (
                  <div className="surface">
                    <Empty
                      icon={<BriefcaseBusiness size={32} />}
                      title={t("applications.empty.title")}
                      text={t("applications.empty.text")}
                    >
                      <button
                        className="button primary"
                        onClick={() => navigate("discover")}
                      >
                        {t("applications.find")}
                        <ArrowRight size={17} />
                      </button>
                    </Empty>
                  </div>
                ) : (
                  <div className="surface applications-table">
                    <div className="table-header">
                      <span>{t("table.job")}</span>
                      <span>{t("table.status")}</span>
                      <span>{t("table.updated")}</span>
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
                          aria-label={t("applications.statusAria", {
                            title: application.job.title,
                          })}
                          value={application.stage}
                          onChange={(event) =>
                            changeStage(
                              application.job,
                              event.target.value as Stage,
                            )
                          }
                        >
                          {STAGES.map((stage) => (
                            <option key={stage} value={stage}>
                              {t(`stage.${stage}`)}
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
                  <ShieldCheck size={14} /> {t("applications.note")}
                </p>
              </>
            )}
            {view === "sources" && (
              <>
                <div className="source-intro">
                  <Globe2 size={27} />
                  <div>
                    <h2>{t("sources.intro.title")}</h2>
                    <p>{t("sources.intro.text")}</p>
                  </div>
                </div>
                <div className="sources-grid">
                  <SourceCard
                    initials="JB"
                    title="Job Bank"
                    subtitle={t("sources.jobbank.subtitle")}
                    status={t(
                      feedError || feed?.status === "error"
                        ? "sources.status.unavailable"
                        : feed?.status === "stale"
                          ? "sources.status.stale"
                          : feed?.status === "success"
                            ? "sources.status.ok"
                            : "sources.status.checking",
                    )}
                    description={t("sources.jobbank.description", {
                      count: feed?.jobs.length || 0,
                      time: formatTime(feed?.fetchedAt),
                    })}
                    url={`https://www.jobbank.gc.ca/jobsearch/jobsearch?searchstring=${encodeURIComponent(store.settings.roles.split(",")[0] || "")}&locationstring=${encodeURIComponent(store.settings.city)}`}
                    primary
                  />
                  <SourceCard
                    initials="in"
                    title="Indeed"
                    subtitle={t("sources.indeed.subtitle")}
                    status={t("sources.external")}
                    description={t("sources.indeed.description")}
                    url={`https://ca.indeed.com/jobs?q=${encodeURIComponent(store.settings.roles.split(",")[0] || "")}&l=${encodeURIComponent(store.settings.city)}`}
                  />
                  <SourceCard
                    initials="ji"
                    title="Jobillico"
                    subtitle={t("sources.jobillico.subtitle")}
                    status={t("sources.external")}
                    description={t("sources.jobillico.description")}
                    url="https://www.jobillico.com/recherche-emploi"
                  />
                </div>
                <div className="surface import-source">
                  <div className="round-icon">
                    <Upload size={24} />
                  </div>
                  <div>
                    <h3>{t("import.title")}</h3>
                    <p>{t("import.text")}</p>
                  </div>
                  <button
                    className="button secondary"
                    onClick={() => importFeed.current?.click()}
                  >
                    <Upload size={17} />
                    {t("import.button")}
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
                          throw new Error(t("error.maxSize"));
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
                        notify(t("toast.imported", { count: imported.length }));
                        navigate("discover");
                      } catch (error) {
                        notify((error as Error).message);
                      }
                    }}
                  />
                </div>
                <div className="info-box">
                  <CircleHelp size={20} />
                  <p>{t("sources.info")}</p>
                </div>
              </>
            )}
            <footer className="page-footer">
              <span>
                JobSearch <span className="footer-dot">·</span>{" "}
                {t("footer.tagline")}
              </span>
              <span>
                <ShieldCheck size={14} />
                {t("footer.privacy")}
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
      {adminOpen&&serviceStatus?.isAdmin&&accountId&&<AdminPanel key={accountId} onClose={()=>setAdminOpen(false)} notify={notify} onConfigChange={()=>void refreshService()}/>}
      <PasswordRecovery/>
      {addJob && <JobForm onSave={saveJob} onClose={() => setAddJob(false)} />}
      {selected && (
        <JobDetails
          key={`${accountId||'guest'}:${selected.id}`}
          job={selected}
          application={store.applications[selected.id]}
          profile={store.profile}
          ai={<>
            {serviceState?.owner===accountId&&serviceState?.error&&<div className="notice" role="alert">{serviceState.error}<button className="text-link" onClick={()=>void refreshService()}>{t("ai.refreshService")}</button></div>}
            <AiPanel key={`${accountId||'guest'}:${selected.id}`} job={selected} profile={store.profile} settings={store.settings} userId={accountId} service={serviceStatus} onPacket={saveAiPacket} onUsageChange={()=>void refreshService()}/>
          </>}
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
            aria-label={t("toast.close")}
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
  const { t } = useI18n();
  return (
    <article className="job-card">
      <div className="job-top">
        <div className="company-identity">
          <span className={`company-avatar tone-${job.employer.length % 4}`}>
            {job.employer.slice(0, 2).toUpperCase() || "JB"}
          </span>
          <div>
            <span className="company-name">
              {job.employer || t("job.noEmployer")}
            </span>
            <span className="job-source">
              {sourceLabel(job.source)} <span>·</span>{" "}
              {job.publishedAt
                ? t("job.published", { date: formatDate(job.publishedAt) })
                : t("job.found", { date: formatDate(job.firstSeenAt) })}
            </span>
          </div>
        </div>
        <button
          className={`bookmark-button ${saved ? "saved" : ""}`}
          aria-label={t(saved ? "job.savedAria" : "job.saveAria", {
            title: job.title,
          })}
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
        {job.location || t("job.noLocation")}
      </div>
      <div className="job-salary">
        <Wallet size={16} />
        {job.salary || t("job.noSalary")}
      </div>
      <div className="job-tags">
        <span className={job.completeness === "full" ? "tag tag-green" : "tag"}>
          {t(job.completeness === "full" ? "job.full" : "job.snippet")}
        </span>
        {matches.length > 0 && (
          <span className="tag tag-mint">
            <Sparkles size={12} />
            {t("job.skillMatches", { count: matches.length })}
          </span>
        )}
        {job.availability === "closed" && (
          <span className="tag">{t("job.closed")}</span>
        )}
      </div>
      <div className="job-bottom">
        <span>
          {t(
            job.completeness === "full"
              ? "job.canPrepare"
              : "job.checkOriginal",
          )}
        </span>
        <button onClick={onSelect}>
          {t("job.view")}
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
  const { t } = useI18n();
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
        {t("sources.openSearch")}
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
  ai,
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
  ai?: ReactNode;
}) {
  const { t } = useI18n();
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
            {job.location || t("job.noLocation")}
          </span>
          <span>
            <Wallet size={17} />
            {job.salary || t("job.noSalary")}
          </span>
        </div>
        <div className="detail-links">
          {safeUrl(job.url) && (
            <ExternalLink href={job.url} className="button secondary small">
              {t("details.original")}
            </ExternalLink>
          )}
          <span className="tag">{sourceLabel(job.source)}</span>
          <span className="muted">
            {t("job.found", { date: formatDate(job.firstSeenAt) })}
          </span>
        </div>
        <section className="detail-section">
          <div className="section-title-row">
            <h3>{t("details.description")}</h3>
            <button className="text-link" onClick={() => setEditing(!editing)}>
              {t(
                editing
                  ? "details.cancelEdit"
                  : job.completeness === "full"
                    ? "common.edit"
                    : "details.addFull",
              )}
            </button>
          </div>
          {job.completeness !== "full" && !editing && (
            <div className="notice">{t("details.snippetNotice")}</div>
          )}
          {editing ? (
            <>
              <Field label={t("details.fullText")}>
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
                <span>{t("details.fullCheckbox")}</span>
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
                {t("details.saveDescription")}
              </button>
            </>
          ) : (
            <div className="description-text">
              {job.description || t("details.noDescription")}
            </div>
          )}
        </section>
        <section className="detail-section">
          <h3>
            <Sparkles size={17} />
            {t("details.matches")}
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
              <p className="form-note">{t("details.matchesNote")}</p>
            </>
          ) : (
            <p className="muted">
              {t(profile.skills ? "details.noMatches" : "details.addSkills")}
            </p>
          )}
        </section>
        {ai}
        <section className="detail-section">
          <div className="form-grid">
            <Field label={t("details.myStatus")}>
              <select
                value={application?.stage || ""}
                onChange={(event) => onStage(event.target.value as Stage)}
              >
                <option value="" disabled>
                  {t("details.notSaved")}
                </option>
                {STAGES.map((stage) => (
                  <option value={stage} key={stage}>
                    {t(`stage.${stage}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("details.notes")}>
              <textarea
                rows={3}
                value={application?.note || ""}
                onChange={(event) => onNote(event.target.value)}
                placeholder={t("details.notesPlaceholder")}
                maxLength={10000}
              />
            </Field>
          </div>
          <p className="form-note">{t("details.submittedNote")}</p>
        </section>
      </div>
      <footer className="modal-footer">
        <button className="button secondary" onClick={onBookmark}>
          <Bookmark size={17} fill={application ? "currentColor" : "none"} />
          {t(application ? "stage.saved" : "details.bookmark")}
        </button>
        <button
          className="button primary"
          disabled={job.availability === "closed"}
          onClick={onPrepare}
        >
          <FileText size={17} />
          {t("details.prepare")}
        </button>
      </footer>
    </Modal>
  );
}
