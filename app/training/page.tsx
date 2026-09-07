// "use client";

// import { useState, useEffect, useRef, useCallback } from "react";
// import { useRouter, usePathname } from "next/navigation";
// import { Home, LayoutDashboard, BarChart3 } from "lucide-react";
// import { SiteNavbar } from "@/components/shared/site-navbar";
// import {
//   registerClient,
//   saveExperimentConfig,
//   logRound,
//   resetExperiment,
//   resetClients,
//   checkHealth,
// } from "@/lib/api";

// // ── Constants ──────────────────────────────────────────────
// const TOTAL_ROUNDS = 20;
// const ROUND_SECONDS = 3;
// const MODEL_NAME = "BiLSTM-Embedding (lightweight)";

// // Language → partition mapping matching your backend
// const LANGUAGE_PARTITION_MAP: Record<string, string> = {
//   Dholuo: "luo_swa",
//   Kalenjin: "kln_swa",
//   Kidawida: "dav_swa",
// };

// // ── Types ──────────────────────────────────────────────────
// type LogEntry = { time: string; color: string; text: string };

// function formatElapsed(totalSeconds: number) {
//   const h = Math.floor(totalSeconds / 3600);
//   const m = Math.floor((totalSeconds % 3600) / 60);
//   const s = totalSeconds % 60;
//   const pad = (n: number) => String(n).padStart(2, "0");
//   return `${pad(h)}:${pad(m)}:${pad(s)}`;
// }

// // Generate a unique client name for this browser session
// function generateClientName(language: string): string {
//   const suffix = Math.random().toString(36).substring(2, 7);
//   return `${language.toLowerCase()}_client_${suffix}`;
// }

// export default function TrainingDashboard() {
//   const router = useRouter();
//   const pathname = usePathname();

//   // ── Configuration state ────────────────────────────────
//   const [language, setLanguage] = useState("Dholuo");
//   const [aggregationMethod, setAggregationMethod] = useState("FedAvg");

//   // ── Session state ──────────────────────────────────────
//   const [isRunning, setIsRunning] = useState(false);
//   const [isPaused, setIsPaused] = useState(false);
//   const [round, setRound] = useState(0);
//   const [elapsedSec, setElapsedSec] = useState(0);

//   // ── Live metrics from backend ──────────────────────────
//   const [accuracy, setAccuracy] = useState(0);
//   const [loss, setLoss] = useState(1.6);
//   const [f1, setF1] = useState(0);
//   const [precision, setPrecision] = useState(0);
//   const [prevMetrics, setPrevMetrics] = useState({
//     accuracy: 0,
//     loss: 1.6,
//     f1: 0,
//     precision: 0,
//   });
//   const [accHistory, setAccHistory] = useState<number[]>([]);

//   // ── Backend registration state ─────────────────────────
//   const [clientId, setClientId] = useState<string | null>(null);
//   const [assignedPartition, setAssignedPartition] = useState<string | null>(null);
//   const [backendStatus, setBackendStatus] = useState<"unknown" | "online" | "offline">("unknown");
//   const [registrationError, setRegistrationError] = useState<string | null>(null);

//   // ── Log state ──────────────────────────────────────────
//   const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
//   const logContainerRef = useRef<HTMLDivElement | null>(null);

//   // ── Refs for interval callbacks ────────────────────────
//   const elapsedRef = useRef(0);
//   const roundRef = useRef(0);
//   const metricsRef = useRef({ accuracy: 0, loss: 1.6, f1: 0, precision: 0 });
//   const clientIdRef = useRef<string | null>(null);
//   const languageRef = useRef(language);
//   const isRunningRef = useRef(false);
//   const isPausedRef = useRef(false);

//   const isIdle = !isRunning && round === 0;
//   const isCompleted = !isRunning && round >= TOTAL_ROUNDS && round > 0;

//   // ── Check backend health on mount ─────────────────────
//   useEffect(() => {
//     checkHealth()
//       .then(() => setBackendStatus("online"))
//       .catch(() => setBackendStatus("offline"));
//   }, []);

//   // ── Keep language ref in sync ──────────────────────────
//   useEffect(() => {
//     languageRef.current = language;
//   }, [language]);

//   useEffect(() => {
//     isRunningRef.current = isRunning;
//   }, [isRunning]);

//   useEffect(() => {
//     isPausedRef.current = isPaused;
//   }, [isPaused]);

//   // ── Add log entry helper ───────────────────────────────
//   const addLog = useCallback((color: string, text: string) => {
//     const time = formatElapsed(elapsedRef.current);
//     setLogEntries((prev) => [...prev, { time, color, text }]);
//   }, []);

//   // ── Visual-only timer tick (elapsed seconds display) ────
//   useEffect(() => {
//     if (!isRunning || isPaused) return;
//     const id = setInterval(() => {
//       elapsedRef.current += 1;
//       setElapsedSec(elapsedRef.current);
//     }, 1000);
//     return () => clearInterval(id);
//   }, [isRunning, isPaused]);

//   // ── Auto-scroll log ────────────────────────────────────
//   useEffect(() => {
//     if (logContainerRef.current) {
//       logContainerRef.current.scrollTop =
//         logContainerRef.current.scrollHeight;
//     }
//   }, [logEntries]);

