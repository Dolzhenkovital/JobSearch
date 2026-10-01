export type View =
  "discover" | "saved" | "applications" | "profile" | "documents" | "sources";
export type Stage =
  | "saved"
  | "reviewing"
  | "prepared"
  | "submitted"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";
export type Job = {
  id: string;
  title: string;
  employer: string;
  location: string;
  salary: string;
  url: string;
  source: string;
  description: string;
  completeness: "snippet" | "full";
  publishedAt: string | null;
  firstSeenAt: string;
  checkedAt: string;
  availability: "active" | "unknown" | "closed";
};
export type Profile = {
  name: string;
  email: string;
  phone: string;
  headline: string;
  summary: string;
  skills: string;
  cv: string;
  version: number;
};
export type Settings = {
  city: string;
  roles: string;
  minHourly: string;
  documentLanguage: "fr" | "en" | "uk";
  applyPreferences: boolean;
};
export type Application = {
  job: Job;
  stage: Stage;
  note: string;
  updatedAt: string;
  submittedAt?: string;
  evidence?: "user_reported";
};
export type Packet = {
  id: string;
  jobId: string;
  title: string;
  employer: string;
  cv: string;
  letter: string;
  profileVersion: number;
  descriptionVersion: string;
  createdAt: string;
  approvedAt: string | null;
  frozenAt?: string;
};
export type Store = {
  schemaVersion: 1;
  profile: Profile;
  settings: Settings;
  jobs: Job[];
  applications: Record<string, Application>;
  packets: Packet[];
};
export type Feed = {
  schemaVersion: 1;
  fetchedAt: string | null;
  lastAttemptAt: string;
  status: "success" | "stale" | "error";
  message: string;
  jobs: Job[];
};
