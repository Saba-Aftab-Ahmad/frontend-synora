"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { SiteNavbar } from "@/components/shared/site-navbar";
import { NotificationDialog, type NoticeData } from "@/components/shared/notification-dialog";
import {
  checkHealth, formatLocalTime, getJoinableSessions, getOverview, type JoinableSession,
  type Architecture, type ClientInfo, type Overview, type Partition, type RoundLog, type RoundView, type SessionConfig,
} from "@/lib/api";
import { POLL_MS } from "@/lib/config";
import { detectBackend, type Capabilities } from "@/lib/backend_detector";
import { FLClient, type ClientStatus, type LocalRoundResult } from "@/lib/fl_client";

// ── Types / helpers ────────────────────────────────────────
type LogEntry = { ts: number; color: string; text: string };

// Only what the person who STARTS a training may choose. Learning rate, epochs, batch size,
// timeout, client selection etc. are fixed on the server (server/training_settings.py).
type Form = { total_rounds: number; partition_type: Partition; dirichlet_alpha: number };

const DEFAULT_FORM: Form = { total_rounds: 20, partition_type: "iid", dirichlet_alpha: 0.5 };

const STATUS_LABEL: Record<ClientStatus, { text: string; color: string }> = {
  idle: { text: "Ready", color: "#4a5568" },
  connecting: { text: "Connecting…", color: "#06b6d4" },
  waiting: { text: "Starting…", color: "#f59e0b" },
  training: { text: "Training locally", color: "#10b981" },
  submitting: { text: "Sending weights", color: "#06b6d4" },
  aggregating: { text: "Waiting for aggregation", color: "#a78bfa" },
  not_selected: { text: "Joined — starts with the next round", color: "#8892b0" },
  paused: { text: "Paused", color: "#f59e0b" },
  stopped: { text: "Stopped", color: "#f43f5e" },
  completed: { text: "Complete", color: "#a78bfa" },
  error: { text: "Error", color: "#ef4444" },
};

function validate(f: Form): Record<string, string> {
  const e: Record<string, string> = {};
  if (!Number.isInteger(f.total_rounds) || f.total_rounds < 1 || f.total_rounds > 100) e.total_rounds = "1 – 100";
  if (!(f.dirichlet_alpha >= 0.05 && f.dirichlet_alpha <= 10)) e.dirichlet_alpha = "0.05 – 10";
  return e;
}

const card: React.CSSProperties = {
  backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16, backdropFilter: "blur(20px)", padding: "clamp(16px, 3vw, 24px)", minWidth: 0,
};
const inputStyle: React.CSSProperties = {
  width: "100%", backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10, color: "#f0f4ff", padding: "9px 12px", fontSize: 14, outline: "none", minHeight: 40,
};
const lbl: React.CSSProperties = { color: "#8892b0", fontSize: 12, display: "block", marginBottom: 6 };

function Field({ label, error, children, hint }: { label: string; error?: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <label style={lbl}>{label}</label>
      {children}
      {error ? <div style={{ color: "#f43f5e", fontSize: 11, marginTop: 4 }}>{error}</div>
        : hint ? <div style={{ color: "#4a5568", fontSize: 11, marginTop: 4 }}>{hint}</div> : null}
    </div>
  );
}

function fmtElapsed(s: number) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