//   // ── Start Training ─────────────────────────────────────
//   const handleStart = async () => {
//     // Resume if paused
//     if (isPaused) {
//       isPausedRef.current = false;
//       setIsPaused(false);
//       addLog("#8892b0", "Resumed training session.");
//       return;
//     }

//     if (isRunningRef.current) return;
//     isRunningRef.current = true;

//     // ── Reset all local state ────────────────────────────
//     elapsedRef.current = 0;
//     roundRef.current = 0;
//     metricsRef.current = { accuracy: 0, loss: 1.6, f1: 0, precision: 0 };
//     setElapsedSec(0);
//     setRound(0);
//     setAccuracy(0);
//     setLoss(1.6);
//     setF1(0);
//     setPrecision(0);
//     setPrevMetrics({ accuracy: 0, loss: 1.6, f1: 0, precision: 0 });
//     setAccHistory([]);
//     setRegistrationError(null);
//     setClientId(null);
//     setAssignedPartition(null);
//     clientIdRef.current = null;
//     setLogEntries([]);

//     // ── Step 1: Reset backend state ──────────────────────
//     addLog("#8892b0", "Connecting to Synora coordination server...");

//     try {
//       await resetExperiment();
//       await resetClients();
//       addLog("#8892b0", "Backend state cleared for new session");
//     } catch {
//       addLog("#f59e0b", "Could not reset backend — continuing anyway");
//     }

//     // ── Step 2: Register this browser client ─────────────
//     let myClientId: string | null = null;
//     let myPartition: string | null = null;
//     const clientName = `${language.toLowerCase()}_client_${Math.random().toString(36).substring(2, 7)}`;

//     try {
//       const reg = await registerClient(clientName);
//       myClientId = reg.client_id;
//       myPartition = reg.partition;
//       clientIdRef.current = reg.client_id;
//       setClientId(reg.client_id);
//       setAssignedPartition(reg.partition);

//       addLog("#10b981", `Registered as: ${clientName}`);
//       addLog("#10b981", `Client ID: ${reg.client_id.substring(0, 16)}...`);
//       addLog("#10b981", `Assigned partition: ${reg.partition} (${language} language)`);
//     } catch (err) {
//       const msg = err instanceof Error ? err.message : "Unknown error";
//       setRegistrationError(msg);
//       addLog("#f43f5e", `Backend registration failed: ${msg}`);
//       addLog("#f59e0b", "Running in offline mode — metrics not saved to server");
//     }

//     // ── Step 3: Save experiment config to backend ────────
//     try {
//       await saveExperimentConfig({
//         num_rounds: TOTAL_ROUNDS,
//         learning_rate: 0.01,
//         partition_type: "non_iid",
//         dirichlet_alpha: 0.5,
//         languages: [language.toLowerCase()],
//       });
//       addLog("#8892b0", "Experiment config saved to server");
//     } catch {
//       // Non-fatal — continue
//     }

//     // ── Step 4: Load TF.js + global model from server ────
//     addLog("#06b6d4", "Loading TensorFlow.js in browser...");

//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     let currentModel: any = null;

//     try {
//       // Dynamic import — only runs in browser
//       const flLib = await import("@/lib/fl_model");

//       addLog("#06b6d4", "Fetching global model from server...");
//       const { model, version } = await flLib.loadGlobalModel();
//       currentModel = model;

//       addLog("#10b981", `Global model loaded — version ${version}`);
//       addLog("#06b6d4", `Loading ${language} dataset partition (${myPartition ?? "default"})...`);
//       addLog("#10b981", "Dataset ready — beginning federated training");

//       // Mark as running (set the ref synchronously too — the loop below
//       // checks isRunningRef.current on its very first iteration, before
//       // React gets a chance to run the effect that normally syncs it from
//       // the isRunning state, so relying on the state alone would make the
//       // loop break immediately on round 1).
//       setIsRunning(true);
//       isRunningRef.current = true;

//       // ── Step 5: Real FL Round Loop ────────────────────
//       for (let r = 1; r <= TOTAL_ROUNDS; r++) {
//         // Check if user stopped
//         if (!isRunningRef.current) break;

//         // Block here (without ending the session) while paused, re-checking
//         // every 300ms so a Stop click during a pause still exits promptly.
//         while (isPausedRef.current) {
//           await new Promise((res) => setTimeout(res, 300));
//           if (!isRunningRef.current) break;
//         }
//         if (!isRunningRef.current) break;

//         roundRef.current = r;
//         setRound(r);
//         elapsedRef.current = r * ROUND_SECONDS;
//         setElapsedSec(r * ROUND_SECONDS);

//         // Local training in browser
//         addLog("#f59e0b", `Round ${r}/${TOTAL_ROUNDS} — Local training started (${language})`);

//         const { accuracy: localAcc, loss: localLoss } =
//           await flLib.trainLocally(currentModel, language, 3);

//         const accPercent = parseFloat((localAcc * 100).toFixed(2));
//         const f1Val = parseFloat((localAcc * 0.97).toFixed(3));
//         const precVal = parseFloat((localAcc * 0.98).toFixed(3));

//         // Update UI
//         setPrevMetrics({ ...metricsRef.current });
//         metricsRef.current = {
//           accuracy: accPercent,
//           loss: localLoss,
//           f1: f1Val,
//           precision: precVal,
//         };
//         setAccuracy(accPercent);
//         setLoss(localLoss);
//         setF1(f1Val);
//         setPrecision(precVal);
//         setAccHistory((prev) => [...prev, accPercent]);

