/**
 * lib/fl_client.ts
 * Federated client controller (SDS 3.1.1 Browser Client Layer).
 *
 * Round loop (all state is decided by the SERVER, so any number of browsers
 * can run this same code at the same time without interfering).  Anybody can
 * press "Start Training" at any time: the first browser starts the training,
 * every later one simply joins it and takes part from the next round.
 *
 *   join session -> load shard (2000 samples) -> loop:
 *     poll round -> if selected: get global model, train locally, submit
 *     weights -> wait for aggregation -> show the server-evaluated global
 *     metrics -> next round ... until the server reports "session_complete".
 *
 * Start / pause / resume / stop / complete / error are reported through
 * `onNotify` so the UI can show a pop-up for each of them.
 */
import {
  ApiError, rememberMe, getGlobalModel, getRound, getShard, joinSession, leaveSession, leaveSessionBeacon,
  setClientState, submitUpdate,
  type Architecture, type ClientInfo, type RoundLog, type RoundView, type SessionConfig, type SessionInfo, type StartConfig,
} from "./api";
import { detectBackend, type Capabilities } from "./backend_detector";
import { LocalTrainer } from "./fl_model";
import { assertWeightsOnly } from "./privacy_guard";

export type ClientStatus =
  | "idle" | "connecting" | "waiting" | "training" | "submitting" | "aggregating"
  | "not_selected" | "paused" | "stopped" | "completed" | "error";

export type NotifyKind = "started" | "paused" | "resumed" | "stopped" | "completed" | "error" | "info";
export type Notice = { kind: NotifyKind; title: string; message: string };

export type LocalRoundResult = { round: number; accuracy: number; loss: number; seconds: number; timestamp: number };

export type Callbacks = {
  onLog: (color: string, text: string) => void;
  onStatus: (s: ClientStatus) => void;
  onNotify: (n: Notice) => void;
  onJoined: (j: { client: ClientInfo; session: SessionInfo; created: boolean; caps: Capabilities; arch: Architecture; shardInfo?: Record<string, number> }) => void;
  onRound: (v: RoundView) => void;
  onGlobal: (log: RoundLog) => void;
  onLocal: (r: LocalRoundResult) => void;
};

