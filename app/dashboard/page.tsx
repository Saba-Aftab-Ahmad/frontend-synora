"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Download, TrendingUp, Target, Layers, Users,
  Home, LayoutGrid, BarChart3, Cpu,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell, LabelList,
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SiteNavbar } from "@/components/shared/site-navbar";
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { exportUrl, formatLocalTime, getOverview, recallMe, type Overview, type RoundLog } from "@/lib/api";
import { POLL_MS } from "@/lib/config";

// ── Logo ───────────────────────────────────────────────────
function SynoraLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="hexStroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
        <radialGradient id="hexFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a1530" />
          <stop offset="100%" stopColor="#0a0a14" />
        </radialGradient>
        <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <polygon points="50,8 86,29 86,71 50,92 14,71 14,29" fill="url(#hexFill)" stroke="url(#hexStroke)" strokeWidth="3" strokeLinejoin="round" />
      <g stroke="#a855f7" strokeOpacity="0.5" strokeWidth="1.2">
        <line x1="50" y1="50" x2="50" y2="28" /><line x1="50" y1="50" x2="72" y2="40" />
        <line x1="50" y1="50" x2="72" y2="62" /><line x1="50" y1="50" x2="50" y2="72" />
        <line x1="50" y1="50" x2="28" y2="62" /><line x1="50" y1="50" x2="28" y2="40" />
        <line x1="50" y1="28" x2="72" y2="40" /><line x1="72" y1="40" x2="72" y2="62" />
        <line x1="72" y1="62" x2="50" y2="72" /><line x1="50" y1="72" x2="28" y2="62" />
        <line x1="28" y1="62" x2="28" y2="40" /><line x1="28" y1="40" x2="50" y2="28" />
      </g>
      <g filter="url(#nodeGlow)">
        <circle cx="50" cy="50" r="3.5" fill="#a855f7" />
        <circle cx="50" cy="28" r="3" fill="#22d3ee" />
        <circle cx="72" cy="40" r="3" fill="#a855f7" />
        <circle cx="72" cy="62" r="3" fill="#22d3ee" />
        <circle cx="50" cy="72" r="3" fill="#a855f7" />
        <circle cx="28" cy="62" r="3" fill="#22d3ee" />
        <circle cx="28" cy="40" r="3" fill="#a855f7" />
      </g>
    </svg>
  );
}

// ── Tooltips ───────────────────────────────────────────────
function CustomLineTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
  const NAMES: Record<string, string> = { accuracy: "Accuracy", loss: "Loss", f1: "F1" };
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-lg p-3 shadow-xl">
        <p className="text-white text-sm font-medium mb-1">Round {label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {NAMES[entry.dataKey] ?? entry.dataKey}: {entry.value}{entry.dataKey === "loss" ? "" : "%"}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

function CustomBarTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { language: string; accuracy: number } }> }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-lg p-3 shadow-xl">
        <p className="text-white text-sm font-medium">{payload[0].payload.language}</p>
        <p className="text-cyan-400 text-sm">{payload[0].payload.accuracy}% accuracy</p>
      </div>
    );
  }
  return null;
}