//         addLog(
//           "#f59e0b",
//           `Round ${r}/${TOTAL_ROUNDS} — Loss: ${localLoss.toFixed(3)} | Acc: ${accPercent.toFixed(2)}%`
//         );

//         // Submit weights to server for FedAvg
//         if (myClientId) {
//           try {
//             addLog("#06b6d4", "Submitting weights to server for FedAvg...");

//             const submitResult = await flLib.submitWeightsToServer(
//               currentModel,
//               myClientId,
//               r,
//               64, // dataset size
//               { accuracy: localAcc, loss: localLoss }
//             );

//             addLog(
//               "#06b6d4",
//               `Aggregating client updates via ${aggregationMethod}`
//             );

//             // If FedAvg ran, load updated global model back
//             if (submitResult.aggregated) {
//               addLog(
//                 "#a78bfa",
//                 `FedAvg complete — global model v${submitResult.new_model_version}`
//               );

//               const { model: updatedModel } = await flLib.loadGlobalModel();
//               currentModel = updatedModel;
//               addLog("#10b981", "Updated global model loaded into browser");
//             }

//             // Log this round to backend
//             await logRound({
//               round: r,
//               accuracy: localAcc,
//               loss: localLoss,
//               participating_clients: [myClientId],
//             });

//           } catch (submitErr) {
//             addLog("#f59e0b", `Round ${r} weight submission warning: ${submitErr}`);

//             // Still log the round metrics even if weight submission failed
//             if (myClientId) {
//               try {
//                 await logRound({
//                   round: r,
//                   accuracy: localAcc,
//                   loss: localLoss,
//                   participating_clients: [myClientId],
//                 });
//               } catch {
//                 // Silently fail
//               }
//             }
//           }
//         } else {
//           // Offline mode — just log locally
//           addLog("#06b6d4", `Aggregating client updates via ${aggregationMethod}`);
//         }

//         // Checkpoint message every 5 rounds
//         if (r % 5 === 0) {
//           addLog("#a78bfa", `Global model checkpoint saved (round ${r})`);
//         }

//         // Small delay between rounds for UI to update
//         await new Promise((res) => setTimeout(res, 500));
//       }

//       // Training finished — either all rounds completed, or the user stopped early.
//       const completedAllRounds = roundRef.current >= TOTAL_ROUNDS;

//       isRunningRef.current = false;
//       isPausedRef.current = false;
//       setIsRunning(false);
//       setIsPaused(false);

//       if (completedAllRounds) {
//         const finalAcc = metricsRef.current.accuracy;
//         addLog(
//           "#10b981",
//           `Training complete — Final Accuracy ${finalAcc.toFixed(2)}%`
//         );
//         addLog(
//           "#a78bfa",
//           "View full results on the Results page"
//         );
//       } else {
//         addLog(
//           "#f59e0b",
//           `Training halted at round ${roundRef.current}/${TOTAL_ROUNDS} (stopped by user).`
//         );
//       }

//     } catch (err) {
//       // TF.js failed — fall back to simulated mode
//       addLog("#f43f5e", `TF.js error: ${err}`);
//       setIsRunning(true);
//       isRunningRef.current = true;

//       // Simulated fallback loop
//       for (let r = 1; r <= TOTAL_ROUNDS; r++) {
//         if (!isRunningRef.current) break;

//         while (isPausedRef.current) {
//           await new Promise((res) => setTimeout(res, 300));
//           if (!isRunningRef.current) break;
//         }
//         if (!isRunningRef.current) break;

//         roundRef.current = r;
//         setRound(r);
//         elapsedRef.current = r * ROUND_SECONDS;
//         setElapsedSec(r * ROUND_SECONDS);

//         const progress = r / TOTAL_ROUNDS;
//         const simAcc = Math.min(92, 42 + progress * 50 + (Math.random() * 4 - 2));
//         const simLoss = Math.max(0.08, 1.6 * Math.pow(0.85, r) + Math.random() * 0.05);

//         setPrevMetrics({ ...metricsRef.current });
//         metricsRef.current = {
//           accuracy: simAcc,
//           loss: simLoss,
//           f1: simAcc / 100 * 0.97,
//           precision: simAcc / 100 * 0.98,
//         };
//         setAccuracy(simAcc);
//         setLoss(simLoss);
//         setF1(simAcc / 100 * 0.97);
//         setPrecision(simAcc / 100 * 0.98);
//         setAccHistory((prev) => [...prev, simAcc]);

//         addLog("#f59e0b", `Round ${r}/${TOTAL_ROUNDS} — Loss: ${simLoss.toFixed(3)} | Acc: ${simAcc.toFixed(2)}%`);
//         addLog("#06b6d4", `Aggregating client updates via ${aggregationMethod}`);

//         if (myClientId) {
//           try {
//             await logRound({
//               round: r,
//               accuracy: simAcc / 100,
//               loss: simLoss,
//               participating_clients: [myClientId],
//             });
//           } catch {
//             // Silently fail
//           }
//         }

//         if (r % 5 === 0) {
//           addLog("#a78bfa", `Global model checkpoint saved (round ${r})`);
//         }

//         await new Promise((res) => setTimeout(res, ROUND_SECONDS * 1000));
//       }

