/**
 * Synora API Client (v2)
 * All communication with the Flask coordination server goes through here.
 *  - HTTPS only (see lib/config.ts)
 *  - X-Session-Token header on every client call (SDS: 401 without it)
 *  - Retries + "waking up server" handling for Render free-tier cold starts
 *  - SDS error schema:  { error, message, field, reference_id }
 */
import { BACKEND_URL } from "./config";
import type { WireTensor } from "./weight_codec";

// ── Types ──────────────────────────────────────────────────
export type Partition = "language" | "iid" | "dirichlet";

/** What the person who STARTS a training may choose. */
export interface StartConfig {
  total_rounds: number;
  partition_type: Partition;
  dirichlet_alpha: number;
}

/** Full session settings. Everything except StartConfig is fixed by the server (server/training_settings.py). */
export interface SessionConfig extends StartConfig {
  learning_rate: number;
  local_epochs: number;
  batch_size: number;
  round_timeout_seconds: number;
  min_participation_threshold: number;
  max_clients_per_round: number;
  selection_strategy: string;
  aggregation_method: "fedavg";
  seed: number;
}

export interface Architecture {
  name: string;
  vocab_size: number;
  embedding_dim: number;
  max_length: number;
  hidden_units: number;
  dropout_rate: number;
  num_classes: number;
  labels: string[];
  layers: { layer_name: string; shape: number[] }[];
  total_parameters: number;
  model_size_bytes: number;
}

export interface ClientInfo {
  client_id: string;
  client_name: string;
  partition: string;
  status: string;
  session_id: string;
  partition_index: number;
  partition_type?: Partition;
  dirichlet_alpha?: number;
  language: string | null;
  backend: string | null;
  capability_score: number | null;
  last_seen: string | null;
  rounds_wanted?: number | null;
  rounds_done?: number;
  joined_round?: number | null;
  session_token?: string;
  online?: boolean;
  selected_this_round?: boolean;
  submitted_this_round?: boolean;
}