// ── Sidebar button ─────────────────────────────────────────
function SidebarButton({ icon: Icon, label, active = false, onClick }: { icon: React.ElementType; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <UITooltip>
      <TooltipTrigger onClick={onClick} className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 ${active ? "bg-gradient-to-br from-purple-500/30 to-purple-600/20 border border-purple-500/40 text-purple-300 shadow-lg shadow-purple-500/20" : "text-slate-500 hover:bg-white/5 hover:text-slate-300"}`}>
        <Icon className="w-5 h-5" />
      </TooltipTrigger>
      <TooltipContent side="right" className="bg-[#0a0a14] border-white/10 text-white">{label}</TooltipContent>
    </UITooltip>
  );
}

const LANG_COLORS = ["#22d3ee", "#a855f7", "#34d399"];

// ── Main component ─────────────────────────────────────────
export default function ResultsPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // ── Live data from the backend (polled every 2 s, SRS NFR-P05: <= 3 s) ──
  const fetchData = async () => {
    try {
      const me = recallMe();
      let data: Overview;
      try { data = await getOverview(me?.session_id, me?.client_id); }
      catch { data = await getOverview(); }       // remembered training no longer exists -> show the latest one
      setOverview(data);
      setLastUpdated(formatLocalTime(new Date().toISOString()));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cannot reach backend server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  const rounds: RoundLog[] = overview?.rounds ?? [];
  const session = overview?.session ?? null;
  const cfg = session?.config;
  const latestRound = rounds[rounds.length - 1];
  const firstRound = rounds[0];

  const convergenceData = rounds.map((r) => ({
    round: String(r.round),
    accuracy: parseFloat((r.accuracy * 100).toFixed(1)),
    loss: parseFloat(r.loss.toFixed(3)),
    f1: parseFloat(((r.f1 ?? 0) * 100).toFixed(1)),
  }));

  // GLOBAL numbers from the server: the combined model of ALL clients on ALL devices
  const sum = overview?.summary ?? null;
  const totalRounds = rounds.length;
  const globalAccuracy = latestRound ? parseFloat((latestRound.accuracy * 100).toFixed(1)) : 0;
  const f1 = latestRound?.f1 != null ? parseFloat(latestRound.f1.toFixed(3)) : null;
  const totalClients = sum?.clients_total ?? overview?.clients?.length ?? 0;
  const onlineClients = sum?.clients_online ?? overview?.clients?.filter((c) => c.online).length ?? 0;
  const contributed = sum?.clients_contributed ?? 0;
  const accuracyGain = latestRound && firstRound && rounds.length > 1
    ? parseFloat(((latestRound.accuracy - firstRound.accuracy) * 100).toFixed(1)) : 0;

  // REAL per-language performance: the server evaluates the global model on held-out
  // sentences of every language (per-class recall) after each round.
  const latestClients = latestRound?.client_metrics ?? [];
  const my = overview?.my ?? null;
  const myRounds = my?.rounds ?? [];
  const myConvergence = myRounds.map((r) => ({
    round: String(r.my_round),
    accuracy: r.local_accuracy != null ? parseFloat((r.local_accuracy * 100).toFixed(1)) : null,
    global: r.global_accuracy != null ? parseFloat((r.global_accuracy * 100).toFixed(1)) : null,
    loss: r.local_loss != null ? parseFloat(Math.max(0, r.local_loss).toFixed(3)) : null,
  }));
  const ms = my?.summary;
  const pct = (v: number | null | undefined) => (v != null ? `${(v * 100).toFixed(1)}%` : "—");
  const globalClientRounds = sum?.client_rounds ?? totalRounds;
  // Per-language chart: THIS client's own model after the chosen own round (default: the latest one)
  const [langRound, setLangRound] = useState<number | null>(null);
  const myLang = my ? (myRounds.find((r) => r.my_round === langRound) ?? myRounds[myRounds.length - 1]) : null;
  const languageData = ((my ? myLang?.per_class : latestRound?.per_class) ?? []).map((c, i) => ({
    language: c.language,
    accuracy: parseFloat((c.accuracy * 100).toFixed(1)),
    f1: c.f1,
    color: LANG_COLORS[i % LANG_COLORS.length],
  }));

  // THIS browser's own client: its own rounds, graphs and metrics (the top cards stay global)

  const statusLabel = session
    ? { pending: "Starting", active: "Training in progress", completed: "Completed", aborted: "Stopped (all clients left or round failed)" }[session.status]
    : "No session yet";

  const handleExport = (kind: "csv" | "json" | "clients.csv") => window.open(exportUrl(kind), "_blank");

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-purple-500/[0.15] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyan-500/[0.10] rounded-full blur-[120px]" />
      </div>

      {/* Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-16 bg-[#0a0a14] border-r border-white/5 z-40 flex-col items-center justify-between py-6">
        <div className="flex flex-col gap-3">
          <SidebarButton icon={Home} label="Home" active={pathname === "/"} onClick={() => router.push("/")} />
          <SidebarButton icon={BarChart3} label="Training" active={pathname === "/training"} onClick={() => router.push("/training")} />
          <SidebarButton icon={LayoutGrid} label="Results" active={pathname === "/dashboard"} onClick={() => router.push("/dashboard")} />
        </div>
        <SynoraLogo size={28} />
      </aside>

      {/* Navbar */}
      <SiteNavbar
        className="md:left-16"
        breadcrumb="Results"
        activeHref="/dashboard"
        links={[
          { href: "/", label: "Home" },
          { href: "/training", label: "Live Demo" },
          { href: "https://github.com/Saba-Aftab-Ahmad/SYNORA", label: "GitHub", external: true },
        ]}
      />

      {/* Main */}
      <main className="relative z-10 pt-24 pb-12 md:ml-16">
        <div className="max-w-7xl mx-auto px-4 md:px-8">

          {/* Header */}
          <div className="py-12 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">
                <span className="text-white">Training Results</span>
                <span className="bg-gradient-to-r from-purple-500 via-violet-500 to-cyan-400 bg-clip-text text-transparent">
                  {" "}— Kenyan NLP Classification
                </span>
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-4 text-sm text-slate-400">
                {loading ? (
                  <span className="text-slate-500">Loading from backend...</span>
                ) : error ? (
                  <span className="text-red-400">⚠ {error}</span>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${session?.status === "active" ? "bg-emerald-400 animate-pulse" : session?.status === "completed" ? "bg-purple-400" : "bg-slate-500"}`} />
                      {statusLabel}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span>{globalClientRounds}{sum?.client_rounds_planned ? ` / ${sum.client_rounds_planned}` : ""} Rounds Complete</span>
                    <span className="text-slate-600">•</span>
                    <span>{onlineClients} of {totalClients} client{totalClients !== 1 ? "s" : ""} online</span>
                    {overview?.partition_indicator && (
                      <>
                        <span className="text-slate-600">•</span>
                        <span className={overview.partition_indicator === "non_iid" ? "text-amber-400" : "text-emerald-400"}>
                          {overview.partition_indicator === "non_iid" ? "Non-IID data" : "IID data"}
                        </span>
                      </>
                    )}
                    {lastUpdated && (
                      <>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-500">Updated {lastUpdated}</span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Export buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleExport("json")}
                disabled={totalRounds === 0}
                className="flex items-center gap-2 px-4 py-2 border border-purple-500/30 rounded-lg text-purple-300 hover:bg-purple-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Export JSON
              </button>
              <button
                onClick={() => handleExport("csv")}
                disabled={totalRounds === 0}
                className="flex items-center gap-2 px-4 py-2 border border-cyan-500/30 rounded-lg text-cyan-300 hover:bg-cyan-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={() => handleExport("clients.csv")}
                disabled={totalRounds === 0}
                className="flex items-center gap-2 px-4 py-2 border border-emerald-500/30 rounded-lg text-emerald-300 hover:bg-emerald-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Per-client CSV
              </button>
            </div>
          </div>

          {/* No data state */}
          {!loading && totalRounds === 0 && !error && (
            <div className="text-center py-20 text-slate-500">
              <p className="text-lg mb-2">{session?.status === "active" ? `Round ${session.current_round} is running — ${onlineClients} client${onlineClients !== 1 ? "s" : ""} online` : "No training data yet"}</p>
              <p className="text-sm">{session?.status === "active" ? "The combined results appear here as soon as the first round is aggregated." : "Go to the Training Dashboard and start a training to see results here."}</p>
              <button
                onClick={() => router.push("/training")}
                className="mt-6 px-6 py-3 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-300 hover:bg-purple-500/30 transition-colors"
              >
                Go to Training Dashboard →
              </button>
            </div>
          )}

          {/* Metric cards */}
          {totalRounds > 0 && (
            <>
              <div className="relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  {/* Global Accuracy */}
                  <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-white/20 transition-colors rounded-2xl p-6 overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 to-cyan-400" />
                    <TrendingUp className="absolute top-6 right-6 w-5 h-5 text-emerald-400/40" />
                    <p className="text-sm text-slate-400 mb-2">Global Accuracy <span className="text-slate-600">· all clients combined</span></p>
                    <p className="text-5xl font-bold text-emerald-400">{globalAccuracy}%</p>
                    {accuracyGain !== 0 && (
                      <p className="text-sm text-emerald-500 mt-2">
                        {accuracyGain > 0 ? "+" : ""}{accuracyGain}% total gain
                      </p>
                    )}
                  </div>

                  {/* Best F1 */}
                  <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-white/20 transition-colors rounded-2xl p-6 overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-400 to-blue-400" />
                    <Target className="absolute top-6 right-6 w-5 h-5 text-cyan-400/40" />
                    <p className="text-sm text-slate-400 mb-2">F1 Score (macro)</p>
                    <p className="text-5xl font-bold text-cyan-400">{f1 ?? "—"}</p>
                    <p className="text-sm text-slate-500 mt-2">Server-evaluated, latest round</p>
                  </div>

                  {/* Total rounds */}
                  <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-white/20 transition-colors rounded-2xl p-6 overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 to-violet-400" />
                    <Layers className="absolute top-6 right-6 w-5 h-5 text-purple-400/40" />
                    <p className="text-sm text-slate-400 mb-2">Rounds Completed</p>
                    <p className="text-5xl font-bold text-purple-400">{globalClientRounds}</p>
                    <p className="text-sm text-slate-500 mt-2">{sum?.client_rounds_planned ? `of ${sum.client_rounds_planned} planned · ` : ""}all clients combined · {totalRounds} global aggregation{totalRounds !== 1 ? "s" : ""}</p>
                  </div>

                  {/* Active nodes */}
                  <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-white/20 transition-colors rounded-2xl p-6 overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-400 to-orange-400" />
                    <Users className="absolute top-6 right-6 w-5 h-5 text-amber-400/40" />
                    <p className="text-sm text-slate-400 mb-2">Clients (all devices)</p>
                    <p className="text-5xl font-bold text-amber-400">{contributed || totalClients}</p>
                    <p className="text-sm text-slate-500 mt-2">{onlineClients} online now · {latestRound ? `${latestRound.client_count} in last round` : "joined so far"}</p>
                  </div>
                </div>
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
                {/* Convergence chart — REAL DATA */}
                <div className="lg:col-span-3 bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-white/20 transition-colors rounded-2xl p-6">
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-white">{my ? "Your Convergence" : "Convergence Over Rounds"}</h2>
                    <p className="text-sm text-slate-400 mt-1">
                      {my ? `Your ${myRounds.length} round${myRounds.length !== 1 ? "s" : ""}: your local accuracy / loss and the global model's accuracy after each of them` : `Global model evaluated by the server on held-out data — ${totalRounds} rounds`}
                    </p>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={(my ? myConvergence : convergenceData) as Record<string, unknown>[]} margin={{ top: 20, right: 30, left: 0, bottom: 24 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="round" stroke="#64748b" tick={{ fill: "#64748b", fontSize: 12 }} tickFormatter={(v) => `R${v}`} label={{ value: my ? "Your round" : "Training round", position: "insideBottom", offset: -6, fill: "#94a3b8", fontSize: 12 }} height={44} />
                        <YAxis yAxisId="left" stroke="#64748b" tick={{ fill: "#64748b", fontSize: 12 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} label={{ value: "Accuracy (%)", angle: -90, position: "insideLeft", fill: "#94a3b8", fontSize: 12 }} />
                        <YAxis yAxisId="right" orientation="right" stroke="#64748b" tick={{ fill: "#64748b", fontSize: 12 }} domain={[0, 2]} label={{ value: "Loss", angle: 90, position: "insideRight", fill: "#94a3b8", fontSize: 12 }} />
                        <Tooltip content={<CustomLineTooltip />} />
                        <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 20 }} formatter={(value) => <span className="text-slate-300 text-sm">{value}</span>} />
                        <Line yAxisId="left" type="monotone" dataKey="accuracy" stroke="#a855f7" strokeWidth={2} dot={my ? { r: 3 } : false} activeDot={{ r: 4, fill: "#a855f7" }} name={my ? "Your local accuracy" : "Accuracy"} connectNulls />
                        <Line yAxisId="right" type="monotone" dataKey="loss" stroke="#22d3ee" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r: 4, fill: "#22d3ee" }} name={my ? "Your local loss" : "Loss"} connectNulls />
                        {my ? <Line yAxisId="left" type="monotone" dataKey="global" stroke="#34d399" strokeWidth={2} strokeDasharray="2 3" dot={{ r: 3 }} activeDot={{ r: 4, fill: "#34d399" }} name="Global accuracy" connectNulls /> : <Line yAxisId="left" type="monotone" dataKey="f1" stroke="#34d399" strokeWidth={2} strokeDasharray="2 3" dot={false} activeDot={{ r: 4, fill: "#34d399" }} name="F1 (%)" />}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Per-language bar chart */}
                <div className="lg:col-span-2 bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-white/20 transition-colors rounded-2xl p-6">
                  <div className="mb-6">
                    <div className="flex items-start justify-between gap-3">
                    <h2 className="text-xl font-semibold text-white">Per-Language Performance</h2>
                    {my && myRounds.length > 0 && (
                      <select data-testid="lang-round" value={myLang?.my_round ?? ""} onChange={(e) => setLangRound(Number(e.target.value))}
                        className="bg-white/5 border border-white/10 rounded-lg text-sm text-slate-200 px-2 py-1">
                        {myRounds.map((r) => <option key={r.my_round} value={r.my_round} className="bg-[#0a0a14]">Your round {r.my_round}</option>)}
                      </select>
                    )}
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{my ? `Your own model after your round ${myLang?.my_round ?? "—"} (global round ${myLang?.round ?? "—"}), per language on the server's held-out data` : "Global-model accuracy per language (server held-out data, latest round)"}</p>
                  </div>
                  <div className="h-80">
                    {languageData.length === 0 ? <div className="h-full grid place-items-center text-slate-500 text-sm">Waiting for the first evaluated round…</div> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={languageData} layout="vertical" margin={{ top: 0, right: 50, left: 0, bottom: 24 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} stroke="#64748b" tick={{ fill: "#64748b", fontSize: 12 }} tickFormatter={(v) => `${v}%`} label={{ value: "Accuracy (%)", position: "insideBottom", offset: -4, fill: "#94a3b8", fontSize: 12 }} height={40} />
                        <YAxis type="category" dataKey="language" stroke="#64748b" tick={{ fill: "#cbd5e1", fontSize: 12 }} width={74} label={{ value: "Language", angle: -90, position: "insideLeft", fill: "#94a3b8", fontSize: 12 }} />
                        <Tooltip content={<CustomBarTooltip />} />
                        <Bar dataKey="accuracy" radius={[0, 4, 4, 0]} barSize={24}>
                          {languageData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.7 + index * 0.1} />
                          ))}
                          <LabelList dataKey="accuracy" position="right" fill="#ffffff" fontSize={12} formatter={(value: React.ReactNode) => `${value ?? 0}%`} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>

              {/* Round history table — REAL DATA */}
              <div className="mt-6 bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-white/20 transition-colors rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-white">{my ? "Your Round History" : "Round History"}</h2>
                    <p className="text-sm text-slate-400 mt-1">
                      {my ? `Only the rounds YOU trained (${myRounds.length} of ${ms?.rounds_wanted ?? "?"} asked) — refreshes every ${POLL_MS / 1000} s` : `Live data from backend (refreshes every ${POLL_MS / 1000} s) — ${totalRounds} rounds recorded`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500">{my ? `${myRounds.length} rounds` : `All ${totalRounds} rounds`}</span>
                    <button
                      onClick={fetchData}
                      className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      ↻ Refresh
                    </button>
                  </div>
                </div>

                {my ? (
                <div className="overflow-x-auto" data-testid="my-history">
                  <Table className="min-w-[760px]">
                    <TableHeader>
                      <TableRow className="bg-white/[0.02] border-b border-white/10 hover:bg-white/[0.02]">
                        {["Your round", "Global round", "Timestamp (local)", "Samples", "Local loss", "Local acc.", "Global acc. then", "Train time"].map((h) => (
                          <TableHead key={h} className="text-slate-400 text-xs uppercase tracking-wider py-4 px-4">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myRounds.map((r, index) => (
                        <TableRow key={r.round} className={`border-b border-white/5 ${index % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent"}`}>
                          <TableCell className="py-3 px-4"><span className="font-mono font-bold text-white">#{String(r.my_round).padStart(2, "0")}</span></TableCell>
                          <TableCell className="py-3 px-4 text-slate-400 font-mono">R{r.round}</TableCell>
                          <TableCell className="py-3 px-4"><span title={r.timestamp} className="font-mono text-xs text-slate-300 whitespace-nowrap">{formatLocalTime(r.timestamp, true)}</span></TableCell>
                          <TableCell className="py-3 px-4 font-mono text-slate-300">{r.dataset_size}</TableCell>
                          <TableCell className="py-3 px-4 font-mono text-cyan-300">{r.local_loss != null ? Math.max(0, r.local_loss).toFixed(3) : "—"}</TableCell>
                          <TableCell className="py-3 px-4 font-mono text-emerald-300">{pct(r.local_accuracy)}</TableCell>
                          <TableCell className="py-3 px-4 font-mono text-purple-300">{pct(r.global_accuracy)}</TableCell>
                          <TableCell className="py-3 px-4 font-mono text-slate-300">{r.train_seconds != null ? `${r.train_seconds.toFixed(1)}s` : "—"}</TableCell>
                        </TableRow>
                      ))}
                      {myRounds.length === 0 && (
                        <TableRow><TableCell colSpan={8} className="py-6 px-4 text-center text-slate-500">You have not finished a round yet.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[760px]">
                    <TableHeader>
                      <TableRow className="bg-white/[0.02] border-b border-white/10 hover:bg-white/[0.02]">
                        {["Round", "Timestamp (local)", "Clients", "Loss", "Accuracy", "F1", "Status"].map((h) => (
                          <TableHead key={h} className="text-slate-400 text-xs uppercase tracking-wider py-4 px-4">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rounds.map((row, index) => (
                        <TableRow key={row.round} className={`border-b border-white/5 hover:bg-purple-500/5 transition-colors ${index % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent"}`}>
                          <TableCell className="py-3 px-4"><span className="font-mono font-bold text-white">#{String(row.round).padStart(2, "0")}</span></TableCell>
                          <TableCell className="py-3 px-4"><span data-testid="row-timestamp" title={row.timestamp} className="font-mono text-xs text-slate-300 whitespace-nowrap">{formatLocalTime(row.timestamp, true)}</span></TableCell>
                          <TableCell className="py-3 px-4">
                            <span className="flex items-center gap-2 text-slate-200" title={row.participating_clients.join(", ")}>
                              <Users className="w-4 h-4 text-slate-500" />{row.client_count}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 px-4"><span className="font-mono text-cyan-300">{Math.max(0, row.loss).toFixed(3)}</span></TableCell>
                          <TableCell className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-emerald-400">{(row.accuracy * 100).toFixed(1)}%</span>
                              <div className="w-16 h-1 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-emerald-400 rounded-full" style={{ width: `${row.accuracy * 100}%` }} /></div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-4"><span className="font-mono text-slate-200">{row.f1 != null ? row.f1.toFixed(3) : "—"}</span></TableCell>
                          <TableCell className="py-3 px-4">
                            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Complete
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                )}
              </div>

              {/* Per-client metrics (latest round) + session settings */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
                <div className="lg:col-span-3 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                  <h2 className="text-xl font-semibold text-white">{my ? `Your Metrics · ${my.client.client_name}` : "Per-Client Metrics"}</h2>
                  <p className="text-sm text-slate-400 mt-1 mb-4">{my ? "Only this browser's client — other clients see their own on their own page" : `Local results reported by each client in round ${latestRound?.round}`}</p>
                  {my && ms ? (
                  <dl data-testid="my-metrics" className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    {([
                      ["Data", my.client.language ? `Language · ${my.client.language}` : my.client.partition_type === "dirichlet" ? `Non-IID · α ${my.client.dirichlet_alpha}` : "IID (mixed)"],
                      ["Rounds", `${ms.rounds_done} of ${ms.rounds_wanted} done`],
                      ["Backend", (my.client.backend ?? "—").toUpperCase()],
                      ["Samples", ms.samples ?? "—"],
                      ["Last local acc.", pct(ms.last_local_accuracy)],
                      ["Best local acc.", pct(ms.best_local_accuracy)],
                      ["Avg local acc.", pct(ms.avg_local_accuracy)],
                      ["Last local loss", ms.last_local_loss != null ? Math.max(0, ms.last_local_loss).toFixed(3) : "—"],
                      ["Avg train time", ms.avg_train_seconds != null ? `${ms.avg_train_seconds.toFixed(1)}s` : "—"],
                      ["Total train time", `${ms.total_train_seconds.toFixed(1)}s`],
                      ["Joined at round", ms.joined_round],
                      ["Global acc. at your last round", pct(ms.global_accuracy_at_last_round)],
                    ] as [string, string | number][]).map(([k, v]) => (
                      <div key={k} className="rounded-xl bg-white/[0.03] border border-white/5 px-3 py-2"><dt className="text-slate-500 text-xs">{k}</dt><dd className="text-slate-100 font-mono mt-0.5">{v}</dd></div>
                    ))}
                  </dl>
                  ) : (
                  <div className="overflow-x-auto">
                    <Table className="min-w-[560px]">
                      <TableHeader>
                        <TableRow className="border-b border-white/10 hover:bg-transparent">
                          {["Client", "Data", "Backend", "Local acc.", "Local loss", "Train time"].map((h) => (
                            <TableHead key={h} className="text-slate-400 text-xs uppercase tracking-wider py-3 px-3">{h}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {latestClients.map((c) => (
                          <TableRow key={c.client_id} className="border-b border-white/5">
                            <TableCell className="py-3 px-3 text-slate-200">{c.client_name}</TableCell>
                            <TableCell className="py-3 px-3 text-purple-300">{c.language ?? "mixed"}</TableCell>
                            <TableCell className="py-3 px-3 text-slate-400">{(c.backend ?? "").toUpperCase()}</TableCell>
                            <TableCell className="py-3 px-3 font-mono text-emerald-300">{c.local_accuracy != null ? `${(c.local_accuracy * 100).toFixed(1)}%` : "—"}</TableCell>
                            <TableCell className="py-3 px-3 font-mono text-cyan-300">{c.local_loss != null ? Math.max(0, c.local_loss).toFixed(3) : "—"}</TableCell>
                            <TableCell className="py-3 px-3 font-mono text-slate-300">{c.train_seconds != null ? `${c.train_seconds.toFixed(1)}s` : "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  )}
                </div>

                <div className="lg:col-span-2 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2"><Cpu className="w-5 h-5 text-purple-300" />Experiment Settings</h2>
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {cfg && ([
                      ["Planned rounds", sum?.total_rounds ?? cfg.total_rounds], ["Learning rate", cfg.learning_rate], ["Local epochs", cfg.local_epochs],
                      ["Batch size", cfg.batch_size], ["Devices", sum?.devices?.length ? sum.devices.map((d) => d.toUpperCase()).join(", ") : "—"],
                      ["Min. clients per round", cfg.min_participation_threshold], ["Partition", "Own choice per client (see Participants)"],
                      ["Client selection", "Automatic"], ["Aggregation", "FedAvg"],
                    ] as [string, string | number][]).map(([k, v]) => (
                      <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="text-slate-200 text-right">{v}</dd></div>
                    ))}
                    {overview?.model && (
                      <>
                        <dt className="text-slate-500">Model</dt><dd className="text-slate-200 text-right">{overview.model.parameters.toLocaleString()} params</dd>
                        <dt className="text-slate-500">Model size</dt><dd className="text-slate-200 text-right">{overview.model.size_mb} MB / {overview.model.limit_mb} MB limit</dd>
                      </>
                    )}
                  </dl>
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <footer className="mt-12 text-center">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />
            <p className="text-sm text-slate-500 mb-3">Synora · Federated AI Training In Your Browser</p>
            <div className="flex items-center justify-center gap-1 text-sm">
              <a href="https://github.com/Saba-Aftab-Ahmad/SYNORA" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">
                GitHub
              </a>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