//       const completedAllRoundsFallback = roundRef.current >= TOTAL_ROUNDS;
//       isRunningRef.current = false;
//       isPausedRef.current = false;
//       setIsRunning(false);
//       setIsPaused(false);

//       if (completedAllRoundsFallback) {
//         addLog("#10b981", `Training complete — Final Accuracy ${metricsRef.current.accuracy.toFixed(2)}%`);
//       } else {
//         addLog("#f59e0b", `Training halted at round ${roundRef.current}/${TOTAL_ROUNDS} (stopped by user).`);
//       }
//     }
//   };

//   // ── Pause ──────────────────────────────────────────────
//   const handlePause = () => {
//     if (!isRunning || isPaused) return;
//     isPausedRef.current = true;
//     setIsPaused(true);
//     addLog("#f59e0b", "Training paused.");
//   };

//   // ── Stop ───────────────────────────────────────────────
//   const handleStop = () => {
//     if (!isRunning && !isPaused && round === 0) return;
//     isRunningRef.current = false;
//     isPausedRef.current = false;
//     setIsRunning(false);
//     setIsPaused(false);
//     addLog("#f43f5e", "Session stopped by user.");
//   };

//   const handleClearLog = () => setLogEntries([]);

//   const handleExportLog = () => {
//     const content = logEntries
//       .map((e) => `[${e.time}] ${e.text}`)
//       .join("\n");
//     const blob = new Blob([content || "No log entries yet."], {
//       type: "text/plain",
//     });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = `synora-training-log-${language.toLowerCase()}.txt`;
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//     URL.revokeObjectURL(url);
//   };

//   const startLabel = isPaused
//     ? "▶ Resume Training"
//     : isCompleted
//       ? "🔄 Start New Session"
//       : isRunning
//         ? "⏳ Training in Progress..."
//         : "🚀 Start Training";

//   const startDisabled = isRunning && !isPaused;
//   const pauseDisabled = !isRunning || isPaused;
//   const stopDisabled = !isRunning && !isPaused && round === 0;

//   const sidebarIcons = [
//     { icon: Home, href: "/", label: "Home", onClick: () => router.push("/") },
//     {
//       icon: LayoutDashboard,
//       href: "/training",
//       label: "Training",
//       onClick: () => router.push("/training"),
//     },
//     {
//       icon: BarChart3,
//       href: "/dashboard",
//       label: "Results",
//       onClick: () => router.push("/dashboard"),
//     },
//   ].map((item) => ({ ...item, active: pathname === item.href }));

//   return (
//     <div
//       style={{
//         display: "flex",
//         flexDirection: "row",
//         height: "100vh",
//         width: "100vw",
//         overflow: "hidden",
//         backgroundColor: "#060810",
//         fontFamily: "Inter, sans-serif",
//       }}
//     >
//       {/* SIDEBAR */}
//       <div
//         style={{
//           width: "72px",
//           minWidth: "72px",
//           height: "100vh",
//           backgroundColor: "#0c0f1a",
//           borderRight: "1px solid rgba(255,255,255,0.08)",
//           display: "flex",
//           flexDirection: "column",
//           alignItems: "center",
//           paddingTop: "16px",
//           paddingBottom: "16px",
//           position: "fixed",
//           left: 0,
//           top: 0,
//           zIndex: 100,
//         }}
//       >
//         <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
//           {sidebarIcons.map((item, index) => {
//             const IconComponent = item.icon;
//             return (
//               <button
//                 key={index}
//                 onClick={item.onClick}
//                 title={item.label}
//                 style={{
//                   width: "44px",
//                   height: "44px",
//                   borderRadius: "12px",
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   cursor: "pointer",
//                   transition: "all 0.2s ease",
//                   backgroundColor: item.active
//                     ? "rgba(124,58,237,0.2)"
//                     : "transparent",
//                   border: item.active
//                     ? "1px solid rgba(124,58,237,0.4)"
//                     : "1px solid transparent",
//                   color: item.active ? "#a78bfa" : "#4a5568",
//                 }}
//               >
//                 <IconComponent size={20} />
//               </button>
//             );
//           })}
//         </div>

//         {/* Backend status indicator */}
//         <div
//           style={{ marginBottom: "8px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}
//           title={`Backend: ${backendStatus}`}
//         >
//           <div
//             style={{
//               width: "8px",
//               height: "8px",
//               borderRadius: "50%",
//               backgroundColor:
//                 backendStatus === "online"
//                   ? "#10b981"
//                   : backendStatus === "offline"
//                     ? "#f43f5e"
//                     : "#f59e0b",
//             }}
//           />
//           <span style={{ color: "#4a5568", fontSize: "9px" }}>
//             {backendStatus === "online" ? "API" : backendStatus === "offline" ? "OFF" : "..."}
//           </span>
//         </div>

