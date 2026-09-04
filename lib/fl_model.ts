/**
 * Synora FL Model — Browser Side
 * TensorFlow.js model for Kenyan language text classification
 * US-04: Load lightweight TF.js classification model
 * US-05: Execute local browser training loop
 * US-09: Receive global model from server
 * US-10: Submit weights for FedAvg aggregation
 */

import type * as tf from "@tensorflow/tfjs";

const BACKEND_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "https://synora-coordination-server.onrender.com";

// ── Type definitions ───────────────────────────────────────

interface GlobalModelResponse {
    version: number;
    round: number;
    weights: { shape: number[]; data: number[] }[] | null;
    architecture?: {
        vocab_size: number;
        embedding_dim: number;
        num_classes: number;
        max_length: number;
    };
}

interface TrainingResult {
    accuracy: number;
    loss: number;
}

interface SubmitResult {
    message: string;
    updates_received: number;
    threshold: number;
    threshold_met: boolean;
    aggregated: boolean;
    new_model_version?: number;
    round: number;
}

// ── Create TF.js model ────────────────────────────────────

/**
 * Create lightweight text classification model.
 * Architecture matches your server-side model definition.
 * US-04
 */
export async function createModel(
    vocabSize = 5000,
    numClasses = 3
) {
    const tf = await import("@tensorflow/tfjs");

    const model = tf.sequential({
        layers: [
            tf.layers.embedding({
                inputDim: vocabSize,
                outputDim: 32,
                inputLength: 100,
                name: "embedding",
            }),
            tf.layers.globalAveragePooling1d({ name: "pooling" }),
            tf.layers.dense({
                units: 16,
                activation: "relu",
                name: "dense_1",
            }),
            tf.layers.dropout({ rate: 0.3, name: "dropout" }),
            tf.layers.dense({
                units: numClasses,
                activation: "softmax",
                name: "output",
            }),
        ],
    });

    model.compile({
        optimizer: tf.train.adam(0.01),
        loss: "categoricalCrossentropy",
        metrics: ["accuracy"],
    });

    return model;
}

// ── US-09: Load global model from server ──────────────────

/**
 * Fetch global model weights from Flask server and
 * load them into a TF.js model in the browser.
 */
export async function loadGlobalModel(): Promise<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: any;
    version: number;
}> {
    const tf = await import("@tensorflow/tfjs");

    // Fetch current global model from server
    const response = await fetch(`${BACKEND_URL}/global-model`, {
        headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch global model: ${response.status}`);
    }

    const serverData: GlobalModelResponse = await response.json();
    const model = await createModel();

    // Apply server weights if they exist
    if (serverData.weights && serverData.weights.length > 0) {
        try {
            const tensors = serverData.weights.map((layer) =>
                tf.tensor(layer.data, layer.shape)
            );

            model.setWeights(tensors);
            tensors.forEach((t) => t.dispose());

            console.log(
                `[FL] Global model loaded — version ${serverData.version}, round ${serverData.round}`
            );
        } catch (err) {
            console.warn(
                "[FL] Could not apply server weights, using random init:",
                err
            );
        }
    } else {
        console.log(
            "[FL] No server weights available — using random initialization"
        );
    }

    return { model, version: serverData.version || 0 };
}

// ── US-05: Local browser training ────────────────────────

/**
 * Train the model locally in the browser on simulated
 * language data. In production this would use the actual
 * CSV partition assigned by the server.
 *
 * @param model    TF.js model to train
 * @param language Language being trained (Dholuo/Kalenjin/Kidawida)
 * @param epochs   Number of local epochs per round
 */
export async function trainLocally(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: any,
    language: string,
    epochs = 3
): Promise<TrainingResult> {
    const tf = await import("@tensorflow/tfjs");

    const numSamples = 64;
    const seqLength = 100;
    const numClasses = 3;

    // Simulate language-specific data distribution
    // In production: load from actual CSV partition
    const languageClassBias =
        language === "Dholuo" ? 0 : language === "Kalenjin" ? 1 : 2;

    // Create realistic non-IID data for this language client
    const xData = tf.randomUniform([numSamples, seqLength], 0, 5000, "int32");

    // Bias toward this language's class (non-IID simulation)
    const labels = tf.tidy(() => {
        const baseLabels = tf.fill([numSamples], languageClassBias, "int32");
        const noise = tf.randomUniform([numSamples], 0, numClasses, "int32");
        const useNoise = tf.randomUniform([numSamples]).less(0.3);
        return tf.where(useNoise, noise, baseLabels);
    });

    const yData = tf.oneHot(labels as tf.Tensor1D, numClasses).toFloat();

    let finalAccuracy = 0;
    let finalLoss = 0;

    try {
        const history = await model.fit(xData, yData, {
            epochs,
            batchSize: 16,
            validationSplit: 0.1,
            verbose: 0,
            shuffle: true,
        });

        const epochHistory = history.history;
        finalAccuracy =
            (epochHistory["acc"]?.[epochs - 1] as number) ||
            (epochHistory["accuracy"]?.[epochs - 1] as number) ||
            0;
        finalLoss = (epochHistory["loss"]?.[epochs - 1] as number) || 0;
    } finally {
        xData.dispose();
        labels.dispose();
        yData.dispose();
    }

    return {
        accuracy: parseFloat(finalAccuracy.toFixed(4)),
        loss: parseFloat(finalLoss.toFixed(4)),
    };
}

// ── Extract weights for transmission ─────────────────────

/**
 * Extract model weights as {shape, data} objects for JSON
 * transmission. Tensors cannot be JSON serialized directly,
 * and the shape must travel with the flattened data so the
 * server (and any client re-loading this model) can correctly
 * reconstruct each tensor.
 */
export async function extractWeights(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: any
): Promise<{ shape: number[]; data: number[] }[]> {
    const weights = model.getWeights();

    const extracted = await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        weights.map(async (tensor: any) => {
            const data = await tensor.data();
            return {
                shape: tensor.shape as number[],
                data: Array.from(data) as number[],
            };
        })
    );

    return extracted;
}

// ── US-10: Submit weights to server for FedAvg ───────────

/**
 * Send locally trained weights to Flask server.
 * Server runs FedAvg when enough clients have submitted.
 *
 * @param model        Trained TF.js model
 * @param clientId     Client ID from registration
 * @param roundNum     Current round number
 * @param datasetSize  Number of local training samples
 * @param metrics      Local training metrics
 */
export async function submitWeightsToServer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: any,
    clientId: string,
    roundNum: number,
    datasetSize: number,
    metrics: { accuracy: number; loss: number }
): Promise<SubmitResult> {
    const weights = await extractWeights(model);

    const response = await fetch(`${BACKEND_URL}/submit-update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            client_id: clientId,
            weights: weights,
            dataset_size: datasetSize,
            metrics: metrics,
            round: roundNum,
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
            `Weight submission failed: ${response.status} — ${JSON.stringify(error)}`
        );
    }

    return response.json() as Promise<SubmitResult>;
}