/**
 * lib/backend_detector.ts
 * Hardware Backend Detector (SRS US-06, SDS 3.1.1.2):
 *   WebGPU  ->  WebGL  ->  CPU   (automatic fallback, each backend is smoke-
 *   tested before it is accepted), plus WebNN detection and hardware
 *   capability reporting (cores / memory).
 * Add  ?backend=cpu|webgl|webgpu  to the URL to force one for testing.
 */
export type BackendName = "webgpu" | "webgl" | "cpu";

export type Capabilities = {
  backend: BackendName;
  webgpu_available: boolean;
  webnn_available: boolean;
  webgl_available: boolean;
  cpu_cores: number;
  memory_gb: number | null;
  tried: string[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tfPromise: Promise<any> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getTf(): Promise<any> {
  if (!tfPromise) tfPromise = import("@tensorflow/tfjs");
  return tfPromise;
}

async function webgpuUsable(): Promise<boolean> {
  try {
    const nav = navigator as unknown as { gpu?: { requestAdapter: () => Promise<unknown> } };
    if (!nav.gpu) return false;
    return !!(await nav.gpu.requestAdapter());
  } catch {
    return false;
  }
}

function webglUsable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export async function detectBackend(): Promise<Capabilities> {
  const tf = await getTf();
  const nav = navigator as unknown as { ml?: unknown; deviceMemory?: number; hardwareConcurrency?: number };
  const forced = new URLSearchParams(window.location.search).get("backend");
  const webgpu_available = await webgpuUsable();
  const webgl_available = webglUsable();
  const webnn_available = !!nav.ml;
  const order: BackendName[] = forced && ["webgpu", "webgl", "cpu"].includes(forced)
    ? [forced as BackendName, "cpu"]
    : ["webgpu", "webgl", "cpu"];

  const tried: string[] = [];
  let chosen: BackendName = "cpu";
  for (const name of order) {
    if (name === "webgpu" && !webgpu_available) { tried.push("webgpu: not available"); continue; }
    if (name === "webgl" && !webgl_available) { tried.push("webgl: not available"); continue; }
    try {
      if (name === "webgpu") await import("@tensorflow/tfjs-backend-webgpu");
      const ok = await tf.setBackend(name);
      await tf.ready();
      if (!ok) throw new Error("setBackend returned false");
      // smoke test: a tiny matmul must really run on this backend
      const a = tf.tensor2d([[1, 2], [3, 4]]);
      const r = tf.matMul(a, a);
      const v = await r.data();
      a.dispose(); r.dispose();
      if (v[0] !== 7) throw new Error("smoke test failed");
      chosen = name;
      tried.push(`${name}: ok`);
      break;
    } catch (e) {
      tried.push(`${name}: failed (${e instanceof Error ? e.message : "error"})`);
    }
  }
  if (chosen === "cpu") {
    await tf.setBackend("cpu");
    await tf.ready();
  }
  return {
    backend: chosen,
    webgpu_available,
    webnn_available,
    webgl_available,
    cpu_cores: nav.hardwareConcurrency ?? 1,
    memory_gb: nav.deviceMemory ?? null,
    tried,
  };
}