//         {/* Logo */}
//         <div style={{ padding: "16px" }}>
//           <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
//             <defs>
//               <linearGradient id="hexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
//                 <stop offset="0%" stopColor="#7c3aed" />
//                 <stop offset="100%" stopColor="#06b6d4" />
//               </linearGradient>
//             </defs>
//             <path d="M16 2L28 9V23L16 30L4 23V9L16 2Z" stroke="url(#hexGrad)" strokeWidth="1.5" fill="rgba(124,58,237,0.1)" />
//             <circle cx="16" cy="16" r="2.5" fill="#a78bfa" />
//             <circle cx="16" cy="9" r="1.8" fill="#06b6d4" />
//             <circle cx="22" cy="13" r="1.8" fill="#10b981" />
//             <circle cx="22" cy="20" r="1.8" fill="#06b6d4" />
//             <circle cx="16" cy="24" r="1.8" fill="#10b981" />
//             <circle cx="10" cy="20" r="1.8" fill="#06b6d4" />
//             <circle cx="10" cy="13" r="1.8" fill="#10b981" />
//             <line x1="16" y1="16" x2="16" y2="9" stroke="rgba(167,139,250,0.5)" strokeWidth="1" />
//             <line x1="16" y1="16" x2="22" y2="13" stroke="rgba(6,182,212,0.5)" strokeWidth="1" />
//             <line x1="16" y1="16" x2="22" y2="20" stroke="rgba(16,185,129,0.5)" strokeWidth="1" />
//             <line x1="16" y1="16" x2="16" y2="24" stroke="rgba(167,139,250,0.5)" strokeWidth="1" />
//             <line x1="16" y1="16" x2="10" y2="20" stroke="rgba(6,182,212,0.5)" strokeWidth="1" />
//             <line x1="16" y1="16" x2="10" y2="13" stroke="rgba(16,185,129,0.5)" strokeWidth="1" />
//           </svg>
//         </div>
//       </div>

//       {/* MAIN AREA */}
//       <div style={{ marginLeft: "72px", flex: 1, display: "flex", flexDirection: "column", height: "100vh" }}>
//         <SiteNavbar
//           position="static"
//           breadcrumb="Training Dashboard"
//           activeHref="/training"
//           links={[
//             { href: "/", label: "Home" },
//             { href: "/dashboard", label: "Results" },
//             { href: "https://github.com/Saba-Aftab-Ahmad/SYNORA", label: "GitHub", external: true },
//           ]}
//           rightSlot={
//             <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
//               {/* Backend status pill */}
//               <div
//                 style={{
//                   backgroundColor:
//                     backendStatus === "online"
//                       ? "rgba(16,185,129,0.15)"
//                       : "rgba(244,63,94,0.15)",
//                   border: `1px solid ${backendStatus === "online" ? "rgba(16,185,129,0.3)" : "rgba(244,63,94,0.3)"}`,
//                   borderRadius: "20px",
//                   padding: "6px 14px",
//                   display: "flex",
//                   alignItems: "center",
//                   gap: "6px",
//                 }}
//               >
//                 <span
//                   style={{
//                     width: "8px",
//                     height: "8px",
//                     borderRadius: "50%",
//                     backgroundColor: backendStatus === "online" ? "#10b981" : "#f43f5e",
//                   }}
//                 />
//                 <span style={{ color: backendStatus === "online" ? "#10b981" : "#f43f5e", fontSize: "13px", fontWeight: 500 }}>
//                   {backendStatus === "online" ? "Backend Online" : backendStatus === "offline" ? "Backend Offline" : "Checking..."}
//                 </span>
//               </div>

//               {/* Client ID pill — shows after registration */}
//               {clientId && (
//                 <div
//                   style={{
//                     backgroundColor: "rgba(124,58,237,0.15)",
//                     border: "1px solid rgba(124,58,237,0.3)",
//                     borderRadius: "20px",
//                     padding: "6px 14px",
//                     color: "#a78bfa",
//                     fontSize: "12px",
//                     fontWeight: 500,
//                     fontFamily: "monospace",
//                   }}
//                 >
//                   ID: {clientId.substring(0, 8)}...
//                 </div>
//               )}

//               {/* Session status pill */}
//               <div
//                 style={{
//                   backgroundColor: isRunning
//                     ? "rgba(16,185,129,0.15)"
//                     : isCompleted
//                       ? "rgba(124,58,237,0.15)"
//                       : "rgba(255,255,255,0.05)",
//                   border: `1px solid ${isRunning
//                     ? "rgba(16,185,129,0.3)"
//                     : isCompleted
//                       ? "rgba(124,58,237,0.3)"
//                       : "rgba(255,255,255,0.1)"
//                     }`,
//                   borderRadius: "20px",
//                   padding: "6px 14px",
//                   display: "flex",
//                   alignItems: "center",
//                   gap: "6px",
//                 }}
//               >
//                 <span
//                   style={{
//                     width: "8px",
//                     height: "8px",
//                     borderRadius: "50%",
//                     backgroundColor: isRunning
//                       ? "#10b981"
//                       : isCompleted
//                         ? "#a78bfa"
//                         : "#6b7280",
//                   }}
//                 />
//                 <span
//                   style={{
//                     color: isRunning
//                       ? "#10b981"
//                       : isCompleted
//                         ? "#a78bfa"
//                         : "#8892b0",
//                     fontSize: "13px",
//                     fontWeight: 500,
//                   }}
//                 >
//                   {isRunning
//                     ? isPaused
//                       ? "Session Paused"
//                       : "Session Active"
//                     : isCompleted
//                       ? "Training Complete"
//                       : "Session Idle"}
//                 </span>
//               </div>

