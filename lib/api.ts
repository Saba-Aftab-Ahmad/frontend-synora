// /**
//  * Synora API Client
//  * Connects frontend to the Flask coordination server on Render.
//  * All backend communication goes through this file.
//  * Never hardcode data — always fetch from the real server.
//  */

// const BACKEND_URL =
//   process.env.NEXT_PUBLIC_BACKEND_URL ||
//   "https://synora-coordination-server.onrender.com";

// // ── Types ──────────────────────────────────────────────────

// export interface RegisterResponse {
//   message: string;
//   client_id: string;
//   partition: string;
//   status: string;
// }

// export interface RoundLog {
//   round: number;
//   accuracy: number;
//   loss: number;
//   participating_clients: string[];
//   client_count: number;
//   timestamp: string;
// }

// export interface ExperimentSummary {
//   experiment_name: string;
//   total_rounds: number;
//   configuration: Record<string, unknown>;
//   rounds: RoundLog[];
//   start_time: string | null;
//   export_time: string;
// }

// export interface AggregationStatus {
//   can_aggregate: boolean;
//   connected_clients: number;
//   min_required: number;
//   current_round: number;
//   status: string;
// }

// // ── Helper ─────────────────────────────────────────────────

// async function apiFetch<T>(
//   endpoint: string,
//   options: RequestInit = {}
// ): Promise<T> {
//   const res = await fetch(`${BACKEND_URL}${endpoint}`, {
//     headers: { "Content-Type": "application/json" },
//     ...options,
//   });

//   if (!res.ok) {
//     const error = await res.json().catch(() => ({}));
//     throw new Error(
//       error.error || `Request failed: ${res.status} ${res.statusText}`
//     );
//   }

//   return res.json() as Promise<T>;
// }

// // ── US-08: Client Registration ─────────────────────────────

// /**
//  * Register this browser session as a federated learning client.
//  * Returns the client_id and assigned language partition.
//  */
// export async function registerClient(
//   clientName: string
// ): Promise<RegisterResponse> {
//   return apiFetch<RegisterResponse>("/register", {
//     method: "POST",
//     body: JSON.stringify({ client_name: clientName }),
//   });
// }

// // ── US-11: Aggregation Check ───────────────────────────────

// /**
//  * Check if enough clients are connected for aggregation.
//  */
// export async function checkAggregation(): Promise<AggregationStatus> {
//   return apiFetch<AggregationStatus>("/aggregate/check");
// }

// // ── US-16: Experiment Configuration ───────────────────────

// /**
//  * Save FL experiment hyperparameters to the backend.
//  */
// export async function saveExperimentConfig(config: {
//   num_rounds: number;
//   learning_rate: number;
//   partition_type: string;
//   dirichlet_alpha: number;
//   languages: string[];
// }): Promise<{ message: string; config: Record<string, unknown> }> {
//   return apiFetch("/experiment/config", {
//     method: "POST",
//     body: JSON.stringify(config),
//   });
// }

// // ── US-17: Round Logging ───────────────────────────────────

// /**
//  * Log metrics for a completed federated training round.
//  */
// export async function logRound(data: {
//   round: number;
//   accuracy: number;
//   loss: number;
//   participating_clients: string[];
// }): Promise<{ message: string; round_data: RoundLog }> {
//   return apiFetch("/experiment/log", {
//     method: "POST",
//     body: JSON.stringify(data),
//   });
// }

// /**
//  * Fetch the full experiment summary including all logged rounds.
//  * Used by both the training dashboard and results page.
//  */
// export async function getExperimentSummary(): Promise<ExperimentSummary> {
//   return apiFetch<ExperimentSummary>("/experiment/summary");
// }

// /**
//  * Reset all experiment logs. Used between demo sessions.
//  */
// export async function resetExperiment(): Promise<{ message: string }> {
//   return apiFetch("/experiment/reset", { method: "DELETE" });
// }