// ── Page ───────────────────────────────────────────────────
export default function TrainingDashboard() {
  const router = useRouter();
  const [form, setForm] = useState<Form>(DEFAULT_FORM);
  const errors = useMemo(() => validate(form), [form]);
  const formValid = Object.keys(errors).length === 0;

  const [status, setStatus] = useState<ClientStatus>("idle");
  const [notice, setNotice] = useState<NoticeData | null>(null);
  // the training that is running right now (anybody who presses Start joins it)
  const [running_, setRunningSession] = useState<JoinableSession | null>(null);
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [arch, setArch] = useState<Architecture | null>(null);
  const [me, setMe] = useState<ClientInfo | null>(null);
  const [sessionCfg, setSessionCfg] = useState<SessionConfig | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inherited, setInherited] = useState(false);
  const [shardInfo, setShardInfo] = useState<Record<string, number> | null>(null);
  const [view, setView] = useState<RoundView | null>(null);
  const [globalHist, setGlobalHist] = useState<RoundLog[]>([]);
  const [localHist, setLocalHist] = useState<LocalRoundResult[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [api, setApi] = useState<"unknown" | "online" | "waking" | "offline">("unknown");
  const [elapsed, setElapsed] = useState(0);

  const clientRef = useRef<FLClient | null>(null);
  const logBox = useRef<HTMLDivElement | null>(null);
  const startedAt = useRef<number | null>(null);

  const running = !["idle", "stopped", "completed", "error"].includes(status);
  const paused = status === "paused";
  const finished = ["stopped", "completed", "error"].includes(status);

  const addLog = useCallback((color: string, text: string) => {
    // Capture the time NOW (when the event happens). Calling Date.now() inside the
    // state updater would stamp the moment React happens to render instead, which
    // can be many seconds later while the browser is busy training (old log bug).
    const ts = Date.now();
    setLogs((p) => [...p.slice(-499), { ts, color, text }]);
  }, []);

  // client controller (created once)
  if (!clientRef.current && typeof window !== "undefined") {
    clientRef.current = new FLClient({
      onLog: addLog,
      onStatus: setStatus,
      onNotify: (n) => setNotice(n),
      onJoined: (j) => {
        setMe(j.client); setSessionId(j.session.session_id); setSessionCfg(j.session.config);
        setInherited(!j.created); setCaps(j.caps); setArch(j.arch); setShardInfo(j.shardInfo ?? null);
      },
      onRound: setView,
      onGlobal: (l) => setGlobalHist((p) => (p.some((x) => x.round === l.round) ? p : [...p, l])),
      onLocal: (r) => setLocalHist((p) => [...p, r]),
    });
  }

  // hardware detection + backend health on load
  useEffect(() => {
    detectBackend().then(setCaps).catch(() => undefined);
    setApi("waking");
    checkHealth().then(() => setApi("online")).catch(() => setApi("offline"));
    const c = clientRef.current;
    return () => { void c?.stop(); };
  }, []);

  // real elapsed timer (wall clock)
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => startedAt.current && setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [running]);

  // live session overview (participants) - NFR-P05: <= 3 s
  useEffect(() => {
    if (!sessionId || !running) return;
    let alive = true;
    const tick = () => getOverview(sessionId).then((o) => alive && setOverview(o)).catch(() => undefined);
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, [sessionId, running]);

  // while this client is not training: is a training already running that Start will join?
  useEffect(() => {
    if (running) return;
    let alive = true;
    const tick = () => getJoinableSessions().then((r) => alive && setRunningSession(r.sessions[0] ?? null)).catch(() => undefined);
    tick();
    const t = setInterval(tick, 3000);
    return () => { alive = false; clearInterval(t); };
  }, [running]);

  // show the WHOLE training so far (also the rounds that finished before this client joined)
  useEffect(() => {
    if (!overview?.rounds?.length) return;
    setGlobalHist((p) => {
      const have = new Set(p.map((x) => x.round));
      const add = overview.rounds.filter((r) => !have.has(r.round));
      return add.length ? [...p, ...add].sort((a, b) => a.round - b.round) : p;
    });
  }, [overview]);

  // one last refresh when a session ends so the participants table is not left stale
  useEffect(() => {
    if (sessionId && ["stopped", "completed", "error"].includes(status)) {
      getOverview(sessionId).then(setOverview).catch(() => undefined);
    }
  }, [status, sessionId]);

  useEffect(() => {
    if (logBox.current) logBox.current.scrollTop = logBox.current.scrollHeight;
  }, [logs]);

  const handleStart = () => {
    if ((!formValid && !joining) || running) return;
    setLogs([]); setGlobalHist([]); setLocalHist([]); setView(null); setOverview(null); setMe(null);
    setSessionId(null); setInherited(false); setElapsed(0);
    startedAt.current = Date.now();
    void clientRef.current?.start(form);
  };
  const handlePauseResume = () => (paused ? clientRef.current?.resume() : clientRef.current?.pause());
  const handleStop = () => void clientRef.current?.stop();

  const exportLog = () => {
    const text = logs.map((e) => `[${formatLocalTime(new Date(e.ts).toISOString(), true)}] ${e.text}`).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = "synora_training_log.txt";
    a.click();
  };

  // ── derived values ───────────────────────────────────────
  const last = globalHist[globalHist.length - 1];
  const prev = globalHist[globalHist.length - 2];
  const lastLocal = localHist[localHist.length - 1];
  const totalRounds = view?.total_rounds ?? sessionCfg?.total_rounds ?? running_?.total_rounds ?? form.total_rounds;
  const round = view?.round_number ?? 0;
  const chartData = useMemo(() => {
    const rounds = new Set<number>([...globalHist.map((g) => g.round), ...localHist.map((l) => l.round)]);
    return [...rounds].sort((a, b) => a - b).map((r) => ({
      round: r,
      global: globalHist.find((g) => g.round === r) ? +(globalHist.find((g) => g.round === r)!.accuracy * 100).toFixed(1) : null,
      local: localHist.find((l) => l.round === r) ? +(localHist.find((l) => l.round === r)!.accuracy * 100).toFixed(1) : null,
    }));
  }, [globalHist, localHist]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const num = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, (e.target.value === "" ? NaN : Number(e.target.value)) as never);

  // a training is already running and Start will join it -> its settings win, the form is read-only
  const joining = !running && !!running_;
  // Rounds and data partitioning are PER CLIENT: every window decides for itself.
  const shown: Form = form;                      // rounds AND data partitioning are your own choice
  const effPartition = shown.partition_type;
  const onlineNow = view?.live_clients ?? running_?.live_clients ?? 1;
  const showLangWarning = effPartition === "language" && onlineNow < 3;
  const st = STATUS_LABEL[status];
  const nonIid = effPartition !== "iid";
  const cfgLocked = running;                     // locked only while YOUR training runs
  const roundsLocked = running;                  // your own rounds: editable until you press Start

  const Delta = ({ cur, old, pct = false, lowerBetter = false }: { cur?: number | null; old?: number | null; pct?: boolean; lowerBetter?: boolean }) => {
    if (cur == null || old == null) return null;
    const d = cur - old;
    const good = lowerBetter ? d <= 0 : d >= 0;
    return <div style={{ color: good ? "#10b981" : "#f43f5e", fontSize: 11, marginTop: 2 }}>{d >= 0 ? "↑" : "↓"} {Math.abs(pct ? d * 100 : d).toFixed(pct ? 1 : 3)}{pct ? "%" : ""}</div>;
  };

  const metricCard = (label: string, value: string, color: string, delta?: React.ReactNode) => (
    <div key={label} style={{ backgroundColor: `${color}1a`, border: `1px solid ${color}33`, borderRadius: 10, padding: 12, minWidth: 0 }}>
      <div style={{ color: "#8892b0", fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div style={{ color: "#f0f4ff", fontSize: "clamp(18px,3.4vw,26px)", fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>{value}</div>
      {delta}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#060810", color: "#f0f4ff" }}>
      <SiteNavbar
        links={[{ href: "/", label: "Home" }, { href: "/training", label: "Live Demo" }, { href: "https://github.com/Saba-Aftab-Ahmad/SYNORA", label: "GitHub", external: true }]}
        activeHref="/training"
        breadcrumb="Training"
      />
      <NotificationDialog notice={notice} onClose={() => setNotice(null)} />

      {/* Persistent status bar (SRS NFR-U05) */}
      <div data-testid="status-bar" style={{ position: "sticky", top: 64, zIndex: 40, marginTop: 64, background: "rgba(6,8,16,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "8px clamp(12px,3vw,28px)", display: "flex", flexWrap: "wrap", gap: "6px 18px", alignItems: "center", fontSize: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: st.color, fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: st.color, animation: running && !paused ? "pulse 1.4s infinite" : undefined }} />
            <span data-testid="status-text">{st.text}</span>
          </span>
          <span style={{ color: "#8892b0" }}>Round <b style={{ color: "#f0f4ff" }}>{round}/{totalRounds}</b></span>
          <span style={{ color: "#8892b0" }}>Your rounds <b data-testid="my-rounds" style={{ color: "#f0f4ff" }}>{view ? `${view.my_rounds_done}/${view.my_rounds_wanted}` : "—"}</b></span>
          <span style={{ color: "#8892b0" }}>Elapsed <b style={{ color: "#f0f4ff", fontFamily: "JetBrains Mono, monospace" }}>{fmtElapsed(elapsed)}</b></span>
          <span style={{ color: "#8892b0" }}>Clients online <b style={{ color: "#f0f4ff" }}>{view ? view.live_clients : "—"}</b></span>
          <span style={{ color: "#8892b0" }}>Backend <b style={{ color: "#06b6d4" }}>{caps ? caps.backend.toUpperCase() : "…"}</b></span>
          <span style={{ color: "#8892b0" }}>Session <b style={{ color: "#f0f4ff" }}>{sessionId ? sessionId.slice(0, 8) : "—"}</b></span>
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, color: "#8892b0" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: api === "online" ? "#10b981" : api === "offline" ? "#f43f5e" : "#f59e0b" }} />
            API {api === "online" ? "connected" : api === "offline" ? "offline" : "connecting…"}
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "clamp(12px, 3vw, 28px)" }}>
        {me && (
          <div style={{ backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 12, padding: "10px 16px", marginBottom: 16, display: "flex", flexWrap: "wrap", gap: "6px 16px", fontSize: 13 }}>
            <span style={{ color: "#10b981" }}>✓ Registered</span>
            <span>Name: <b style={{ color: "#06b6d4" }}>{me.client_name}</b></span>
            <span>Data: <b style={{ color: "#a78bfa" }}>{me.language ?? `${effPartition} shard ${me.partition_index + 1}`}</b></span>
            {shardInfo && <span style={{ color: "#8892b0" }}>2000 samples: {Object.entries(shardInfo).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${v}`).join(" · ")}</span>}
            <span style={{ color: nonIid ? "#f59e0b" : "#10b981" }}>{nonIid ? "Non-IID partition" : "IID partition"}</span>
          </div>
        )}
        {inherited && (
          <div style={{ backgroundColor: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#f59e0b" }}>
            You joined a training that was already running. The data split was set by the client that started it; the number of rounds is your own. You start with the next round, from the current global model.
          </div>
        )}
        {showLangWarning && (
          <div style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 12, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#f5c26b" }}>
            Non-IID (one language per client): the global model only learns the languages of the clients that are online ({onlineNow} now, 3 are needed for all languages). With fewer clients its accuracy on the full 3-language test set stays low — more devices can join at any time, or use IID mode for a single-device demo.
          </div>
        )}

        {joining && running_ && (
          <div data-testid="running-banner" style={{ backgroundColor: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.35)", borderRadius: 12, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#c4b5fd" }}>
            <b>A training is already running</b> — round {Math.max(running_.current_round, 1)} · {running_.live_clients} client{running_.live_clients !== 1 ? "s" : ""} online
            {running_.accuracy != null ? ` · global accuracy ${(running_.accuracy * 100).toFixed(1)}%` : ""}. Choose YOUR OWN rounds and data partitioning, then press <b>Join Running Training</b>.
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))", gap: 16, marginBottom: 16 }}>
          {/* ── Config ── */}
          <section style={card} aria-label="Training configuration">
            <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 16 }}>Training Configuration</h2>

            <div style={{ marginBottom: 12 }}>
              <Field label="Rounds" error={errors.total_rounds} hint={joining ? "How many rounds YOU want to take part in (others choose their own)" : "How many rounds you want to take part in"}>
                <input type="number" style={inputStyle} disabled={roundsLocked} value={Number.isNaN(shown.total_rounds) ? "" : shown.total_rounds} onChange={num("total_rounds")} min={1} max={100} />
              </Field>
            </div>

            <div style={{ marginBottom: 12 }}>
              <Field label="Data partitioning" hint={shown.partition_type === "language" ? "Each client owns ONE language (natural non-IID)" : shown.partition_type === "dirichlet" ? "Dirichlet label-skew over the mixed pool (non-IID)" : "2000 random sentences of all 3 languages on every client"}>
                <select style={inputStyle} disabled={cfgLocked} value={shown.partition_type} onChange={(e) => set("partition_type", e.target.value as Partition)}>
                  <option value="iid">IID — mixed languages on every client</option>
                  <option value="language">Non-IID — one language per client</option>
                  <option value="dirichlet">Non-IID — Dirichlet (α)</option>
                </select>
              </Field>
            </div>
            {shown.partition_type === "dirichlet" && (
              <div style={{ marginBottom: 12 }}>
                <Field label="Dirichlet α (smaller = more skew)" error={errors.dirichlet_alpha}>
                  <input type="number" step="0.05" style={inputStyle} disabled={cfgLocked} value={Number.isNaN(shown.dirichlet_alpha) ? "" : shown.dirichlet_alpha} onChange={num("dirichlet_alpha")} />
                </Field>
              </div>
            )}

            <div style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "9px 12px", marginBottom: 14 }}>
              <div style={{ color: "#f0f4ff", fontSize: 14 }}>Embedding + Avg-Pool + Dense (lightweight)</div>
              <div style={{ color: "#8892b0", fontSize: 12, marginTop: 2 }}>
                {arch ? `${arch.total_parameters.toLocaleString()} parameters · ${(arch.model_size_bytes / 1e6).toFixed(2)} MB (limit 5 MB) · loaded from server` : "160,579 parameters · 0.64 MB (limit 5 MB) · loaded from server"}
              </div>
            </div>

            <div style={{ color: "#4a5568", fontSize: 11, marginBottom: 12, lineHeight: 1.6 }}>
              Anyone can join at any time: press Start Training on any device. Learning settings and client selection are handled automatically by the server.
            </div>

            {!running ? (
              <button data-testid="start-btn" onClick={handleStart} disabled={!formValid && !joining} style={{
                width: "100%", padding: 12, background: formValid ? "linear-gradient(135deg, #7c3aed, #06b6d4)" : "rgba(124,58,237,0.3)",
                border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 600, cursor: formValid ? "pointer" : "not-allowed", minHeight: 44,
              }}>
                {joining ? "▶ Join Running Training" : finished ? "⟳ Start New Training" : "▶ Start Training"}
              </button>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button data-testid="pause-btn" onClick={handlePauseResume} style={{ padding: 10, background: paused ? "rgba(16,185,129,0.15)" : "transparent", border: `1px solid ${paused ? "rgba(16,185,129,0.5)" : "rgba(255,255,255,0.25)"}`, borderRadius: 10, color: paused ? "#10b981" : "#f0f4ff", fontSize: 14, cursor: "pointer", minHeight: 44 }}>
                  {paused ? "▶ Resume" : "⏸ Pause"}
                </button>
                <button data-testid="stop-btn" onClick={handleStop} style={{ padding: 10, background: "transparent", border: "1px solid rgba(244,63,94,0.5)", borderRadius: 10, color: "#f43f5e", fontSize: 14, cursor: "pointer", minHeight: 44 }}>
                  ⏹ Stop
                </button>
              </div>
            )}

            {caps && (
              <div style={{ marginTop: 14, padding: "10px 12px", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 8, fontSize: 12, color: "#8892b0", lineHeight: 1.7 }}>
                <b style={{ color: "#f0f4ff" }}>Hardware</b> — backend <b style={{ color: "#06b6d4" }}>{caps.backend.toUpperCase()}</b>
                {" · "}WebGPU {caps.webgpu_available ? "✓" : "✗"} · WebNN {caps.webnn_available ? "✓" : "✗"} · {caps.cpu_cores} cores{caps.memory_gb ? ` · ${caps.memory_gb} GB` : ""}
              </div>
            )}
          </section>

          {/* ── Metrics ── */}
          <section style={card} aria-label="Live metrics">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              <h2 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>Live Metrics</h2>
              <span style={{ backgroundColor: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 20, padding: "4px 12px", color: "#10b981", fontSize: 12 }}>
                Round {round} of {totalRounds}
              </span>
            </div>

            <div style={{ color: "#8892b0", fontSize: 12, marginBottom: 8 }}>
              Global model — evaluated by the server on held-out validation data
            </div>
            <div data-testid="global-metrics" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10, marginBottom: 14 }}>
              {metricCard("Accuracy", last ? `${(last.accuracy * 100).toFixed(1)}%` : "—", "#7c3aed", <Delta cur={last?.accuracy} old={prev?.accuracy} pct />)}
              {metricCard("Loss", last ? Math.max(0, last.loss).toFixed(3) : "—", "#06b6d4", <Delta cur={last?.loss} old={prev?.loss} lowerBetter />)}
              {metricCard("F1 (macro)", last?.f1 != null ? last.f1.toFixed(3) : "—", "#10b981", <Delta cur={last?.f1} old={prev?.f1} />)}
              {metricCard("Precision (macro)", last?.precision != null ? last.precision.toFixed(3) : "—", "#f59e0b", <Delta cur={last?.precision} old={prev?.precision} />)}
            </div>

            <div style={{ color: "#8892b0", fontSize: 12, marginBottom: 8 }}>This client — local training on its own 2000 samples</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10, marginBottom: 14 }}>
              {metricCard("Local acc.", lastLocal ? `${(lastLocal.accuracy * 100).toFixed(1)}%` : "—", "#a78bfa")}
              {metricCard("Local loss", lastLocal ? Math.max(0, lastLocal.loss).toFixed(3) : "—", "#22d3ee")}
              {metricCard("Train time", lastLocal ? `${lastLocal.seconds.toFixed(1)}s` : "—", "#8892b0")}
            </div>

            <div style={{ backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 10, padding: "12px 8px 6px" }}>
              <div style={{ color: "#8892b0", fontSize: 12, margin: "0 8px 6px" }}>Accuracy per round</div>
              <div style={{ width: "100%", height: 220 }}>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 22 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="round" stroke="#64748b" tick={{ fill: "#8892b0", fontSize: 11 }} label={{ value: "Round", position: "insideBottom", offset: -12, fill: "#8892b0", fontSize: 12 }} />
                      <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fill: "#8892b0", fontSize: 11 }} tickFormatter={(v) => `${v}%`} label={{ value: "Accuracy (%)", angle: -90, position: "insideLeft", offset: 12, fill: "#8892b0", fontSize: 12 }} />
                      <Tooltip contentStyle={{ background: "#0c0f1a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8 }} labelFormatter={(l) => `Round ${l}`} />
                      <Legend verticalAlign="top" height={24} />
                      <Line type="monotone" dataKey="global" name="Global (server-evaluated)" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} connectNulls isAnimationActive={false} />
                      <Line type="monotone" dataKey="local" name="Local (this client)" stroke="#22d3ee" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 2 }} connectNulls isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: "100%", display: "grid", placeItems: "center", color: "#4a5568", fontSize: 13 }}>Start training to see results</div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* ── Participants ── */}
        {overview?.clients && overview.clients.length > 0 && (
          <section style={{ ...card, marginBottom: 16 }} aria-label="Participants">
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
              <h2 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>Participants</h2>
              <span style={{ color: "#8892b0", fontSize: 12 }}>
                {view && running ? `Round ${view.round_number}: ${view.received}/${view.selected_count ?? "?"} updates received` : ""}
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 520 }}>
                <thead>
                  <tr style={{ color: "#8892b0", textAlign: "left", fontSize: 11, textTransform: "uppercase" }}>
                    {["Client", "Data", "Backend", "Rounds", "Status", "This round"].map((h) => <th key={h} style={{ padding: "6px 8px", fontWeight: 500 }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {overview.clients.map((c) => (
                    <tr key={c.client_id} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <td style={{ padding: "8px" }}>{c.client_name}{me?.client_id === c.client_id ? <span style={{ color: "#06b6d4" }}> (you)</span> : null}</td>
                      <td style={{ padding: "8px", color: "#a78bfa" }}>{c.language ? `language · ${c.language}` : c.partition_type === "dirichlet" ? `non-IID · α ${c.dirichlet_alpha}` : "IID"}</td>
                      <td style={{ padding: "8px", color: "#8892b0" }}>{(c.backend ?? "").toUpperCase()}</td>
                      <td style={{ padding: "8px", color: "#8892b0" }}>{c.rounds_done ?? 0}/{c.rounds_wanted ?? "?"}</td>
                      <td style={{ padding: "8px", color: c.status === "left" ? "#f43f5e" : c.online ? "#10b981" : "#8892b0" }}>{c.status === "paused" ? "paused" : c.status === "left" ? "left" : c.online ? "online" : "offline"}</td>
                      <td style={{ padding: "8px", color: "#8892b0" }}>{c.status === "left" || (c.rounds_wanted != null && (c.rounds_done ?? 0) >= c.rounds_wanted) ? "finished" : c.submitted_this_round ? "✓ submitted" : c.selected_this_round ? "training…" : c.status === "paused" ? "paused" : "next round"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Log ── */}
        <section style={{ ...card, padding: 0, overflow: "hidden" }} aria-label="Live training log">
          <div style={{ padding: "12px clamp(12px,3vw,20px)", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: running ? "#10b981" : "#4a5568" }} />
              <span style={{ fontSize: 15, fontWeight: 600 }}>Live Training Log</span>
              <span style={{ color: "#4a5568", fontSize: 11 }}>times shown in your local time zone</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setLogs([])} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 12px", color: "#8892b0", fontSize: 12, cursor: "pointer" }}>Clear Log</button>
              <button onClick={exportLog} disabled={!logs.length} style={{ backgroundColor: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.4)", borderRadius: 8, padding: "6px 12px", color: "#a78bfa", fontSize: 12, cursor: "pointer" }}>Export</button>
            </div>
          </div>
          <div ref={logBox} data-testid="log-box" style={{ backgroundColor: "#030507", height: 220, overflowY: "auto", fontFamily: "JetBrains Mono, monospace", fontSize: 12, lineHeight: 1.8, padding: "12px clamp(12px,3vw,20px)" }}>
            {logs.length === 0 ? <div style={{ color: "#4a5568" }}>Press “Start Training” to begin…</div> : logs.map((e, i) => (
              <div key={i} style={{ wordBreak: "break-word" }}>
                <span style={{ color: "#4a5568" }}>[{formatLocalTime(new Date(e.ts).toISOString())}]</span>{" "}
                <span style={{ color: e.color }}>{e.text}</span>
              </div>
            ))}
          </div>
          <div style={{ backgroundColor: "#030507", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px clamp(12px,3vw,20px)", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 6, fontSize: 12 }}>
            <span style={{ color: st.color }}>{st.text}</span>
            <span style={{ color: "#4a5568" }}>{logs.length} events | Round {round} of {totalRounds}</span>
          </div>
        </section>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button onClick={() => router.push("/dashboard")} style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)", border: "none", borderRadius: 12, padding: "12px 32px", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", minHeight: 44 }}>
            View Results →
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        select option { background-color:#0c0f1a; color:#f0f4ff; }
        input:disabled, select:disabled { opacity: .55; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