export interface SessionInfo {
  session_id: string;
  status: "pending" | "active" | "completed" | "aborted";
  config: SessionConfig;
  current_round: number;
  model_version: number;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface JoinResponse {
  created_session: boolean;
  client: ClientInfo;
  session: SessionInfo;
  architecture: Architecture;
}

/** The training that is running right now (GET /api/sessions/joinable). */
export interface JoinableSession {
  session_id: string;
  status: "pending" | "active";
  current_round: number;
  rounds_completed: number;
  total_rounds: number;
  partition_type: Partition;
  dirichlet_alpha: number;
  live_clients: number;
  accuracy: number | null;
  f1: number | null;
  created_at: string;
}

export type JoinMode = "auto" | "join" | "new";

export interface PerClass {
  language: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  support: number;
}

export interface ClientRoundMetric {
  client_id: string;
  client_name: string;
  language: string | null;
  backend: string | null;
  dataset_size: number;
  local_accuracy: number | null;
  local_loss: number | null;
  train_seconds: number | null;
  payload_bytes: number | null;
  timestamp?: string;
  round?: number;
}

export interface RoundLog {
  round: number;
  accuracy: number;
  loss: number;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  avg_local_accuracy: number | null;
  avg_local_loss: number | null;
  payload_bytes: number | null;
  aggregation_ms: number | null;
  round_duration_seconds: number | null;
  aggregation_method: string | null;
  participating_clients: string[];
  client_count: number;
  per_class: PerClass[] | null;
  client_metrics: ClientRoundMetric[] | null;
  session_id: string | null;
  timestamp: string; // ISO-8601 UTC with ms and 'Z'
}

export type Phase = "waiting" | "train" | "wait" | "not_selected" | "my_rounds_done" | "session_complete" | "aborted";

export interface RoundView {
  session_id: string;
  session_status: SessionInfo["status"];
  /** planned end of the whole training (the furthest round any client asked for) */
  total_rounds: number;
  my_rounds_wanted: number;
  my_rounds_done: number;
  round_number: number;
  round_state: string;
  model_version: number;
  required_model_version: number;
  live_clients: number;
  clients_total: number;
  rounds_completed: number;
  deadline: string | null;
  server_time: string;
  client_status: string;
  selected: boolean;
  submitted: boolean;
  received: number;
  selected_count?: number;
  phase: Phase;
  last_round: RoundLog | null;
}

export interface GlobalModel {
  session_id: string;
  version: number;
  round: number;
  up_to_date: boolean;
  weights: WireTensor[] | null;
  accuracy: number | null;
  loss: number | null;
  architecture: Architecture;
}

export interface ShardResponse {
  num_samples: number;
  seq_len: number;
  x_b64: string;
  labels: number[];
  label_distribution: Record<string, number>;
  language: string | null;
  partition_type: Partition;
  partition_index: number;
}

/** GLOBAL numbers: the aggregated model of ALL clients on ALL devices. */
export interface GlobalSummary {
  status: SessionInfo["status"];
  rounds_completed: number;
  total_rounds: number;
  current_round: number;
  accuracy: number | null;
  loss: number | null;
  f1: number | null;
  precision: number | null;
  recall: number | null;
  /** every client-round averaged into the global result (e.g. 10 + 7 + 5 = 22) */
  client_rounds?: number;
  client_rounds_planned?: number;
  aggregation_rounds?: number;
  clients_total: number;
  clients_online: number;
  clients_contributed: number;
  clients_last_round: number;
  devices: string[];
}

export interface MyRound {
  my_round: number;
  round: number;
  local_accuracy: number | null;
  local_loss: number | null;
  train_seconds: number | null;
  dataset_size: number;
  backend: string | null;
  val_accuracy?: number | null;
  per_class?: PerClass[] | null;
  global_accuracy: number | null;
  global_loss: number | null;
  global_f1: number | null;
  timestamp: string;
}

export interface MyResults {
  client: ClientInfo;
  rounds: MyRound[];
  summary: {
    rounds_done: number;
    rounds_wanted: number;
    joined_round: number;
    samples: number | null;
    last_local_accuracy: number | null;
    best_local_accuracy: number | null;
    avg_local_accuracy: number | null;
    last_local_loss: number | null;
    avg_train_seconds: number | null;
    total_train_seconds: number;
    global_accuracy_at_last_round: number | null;
  };
}

/** The browser remembers which client it is, so the Results page can show ITS OWN history. */
const ME_KEY = "synora_me";
export function rememberMe(client_id: string, session_id: string) {
  try { const v = JSON.stringify({ client_id, session_id }); sessionStorage.setItem(ME_KEY, v); localStorage.setItem(ME_KEY, v); } catch { /* storage may be blocked */ }
}
export function recallMe(): { client_id: string; session_id: string } | null {
  try { const v = sessionStorage.getItem(ME_KEY) ?? localStorage.getItem(ME_KEY); return v ? JSON.parse(v) : null; } catch { return null; }
}

export interface Overview {
  my?: MyResults | null;
  session: SessionInfo | null;
  summary?: GlobalSummary | null;
  current_round: { round_number: number; state: string; deadline: string | null; selected_clients: string[] } | null;
  received?: number;
  clients: ClientInfo[];
  rounds: RoundLog[];
  latest?: RoundLog | null;
  partition_indicator?: "iid" | "non_iid";
  model: { name: string; parameters: number; size_bytes: number; size_mb: number; limit_mb: number; layers: string[] };
  server_time?: string;
}

export interface SelectionRow {
  round: number;
  client_id: string;
  client_name: string;
  strategy: string;
  selected: boolean;
  capability_score: number | null;
  reason: string;
  timestamp: string;
}

export class ApiError extends Error {
  status: number;
  code: string;
  field: string | null;
  constructor(status: number, code: string, message: string, field: string | null = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

// ── Core fetch ─────────────────────────────────────────────
type FetchOpts = {
  method?: string;
  body?: unknown;
  token?: string | null;
  retries?: number;
  timeoutMs?: number;
  onWake?: (attempt: number) => void;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function apiFetch<T>(endpoint: string, o: FetchOpts = {}): Promise<T> {
  const retries = o.retries ?? 3;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), o.timeoutMs ?? 60000);
    try {
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: o.method ?? (o.body !== undefined ? "POST" : "GET"),
        headers: {
          "Content-Type": "application/json",
          ...(o.token ? { "X-Session-Token": o.token } : {}),
        },
        body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
        signal: ctrl.signal,
        cache: "no-store",
      });
      clearTimeout(timer);
      if ([502, 503, 504].includes(res.status) && attempt < retries) {
        o.onWake?.(attempt + 1); // Render is waking up
        await sleep(2000 * (attempt + 1));
        continue;
      }
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new ApiError(
          res.status,
          e.error || "http_error",
          e.message || `Request failed: ${res.status} ${res.statusText}`,
          e.field ?? null
        );
      }
      return (await res.json()) as T;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof ApiError) throw err; // real HTTP error: do not retry
      lastErr = err;
      if (attempt < retries) {
        o.onWake?.(attempt + 1);
        await sleep(1500 * (attempt + 1));
        continue;
      }
    }
  }
  throw new ApiError(
    0,
    "network_error",
    `Cannot reach the coordination server. Check your connection and try again.${lastErr instanceof Error ? ` (${lastErr.message})` : ""}`
  );
}