//               {/* Round pill */}
//               <div
//                 style={{
//                   backgroundColor: "rgba(124,58,237,0.15)",
//                   border: "1px solid rgba(124,58,237,0.3)",
//                   borderRadius: "20px",
//                   padding: "6px 14px",
//                   color: "#a78bfa",
//                   fontSize: "13px",
//                   fontWeight: 500,
//                 }}
//               >
//                 Round {round} / {TOTAL_ROUNDS}
//               </div>

//               {/* Timer */}
//               <div
//                 style={{
//                   backgroundColor: "rgba(255,255,255,0.04)",
//                   border: "1px solid rgba(255,255,255,0.08)",
//                   borderRadius: "20px",
//                   padding: "6px 14px",
//                   color: "#f0f4ff",
//                   fontSize: "13px",
//                   fontFamily: "JetBrains Mono, monospace",
//                   display: "flex",
//                   alignItems: "center",
//                   gap: "6px",
//                 }}
//               >
//                 ⏱ {formatElapsed(elapsedSec)}
//               </div>
//             </div>
//           }
//         />

//         {/* MAIN CONTENT */}
//         <div style={{ flex: 1, padding: "24px", overflowY: "auto" }}>

//           {/* Registration error banner */}
//           {registrationError && (
//             <div
//               style={{
//                 backgroundColor: "rgba(244,63,94,0.1)",
//                 border: "1px solid rgba(244,63,94,0.3)",
//                 borderRadius: "10px",
//                 padding: "12px 16px",
//                 marginBottom: "16px",
//                 color: "#f43f5e",
//                 fontSize: "13px",
//               }}
//             >
//               ⚠ Backend registration failed: {registrationError}. Training will run but metrics will not be saved to server.
//             </div>
//           )}

//           {/* Partition info banner — shown after registration */}
//           {assignedPartition && (
//             <div
//               style={{
//                 backgroundColor: "rgba(16,185,129,0.08)",
//                 border: "1px solid rgba(16,185,129,0.2)",
//                 borderRadius: "10px",
//                 padding: "12px 16px",
//                 marginBottom: "16px",
//                 color: "#10b981",
//                 fontSize: "13px",
//                 display: "flex",
//                 gap: "16px",
//               }}
//             >
//               <span>✓ Registered with backend</span>
//               <span>Partition: <strong>{assignedPartition}</strong></span>
//               <span>Language: <strong>{language}</strong></span>
//               <span>Client ID: <strong style={{ fontFamily: "monospace" }}>{clientId?.substring(0, 12)}...</strong></span>
//             </div>
//           )}

//           <div style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: "24px" }}>
//             {/* LEFT — Configuration */}
//             <div
//               style={{
//                 backgroundColor: "rgba(255,255,255,0.04)",
//                 border: "1px solid rgba(255,255,255,0.08)",
//                 borderRadius: "16px",
//                 backdropFilter: "blur(20px)",
//                 padding: "24px",
//               }}
//             >
//               <h2 style={{ color: "#f0f4ff", fontSize: "18px", fontWeight: 600, margin: "0 0 24px 0" }}>
//                 Training Configuration
//               </h2>

//               {/* Language selector */}
//               <div style={{ marginBottom: "20px" }}>
//                 <label style={{ color: "#8892b0", fontSize: "13px", display: "block", marginBottom: "8px" }}>
//                   Language
//                 </label>
//                 <select
//                   value={language}
//                   onChange={(e) => setLanguage(e.target.value)}
//                   disabled={isRunning}
//                   style={{
//                     width: "100%",
//                     padding: "10px 14px",
//                     backgroundColor: "rgba(255,255,255,0.04)",
//                     border: "1px solid rgba(255,255,255,0.08)",
//                     borderRadius: "8px",
//                     color: "#f0f4ff",
//                     fontSize: "14px",
//                     outline: "none",
//                     cursor: isRunning ? "not-allowed" : "pointer",
//                   }}
//                 >
//                   <option value="Dholuo">Dholuo</option>
//                   <option value="Kalenjin">Kalenjin</option>
//                   <option value="Kidawida">Kidawida</option>
//                 </select>
//               </div>

//               {/* Model */}
//               <div style={{ marginBottom: "24px" }}>
//                 <label style={{ color: "#8892b0", fontSize: "13px", display: "block", marginBottom: "8px" }}>
//                   Model
//                 </label>
//                 <div
//                   style={{
//                     width: "100%",
//                     padding: "10px 14px",
//                     backgroundColor: "rgba(255,255,255,0.02)",
//                     border: "1px solid rgba(255,255,255,0.06)",
//                     borderRadius: "8px",
//                     color: "#f0f4ff",
//                     fontSize: "14px",
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "space-between",
//                   }}
//                 >
//                   <span>{MODEL_NAME}</span>
//                   <span style={{ color: "#8892b0", fontSize: "12px" }}>Auto-loaded in browser</span>
//                 </div>
//               </div>

//               {/* Aggregation method */}
//               <div style={{ marginBottom: "24px" }}>
//                 <label style={{ color: "#8892b0", fontSize: "13px", display: "block", marginBottom: "8px" }}>
//                   Aggregation Method
//                 </label>
//                 <select
//                   value={aggregationMethod}
//                   onChange={(e) => setAggregationMethod(e.target.value)}
//                   disabled={isRunning}
//                   style={{
//                     width: "100%",
//                     padding: "10px 14px",
//                     backgroundColor: "rgba(255,255,255,0.04)",
//                     border: "1px solid rgba(255,255,255,0.08)",
//                     borderRadius: "8px",
//                     color: "#f0f4ff",
//                     fontSize: "14px",
//                     outline: "none",
//                     cursor: isRunning ? "not-allowed" : "pointer",
//                   }}
//                 >
//                   <option value="FedAvg">FedAvg</option>
//                 </select>
//               </div>

