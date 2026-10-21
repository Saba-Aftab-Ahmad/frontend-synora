/**
 * lib/fl_model.ts
 * Local Training Module (SDS 3.1.1.3) - on-device training with TF.js.
 *
 * MODEL (identical to server/model_spec.py - the lightweight model of the SRS,
 * NFR-A03: <= 5 MB):
 *
 *     Embedding(5000 x 32) -> GlobalAveragePooling1D -> Dense(16, relu)
 *         -> Dropout(0.3) -> Dense(3, softmax)          160,579 parameters = 0.64 MB
 *
 * WHAT CHANGED vs v1 and WHY (this is the training-speed fix):
 *  1. v1 trained through tf.layers.embedding().  TF.js back-propagates an
 *     embedding lookup through a one-hot matrix of [batch x length x 5000]
 *     numbers (12.8 M per step for batch 64) - extremely slow on CPU and
 *     memory-hungry on the GPU.
 *     "Embedding -> average pooling" is mathematically the SAME as
 *         mean_embedding = (word_count_vector / L)  @  EmbeddingMatrix
 *     (an "embedding bag").  We build the sparse word-count matrix in plain
 *     JavaScript (2 560 increments per batch) and use ONE small matmul
 *     [64 x 5000]@[5000 x 32].  Same weights, same outputs (verified against
 *     the server's numpy mirror, see tests), ~40-100x cheaper per step.
 *  2. The model object / variables are created once and re-used every round;
 *     global weights are loaded with assign() (v1 re-built a RANDOM model each
 *     round and silently fell back to it when parsing failed).
 *  3. Batch 64 (v1: 16) and sequence length 40 (v1: 100).  Still exactly 2000
 *     samples per client.
 *  4. Every tensor is disposed; a fresh Adam optimizer is used per round;
 *     the UI thread is released after every batch (tf.nextFrame).
 *  5. Hard local-training timeout (SDS: 120 s).
 */
import type { Architecture, ShardResponse } from "./api";
import { getTf } from "./backend_detector";
import { b64ToF32, b64ToU16, f32ToB64, type WireTensor } from "./weight_codec";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TF = any;

export type TrainResult = {
  accuracy: number;
  loss: number;
  seconds: number;
  epochs: number;
  timedOut: boolean;
  stopped: boolean;
};

export class LocalTrainer {
  private tf!: TF;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private vars: any[] = [];
  private ids: Int32Array | null = null; // [N * L] token ids of this client's shard
  private labels: Int32Array | null = null;
  private stopFlag = false;
  version = -1;
  numSamples = 0;

  constructor(private arch: Architecture) {}

  async init() {
    const tf = (this.tf = await getTf());
    // Variables in the SAME order as the server's LAYER_SPECS / TF.js getWeights():
    // embedding, dense_1 kernel, dense_1 bias, output kernel, output bias
    this.vars = this.arch.layers.map((l) => tf.variable(tf.zeros(l.shape), true, l.layer_name));
  }

  get parameterCount(): number {
    return this.arch.layers.reduce((n, l) => n + l.shape.reduce((a, b) => a * b, 1), 0);
  }

  /** Cache this client's 2000-sample shard (once per session). */
  loadShard(shard: ShardResponse) {
    const flat = b64ToU16(shard.x_b64);
    if (flat.length !== shard.num_samples * shard.seq_len) throw new Error("Corrupt dataset shard received");
    this.ids = Int32Array.from(flat);
    this.labels = Int32Array.from(shard.labels);
    this.numSamples = shard.num_samples;
  }

  /** Load the server's global weights into the existing variables (in place). */
  setGlobalWeights(wire: WireTensor[], version: number) {
    const tf = this.tf;
    if (wire.length !== this.arch.layers.length) throw new Error("Global model has an unexpected number of tensors");
    wire.forEach((t, i) => {
      if (JSON.stringify(t.shape) !== JSON.stringify(this.arch.layers[i].shape)) throw new Error(`Tensor ${i} shape mismatch`);
      const data = b64ToF32(t.data_b64);
      if (!data.every(Number.isFinite)) throw new Error(`Tensor ${i} contains NaN/Infinity`);
      const tensor = tf.tensor(data, t.shape, "float32");
      this.vars[i].assign(tensor);
      tensor.dispose();
    });
    this.version = version;
  }