// ── Session / client ───────────────────────────────────────
export const joinSession = (
  body: {
    client_name?: string; config?: Partial<StartConfig>; capabilities: Record<string, unknown>; preferred_language?: string;
    /** "join" = attach to `session_id`; "new" = start my own session; "auto" = join the newest, else start one. */
    mode?: JoinMode; session_id?: string;
  },
  onWake?: (n: number) => void
) => apiFetch<JoinResponse>("/api/clients/join", { body, retries: 5, onWake });

/** Sessions that are running right now and can still be joined. */
export const getJoinableSessions = (onWake?: (n: number) => void) =>
  apiFetch<{ sessions: JoinableSession[] }>("/api/sessions/joinable", { retries: 5, onWake, timeoutMs: 30000 });

export const leaveSession = (token: string) =>
  apiFetch<{ message: string }>("/api/clients/leave", { body: {}, token, retries: 0, timeoutMs: 8000 });

/** Used when the page is closed: `keepalive` lets the request finish after unload. */
export function leaveSessionBeacon(token: string) {
  try {
    void fetch(`${BACKEND_URL}/api/clients/leave`, {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json", "X-Session-Token": token },
      body: JSON.stringify({ reason: "page_closed" }),
    });
  } catch {
    /* ignore */
  }
}

export const setClientState = (token: string, state: "active" | "paused") =>
  apiFetch<{ status: string }>("/api/clients/status", { body: { state }, token, retries: 2 });

export const getRound = (token: string) => apiFetch<RoundView>("/api/rounds/current", { token, retries: 2 });

export const getGlobalModel = (token: string, since?: number) =>
  apiFetch<GlobalModel>(`/api/model/global${since !== undefined ? `?since=${since}` : ""}`, { token, retries: 3, timeoutMs: 90000 });

export const getShard = (token: string) => apiFetch<ShardResponse>("/api/dataset/shard", { token, retries: 3, timeoutMs: 90000 });

export const submitUpdate = (token: string, round: number, payload: Record<string, unknown>) =>
  apiFetch<{ status: string; aggregated: boolean; round_state: string; updates_received: number; required: number; model_version: number }>(
    `/api/rounds/${round}/submit`,
    { body: payload, token, retries: 2, timeoutMs: 90000 }
  );

// ── Public metrics (dashboard) ─────────────────────────────
export const getOverview = (sessionId?: string, clientId?: string) =>
  apiFetch<Overview>(`/api/sessions/current${sessionId ? `?session_id=${sessionId}${clientId ? `&client_id=${clientId}` : ""}` : clientId ? `?client_id=${clientId}` : ""}`, { retries: 1, timeoutMs: 30000 });

export const getSelection = () => apiFetch<{ selection: SelectionRow[] }>("/api/selection", { retries: 1 });
export const getEvents = () =>
  apiFetch<{ events: { event_type: string; detail: string; timestamp: string }[] }>("/api/events", { retries: 1 });

export const checkHealth = () =>
  apiFetch<{ status: string; database: string }>("/api/health", { retries: 4, timeoutMs: 60000 });

export const exportUrl = (kind: "csv" | "json" | "clients.csv") => `${BACKEND_URL}/api/export/${kind}`;

// ── Time helpers ───────────────────────────────────────────
/** Server timestamps are UTC ISO strings with 'Z' -> shown in the viewer's own time zone. */
export function formatLocalTime(iso: string | null | undefined, withDate = false): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  const t = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
  return withDate ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${t}` : t;
}