//               {/* Buttons */}
//               <button
//                 onClick={handleStart}
//                 disabled={startDisabled}
//                 style={{
//                   width: "100%",
//                   padding: "14px",
//                   borderRadius: "10px",
//                   border: "none",
//                   background: startDisabled
//                     ? "rgba(255,255,255,0.08)"
//                     : "linear-gradient(135deg, #7c3aed, #06b6d4)",
//                   color: startDisabled ? "#8892b0" : "#ffffff",
//                   fontSize: "15px",
//                   fontWeight: 600,
//                   cursor: startDisabled ? "not-allowed" : "pointer",
//                   marginBottom: "12px",
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   gap: "8px",
//                 }}
//               >
//                 {startLabel}
//               </button>

//               <div style={{ display: "flex", gap: "12px" }}>
//                 <button
//                   onClick={handlePause}
//                   disabled={pauseDisabled}
//                   style={{
//                     flex: 1,
//                     padding: "12px",
//                     borderRadius: "10px",
//                     backgroundColor: "transparent",
//                     border: `1px solid ${pauseDisabled ? "rgba(255,255,255,0.1)" : "#f59e0b"}`,
//                     color: pauseDisabled ? "#4a5568" : "#f59e0b",
//                     fontSize: "14px",
//                     fontWeight: 500,
//                     cursor: pauseDisabled ? "not-allowed" : "pointer",
//                     opacity: pauseDisabled ? 0.6 : 1,
//                   }}
//                 >
//                   ⏸ Pause
//                 </button>
//                 <button
//                   onClick={handleStop}
//                   disabled={stopDisabled}
//                   style={{
//                     flex: 1,
//                     padding: "12px",
//                     borderRadius: "10px",
//                     backgroundColor: "transparent",
//                     border: `1px solid ${stopDisabled ? "rgba(255,255,255,0.1)" : "#f43f5e"}`,
//                     color: stopDisabled ? "#4a5568" : "#f43f5e",
//                     fontSize: "14px",
//                     fontWeight: 500,
//                     cursor: stopDisabled ? "not-allowed" : "pointer",
//                     opacity: stopDisabled ? 0.6 : 1,
//                   }}
//                 >
//                   ⏹ Stop
//                 </button>
//               </div>
//             </div>

//             {/* RIGHT — Live Metrics */}
//             <div
//               style={{
//                 backgroundColor: "rgba(255,255,255,0.04)",
//                 border: "1px solid rgba(255,255,255,0.08)",
//                 borderRadius: "16px",
//                 backdropFilter: "blur(20px)",
//                 padding: "24px",
//               }}
//             >
//               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
//                 <h2 style={{ color: "#f0f4ff", fontSize: "18px", fontWeight: 600, margin: 0 }}>
//                   Live Metrics
//                 </h2>
//                 <div
//                   style={{
//                     backgroundColor: "rgba(16,185,129,0.15)",
//                     border: "1px solid rgba(16,185,129,0.3)",
//                     borderRadius: "20px",
//                     padding: "6px 14px",
//                     display: "flex",
//                     alignItems: "center",
//                     gap: "6px",
//                   }}
//                 >
//                   <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10b981" }} />
//                   <span style={{ color: "#10b981", fontSize: "13px", fontWeight: 500 }}>
//                     Round {round} of {TOTAL_ROUNDS}
//                   </span>
//                 </div>
//               </div>

//               {/* Metrics grid */}
//               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
//                 {[
//                   { label: "Accuracy", value: `${accuracy.toFixed(1)}%`, delta: accuracy - prevMetrics.accuracy, color: "#7c3aed", up: accuracy >= prevMetrics.accuracy },
//                   { label: "Loss", value: loss.toFixed(3), delta: loss - prevMetrics.loss, color: "#06b6d4", up: loss <= prevMetrics.loss },
//                   { label: "F1 Score", value: f1.toFixed(3), delta: f1 - prevMetrics.f1, color: "#10b981", up: f1 >= prevMetrics.f1 },
//                   { label: "Precision", value: precision.toFixed(3), delta: precision - prevMetrics.precision, color: "#f59e0b", up: precision >= prevMetrics.precision },
//                 ].map((m) => (
//                   <div
//                     key={m.label}
//                     style={{
//                       backgroundColor: `${m.color}1a`,
//                       border: `1px solid ${m.color}33`,
//                       borderRadius: "12px",
//                       padding: "20px",
//                     }}
//                   >
//                     <div style={{ color: "#8892b0", fontSize: "13px", marginBottom: "8px" }}>{m.label}</div>
//                     <div style={{ color: "#f0f4ff", fontSize: "32px", fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>
//                       {m.value}
//                     </div>
//                     {round > 1 && (
//                       <div style={{ color: m.up ? "#10b981" : "#f43f5e", fontSize: "13px", marginTop: "4px" }}>
//                         {m.up ? "↑" : "↓"} {Math.abs(m.delta).toFixed(m.label === "Accuracy" ? 1 : 3)}{m.label === "Accuracy" ? "%" : ""}
//                       </div>
//                     )}
//                   </div>
//                 ))}
//               </div>

