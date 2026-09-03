"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Download, TrendingUp, Target, Layers, Users, ChevronsUpDown, Shield, Home, LayoutGrid, BarChart3 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LabelList,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SiteNavbar } from "@/components/shared/site-navbar";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";


// SynoraLogo component with neural network design
function SynoraLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
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
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Hexagon outline - flat-top orientation */}
      <polygon
        points="50,8 86,29 86,71 50,92 14,71 14,29"
        fill="url(#hexFill)"
        stroke="url(#hexStroke)"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Connection lines between nodes */}
      <g stroke="#a855f7" strokeOpacity="0.5" strokeWidth="1.2">
        {/* center to all outer nodes */}
        <line x1="50" y1="50" x2="50" y2="28" />
        <line x1="50" y1="50" x2="72" y2="40" />
        <line x1="50" y1="50" x2="72" y2="62" />
        <line x1="50" y1="50" x2="50" y2="72" />
        <line x1="50" y1="50" x2="28" y2="62" />
        <line x1="50" y1="50" x2="28" y2="40" />
        {/* outer ring connections */}
        <line x1="50" y1="28" x2="72" y2="40" />
        <line x1="72" y1="40" x2="72" y2="62" />
        <line x1="72" y1="62" x2="50" y2="72" />
        <line x1="50" y1="72" x2="28" y2="62" />
        <line x1="28" y1="62" x2="28" y2="40" />
        <line x1="28" y1="40" x2="50" y2="28" />
      </g>

      {/* Nodes with glow - alternating purple and cyan */}
      <g filter="url(#nodeGlow)">
        {/* Center node - purple */}
        <circle cx="50" cy="50" r="3.5" fill="#a855f7" />
        {/* Top - cyan */}
        <circle cx="50" cy="28" r="3" fill="#22d3ee" />
        {/* Top-right - purple */}
        <circle cx="72" cy="40" r="3" fill="#a855f7" />
        {/* Bottom-right - cyan */}
        <circle cx="72" cy="62" r="3" fill="#22d3ee" />
        {/* Bottom - purple */}
        <circle cx="50" cy="72" r="3" fill="#a855f7" />
        {/* Bottom-left - cyan */}
        <circle cx="28" cy="62" r="3" fill="#22d3ee" />
        {/* Top-left - purple */}
        <circle cx="28" cy="40" r="3" fill="#a855f7" />
      </g>
    </svg>
  );
}

// Convergence data over 20 rounds
const convergenceData = [
  { round: "1", accuracy: 42, loss: 1.24 },
  { round: "2", accuracy: 48, loss: 1.1 },
  { round: "3", accuracy: 54, loss: 0.98 },
  { round: "4", accuracy: 59, loss: 0.88 },
  { round: "5", accuracy: 63, loss: 0.8 },
  { round: "6", accuracy: 67, loss: 0.73 },
  { round: "7", accuracy: 70, loss: 0.67 },
  { round: "8", accuracy: 72, loss: 0.62 },
  { round: "9", accuracy: 74, loss: 0.58 },
  { round: "10", accuracy: 76, loss: 0.55 },
  { round: "11", accuracy: 77, loss: 0.52 },
  { round: "12", accuracy: 78, loss: 0.5 },
  { round: "13", accuracy: 79, loss: 0.48 },
  { round: "14", accuracy: 80, loss: 0.47 },
  { round: "15", accuracy: 81, loss: 0.46 },
  { round: "16", accuracy: 82, loss: 0.45 },
  { round: "17", accuracy: 82.5, loss: 0.44 },
  { round: "18", accuracy: 83, loss: 0.435 },
  { round: "19", accuracy: 83.7, loss: 0.432 },
  { round: "20", accuracy: 84.2, loss: 0.43 },
];

// Per-language performance data
const languageData = [
  { language: "Amharic", accuracy: 62 },
  { language: "Igbo", accuracy: 66 },
  { language: "Yoruba", accuracy: 68 },
  { language: "Hausa", accuracy: 71 },
  { language: "Swahili", accuracy: 84 },
];

// Round history data
const roundHistoryData = [
  { round: "01", participants: 10, avgLoss: 1.24, accuracy: 42.0, epsilon: 0.82, status: "Complete" },
  { round: "05", participants: 12, avgLoss: 0.80, accuracy: 63.0, epsilon: 1.95, status: "Complete" },
  { round: "10", participants: 12, avgLoss: 0.55, accuracy: 76.0, epsilon: 3.40, status: "Complete" },
  { round: "15", participants: 12, avgLoss: 0.46, accuracy: 81.0, epsilon: 4.85, status: "Complete" },
  { round: "20", participants: 12, avgLoss: 0.43, accuracy: 84.2, epsilon: 6.20, status: "Complete" },
];

// Custom tooltip for the line chart
function CustomLineTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-lg p-3 shadow-xl">
        <p className="text-white text-sm font-medium mb-1">Round {label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.dataKey === "accuracy" ? "Accuracy" : "Loss"}: {entry.value}
            {entry.dataKey === "accuracy" ? "%" : ""}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