  /** Word-count matrix [n x V], each row sums to 1 (= count / L).  Plain JS, very cheap. */
  private countMatrix(idx: ArrayLike<number>, start: number, n: number): Float32Array {
    const V = this.arch.vocab_size;
    const L = this.arch.max_length;
    const out = new Float32Array(n * V);
    const w = 1 / L;
    const ids = this.ids!;
    for (let i = 0; i < n; i++) {
      const base = idx[start + i] * L;
      for (let j = 0; j < L; j++) out[i * V + ids[base + j]] += w;
    }
    return out;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private forward(counts: any, training: boolean): any {
    const tf = this.tf;
    const [E, W1, b1, W2, b2] = this.vars;
    let h = counts.matMul(E); // embedding + average pooling
    h = tf.relu(h.matMul(W1).add(b1)); // Dense(16, relu)
    if (training) h = tf.dropout(h, this.arch.dropout_rate); // Dropout(0.3)
    return tf.softmax(h.matMul(W2).add(b2)); // Dense(3, softmax)
  }

  /** Class probabilities for the given rows of the shard (used by tests / local evaluation). */
  predictProbs(rows: number[]): Float32Array {
    const tf = this.tf;
    return tf.tidy(() => {
      const counts = tf.tensor2d(this.countMatrix(rows, 0, rows.length), [rows.length, this.arch.vocab_size]);
      return this.forward(counts, false).dataSync();
    }) as Float32Array;
  }

  /** Local training with a wall-clock timeout (SDS: 120 s). */
  async train(opts: {
    epochs: number;
    batchSize: number;
    learningRate: number;
    timeoutMs: number;
    onEpoch?: (epoch: number, acc: number, loss: number) => void;
  }): Promise<TrainResult> {
    const tf = this.tf;
    if (!this.ids || !this.labels) throw new Error("Dataset shard not loaded");
    this.stopFlag = false;
    const optimizer = tf.train.adam(opts.learningRate); // fresh optimizer state every round
    const N = this.numSamples;
    const V = this.arch.vocab_size;
    const C = this.arch.num_classes;
    const t0 = performance.now();
    let timedOut = false;
    let lastAcc = 0;
    let lastLoss = 0;
    let doneEpochs = 0;
    let lastYield = performance.now();

    try {
      for (let epoch = 0; epoch < opts.epochs && !timedOut && !this.stopFlag; epoch++) {
        const order = Int32Array.from({ length: N }, (_, i) => i);
        for (let i = N - 1; i > 0; i--) { // Fisher-Yates shuffle
          const j = Math.floor(Math.random() * (i + 1));
          const tmp = order[i]; order[i] = order[j]; order[j] = tmp;
        }
        let lossSum = 0, correct = 0, seen = 0;
        for (let start = 0; start < N; start += opts.batchSize) {
          if (this.stopFlag) break;
          if (performance.now() - t0 > opts.timeoutMs) { timedOut = true; break; }
          const n = Math.min(opts.batchSize, N - start);
          const counts = tf.tensor2d(this.countMatrix(order, start, n), [n, V]);
          const yOne = new Float32Array(n * C);
          const yIdx = new Int32Array(n);
          for (let i = 0; i < n; i++) { const lab = this.labels[order[start + i]]; yOne[i * C + lab] = 1; yIdx[i] = lab; }
          const y = tf.tensor2d(yOne, [n, C]);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let probs: any = null;
          const cost = optimizer.minimize(() => {
            const p = this.forward(counts, true);
            probs = tf.keep(tf.clone(p));
            return tf.neg(tf.mean(tf.sum(y.mul(tf.log(p.add(1e-7))), 1)));
          }, true, this.vars);
          const lossVal = (await cost.data())[0];
          const pred = tf.tidy(() => probs.argMax(1).dataSync()) as Int32Array;
          for (let i = 0; i < n; i++) if (pred[i] === yIdx[i]) correct++;
          lossSum += lossVal * n; seen += n;
          cost.dispose(); probs.dispose(); counts.dispose(); y.dispose();
          // Release the UI thread at most every ~40 ms.  (setTimeout instead of
          // requestAnimationFrame: rAF is paused in background tabs, which would
          // freeze a second client running in another tab/window.)
          if (performance.now() - lastYield > 40) {
            await new Promise((r) => setTimeout(r, 0));
            lastYield = performance.now();
          }
        }
        if (seen > 0) {
          lastAcc = correct / seen;
          lastLoss = lossSum / seen;
          doneEpochs = epoch + 1;
          opts.onEpoch?.(doneEpochs, lastAcc, lastLoss);
        }
      }
    } finally {
      optimizer.dispose();
    }
    return { accuracy: lastAcc, loss: lastLoss, seconds: (performance.now() - t0) / 1000, epochs: doneEpochs, timedOut, stopped: this.stopFlag };
  }

  stop() { this.stopFlag = true; }

  /** Current weights in the wire format (float32 base64). */
  exportWeights(): WireTensor[] {
    return this.vars.map((v: { shape: number[]; dataSync: () => Float32Array }, i: number) => ({
      layer_name: this.arch.layers[i].layer_name,
      shape: [...v.shape],
      dtype: "float32" as const,
      data_b64: f32ToB64(new Float32Array(v.dataSync())),
    }));
  }

  dispose() {
    this.vars.forEach((v) => v.dispose());
    this.vars = [];
    this.ids = null;
    this.labels = null;
  }
}