const COLORS = { info: "#8892b0", ok: "#10b981", warn: "#f59e0b", bad: "#f43f5e", cyan: "#06b6d4", purple: "#a78bfa" };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class FLClient {
  private token: string | null = null;
  private trainer: LocalTrainer | null = null;
  private running = false;
  private paused = false;
  private stopRequested = false;
  private pausedSent = false;
  private lastGlobalRound = 0;
  private lastTrainedRound = 0;
  private cfg: SessionConfig | null = null;
  private unloadHandler = () => { if (this.token) leaveSessionBeacon(this.token); };

  constructor(private cb: Callbacks) {}

  get isRunning() { return this.running; }
  get isPaused() { return this.paused; }

  private log(color: string, text: string) { this.cb.onLog(color, text); }
  private status(s: ClientStatus) { this.cb.onStatus(s); }

  // ── public controls ────────────────────────────────────
  /**
   * Start a training - or join the one that is already running (the server decides;
   * `config` is only used by the browser that creates the training).
   */
  async start(config: Partial<StartConfig>, opts: { name?: string; preferredLanguage?: string } = {}) {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this.stopRequested = false;
    this.pausedSent = false;
    this.lastGlobalRound = 0;
    this.lastTrainedRound = 0;
    this.status("connecting");
    try {
      this.log(COLORS.cyan, "Detecting hardware backend (WebGPU → WebGL → CPU)...");
      const caps = await detectBackend();
      this.log(COLORS.ok, `Backend: ${caps.backend.toUpperCase()} | WebGPU ${caps.webgpu_available ? "yes" : "no"} | WebNN ${caps.webnn_available ? "yes" : "no"} | ${caps.cpu_cores} CPU cores${caps.memory_gb ? ` | ${caps.memory_gb} GB RAM` : ""}`);
      caps.tried.forEach((t) => this.log(COLORS.info, `  backend probe → ${t}`));

      this.log(COLORS.info, "Connecting to Synora coordination server (first request may take ~30 s if the server is waking up)...");

      const j = await joinSession(
        {
          client_name: opts.name,
          config,
          preferred_language: opts.preferredLanguage,
          capabilities: {
            backend: caps.backend, cpu_cores: caps.cpu_cores, memory_gb: caps.memory_gb ?? undefined,
            webgpu_available: caps.webgpu_available, webnn_available: caps.webnn_available,
          },
        },
        (n) => this.log(COLORS.warn, `Server is waking up... retry ${n}`)
      );
      this.token = j.client.session_token ?? null;
      rememberMe(j.client.client_id, j.session.session_id);
      this.cfg = j.session.config;
      if (!this.token) throw new Error("Server did not return a session token");
      window.addEventListener("pagehide", this.unloadHandler);

      this.log(COLORS.ok, `${j.created_session ? "Started a new training" : `Joined the running training (round ${j.session.current_round} of ${j.session.config.total_rounds})`} — session ${j.session.session_id.slice(0, 8)} as ${j.client.client_name}`);
      if (!j.created_session) this.log(COLORS.warn, "You take part from the next round, with your own rounds and data partitioning.");
      this.log(COLORS.info, `Partition: ${j.client.partition_type ?? j.session.config.partition_type}${j.client.language ? ` (${j.client.language})` : ` (shard ${j.client.partition_index + 1})`}`);

      // Model + data
      this.trainer = new LocalTrainer(j.architecture);
      await this.trainer.init();
      this.log(COLORS.cyan, `Model built from server architecture: ${this.trainer.parameterCount.toLocaleString()} parameters (${(j.architecture.model_size_bytes / 1e6).toFixed(2)} MB)`);
      const shard = await getShard(this.token);
      this.trainer.loadShard(shard);
      this.log(COLORS.ok, `Dataset shard ready: ${shard.num_samples} samples — ${Object.entries(shard.label_distribution).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${v}`).join(", ")}`);
      const gm = await getGlobalModel(this.token);
      this.trainer.setGlobalWeights(gm.weights!, gm.version);
      this.log(COLORS.ok, `Server-initialised global model v${gm.version} loaded`);

      this.cb.onJoined({ client: j.client, session: j.session, created: j.created_session, caps, arch: j.architecture, shardInfo: shard.label_distribution });
      this.cb.onNotify({
        kind: "started",
        title: "Training started",
        message: j.created_session
          ? `Training ${j.session.session_id.slice(0, 8)} started (${j.session.config.total_rounds} rounds). Other devices can join at any time just by pressing Start Training.`
          : `You joined the running training (round ${j.session.current_round} of ${j.session.config.total_rounds}). You start from the next round, with the current global model.`,
      });
      await this.loop();
    } catch (e) {
      this.fail(e);
    } finally {
      window.removeEventListener("pagehide", this.unloadHandler);
      this.trainer?.dispose();
      this.trainer = null;
      this.running = false;
    }
  }

  async pause() {
    if (!this.running || this.paused) return;
    this.paused = true;
    this.log(COLORS.warn, "Pause requested — takes effect after the current step finishes.");
    this.cb.onNotify({ kind: "paused", title: "Training paused", message: "This client will sit out new rounds until you resume. Other clients keep training." });
    this.status("paused");
    if (this.token) { try { await setClientState(this.token, "paused"); this.pausedSent = true; } catch { /* retried in loop */ } }
  }

  async resume() {
    if (!this.running || !this.paused) return;
    this.paused = false;
    this.log(COLORS.ok, "Resumed.");
    this.cb.onNotify({ kind: "resumed", title: "Training resumed", message: "This client will be selected again from the next round." });
    if (this.token) { try { await setClientState(this.token, "active"); this.pausedSent = false; } catch { /* ignore */ } }
  }

  async stop() {
    if (!this.running) return;
    this.stopRequested = true;
    this.trainer?.stop();
    this.log(COLORS.bad, "Stop requested by user.");
  }

  // ── main loop ──────────────────────────────────────────
  private async loop() {
    const token = this.token!;
    let errors = 0;
    while (!this.stopRequested) {
      let v: RoundView;
      try {
        v = await getRound(token);
        errors = 0;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) throw e;
        errors++;
        this.log(COLORS.warn, `Connection problem (${errors}/8): ${e instanceof Error ? e.message : e}`);
        if (errors >= 8) throw e;
        await sleep(2500);
        continue;
      }
      this.cb.onRound(v);

      if (v.last_round && v.last_round.round > this.lastGlobalRound) {
        this.lastGlobalRound = v.last_round.round;
        const l = v.last_round;
        this.cb.onGlobal(l);
        this.log(COLORS.purple, `Round ${l.round} aggregated (${l.client_count} client${l.client_count !== 1 ? "s" : ""}) — GLOBAL accuracy ${(l.accuracy * 100).toFixed(1)}% | loss ${l.loss.toFixed(3)} | F1 ${(l.f1 ?? 0).toFixed(3)}`);
      }

      if (v.phase === "session_complete") {
        await this.finish(v);
        return;
      }
      // This client has had exactly the number of rounds it asked for -> it finishes
      // (once its last update is part of the global model); the others carry on.
      if (v.phase === "my_rounds_done") {
        if (!v.last_round || v.last_round.round >= this.lastTrainedRound) {
          await this.finish(v, true);
          return;
        }
        this.status("aggregating");
        await sleep(900);
        continue;
      }
      if (v.phase === "aborted") {
        throw new Error("The session was aborted by the server (not enough active clients or repeated round failures).");
      }

      if (this.paused) {
        if (!this.pausedSent) { try { await setClientState(token, "paused"); this.pausedSent = true; } catch { /* retry */ } }
        this.status("paused");
        await sleep(1500);
        continue;
      }

      switch (v.phase) {
        case "train":
          if (this.lastTrainedRound === v.round_number) { this.status("aggregating"); await sleep(900); break; }
          await this.trainRound(v);
          break;
        case "wait":
          this.status("aggregating");
          await sleep(900);
          break;
        case "not_selected":
          this.status("not_selected");
          await sleep(1500);
          break;
        default:
          this.status("waiting");
          await sleep(1500);
      }
    }
    await this.stopped();
  }

  private async trainRound(v: RoundView) {
    const token = this.token!;
    const trainer = this.trainer!;
    const cfg = this.cfg!;
    const r = v.round_number;
    this.status("training");
    this.log(COLORS.warn, `Round ${r}/${v.total_rounds} — selected (${v.selected_count ?? "?"} client${(v.selected_count ?? 2) !== 1 ? "s" : ""} this round)`);

    if (trainer.version !== v.required_model_version) {
      this.log(COLORS.cyan, `Fetching global model v${v.required_model_version}...`);
      const gm = await getGlobalModel(token, trainer.version);
      if (!gm.up_to_date && gm.weights) trainer.setGlobalWeights(gm.weights, gm.version);
      if (gm.version < v.required_model_version) { this.log(COLORS.warn, "Global model not ready yet — retrying"); await sleep(1000); return; }
    }

    const res = await trainer.train({
      epochs: cfg.local_epochs,
      batchSize: cfg.batch_size,
      learningRate: cfg.learning_rate,
      timeoutMs: Math.min(cfg.round_timeout_seconds, 120) * 1000,
      onEpoch: (e, acc, loss) => this.log(COLORS.info, `  epoch ${e}/${cfg.local_epochs}: local accuracy ${(acc * 100).toFixed(1)}% | loss ${loss.toFixed(3)}`),
    });
    if (this.stopRequested || res.stopped) return;
    if (res.timedOut) this.log(COLORS.warn, `Local training hit the ${cfg.round_timeout_seconds}s limit — submitting what was learned.`);
    this.cb.onLocal({ round: r, accuracy: res.accuracy, loss: res.loss, seconds: res.seconds, timestamp: Date.now() });
    this.log(COLORS.ok, `Round ${r} local training done in ${res.seconds.toFixed(1)}s — local accuracy ${(res.accuracy * 100).toFixed(1)}%`);

    this.status("submitting");
    const payload = {
      round: r,
      weights: trainer.exportWeights(),
      metrics: { accuracy: res.accuracy, loss: res.loss },
      train_seconds: res.seconds,
      local_epochs: res.epochs,
    };
    assertWeightsOnly(payload); // Privacy Enforcement Layer (client side)
    try {
      const resp = await submitUpdate(token, r, payload);
      this.lastTrainedRound = r;
      this.log(COLORS.cyan, `Weights submitted${resp.aggregated ? " — this update completed the round" : " — waiting for the other clients of this round"}`);
    } catch (e) {
      if (e instanceof ApiError && [409, 403].includes(e.status)) {
        this.lastTrainedRound = r;
        this.log(COLORS.warn, `Update not accepted (${e.code}): ${e.message}`);
      } else throw e;
    }
  }

  private async finish(v: RoundView, ownRoundsOnly = false) {
    const l = v.last_round;
    this.status("completed");
    this.log(COLORS.ok, `${ownRoundsOnly ? `Your ${v.my_rounds_wanted} round${v.my_rounds_wanted !== 1 ? "s are" : " is"} done` : "Training complete"} — final GLOBAL accuracy ${l ? (l.accuracy * 100).toFixed(1) : "—"}%`);
    const tookPart = this.lastTrainedRound > 0;
    const stats = l ? ` Global accuracy ${(l.accuracy * 100).toFixed(1)}%, F1 ${(l.f1 ?? 0).toFixed(3)} (evaluated by the server on held-out data).` : "";
    this.cb.onNotify({
      kind: "completed",
      title: ownRoundsOnly ? "Your rounds are complete" : "Training complete",
      message: !tookPart
        ? "This training finished before your first round started, so you did not contribute. Press Start Training to begin a new one."
        : ownRoundsOnly
        ? `You took part in all ${v.my_rounds_wanted} round${v.my_rounds_wanted !== 1 ? "s" : ""} you asked for. The training continues for other clients.${stats}`
        : `${v.my_rounds_done} round${v.my_rounds_done !== 1 ? "s" : ""} done by you; the training ran ${v.rounds_completed} rounds in total.${stats}`,
    });
    if (this.token) { try { await leaveSession(this.token); } catch { /* ignore */ } }
  }

  private async stopped() {
    this.status("stopped");
    if (this.token) { try { await leaveSession(this.token); } catch { /* ignore */ } }
    this.cb.onNotify({ kind: "stopped", title: "Training stopped", message: "You left the session. Rounds already aggregated stay available on the Results page." });
  }

  private fail(e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    this.status("error");
    this.log(COLORS.bad, `Error: ${msg}`);
    this.cb.onNotify({ kind: "error", title: "Training stopped by an error", message: msg });
    if (this.token) leaveSessionBeacon(this.token);
  }
}
