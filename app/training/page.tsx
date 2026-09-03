"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  LayoutDashboard,
  BarChart3,
} from "lucide-react";
import { SiteNavbar } from "@/components/shared/site-navbar";

const TOTAL_ROUNDS = 20;
const ROUND_SECONDS = 3; // simulated: one federated round "completes" every N seconds
const MODEL_NAME = "DistilBERT-mini";

type LogEntry = { time: string; color: string; text: string };

function formatElapsed(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function TrainingDashboard() {
  const router = useRouter();
  const pathname = usePathname();

  const [language, setLanguage] = useState("Swahili");
  const [aggregationMethod, setAggregationMethod] = useState("FedAvg");

  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [round, setRound] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);

  const [accuracy, setAccuracy] = useState(0);
  const [loss, setLoss] = useState(1.6);
  const [f1, setF1] = useState(0);
  const [precision, setPrecision] = useState(0);
  const [prevMetrics, setPrevMetrics] = useState({ accuracy: 0, loss: 1.6, f1: 0, precision: 0 });
  const [accHistory, setAccHistory] = useState<number[]>([]);

  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  // Refs mirror the latest values so the interval callback never reads stale state.
  const elapsedRef = useRef(0);
  const roundRef = useRef(0);
  const metricsRef = useRef({ accuracy: 0, loss: 1.6, f1: 0, precision: 0 });

  const isIdle = !isRunning && round === 0;
  const isCompleted = !isRunning && round >= TOTAL_ROUNDS && round > 0;

  useEffect(() => {
    if (!isRunning || isPaused) return;

    const id = setInterval(() => {
      elapsedRef.current += 1;
      setElapsedSec(elapsedRef.current);

      if (elapsedRef.current % ROUND_SECONDS === 0 && roundRef.current < TOTAL_ROUNDS) {
        roundRef.current += 1;
        const r = roundRef.current;

        const targetAcc = 90 + Math.random() * 4;
        const prevAcc = metricsRef.current.accuracy;
        const newAcc = Math.min(96, prevAcc + (targetAcc - prevAcc) * 0.18 + (Math.random() * 2 - 1));
        const newLoss = Math.max(0.08, metricsRef.current.loss * (0.8 + Math.random() * 0.08));
        const newF1 = Math.min(0.98, Math.max(0, newAcc / 100 - 0.04 + Math.random() * 0.02));
        const newPrecision = Math.min(0.98, Math.max(0, newAcc / 100 + Math.random() * 0.02 - 0.01));

        setPrevMetrics({ ...metricsRef.current });
        metricsRef.current = { accuracy: newAcc, loss: newLoss, f1: newF1, precision: newPrecision };

        setRound(r);
        setAccuracy(newAcc);
        setLoss(newLoss);
        setF1(newF1);
        setPrecision(newPrecision);
        setAccHistory((prev) => [...prev, newAcc]);

        const ts = formatElapsed(elapsedRef.current);
        setLogEntries((prev) => [
          ...prev,
          { time: ts, color: "#f59e0b", text: `📉 Round ${r}/${TOTAL_ROUNDS} — Loss: ${newLoss.toFixed(3)} | Acc: ${newAcc.toFixed(2)}%` },
          { time: ts, color: "#06b6d4", text: `🔄 Aggregating client updates via ${aggregationMethod}` },
          ...(r % 5 === 0
            ? [{ time: ts, color: "#a78bfa", text: `💾 Global model checkpoint saved (round ${r})` }]
            : []),
          ...(r >= TOTAL_ROUNDS
            ? [{ time: ts, color: "#10b981", text: `✅ Training complete — Final Accuracy ${newAcc.toFixed(2)}%` }]
            : []),
        ]);

        if (r >= TOTAL_ROUNDS) {
          setIsRunning(false);
          setIsPaused(false);
        }

        // Log round to backend
        fetch(`${process.env.NEXT_PUBLIC_SERVER_URL || 'https://synora-coordination-server.onrender.com'}/experiment/log`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            round: r,
            accuracy: newAcc / 100,
            loss: newLoss,
            participating_clients: [language.toLowerCase() + '_client']
          })
        }).catch(err => console.error('Failed to log round:', err));

      }
    }, 1000);

    return () => clearInterval(id);
  }, [isRunning, isPaused, aggregationMethod]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logEntries]);

  const handleStart = () => {
    if (isPaused) {
      setIsPaused(false);
      setLogEntries((prev) => [
        ...prev,
        { time: formatElapsed(elapsedRef.current), color: "#8892b0", text: "▶ Resumed training session." },
      ]);
      return;
    }
    if (isRunning) return;

    elapsedRef.current = 0;
    roundRef.current = 0;
    metricsRef.current = { accuracy: 0, loss: 1.6, f1: 0, precision: 0 };
    setElapsedSec(0);
    setRound(0);
    setAccuracy(0);
    setLoss(1.6);
    setF1(0);
    setPrecision(0);
    setPrevMetrics({ accuracy: 0, loss: 1.6, f1: 0, precision: 0 });
    setAccHistory([]);
    setLogEntries([
      { time: "00:00:00", color: "#10b981", text: "✓ Model downloaded from server (2.3 MB)" },
      { time: "00:00:00", color: "#06b6d4", text: "⚡ WebGPU backend initialized" },
      { time: "00:00:00", color: "#06b6d4", text: `⚡ Loading ${language} dataset...` },
    ]);
    setIsPaused(false);
    setIsRunning(true);
  };

  const handlePause = () => {
    if (!isRunning || isPaused) return;
    setIsPaused(true);
    setLogEntries((prev) => [
      ...prev,
      { time: formatElapsed(elapsedRef.current), color: "#f59e0b", text: "⏸ Training paused." },
    ]);
  };

  const handleStop = () => {
    if (!isRunning && !isPaused && round === 0) return;
    setIsRunning(false);
    setIsPaused(false);
    setLogEntries((prev) => [
      ...prev,
      { time: formatElapsed(elapsedRef.current), color: "#f43f5e", text: "⏹ Session stopped by user." },
    ]);
  };

  const handleClearLog = () => setLogEntries([]);

  const handleExportLog = () => {
    const content = logEntries.map((e) => `[${e.time}] ${e.text}`).join("\n");
    const blob = new Blob([content || "No log entries yet."], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `synora-training-log-${language.toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const startLabel = isPaused
    ? "▶ Resume Training"
    : isCompleted
      ? "🔄 Start New Session"
      : isRunning
        ? "⏳ Training in Progress..."
        : "🚀 Start Training";

  const startDisabled = isRunning && !isPaused;
  const pauseDisabled = !isRunning || isPaused;
  const stopDisabled = !isRunning && !isPaused && round === 0;

  const sidebarIcons = [
    { icon: Home, href: "/", label: "Home", onClick: () => router.push("/") },
    { icon: LayoutDashboard, href: "/training", label: "Training", onClick: () => router.push("/training") },
    { icon: BarChart3, href: "/dashboard", label: "Results", onClick: () => router.push("/dashboard") },
  ].map((item) => ({ ...item, active: pathname === item.href }));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        backgroundColor: "#060810",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* SECTION 1 — LEFT SIDEBAR */}
      <div
        style={{
          width: "72px",
          minWidth: "72px",
          height: "100vh",
          backgroundColor: "#0c0f1a",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: "16px",
          paddingBottom: "16px",
          position: "fixed",
          left: 0,
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            flex: 1,
          }}
        >
          {sidebarIcons.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <button
                key={index}
                onClick={item.onClick}
                title={item.label}
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  backgroundColor: item.active
                    ? "rgba(124,58,237,0.2)"
                    : "transparent",
                  border: item.active
                    ? "1px solid rgba(124,58,237,0.4)"
                    : "1px solid transparent",
                  color: item.active ? "#a78bfa" : "#4a5568",
                }}
              >
                <IconComponent size={20} />
              </button>
            );
          })}
        </div>

        {/* Synora Hexagon Logo at bottom */}
        <div style={{ marginTop: "auto", padding: "16px" }}>
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="hexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>

            {/* Hexagon outer shape */}
            <path
              d="M16 2L28 9V23L16 30L4 23V9L16 2Z"
              stroke="url(#hexGrad)"
              strokeWidth="1.5"
              fill="rgba(124,58,237,0.1)"
            />

            {/* Center node */}
            <circle cx="16" cy="16" r="2.5" fill="#a78bfa" />

            {/* Outer nodes */}
            <circle cx="16" cy="9" r="1.8" fill="#06b6d4" />
            <circle cx="22" cy="13" r="1.8" fill="#10b981" />
            <circle cx="22" cy="20" r="1.8" fill="#06b6d4" />
            <circle cx="16" cy="24" r="1.8" fill="#10b981" />
            <circle cx="10" cy="20" r="1.8" fill="#06b6d4" />
            <circle cx="10" cy="13" r="1.8" fill="#10b981" />

            {/* Connection lines from center to outer nodes */}
            <line x1="16" y1="16" x2="16" y2="9" stroke="rgba(167,139,250,0.5)" strokeWidth="1" />
            <line x1="16" y1="16" x2="22" y2="13" stroke="rgba(6,182,212,0.5)" strokeWidth="1" />
            <line x1="16" y1="16" x2="22" y2="20" stroke="rgba(16,185,129,0.5)" strokeWidth="1" />
            <line x1="16" y1="16" x2="16" y2="24" stroke="rgba(167,139,250,0.5)" strokeWidth="1" />
            <line x1="16" y1="16" x2="10" y2="20" stroke="rgba(6,182,212,0.5)" strokeWidth="1" />
            <line x1="16" y1="16" x2="10" y2="13" stroke="rgba(16,185,129,0.5)" strokeWidth="1" />
          </svg>
        </div>
      </div>

      {/* Main area with header and content */}
      <div
        style={{
          marginLeft: "72px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100vh",
        }}
      >
        {/* SECTION 2 — TOP HEADER BAR (shared site navbar, same style as landing/dashboard) */}
        <SiteNavbar
          position="static"
          breadcrumb="Training Dashboard"
          activeHref="/training"
          links={[
            { href: "/", label: "Home" },
            { href: "/dashboard", label: "Results" },
            { href: "https://github.com/Saba-Aftab-Ahmad/SYNORA", label: "GitHub", external: true },
          ]}
          rightSlot={
            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              {/* Session Status Pill */}
              <div
                style={{
                  backgroundColor: isRunning ? "rgba(16,185,129,0.15)" : isCompleted ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${isRunning ? "rgba(16,185,129,0.3)" : isCompleted ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.1)"}`,
                  borderRadius: "20px",
                  padding: "6px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: isRunning ? "#10b981" : isCompleted ? "#a78bfa" : "#6b7280",
                    boxShadow: isRunning ? "0 0 8px #10b981" : isCompleted ? "0 0 8px #a78bfa" : "none",
                  }}
                />
                <span
                  style={{
                    color: isRunning ? "#10b981" : isCompleted ? "#a78bfa" : "#8892b0",
                    fontSize: "13px",
                    fontWeight: 500,
                  }}
                >
                  {isRunning ? (isPaused ? "Session Paused" : "Session Active") : isCompleted ? "Training Complete" : "Session Idle"}
                </span>
              </div>

              {/* Round Pill */}
              <div
                style={{
                  backgroundColor: "rgba(124,58,237,0.15)",
                  border: "1px solid rgba(124,58,237,0.3)",
                  borderRadius: "20px",
                  padding: "6px 14px",
                  color: "#a78bfa",
                  fontSize: "13px",
                  fontWeight: 500,
                }}
              >
                Round {round} / {TOTAL_ROUNDS}
              </div>

              {/* Timer */}
              <div
                style={{
                  backgroundColor: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "20px",
                  padding: "6px 14px",
                  color: "#f0f4ff",
                  fontSize: "13px",
                  fontFamily: "JetBrains Mono, monospace",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                ⏱ {formatElapsed(elapsedSec)}
              </div>
            </div>
          }
        />

        {/* SECTION 3 — MAIN CONTENT */}
        <div
          style={{
            flex: 1,
            padding: "24px",
            overflowY: "auto",
          }}
        >
          {/* TOP ROW — 2 column grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 3fr",
              gap: "24px",
            }}
          >
            {/* LEFT CARD — Training Configuration */}
            <div
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "16px",
                backdropFilter: "blur(20px)",
                padding: "24px",
              }}
            >
              <h2
                style={{
                  color: "#f0f4ff",
                  fontSize: "18px",
                  fontWeight: 600,
                  marginBottom: "24px",
                  margin: "0 0 24px 0",
                }}
              >
                Training Configuration
              </h2>

              {/* Dropdowns */}
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    color: "#8892b0",
                    fontSize: "13px",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    backgroundColor: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "8px",
                    color: "#f0f4ff",
                    fontSize: "14px",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="Swahili">Swahili</option>
                  <option value="Kidawida">Kidawida</option>
                  <option value="Dholuo">Dholuo</option>
                </select>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label
                  style={{
                    color: "#8892b0",
                    fontSize: "13px",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Model
                </label>
                <div
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    backgroundColor: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "8px",
                    color: "#f0f4ff",
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{MODEL_NAME}</span>
                  <span style={{ color: "#8892b0", fontSize: "12px" }}>Auto-loaded in browser</span>
                </div>
              </div>

              {/* Aggregation Method Dropdown */}
              <div style={{ marginBottom: "24px" }}>
                <label
                  style={{
                    color: "#8892b0",
                    fontSize: "13px",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Aggregation Method
                </label>
                <select
                  value={aggregationMethod}
                  onChange={(e) => setAggregationMethod(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    backgroundColor: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "8px",
                    color: "#f0f4ff",
                    fontSize: "14px",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="FedAvg">FedAvg</option>
                  <option value="FedProx">FedProx</option>
                  <option value="FedAdam">FedAdam</option>
                </select>
              </div>

              {/* Action Buttons */}
              <button
                onClick={handleStart}
                disabled={startDisabled}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "10px",
                  border: "none",
                  background: startDisabled
                    ? "rgba(255,255,255,0.08)"
                    : "linear-gradient(135deg, #7c3aed, #06b6d4)",
                  color: startDisabled ? "#8892b0" : "#ffffff",
                  fontSize: "15px",
                  fontWeight: 600,
                  cursor: startDisabled ? "not-allowed" : "pointer",
                  marginBottom: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {startLabel}
              </button>

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={handlePause}
                  disabled={pauseDisabled}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "10px",
                    backgroundColor: "transparent",
                    border: `1px solid ${pauseDisabled ? "rgba(255,255,255,0.1)" : "#f59e0b"}`,
                    color: pauseDisabled ? "#4a5568" : "#f59e0b",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: pauseDisabled ? "not-allowed" : "pointer",
                    opacity: pauseDisabled ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  ⏸ Pause
                </button>
                <button
                  onClick={handleStop}
                  disabled={stopDisabled}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "10px",
                    backgroundColor: "transparent",
                    border: `1px solid ${stopDisabled ? "rgba(255,255,255,0.1)" : "#f43f5e"}`,
                    color: stopDisabled ? "#4a5568" : "#f43f5e",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: stopDisabled ? "not-allowed" : "pointer",
                    opacity: stopDisabled ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  ⏹ Stop
                </button>
              </div>
            </div>

            {/* RIGHT CARD — Live Metrics */}
            <div
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "16px",
                backdropFilter: "blur(20px)",
                padding: "24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "24px",
                }}
              >
                <h2
                  style={{
                    color: "#f0f4ff",
                    fontSize: "18px",
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  Live Metrics
                </h2>
                <div
                  style={{
                    backgroundColor: "rgba(16,185,129,0.15)",
                    border: "1px solid rgba(16,185,129,0.3)",
                    borderRadius: "20px",
                    padding: "6px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#10b981",
                      animation: "pulse 2s infinite",
                    }}
                  />
                  <span
                    style={{ color: "#10b981", fontSize: "13px", fontWeight: 500 }}
                  >
                    Round {round} of {TOTAL_ROUNDS}
                  </span>
                </div>
              </div>

              {/* 2x2 Metrics Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginBottom: "24px",
                }}
              >
                {/* Accuracy */}
                <div
                  style={{
                    backgroundColor: "rgba(124,58,237,0.1)",
                    border: "1px solid rgba(124,58,237,0.2)",
                    borderRadius: "12px",
                    padding: "20px",
                  }}
                >
                  <div
                    style={{ color: "#8892b0", fontSize: "13px", marginBottom: "8px" }}
                  >
                    Accuracy
                  </div>
                  <div
                    style={{
                      color: "#f0f4ff",
                      fontSize: "32px",
                      fontFamily: "JetBrains Mono, monospace",
                      fontWeight: 600,
                    }}
                  >
                    {accuracy.toFixed(1)}%
                  </div>
                  {round > 1 && (
                    <div style={{ color: accuracy >= prevMetrics.accuracy ? "#10b981" : "#f43f5e", fontSize: "13px", marginTop: "4px" }}>
                      {accuracy >= prevMetrics.accuracy ? "↑" : "↓"} {accuracy >= prevMetrics.accuracy ? "+" : ""}{(accuracy - prevMetrics.accuracy).toFixed(1)}%
                    </div>
                  )}
                </div>

                {/* Loss */}
                <div
                  style={{
                    backgroundColor: "rgba(6,182,212,0.1)",
                    border: "1px solid rgba(6,182,212,0.2)",
                    borderRadius: "12px",
                    padding: "20px",
                  }}
                >
                  <div
                    style={{ color: "#8892b0", fontSize: "13px", marginBottom: "8px" }}
                  >
                    Loss
                  </div>
                  <div
                    style={{
                      color: "#f0f4ff",
                      fontSize: "32px",
                      fontFamily: "JetBrains Mono, monospace",
                      fontWeight: 600,
                    }}
                  >
                    {loss.toFixed(3)}
                  </div>
                  {round > 1 && (
                    <div style={{ color: loss <= prevMetrics.loss ? "#10b981" : "#f43f5e", fontSize: "13px", marginTop: "4px" }}>
                      {loss <= prevMetrics.loss ? "↓" : "↑"} {(loss - prevMetrics.loss).toFixed(3)}
                    </div>
                  )}
                </div>

                {/* F1 Score */}
                <div
                  style={{
                    backgroundColor: "rgba(16,185,129,0.1)",
                    border: "1px solid rgba(16,185,129,0.2)",
                    borderRadius: "12px",
                    padding: "20px",
                  }}
                >
                  <div
                    style={{ color: "#8892b0", fontSize: "13px", marginBottom: "8px" }}
                  >
                    F1 Score
                  </div>
                  <div
                    style={{
                      color: "#f0f4ff",
                      fontSize: "32px",
                      fontFamily: "JetBrains Mono, monospace",
                      fontWeight: 600,
                    }}
                  >
                    {f1.toFixed(3)}
                  </div>
                  {round > 1 && (
                    <div style={{ color: f1 >= prevMetrics.f1 ? "#10b981" : "#f43f5e", fontSize: "13px", marginTop: "4px" }}>
                      {f1 >= prevMetrics.f1 ? "↑" : "↓"} {f1 >= prevMetrics.f1 ? "+" : ""}{(f1 - prevMetrics.f1).toFixed(3)}
                    </div>
                  )}
                </div>

                {/* Precision */}
                <div
                  style={{
                    backgroundColor: "rgba(245,158,11,0.1)",
                    border: "1px solid rgba(245,158,11,0.2)",
                    borderRadius: "12px",
                    padding: "20px",
                  }}
                >
                  <div
                    style={{ color: "#8892b0", fontSize: "13px", marginBottom: "8px" }}
                  >
                    Precision
                  </div>
                  <div
                    style={{
                      color: "#f0f4ff",
                      fontSize: "32px",
                      fontFamily: "JetBrains Mono, monospace",
                      fontWeight: 600,
                    }}
                  >
                    {precision.toFixed(3)}
                  </div>
                  {round > 1 && (
                    <div style={{ color: precision >= prevMetrics.precision ? "#10b981" : "#f43f5e", fontSize: "13px", marginTop: "4px" }}>
                      {precision >= prevMetrics.precision ? "↑" : "↓"} {precision >= prevMetrics.precision ? "+" : ""}{(precision - prevMetrics.precision).toFixed(3)}
                    </div>
                  )}
                </div>
              </div>

              {/* SVG Line Chart */}
              <div
                style={{
                  backgroundColor: "rgba(255,255,255,0.02)",
                  borderRadius: "12px",
                  padding: "20px",
                }}
              >
                <div
                  style={{
                    color: "#8892b0",
                    fontSize: "13px",
                    marginBottom: "16px",
                  }}
                >
                  Accuracy Over Rounds
                </div>
                <svg
                  viewBox="0 0 400 150"
                  style={{ width: "100%", height: "150px" }}
                >
                  <defs>
                    <linearGradient
                      id="areaGradient"
                      x1="0%"
                      y1="0%"
                      x2="0%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Grid lines */}
                  {[0, 1, 2, 3, 4].map((i) => (
                    <line
                      key={i}
                      x1="40"
                      y1={20 + i * 30}
                      x2="380"
                      y2={20 + i * 30}
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="1"
                    />
                  ))}

                  {/* Y-axis labels */}
                  {[100, 80, 60, 40, 20].map((val, i) => (
                    <text
                      key={i}
                      x="30"
                      y={25 + i * 30}
                      fill="#8892b0"
                      fontSize="10"
                      textAnchor="end"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {val}%
                    </text>
                  ))}

                  {accHistory.length > 1 ? (
                    <>
                      {/* Area fill */}
                      <path
                        d={`M ${40} ${140 - ((accHistory[0] - 20) / 80) * 120} ${accHistory.map((val, i) => `L ${40 + (i * 340) / (accHistory.length - 1)} ${140 - ((val - 20) / 80) * 120}`).join(" ")} L ${40 + 340} 140 L 40 140 Z`}
                        fill="url(#areaGradient)"
                      />

                      {/* Line */}
                      <path
                        d={`M ${accHistory.map((val, i) => `${40 + (i * 340) / (accHistory.length - 1)} ${140 - ((val - 20) / 80) * 120}`).join(" L ")}`}
                        fill="none"
                        stroke="#7c3aed"
                        strokeWidth="2"
                      />

                      {/* Data points */}
                      {accHistory.map((val, i) => (
                        <circle
                          key={i}
                          cx={40 + (i * 340) / (accHistory.length - 1)}
                          cy={140 - ((val - 20) / 80) * 120}
                          r="4"
                          fill="#06b6d4"
                          stroke="#060810"
                          strokeWidth="2"
                        />
                      ))}

                      {/* X-axis labels (thinned out when there are many rounds) */}
                      {accHistory.map((_, i) => {
                        const skip = Math.ceil(accHistory.length / 8);
                        if (i % skip !== 0 && i !== accHistory.length - 1) return null;
                        return (
                          <text
                            key={i}
                            x={40 + (i * 340) / (accHistory.length - 1)}
                            y="155"
                            fill="#8892b0"
                            fontSize="10"
                            textAnchor="middle"
                            fontFamily="JetBrains Mono, monospace"
                          >
                            R{i + 1}
                          </text>
                        );
                      })}
                    </>
                  ) : (
                    <text
                      x="200"
                      y="80"
                      fill="#4a5568"
                      fontSize="13"
                      textAnchor="middle"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      Start training to see live results
                    </text>
                  )}
                </svg>
              </div>
            </div>
          </div>

          {/* SECTION 4 — LIVE TRAINING LOG */}
          <div
            style={{
              marginTop: "24px",
              backgroundColor: "rgba(255,255,255,0.04)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "20px",
              overflow: "hidden",
            }}
          >
            {/* Card Header */}
            <div
              style={{
                padding: "20px 24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {/* Left: Title with blinking dot */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    backgroundColor: "#10b981",
                    animation: "blink 1s infinite",
                  }}
                />
                <span style={{ color: "#f0f4ff", fontSize: "16px", fontWeight: 600 }}>
                  Live Training Log
                </span>
              </div>

              {/* Right: Badges and buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {/* Auto-scroll badge */}
                <div
                  style={{
                    backgroundColor: "rgba(16,185,129,0.15)",
                    border: "1px solid rgba(16,185,129,0.3)",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    color: "#10b981",
                    fontSize: "12px",
                    fontWeight: 500,
                  }}
                >
                  Auto-scroll ON
                </div>

                {/* Clear Log button */}
                <button
                  onClick={handleClearLog}
                  style={{
                    backgroundColor: "transparent",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "8px",
                    padding: "8px 14px",
                    color: "#8892b0",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Clear Log
                </button>

                {/* Export button */}
                <button
                  onClick={handleExportLog}
                  style={{
                    backgroundColor: "rgba(124,58,237,0.2)",
                    border: "1px solid rgba(124,58,237,0.4)",
                    borderRadius: "8px",
                    padding: "8px 14px",
                    color: "#a78bfa",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Export
                </button>
              </div>
            </div>

            {/* Terminal Body */}
            <div
              ref={logContainerRef}
              style={{
                backgroundColor: "#030507",
                height: "220px",
                overflowY: "auto",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "13px",
                lineHeight: 1.9,
                padding: "16px 24px",
              }}
            >
              {logEntries.length === 0 ? (
                <div style={{ color: "#4a5568" }}>Press "Start Training" to begin a session…</div>
              ) : (
                logEntries.map((entry, i) => (
                  <div key={i}>
                    <span style={{ color: "#4a5568" }}>[{entry.time}]</span>{" "}
                    <span style={{ color: entry.color }}>{entry.text}</span>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Status Bar */}
            <div
              style={{
                backgroundColor: "#030507",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                padding: "12px 24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {/* Left: Status */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: isRunning ? (isPaused ? "#f59e0b" : "#10b981") : isCompleted ? "#a78bfa" : "#4a5568",
                    animation: isRunning && !isPaused ? "pulse 2s infinite" : "none",
                  }}
                />
                <span style={{ color: isRunning ? (isPaused ? "#f59e0b" : "#10b981") : isCompleted ? "#a78bfa" : "#4a5568", fontSize: "12px" }}>
                  {isRunning
                    ? isPaused
                      ? "Paused — click Resume to continue"
                      : "Training in progress…"
                    : isCompleted
                      ? "Training session complete"
                      : "Waiting to start…"}
                </span>
              </div>

              {/* Right: Event count */}
              <span style={{ color: "#4a5568", fontSize: "12px" }}>
                {logEntries.length} events | Round {round} of {TOTAL_ROUNDS}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pulse animation and slider styles */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
          select option {
            background-color: #0c0f1a;
            color: #f0f4ff;
          }
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #7c3aed;
            cursor: pointer;
            border: 2px solid #f0f4ff;
            box-shadow: 0 0 8px rgba(124,58,237,0.5);
            margin-top: -6px;
          }
          input[type="range"]::-moz-range-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #7c3aed;
            cursor: pointer;
            border: 2px solid #f0f4ff;
            box-shadow: 0 0 8px rgba(124,58,237,0.5);
          }
          input[type="range"]::-webkit-slider-runnable-track {
            height: 4px;
            background: rgba(255,255,255,0.1);
            border-radius: 2px;
          }
          input[type="range"]::-moz-range-track {
            height: 4px;
            background: rgba(255,255,255,0.1);
            border-radius: 2px;
          }
        `}
      </style>
    </div>
  );
}