// /**
//  * Reset all registered clients. Used between demo sessions.
//  */
// export async function resetClients(): Promise<{ message: string }> {
//   return apiFetch("/clients/reset", { method: "DELETE" });
// }

// /**
//  * Check server health. Returns connected status.
//  */
// export async function checkHealth(): Promise<{
//   status: string;
//   database: string;
//   registered_clients: number;
// }> {
//   return apiFetch("/health");
// }

/**
 * Synora API Client
 * Connects frontend to the Flask coordination server on Render.
 * All backend communication goes through this file.
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://synora-coordination-server.onrender.com";

// ── Types ──────────────────────────────────────────────────

// export interface RegisterResponse {
//   message: string;
//   client_id: string;
//   partition: string;
//   status: string;
// }
export interface RegisterResponse {
  message: string;
  client_id: string;
  partition: string;
  status: string;
}

export interface RoundLog {
  round: number;
  accuracy: number;
  loss: number;
  participating_clients: string[];
  client_count: number;
  timestamp: string;
}

export interface ExperimentSummary {
  experiment_name: string;
  total_rounds: number;
  configuration: Record<string, unknown>;
  rounds: RoundLog[];
  start_time: string | null;
  export_time: string;
}

export interface AggregationStatus {
  can_aggregate: boolean;
  connected_clients: number;
  min_required: number;
  current_round: number;
  status: string;
}

// ── Helper ─────────────────────────────────────────────────

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(
      (error as { error?: string }).error ||
        `Request failed: ${res.status} ${res.statusText}`
    );
  }

  return res.json() as Promise<T>;
}

// ── US-08: Client Registration ─────────────────────────────

/**
 * STEP 3 FIX: Now accepts partition so language → partition
 * mapping is respected (Dholuo→luo_swa, Kalenjin→kln_swa,
 * Kidawida→dav_swa) instead of backend round-robin.
 */
// export async function registerClient(
//   clientName: string,
//   partition: string        // ← added
// ): Promise<RegisterResponse> {
//   return apiFetch<RegisterResponse>("/register", {
//     method: "POST",
//     body: JSON.stringify({ client_name: clientName, partition }),
//   });
// }

export async function registerClient(
  clientName: string,
  partition: string
): Promise<RegisterResponse> {
  return apiFetch<RegisterResponse>("/register", {
    method: "POST",
    body: JSON.stringify({
      client_name: clientName,
      partition: partition,
    }),
  });
}

// ── US-11: Aggregation Check ───────────────────────────────

export async function checkAggregation(): Promise<AggregationStatus> {
  return apiFetch<AggregationStatus>("/aggregate/check");
}

// ── US-16: Experiment Configuration ───────────────────────

export async function saveExperimentConfig(config: {
  num_rounds: number;
  learning_rate: number;
  partition_type: string;
  dirichlet_alpha: number;
  languages: string[];
}): Promise<{ message: string; config: Record<string, unknown> }> {
  return apiFetch("/experiment/config", {
    method: "POST",
    body: JSON.stringify(config),
  });
}

// ── US-17: Round Logging ───────────────────────────────────

/**
 * Log metrics for a completed federated training round.
 * STEP 1 FIX: This is now only called when weight submission
 * FAILS (backend already logs on success via /submit-update).
 */
export async function logRound(data: {
  round: number;
  accuracy: number;
  loss: number;
  participating_clients: string[];
}): Promise<{ message: string; round_data: RoundLog }> {
  return apiFetch("/experiment/log", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getExperimentSummary(): Promise<ExperimentSummary> {
  return apiFetch<ExperimentSummary>("/experiment/summary");
}

export async function resetExperiment(): Promise<{ message: string }> {
  return apiFetch("/experiment/reset", { method: "DELETE" });
}

export async function resetClients(): Promise<{ message: string }> {
  return apiFetch("/clients/reset", { method: "DELETE" });
}

export async function checkHealth(): Promise<{
  status: string;
  database: string;
  registered_clients: number;
}> {
  return apiFetch("/health");
}