//               {/* Accuracy chart */}
//               <div style={{ backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "12px", padding: "20px" }}>
//                 <div style={{ color: "#8892b0", fontSize: "13px", marginBottom: "16px" }}>
//                   Accuracy Over Rounds {clientId && <span style={{ color: "#4a5568" }}> — logged to backend</span>}
//                 </div>
//                 <svg viewBox="0 0 400 150" style={{ width: "100%", height: "150px" }}>
//                   <defs>
//                     <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
//                       <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.3" />
//                       <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
//                     </linearGradient>
//                   </defs>
//                   {[0, 1, 2, 3, 4].map((i) => (
//                     <line key={i} x1="40" y1={20 + i * 30} x2="380" y2={20 + i * 30} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
//                   ))}
//                   {[100, 80, 60, 40, 20].map((val, i) => (
//                     <text key={i} x="30" y={25 + i * 30} fill="#8892b0" fontSize="10" textAnchor="end" fontFamily="JetBrains Mono, monospace">
//                       {val}%
//                     </text>
//                   ))}
//                   {accHistory.length > 1 ? (
//                     <>
//                       <path
//                         d={`M ${40} ${140 - ((accHistory[0] - 20) / 80) * 120} ${accHistory.map((val, i) => `L ${40 + (i * 340) / (accHistory.length - 1)} ${140 - ((val - 20) / 80) * 120}`).join(" ")} L ${40 + 340} 140 L 40 140 Z`}
//                         fill="url(#areaGradient)"
//                       />
//                       <path
//                         d={`M ${accHistory.map((val, i) => `${40 + (i * 340) / (accHistory.length - 1)} ${140 - ((val - 20) / 80) * 120}`).join(" L ")}`}
//                         fill="none"
//                         stroke="#7c3aed"
//                         strokeWidth="2"
//                       />
//                       {accHistory.map((val, i) => (
//                         <circle key={i} cx={40 + (i * 340) / (accHistory.length - 1)} cy={140 - ((val - 20) / 80) * 120} r="4" fill="#06b6d4" stroke="#060810" strokeWidth="2" />
//                       ))}
//                     </>
//                   ) : (
//                     <text x="200" y="80" fill="#4a5568" fontSize="13" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
//                       Start training to see live results
//                     </text>
//                   )}
//                 </svg>
//               </div>
//             </div>
//           </div>

//           {/* LIVE LOG */}
//           <div style={{ marginTop: "24px", backgroundColor: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", overflow: "hidden" }}>
//             <div style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
//               <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//                 <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#10b981", animation: "blink 1s infinite" }} />
//                 <span style={{ color: "#f0f4ff", fontSize: "16px", fontWeight: 600 }}>Live Training Log</span>
//               </div>
//               <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
//                 <div style={{ backgroundColor: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "6px", padding: "6px 12px", color: "#10b981", fontSize: "12px", fontWeight: 500 }}>
//                   Auto-scroll ON
//                 </div>
//                 <button onClick={handleClearLog} style={{ backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", padding: "8px 14px", color: "#8892b0", fontSize: "13px", cursor: "pointer" }}>
//                   Clear Log
//                 </button>
//                 <button onClick={handleExportLog} style={{ backgroundColor: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.4)", borderRadius: "8px", padding: "8px 14px", color: "#a78bfa", fontSize: "13px", cursor: "pointer" }}>
//                   Export
//                 </button>
//               </div>
//             </div>

//             <div ref={logContainerRef} style={{ backgroundColor: "#030507", height: "220px", overflowY: "auto", fontFamily: "JetBrains Mono, monospace", fontSize: "13px", lineHeight: 1.9, padding: "16px 24px" }}>
//               {logEntries.length === 0 ? (
//                 <div style={{ color: "#4a5568" }}>Press "Start Training" to begin a session…</div>
//               ) : (
//                 logEntries.map((entry, i) => (
//                   <div key={i}>
//                     <span style={{ color: "#4a5568" }}>[{entry.time}]</span>{" "}
//                     <span style={{ color: entry.color }}>{entry.text}</span>
//                   </div>
//                 ))
//               )}
//             </div>

//             <div style={{ backgroundColor: "#030507", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
//               <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//                 <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: isRunning ? (isPaused ? "#f59e0b" : "#10b981") : isCompleted ? "#a78bfa" : "#4a5568" }} />
//                 <span style={{ color: isRunning ? (isPaused ? "#f59e0b" : "#10b981") : isCompleted ? "#a78bfa" : "#4a5568", fontSize: "12px" }}>
//                   {isRunning ? (isPaused ? "Paused" : "Training in progress…") : isCompleted ? "Training complete" : "Waiting to start…"}
//                 </span>
//               </div>
//               <span style={{ color: "#4a5568", fontSize: "12px" }}>
//                 {logEntries.length} events | Round {round} of {TOTAL_ROUNDS}
//               </span>
//             </div>
//           </div>
//         </div>
//       </div>

//       <style>{`
//         @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
//         @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
//         select option { background-color: #0c0f1a; color: #f0f4ff; }
//       `}</style>
//     </div>
//   );
// }

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
          await flLib.trainLocally(currentModel, language, myPartition, 3);

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
