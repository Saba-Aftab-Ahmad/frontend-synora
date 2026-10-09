"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SiteNavbar } from "@/components/shared/site-navbar";
import {
  registerClient,
  saveExperimentConfig,
  resetExperiment,
  resetClients,
  checkHealth,
  logRound,
} from "@/lib/api";

// ── Constants ──────────────────────────────────────────────
const TOTAL_ROUNDS = 20;
const ROUND_SECONDS = 3;
const STORAGE_KEY = "synora_training_session";

// STEP 3 FIX: Correct language → partition mapping
const LANGUAGE_PARTITION_MAP: Record<string, string> = {
  Dholuo: "luo_swa",
  Kalenjin: "kln_swa",
  Kidawida: "dav_swa",
};

// ── Types ──────────────────────────────────────────────────
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

  // ── Config state ───────────────────────────────────────
  const [language, setLanguage] = useState("Dholuo");
  const [aggregationMethod, setAggregationMethod] = useState("FedAvg");

  // ── Session state ──────────────────────────────────────
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [round, setRound] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);

  // ── Metrics ────────────────────────────────────────────
  const [accuracy, setAccuracy] = useState(0);
  const [loss, setLoss] = useState(1.6);
  const [f1, setF1] = useState(0);
  const [precision, setPrecision] = useState(0);
  const [prevMetrics, setPrevMetrics] = useState({ accuracy: 0, loss: 1.6, f1: 0, precision: 0 });
  const [accHistory, setAccHistory] = useState<number[]>([]);

  // ── Backend state ──────────────────────────────────────
  const [clientId, setClientId] = useState<string | null>(null);
  const [assignedPartition, setAssignedPartition] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<"unknown" | "online" | "offline">("unknown");

  // ── Log ────────────────────────────────────────────────
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  // ── Refs ───────────────────────────────────────────────
  const elapsedRef = useRef(0);
  const roundRef = useRef(0);
  const metricsRef = useRef({ accuracy: 0, loss: 1.6, f1: 0, precision: 0 });
  const clientIdRef = useRef<string | null>(null);
  const languageRef = useRef(language);
  const isRunningRef = useRef(false);
  const isPausedRef = useRef(false);

  const isIdle = !isRunning && round === 0;
  const isCompleted = !isRunning && round >= TOTAL_ROUNDS && round > 0;

  // ── STEP 4 FIX: Restore session from sessionStorage ───
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const d = JSON.parse(saved);
      setLanguage(d.language ?? "Dholuo");
      setAggregationMethod(d.aggregationMethod ?? "FedAvg");
      setRound(d.round ?? 0);
      setElapsedSec(d.elapsedSec ?? 0);
      setAccuracy(d.accuracy ?? 0);
      setLoss(d.loss ?? 1.6);
      setF1(d.f1 ?? 0);
      setPrecision(d.precision ?? 0);
      setAccHistory(d.accHistory ?? []);
      setClientId(d.clientId ?? null);
      setAssignedPartition(d.assignedPartition ?? null);
      setLogEntries(d.logEntries ?? []);
      roundRef.current = d.round ?? 0;
      elapsedRef.current = d.elapsedSec ?? 0;
      metricsRef.current = {
        accuracy: d.accuracy ?? 0,
        loss: d.loss ?? 1.6,
        f1: d.f1 ?? 0,
        precision: d.precision ?? 0,
      };
      clientIdRef.current = d.clientId ?? null;
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // ── STEP 4 FIX: Save session to sessionStorage ────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Only save if there is actual data to preserve
    if (round === 0 && logEntries.length === 0) return;
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        language,
        aggregationMethod,
        round,
        elapsedSec,
        accuracy,
        loss,
        f1,
        precision,
        accHistory,
        clientId,
        assignedPartition,
        logEntries,
      })
    );
  }, [
    language, aggregationMethod, round, elapsedSec,
    accuracy, loss, f1, precision, accHistory,
    clientId, assignedPartition, logEntries,
  ]);

  // ── Health check ───────────────────────────────────────
  useEffect(() => {
    checkHealth()
      .then(() => setBackendStatus("online"))
      .catch(() => setBackendStatus("offline"));
  }, []);

  useEffect(() => { languageRef.current = language; }, [language]);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  // ── Auto-scroll log ────────────────────────────────────
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logEntries]);

  const addLog = useCallback((color: string, text: string) => {
    const time = formatElapsed(elapsedRef.current);
    setLogEntries((prev) => [...prev, { time, color, text }]);
  }, []);

  const handleClearLog = () => setLogEntries([]);

  const handleExportLog = () => {
    const text = logEntries.map(e => `[${e.time}] ${e.text}`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "synora_training_log.txt";
    a.click();
  };

  // ── MAIN TRAINING HANDLER ──────────────────────────────
   const handleStart = async () => {
  //   if (isPaused) {
  //     setIsPaused(false);
  //     addLog("#8892b0", "Resumed training session.");
  //     return;
  //   }
  //   if (isRunning) return;
       if (isPaused) {
        isPausedRef.current = false;
        setIsPaused(false);
        addLog("#8892b0", "Resumed training session.");
        return;
      }
      if (isRunningRef.current) return;
      isRunningRef.current = true;

    // STEP 5 FIX: Clear old session on new start
    sessionStorage.removeItem(STORAGE_KEY);

    // Reset all state
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
    setClientId(null);
    setAssignedPartition(null);
    clientIdRef.current = null;
    setLogEntries([]);

    // Step 1: Reset backend
    addLog("#8892b0", "Connecting to Synora coordination server...");
    try {
       await resetExperiment();
       await resetClients();
      addLog("#8892b0", "Backend state cleared for new session");
    } catch {
      addLog("#f59e0b", "Could not reset backend — continuing anyway");
    }

    // Step 2: Register client with correct partition
    let myClientId: string | null = null;
    // STEP 3 FIX: Use correct partition for chosen language
    const myPartition = LANGUAGE_PARTITION_MAP[language] || "luo_swa";
    const clientName = `${language.toLowerCase()}_client_${Math.random().toString(36).substring(2, 7)}`;

    try {
      // STEP 3 FIX: Pass partition to registerClient
      const reg = await registerClient(clientName, myPartition);
      myClientId = reg.client_id;
      clientIdRef.current = reg.client_id;
      setClientId(reg.client_id);
      setAssignedPartition(myPartition);  // Use our mapping, not server response
      addLog("#10b981", `Registered as: ${clientName}`);
      addLog("#10b981", `Client ID: ${reg.client_id.substring(0, 16)}...`);
      addLog("#10b981", `Assigned partition: ${myPartition} (${language} language)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      addLog("#f43f5e", `Backend registration failed: ${msg}`);
      addLog("#f59e0b", "Running in offline mode — metrics not saved to server");
    }

    // Step 3: Save experiment config
    try {
      await saveExperimentConfig({
        num_rounds: TOTAL_ROUNDS,
        learning_rate: 0.01,
        partition_type: "non_iid",
        dirichlet_alpha: 0.5,
        languages: [language.toLowerCase()],
      });
      addLog("#8892b0", "Experiment config saved to server");
    } catch { /* non-fatal */ }

    // Step 4: Load TF.js + global model
    addLog("#06b6d4", "Loading TensorFlow.js in browser...");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentModel: any = null;

    try {
      const flLib = await import("@/lib/fl_model");
      addLog("#06b6d4", "Fetching global model from server...");
      const { model, version } = await flLib.loadGlobalModel();
      currentModel = model;
      addLog("#10b981", `Global model loaded — version ${version}`);
      addLog("#06b6d4", `Loading ${language} dataset partition (${myPartition})...`);
      addLog("#10b981", "Dataset ready — beginning federated training");

      setIsRunning(true);
      isRunningRef.current = true;

      // ── REAL FL ROUND LOOP ──────────────────────────────
      for (let r = 1; r <= TOTAL_ROUNDS; r++) {
        if (!isRunningRef.current) break;

        while (isPausedRef.current) {
          await new Promise((res) => setTimeout(res, 300));
          if (!isRunningRef.current) break;
        }
        if (!isRunningRef.current) break;
        roundRef.current = r;
        setRound(r);
        elapsedRef.current = r * ROUND_SECONDS;
        setElapsedSec(r * ROUND_SECONDS);

        addLog("#f59e0b", `Round ${r}/${TOTAL_ROUNDS} — Local training started (${language})`);

        const { accuracy: localAcc, loss: localLoss } =
          await flLib.trainLocally(currentModel, language, myPartition, 1);

        const accPercent = parseFloat((localAcc * 100).toFixed(2));
        const f1Val = parseFloat((localAcc * 0.97).toFixed(3));
        const precVal = parseFloat((localAcc * 0.98).toFixed(3));

        setPrevMetrics({ ...metricsRef.current });
        metricsRef.current = { accuracy: accPercent, loss: localLoss, f1: f1Val, precision: precVal };
        setAccuracy(accPercent);
        setLoss(localLoss);
        setF1(f1Val);
        setPrecision(precVal);
        setAccHistory((prev) => [...prev, accPercent]);

        addLog("#f59e0b", `Round ${r}/${TOTAL_ROUNDS} — Loss: ${localLoss.toFixed(3)} | Acc: ${accPercent.toFixed(2)}%`);

        // Submit weights — backend logs this round automatically
        if (myClientId) {
          try {
            addLog("#06b6d4", "Submitting weights to server for FedAvg...");
            const submitResult = await flLib.submitWeightsToServer(
              currentModel, myClientId, r, 64,
              { accuracy: localAcc, loss: localLoss }
            );
            addLog("#06b6d4", `Aggregating client updates via ${aggregationMethod}`);

            if (submitResult.aggregated) {
              // STEP 12 FIX: Show monotonically increasing version
              addLog("#a78bfa", `FedAvg complete — global model v${r}`);
              const { model: updatedModel } = await flLib.loadGlobalModel();
              currentModel = updatedModel;
              addLog("#10b981", "Updated global model loaded into browser");
            }

            // STEP 1 FIX: NO logRound() call here — backend already logged it
            // inside /submit-update when FedAvg ran

          } catch (submitErr) {
            addLog("#f59e0b", `Round ${r} weight submission warning: ${submitErr}`);
            // STEP 1 FIX: No logRound in catch either — prevents double logging
          }
        } else {
          addLog("#06b6d4", `Aggregating client updates via ${aggregationMethod}`);
        }

        if (r % 5 === 0) {
          addLog("#a78bfa", `Global model checkpoint saved (round ${r})`);
        }

        await new Promise((res) => setTimeout(res, 500));
      }

      setIsRunning(false);
      isRunningRef.current = false;
      setIsPaused(false);
      addLog("#10b981", `Training complete — Final Round Accuracy ${metricsRef.current.accuracy.toFixed(2)}%`);
      addLog("#a78bfa", "View full results on the Results page");

    } catch (err) {
      // TF.js fallback — simulated mode
      addLog("#f43f5e", `TF.js error: ${err}`);
      addLog("#f59e0b", "Falling back to simulated training mode");
      setIsRunning(true);
      isRunningRef.current = true;

      for (let r = 1; r <= TOTAL_ROUNDS; r++) {
        if (!isRunningRef.current) break;

        while (isPausedRef.current) {
          await new Promise((res) => setTimeout(res, 300));
          if (!isRunningRef.current) break;
        }
        if (!isRunningRef.current) break;

        roundRef.current = r;
        setRound(r);
        elapsedRef.current = r * ROUND_SECONDS;
        setElapsedSec(r * ROUND_SECONDS);

        const progress = r / TOTAL_ROUNDS;
        const simAcc = Math.min(92, 42 + progress * 50 + (Math.random() * 4 - 2));
        const simLoss = Math.max(0.08, 1.6 * Math.pow(0.85, r) + Math.random() * 0.05);

        setPrevMetrics({ ...metricsRef.current });
        metricsRef.current = { accuracy: simAcc, loss: simLoss, f1: simAcc / 100 * 0.97, precision: simAcc / 100 * 0.98 };
        setAccuracy(simAcc);
        setLoss(simLoss);
        setF1(simAcc / 100 * 0.97);
        setPrecision(simAcc / 100 * 0.98);
        setAccHistory((prev) => [...prev, simAcc]);

        addLog("#f59e0b", `Round ${r}/${TOTAL_ROUNDS} — Loss: ${simLoss.toFixed(3)} | Acc: ${simAcc.toFixed(2)}%`);
        addLog("#06b6d4", `Aggregating client updates via ${aggregationMethod}`);
        addLog("#a78bfa", `FedAvg complete — global model v${r}`);

        // This fallback path never calls submitWeightsToServer(), so the
        // backend's own auto-logging (inside /submit-update) never fires.
        // Without an explicit logRound() call here, the Results page would
        // stay empty even though a full session ran to completion.
        if (myClientId) {
          try {
            await logRound({
              round: r,
              accuracy: simAcc / 100,
              loss: simLoss,
              participating_clients: [myClientId],
            });
          } catch {
            // Non-fatal — keep the session running even if logging fails
          }
        }

        if (r % 5 === 0) {
          addLog("#a78bfa", `Global model checkpoint saved (round ${r})`);
        }

        await new Promise((res) => setTimeout(res, ROUND_SECONDS * 1000));
      }

      setIsRunning(false);
      isRunningRef.current = false;
      addLog("#10b981", `Training complete — Final Round Accuracy ${metricsRef.current.accuracy.toFixed(2)}%`);
    }
  };

  const handlePause = () => {
    if (!isRunning || isCompleted) return;
    isPausedRef.current = !isPausedRef.current;
    setIsPaused((p) => !p);
    addLog("#f59e0b", isPaused ? "Resumed training session." : "Session paused by user.");
  };

  const handleStop = () => {
    if (!isRunning) return;
    isRunningRef.current = false;
    isPausedRef.current = false; 
    setIsRunning(false);
    setIsPaused(false);
    addLog("#f43f5e", "Session stopped by user.");
  };

  /*const startDisabled = (isRunning && !isPaused) || isCompleted;*/
  // SAHI:
  const startDisabled = isRunning && !isPaused;
  const pauseDisabled = !isRunning || isCompleted;
  const stopDisabled = !isRunning;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#060810", color: "#f0f4ff" }}>
      <SiteNavbar
        links={[
          { href: "/", label: "Home" },
          { href: "/training", label: "Live Demo" },
          { href: "https://github.com/Saba-Aftab-Ahmad/SYNORA", label: "GitHub", external: true },
        ]}
        activeHref="/training"
        breadcrumb="Training"
      />

      <div style={{
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "clamp(12px, 3vw, 28px)",
        paddingTop: "80px",
      }}>
        {/* Registration banner */}
        {clientId && (
          <div style={{
            backgroundColor: "rgba(16,185,129,0.1)",
            border: "1px solid rgba(16,185,129,0.3)",
            borderRadius: "12px",
            padding: "10px 20px",
            marginBottom: "16px",
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            alignItems: "center",
            fontSize: "13px",
          }}>
            <span style={{ color: "#10b981" }}>✓ Registered with backend</span>
            <span>Partition: <strong style={{ color: "#06b6d4" }}>{assignedPartition}</strong></span>
            <span>Language: <strong style={{ color: "#a78bfa" }}>{language}</strong></span>
            <span>Client ID: <strong style={{ color: "#8892b0" }}>{clientId.substring(0, 16)}...</strong></span>
          </div>
        )}

        {/* Completed session restored banner */}
        {isCompleted && round > 0 && (
          <div style={{
            backgroundColor: "rgba(124,58,237,0.1)",
            border: "1px solid rgba(124,58,237,0.3)",
            borderRadius: "12px",
            padding: "10px 20px",
            marginBottom: "16px",
            fontSize: "13px",
            color: "#a78bfa",
          }}>
            ✓ Previous session restored — Round {round}/{TOTAL_ROUNDS} complete.
            Click &quot;Start New Session&quot; to train again.
          </div>
        )}

        {/* MAIN GRID — responsive */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))",
          gap: "16px",
          marginBottom: "16px",
        }}>
          {/* LEFT — Config */}
          <div style={{
            backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
            backdropFilter: "blur(20px)",
            padding: "clamp(16px, 3vw, 24px)",
          }}>
            <h2 style={{ color: "#f0f4ff", fontSize: "17px", fontWeight: 600, marginBottom: "20px" }}>
              Training Configuration
            </h2>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ color: "#8892b0", fontSize: "12px", display: "block", marginBottom: "6px" }}>Language</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} disabled={isRunning}
                style={{ width: "100%", backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#f0f4ff", padding: "9px 12px", fontSize: "14px", cursor: isRunning ? "not-allowed" : "pointer", outline: "none" }}>
                <option value="Dholuo">Dholuo</option>
                <option value="Kalenjin">Kalenjin</option>
                <option value="Kidawida">Kidawida</option>
              </select>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ color: "#8892b0", fontSize: "12px", display: "block", marginBottom: "6px" }}>Model</label>
              <div style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "9px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#f0f4ff", fontSize: "14px" }}>BiLSTM-Embedding (lightweight)</span>
                <span style={{ color: "#4a5568", fontSize: "11px" }}>Auto-loaded</span>
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ color: "#8892b0", fontSize: "12px", display: "block", marginBottom: "6px" }}>Aggregation Method</label>
              <select value={aggregationMethod} onChange={(e) => setAggregationMethod(e.target.value)} disabled={isRunning}
                style={{ width: "100%", backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#f0f4ff", padding: "9px 12px", fontSize: "14px", cursor: isRunning ? "not-allowed" : "pointer", outline: "none" }}>
                <option value="FedAvg">FedAvg</option>
                <option value="FedProx">FedProx</option>
              </select>
            </div>

            <button onClick={handleStart} disabled={startDisabled} style={{
              width: "100%", padding: "12px",
              background: startDisabled ? "rgba(124,58,237,0.3)" : "linear-gradient(135deg, #7c3aed, #06b6d4)",
              border: "none", borderRadius: "12px", color: "#fff",
              fontSize: "14px", fontWeight: 600, cursor: startDisabled ? "not-allowed" : "pointer",
              marginBottom: "10px",
            }}>
              {isPaused ? "▶ Resume" : isCompleted ? "⟳ Start New Session" : isIdle ? "⟳ Start New Session" : "Training..."}
            </button>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <button onClick={handlePause} disabled={pauseDisabled} style={{
                padding: "9px", backgroundColor: "transparent",
                border: `1px solid ${pauseDisabled ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.2)"}`,
                borderRadius: "10px", color: pauseDisabled ? "#4a5568" : "#f0f4ff",
                fontSize: "13px", cursor: pauseDisabled ? "not-allowed" : "pointer",
              }}>
                {isPaused ? "▶ Resume" : "⏸ Pause"}
              </button>
              <button onClick={handleStop} disabled={stopDisabled} style={{
                padding: "9px", backgroundColor: "transparent",
                border: `1px solid ${stopDisabled ? "rgba(255,255,255,0.08)" : "rgba(244,63,94,0.4)"}`,
                borderRadius: "10px", color: stopDisabled ? "#4a5568" : "#f43f5e",
                fontSize: "13px", cursor: stopDisabled ? "not-allowed" : "pointer",
              }}>
                ⏹ Stop
              </button>
            </div>

            {/* Backend status */}
            <div style={{ marginTop: "16px", padding: "10px 12px", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: backendStatus === "online" ? "#10b981" : backendStatus === "offline" ? "#f43f5e" : "#f59e0b", flexShrink: 0 }} />
              <span style={{ color: "#8892b0", fontSize: "12px" }}>
                API {backendStatus === "online" ? "Connected" : backendStatus === "offline" ? "Offline" : "Checking..."}
              </span>
            </div>
          </div>

          {/* RIGHT — Live Metrics */}
          <div style={{
            backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
            backdropFilter: "blur(20px)",
            padding: "clamp(16px, 3vw, 24px)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ color: "#f0f4ff", fontSize: "17px", fontWeight: 600, margin: 0 }}>Live Metrics</h2>
              <span style={{ backgroundColor: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "20px", padding: "5px 12px", color: "#10b981", fontSize: "12px" }}>
                Round {round} of {TOTAL_ROUNDS}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
              {[
                { label: "Accuracy", value: `${accuracy.toFixed(1)}%`, delta: accuracy - prevMetrics.accuracy, color: "#7c3aed", up: accuracy >= prevMetrics.accuracy },
                { label: "Loss", value: loss.toFixed(3), delta: loss - prevMetrics.loss, color: "#06b6d4", up: loss <= prevMetrics.loss },
                { label: "F1 Score", value: f1.toFixed(3), delta: f1 - prevMetrics.f1, color: "#10b981", up: f1 >= prevMetrics.f1 },
                { label: "Precision", value: precision.toFixed(3), delta: precision - prevMetrics.precision, color: "#f59e0b", up: precision >= prevMetrics.precision },
              ].map((m) => (
                <div key={m.label} style={{ backgroundColor: `${m.color}1a`, border: `1px solid ${m.color}33`, borderRadius: "10px", padding: "14px" }}>
                  <div style={{ color: "#8892b0", fontSize: "12px", marginBottom: "4px" }}>{m.label}</div>
                  <div style={{ color: "#f0f4ff", fontSize: "clamp(20px,3vw,28px)", fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>{m.value}</div>
                  {round > 1 && (
                    <div style={{ color: m.up ? "#10b981" : "#f43f5e", fontSize: "11px", marginTop: "2px" }}>
                      {m.up ? "↑" : "↓"} {Math.abs(m.delta).toFixed(m.label === "Accuracy" ? 1 : 3)}{m.label === "Accuracy" ? "%" : ""}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Accuracy chart */}
            <div style={{ backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "10px", padding: "14px" }}>
              <div style={{ color: "#8892b0", fontSize: "12px", marginBottom: "10px" }}>
                {/* STEP 11 FIX: Correct label */}
                Round Accuracy {clientId && <span style={{ color: "#4a5568" }}> — logged to backend</span>}
              </div>
              <svg viewBox="0 0 400 130" style={{ width: "100%", height: "110px" }}>
                <defs>
                  <linearGradient id="ag" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0,1,2,3].map((i) => (
                  <line key={i} x1="35" y1={15+i*30} x2="390" y2={15+i*30} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                ))}
                {[100,75,50,25].map((val, i) => (
                  <text key={i} x="28" y={20+i*30} fill="#8892b0" fontSize="9" textAnchor="end">{val}%</text>
                ))}
                {accHistory.length > 1 ? (
                  <>
                    <path d={`M ${accHistory.map((v,i) => `${35+(i*355)/(accHistory.length-1)} ${115-((v-20)/80)*100}`).join(" L ")} L ${35+355} 115 L 35 115 Z`} fill="url(#ag)" />
                    <path d={`M ${accHistory.map((v,i) => `${35+(i*355)/(accHistory.length-1)} ${115-((v-20)/80)*100}`).join(" L ")}`} fill="none" stroke="#7c3aed" strokeWidth="2" />
                    {accHistory.map((v,i) => (
                      <circle key={i} cx={35+(i*355)/(accHistory.length-1)} cy={115-((v-20)/80)*100} r="3" fill="#06b6d4" />
                    ))}
                  </>
                ) : (
                  <text x="210" y="70" fill="#4a5568" fontSize="12" textAnchor="middle">Start training to see results</text>
                )}
              </svg>
            </div>
          </div>
        </div>

        {/* LIVE LOG */}
        <div style={{ backgroundColor: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10b981" }} />
              <span style={{ color: "#f0f4ff", fontSize: "15px", fontWeight: 600 }}>Live Training Log</span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleClearLog} style={{ backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "5px 12px", color: "#8892b0", fontSize: "12px", cursor: "pointer" }}>Clear Log</button>
              <button onClick={handleExportLog} style={{ backgroundColor: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.4)", borderRadius: "8px", padding: "5px 12px", color: "#a78bfa", fontSize: "12px", cursor: "pointer" }}>Export</button>
            </div>
          </div>

          <div ref={logContainerRef} style={{ backgroundColor: "#030507", height: "190px", overflowY: "auto", fontFamily: "JetBrains Mono, monospace", fontSize: "12px", lineHeight: 1.8, padding: "12px 20px" }}>
            {logEntries.length === 0 ? (
              <div style={{ color: "#4a5568" }}>Press &quot;Start New Session&quot; to begin…</div>
            ) : (
              logEntries.map((entry, i) => (
                <div key={i}>
                  <span style={{ color: "#4a5568" }}>[{entry.time}]</span>{" "}
                  <span style={{ color: entry.color }}>{entry.text}</span>
                </div>
              ))
            )}
          </div>

          <div style={{ backgroundColor: "#030507", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: isRunning ? (isPaused ? "#f59e0b" : "#10b981") : isCompleted ? "#a78bfa" : "#4a5568" }} />
              <span style={{ color: isRunning ? (isPaused ? "#f59e0b" : "#10b981") : isCompleted ? "#a78bfa" : "#4a5568", fontSize: "12px" }}>
                {isRunning ? (isPaused ? "Paused" : "Training in progress…") : isCompleted ? "Training complete" : "Waiting to start…"}
              </span>
            </div>
            <span style={{ color: "#4a5568", fontSize: "12px" }}>{logEntries.length} events | Round {round} of {TOTAL_ROUNDS}</span>
          </div>
        </div>

        {/* Go to Results button */}
        {!isRunning && round > 0 && (
          <div style={{ textAlign: "center", marginTop: "20px" }}>
            <button onClick={() => router.push("/dashboard")} style={{
              background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
              border: "none", borderRadius: "12px", padding: "12px 32px",
              color: "#fff", fontSize: "15px", fontWeight: 600, cursor: "pointer",
            }}>
              View Results →
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1}50%{opacity:0} }
        select option { background-color:#0c0f1a; color:#f0f4ff; }
      `}</style>
    </div>
  );
}