// Custom tooltip for the bar chart
function CustomBarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { language: string; accuracy: number } }>;
}) {
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

// Sidebar icon button component
function SidebarButton({
  icon: Icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <UITooltip>
      <TooltipTrigger
        onClick={onClick}
        className={`
          w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200
          ${active
            ? "bg-gradient-to-br from-purple-500/30 to-purple-600/20 border border-purple-500/40 text-purple-300 shadow-lg shadow-purple-500/20"
            : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
          }
        `}
      >
        <Icon className="w-5 h-5" />
      </TooltipTrigger>
      <TooltipContent side="right" className="bg-[#0a0a14] border-white/10 text-white">
        {label}
      </TooltipContent>
    </UITooltip>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const pathname = usePathname();

  const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'https://synora-coordination-server.onrender.com';

  useEffect(() => {
    fetch(`${SERVER_URL}/experiment/summary`)
      .then(res => res.json())
      .then(data => {
        // use data.rounds to populate your charts
        console.log(data);
      })
      .catch(err => console.error('Backend error:', err));
  }, [SERVER_URL]);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background gradient glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-purple-500/[0.15] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyan-500/[0.10] rounded-full blur-[120px]" />
      </div>

      {/* Fixed Left Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-16 bg-[#0a0a14] border-r border-white/5 z-40 flex-col items-center justify-between py-6">
        {/* Top icons */}
        <div className="flex flex-col gap-3">
          <SidebarButton icon={Home} label="Home" active={pathname === "/"} onClick={() => router.push("/")} />
          <SidebarButton icon={BarChart3} label="Training" active={pathname === "/training"} onClick={() => router.push("/training")} />
          <SidebarButton icon={LayoutGrid} label="Results" active={pathname === "/dashboard"} onClick={() => router.push("/dashboard")} />
        </div>

        {/* Bottom logo */}
        <div>
          <SynoraLogo size={28} />
        </div>
      </aside>

      {/* Navigation Header */}
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

      {/* Main Content - shifted right for sidebar */}
      <main className="relative z-10 pt-24 pb-12 md:ml-16">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {/* Page Header */}
          <div className="py-12 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">
                <span className="text-white">Training Results</span>
                <span className="bg-gradient-to-r from-purple-500 via-violet-500 to-cyan-400 bg-clip-text text-transparent">
                  {" "}— Swahili NLP Classification
                </span>
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-4 text-sm text-slate-400">
                <span>20 Rounds Complete</span>
                <span className="text-slate-600">•</span>
                <span>12 Participants</span>
                <span className="text-slate-600">•</span>
                <span>Session #FL-2024-SW-001</span>
              </div>
            </div>
            <button
              disabled
              title="Coming soon"
              className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded-lg text-slate-500 cursor-not-allowed opacity-60 w-fit"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>

          {/* Metric Cards with floating glow */}
          <div className="relative">
            {/* Floating glow behind metric cards */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
              {/* Global Accuracy */}
              <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-white/20 transition-colors rounded-2xl p-6 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 to-cyan-400" />
                <TrendingUp className="absolute top-6 right-6 w-5 h-5 text-emerald-400/40" />
                <p className="text-sm text-slate-400 mb-2">Global Accuracy</p>
                <p className="text-5xl font-bold text-emerald-400">84.2%</p>
                <p className="text-sm text-emerald-500 mt-2">+2.3% from last round</p>
              </div>

              {/* Best F1 Score */}
              <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-white/20 transition-colors rounded-2xl p-6 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-400 to-blue-400" />
                <Target className="absolute top-6 right-6 w-5 h-5 text-cyan-400/40" />
                <p className="text-sm text-slate-400 mb-2">Best F1 Score</p>
                <p className="text-5xl font-bold text-cyan-400">0.891</p>
                <p className="text-sm text-slate-500 mt-2">Round 18 peak</p>
              </div>

              {/* Total Rounds */}
              <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-white/20 transition-colors rounded-2xl p-6 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 to-violet-400" />
                <Layers className="absolute top-6 right-6 w-5 h-5 text-purple-400/40" />
                <p className="text-sm text-slate-400 mb-2">Total Rounds</p>
                <p className="text-5xl font-bold text-purple-400">20</p>
                <p className="text-sm text-slate-500 mt-2">Completed successfully</p>
              </div>

              {/* Active Nodes */}
              <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-white/20 transition-colors rounded-2xl p-6 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-400 to-orange-400" />
                <Users className="absolute top-6 right-6 w-5 h-5 text-amber-400/40" />
                <p className="text-sm text-slate-400 mb-2">Active Nodes</p>
                <p className="text-5xl font-bold text-amber-400">12</p>
                <p className="text-sm text-slate-500 mt-2">All synchronized</p>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
            {/* Convergence Chart */}
            <div className="lg:col-span-3 bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-white/20 transition-colors rounded-2xl p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white">Convergence Over Rounds</h2>
                <p className="text-sm text-slate-400 mt-1">Accuracy & Loss across 20 training rounds</p>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={convergenceData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="round"
                      stroke="#64748b"
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      tickFormatter={(value) => `R${value}`}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#64748b"
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#64748b"
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      domain={[0, 1.5]}
                    />
                    <Tooltip content={<CustomLineTooltip />} />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ paddingBottom: 20 }}
                      formatter={(value) => <span className="text-slate-300 text-sm">{value}</span>}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="accuracy"
                      stroke="#a855f7"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: "#a855f7" }}
                      name="Accuracy"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="loss"
                      stroke="#22d3ee"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      activeDot={{ r: 4, fill: "#22d3ee" }}
                      name="Loss"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Language Performance Chart */}
            <div className="lg:col-span-2 bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-white/20 transition-colors rounded-2xl p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white">Per-Language Performance</h2>
                <p className="text-sm text-slate-400 mt-1">Final accuracy by language</p>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={languageData}
                    layout="vertical"
                    margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} stroke="#64748b" tick={{ fill: "#64748b", fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="language"
                      stroke="#64748b"
                      tick={{ fill: "#cbd5e1", fontSize: 12 }}
                      width={70}
                    />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Bar dataKey="accuracy" radius={[0, 4, 4, 0]} barSize={24}>
                      {languageData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.language === "Swahili" ? "url(#swahili-gradient)" : "#22d3ee"}
                          fillOpacity={entry.language === "Swahili" ? 1 : 0.6 + index * 0.1}
                        />
                      ))}
                      <LabelList
                        dataKey="accuracy"
                        position="right"
                        fill="#ffffff"
                        fontSize={12}
                        formatter={(value: React.ReactNode) => `${value ?? 0}%`}
                      />
                    </Bar>
                    <defs>
                      <linearGradient id="swahili-gradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#a855f7" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Round History Table */}
          <div className="mt-6 bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-white/20 transition-colors rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white">Round History</h2>
                <p className="text-sm text-slate-400 mt-1">Detailed metrics per training round</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">Showing 5 of 20 rounds</span>
                <span
                  className="text-sm text-slate-600 cursor-not-allowed select-none"
                  title="Coming soon"
                  aria-disabled="true"
                >
                  View All
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-white/[0.02] border-b border-white/10 hover:bg-white/[0.02]">
                    <TableHead className="text-slate-400 text-xs uppercase tracking-wider py-4 px-6">
                      <span className="flex items-center gap-1">
                        Round
                        <ChevronsUpDown className="w-3 h-3" />
                      </span>
                    </TableHead>
                    <TableHead className="text-slate-400 text-xs uppercase tracking-wider py-4 px-6">
                      <span className="flex items-center gap-1">
                        Participants
                        <ChevronsUpDown className="w-3 h-3" />
                      </span>
                    </TableHead>
                    <TableHead className="text-slate-400 text-xs uppercase tracking-wider py-4 px-6">
                      <span className="flex items-center gap-1">
                        Avg Loss
                        <ChevronsUpDown className="w-3 h-3" />
                      </span>
                    </TableHead>
                    <TableHead className="text-slate-400 text-xs uppercase tracking-wider py-4 px-6">
                      <span className="flex items-center gap-1">
                        Global Accuracy
                        <ChevronsUpDown className="w-3 h-3" />
                      </span>
                    </TableHead>
                    <TableHead className="text-slate-400 text-xs uppercase tracking-wider py-4 px-6">
                      <span className="flex items-center gap-1">
                        Privacy ε
                        <ChevronsUpDown className="w-3 h-3" />
                      </span>
                    </TableHead>
                    <TableHead className="text-slate-400 text-xs uppercase tracking-wider py-4 px-6">
                      <span className="flex items-center gap-1">
                        Status
                        <ChevronsUpDown className="w-3 h-3" />
                      </span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roundHistoryData.map((row, index) => (
                    <TableRow
                      key={row.round}
                      className={`border-b border-white/5 hover:bg-purple-500/5 transition-colors ${index % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent"
                        }`}
                    >
                      <TableCell className="py-4 px-6">
                        <span className="font-mono font-bold text-white">#{row.round}</span>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <span className="flex items-center gap-2 text-slate-200">
                          <Users className="w-4 h-4 text-slate-500" />
                          {row.participants} nodes
                        </span>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <span className="font-mono text-cyan-300">{row.avgLoss.toFixed(2)}</span>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-emerald-400">{row.accuracy.toFixed(1)}%</span>
                          <div className="w-16 h-1 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full bg-emerald-400 rounded-full"
                              style={{ width: `${row.accuracy}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <span className="flex items-center gap-2 font-mono text-purple-300">
                          <Shield className="w-4 h-4 text-purple-400/50" />
                          ε = {row.epsilon.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {row.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-12 text-center">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />
            <p className="text-sm text-slate-500 mb-3">
              Synora · Federated AI Training In Your Browser
            </p>
            <div className="flex items-center justify-center gap-1 text-sm">
              <span className="text-slate-600 cursor-not-allowed select-none" title="Coming soon" aria-disabled="true">
                Documentation
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-600 cursor-not-allowed select-none" title="Coming soon" aria-disabled="true">
                Privacy
              </span>
              <span className="text-slate-600">·</span>
              <a
                href="https://github.com/Saba-Aftab-Ahmad/SYNORA"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-white transition-colors"
              >
                GitHub
              </a>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
