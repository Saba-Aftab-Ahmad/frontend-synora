// /**
//  * Synora FL Model — Browser Side
//  * TensorFlow.js model for Kenyan language text classification
//  * US-04: Load lightweight TF.js classification model
//  * US-05: Execute local browser training loop
//  * US-09: Receive global model from server
//  * US-10: Submit weights for FedAvg aggregation
//  */

// import type * as tf from "@tensorflow/tfjs";

// const BACKEND_URL =
//     process.env.NEXT_PUBLIC_BACKEND_URL ||
//     "https://synora-coordination-server.onrender.com";

// // ── Type definitions ───────────────────────────────────────

// interface GlobalModelResponse {
//     version: number;
//     round: number;
//     weights: { shape: number[]; data: number[] }[] | null;
//     architecture?: {
//         vocab_size: number;
//         embedding_dim: number;
//         num_classes: number;
//         max_length: number;
//     };
// }

// interface TrainingResult {
//     accuracy: number;
//     loss: number;
// }

// interface SubmitResult {
//     message: string;
//     updates_received: number;
//     threshold: number;
//     threshold_met: boolean;
//     aggregated: boolean;
//     new_model_version?: number;
//     round: number;
// }

// // ── Create TF.js model ────────────────────────────────────

// /**
//  * Create lightweight text classification model.
//  * Architecture matches your server-side model definition.
//  * US-04
//  */
// export async function createModel(
//     vocabSize = 5000,
//     numClasses = 3
// ) {
//     const tf = await import("@tensorflow/tfjs");

//     const model = tf.sequential({
//         layers: [
//             tf.layers.embedding({
//                 inputDim: vocabSize,
//                 outputDim: 32,
//                 inputLength: 100,
//                 name: "embedding",
//             }),
//             tf.layers.globalAveragePooling1d({ name: "pooling" }),
//             tf.layers.dense({
//                 units: 16,
//                 activation: "relu",
//                 name: "dense_1",
//             }),
//             tf.layers.dropout({ rate: 0.3, name: "dropout" }),
//             tf.layers.dense({
//                 units: numClasses,
//                 activation: "softmax",
//                 name: "output",
//             }),
//         ],
//     });

//     model.compile({
//         optimizer: tf.train.adam(0.01),
//         loss: "categoricalCrossentropy",
//         metrics: ["accuracy"],
//     });

//     return model;
// }

// // ── US-09: Load global model from server ──────────────────

// /**
//  * Fetch global model weights from Flask server and
//  * load them into a TF.js model in the browser.
//  */
// export async function loadGlobalModel(): Promise<{
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     model: any;
//     version: number;
// }> {
//     const tf = await import("@tensorflow/tfjs");

//     // Fetch current global model from server
//     const response = await fetch(`${BACKEND_URL}/global-model`, {
//         headers: { "Content-Type": "application/json" },
//     });

//     if (!response.ok) {
//         throw new Error(`Failed to fetch global model: ${response.status}`);
//     }

//     const serverData: GlobalModelResponse = await response.json();
//     const model = await createModel();

//     // Apply server weights if they exist
//     if (serverData.weights && serverData.weights.length > 0) {
//         try {
//             const tensors = serverData.weights.map((layer) =>
//                 tf.tensor(layer.data, layer.shape)
//             );

//             model.setWeights(tensors);
//             tensors.forEach((t) => t.dispose());

//             console.log(
//                 `[FL] Global model loaded — version ${serverData.version}, round ${serverData.round}`
//             );
//         } catch (err) {
//             console.warn(
//                 "[FL] Could not apply server weights, using random init:",
//                 err
//             );
//         }
//     } else {
//         console.log(
//             "[FL] No server weights available — using random initialization"
//         );
//     }

//     return { model, version: serverData.version || 0 };
// }

// // ── US-05: Local browser training ────────────────────────

// /**
//  * Train the model locally in the browser on simulated
//  * language data. In production this would use the actual
//  * CSV partition assigned by the server.
//  *
//  * @param model    TF.js model to train
//  * @param language Language being trained (Dholuo/Kalenjin/Kidawida)
//  * @param epochs   Number of local epochs per round
//  */
// export async function trainLocally(
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     model: any,
//     language: string,
//     epochs = 3
// ): Promise<TrainingResult> {
//     const tf = await import("@tensorflow/tfjs");

//     const numSamples = 64;
//     const seqLength = 100;
//     const numClasses = 3;

//     // Simulate language-specific data distribution
//     // In production: load from actual CSV partition
//     const languageClassBias =
//         language === "Dholuo" ? 0 : language === "Kalenjin" ? 1 : 2;

//     // Create realistic non-IID data for this language client
//     const xData = tf.randomUniform([numSamples, seqLength], 0, 5000, "int32");

//     // Bias toward this language's class (non-IID simulation)
//     const labels = tf.tidy(() => {
//         const baseLabels = tf.fill([numSamples], languageClassBias, "int32");
//         const noise = tf.randomUniform([numSamples], 0, numClasses, "int32");
//         const useNoise = tf.randomUniform([numSamples]).less(0.3);
//         return tf.where(useNoise, noise, baseLabels);
//     });

//     const yData = tf.oneHot(labels as tf.Tensor1D, numClasses).toFloat();

//     let finalAccuracy = 0;
//     let finalLoss = 0;

//     try {
//         const history = await model.fit(xData, yData, {
//             epochs,
//             batchSize: 16,
//             validationSplit: 0.1,
//             verbose: 0,
//             shuffle: true,
//         });

//         const epochHistory = history.history;
//         finalAccuracy =
//             (epochHistory["acc"]?.[epochs - 1] as number) ||
//             (epochHistory["accuracy"]?.[epochs - 1] as number) ||
//             0;
//         finalLoss = (epochHistory["loss"]?.[epochs - 1] as number) || 0;
//     } finally {
//         xData.dispose();
//         labels.dispose();
//         yData.dispose();
//     }

//     return {
//         accuracy: parseFloat(finalAccuracy.toFixed(4)),
//         loss: parseFloat(finalLoss.toFixed(4)),
//     };
// }

// // ── Extract weights for transmission ─────────────────────

// /**
//  * Extract model weights as {shape, data} objects for JSON
//  * transmission. Tensors cannot be JSON serialized directly,
//  * and the shape must travel with the flattened data so the
//  * server (and any client re-loading this model) can correctly
//  * reconstruct each tensor.
//  */
// export async function extractWeights(
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     model: any
// ): Promise<{ shape: number[]; data: number[] }[]> {
//     const weights = model.getWeights();

//     const extracted = await Promise.all(
//         // eslint-disable-next-line @typescript-eslint/no-explicit-any
//         weights.map(async (tensor: any) => {
//             const data = await tensor.data();
//             return {
//                 shape: tensor.shape as number[],
//                 data: Array.from(data) as number[],
//             };
//         })
//     );

//     return extracted;
// }

// // ── US-10: Submit weights to server for FedAvg ───────────

// /**
//  * Send locally trained weights to Flask server.
//  * Server runs FedAvg when enough clients have submitted.
//  *
//  * @param model        Trained TF.js model
//  * @param clientId     Client ID from registration
//  * @param roundNum     Current round number
//  * @param datasetSize  Number of local training samples
//  * @param metrics      Local training metrics
//  */
// export async function submitWeightsToServer(
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     model: any,
//     clientId: string,
//     roundNum: number,
//     datasetSize: number,
//     metrics: { accuracy: number; loss: number }
// ): Promise<SubmitResult> {
//     const weights = await extractWeights(model);

//     const response = await fetch(`${BACKEND_URL}/submit-update`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//             client_id: clientId,
//             weights: weights,
//             dataset_size: datasetSize,
//             metrics: metrics,
//             round: roundNum,
//         }),
//     });

//     if (!response.ok) {
//         const error = await response.json().catch(() => ({}));
//         throw new Error(
//             `Weight submission failed: ${response.status} — ${JSON.stringify(error)}`
//         );
//     }

//     return response.json() as Promise<SubmitResult>;
// }

/**
 * Synora FL Model — Browser Side
 * TensorFlow.js model for Kenyan language text classification
 *
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

// ── Fixed global label vocabulary ──────────────────────────
//
// This MUST be identical (same labels, same order) across every browser
// client, because the model's output layer has a fixed number of units
// (3) and FedAvg only makes sense if every client's "class 0" means the
// same language. Each server partition is single-language by design
// (non-IID), so we can't derive the class count from what's present
// locally — that produced only 1-2 classes per partition and caused a
// shape mismatch against the model's fixed 3-unit output layer.
const GLOBAL_LABELS = ["Dholuo", "Kalenjin", "Kidawida"];

// ── Create TF.js model ─────────────────────────────────────

/**
 * Create lightweight text classification model.
 * Architecture matches the server-side model definition.
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
            tf.layers.globalAveragePooling1d({
                name: "pooling",
            }),
            tf.layers.dense({
                units: 16,
                activation: "relu",
                name: "dense_1",
            }),
            tf.layers.dropout({
                rate: 0.3,
                name: "dropout",
            }),
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

// ── US-09: Load global model from server ───────────────────

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

    const response = await fetch(
        `${BACKEND_URL}/global-model`,
        {
            headers: {
                "Content-Type": "application/json",
            },
        }
    );

    if (!response.ok) {
        throw new Error(
            `Failed to fetch global model: ${response.status}`
        );
    }

    const serverData: GlobalModelResponse =
        await response.json();

    const model = await createModel();

    // Apply server weights if they exist
    if (
        serverData.weights &&
        serverData.weights.length > 0
    ) {
        try {
            const tensors =
                serverData.weights.map((layer) =>
                    tf.tensor(
                        layer.data,
                        layer.shape
                    )
                );

            model.setWeights(tensors);

            tensors.forEach((t) =>
                t.dispose()
            );

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

    return {
        model,
        version: serverData.version || 0,
    };
}

// ── Simple hash-based tokenizer ────────────────────────────

/**
 * Convert a word/token into a stable integer ID.
 *
 * 0 is reserved for padding.
 * Remaining vocabulary IDs are generated using a
 * deterministic hash function.
 */
function hashToken(
    token: string,
    vocabSize: number
): number {
    let hash = 0;

    for (let i = 0; i < token.length; i++) {
        hash =
            (hash * 31 +
                token.charCodeAt(i)) >>>
            0;
    }

    return (
        (hash % (vocabSize - 1)) + 1
    );
}

/**
 * Convert text into a fixed-length sequence
 * of token IDs.
 */
function tokenizeText(
    text: string,
    seqLength: number,
    vocabSize: number
): number[] {
    const tokens = text
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    const ids = tokens
        .slice(0, seqLength)
        .map((token) =>
            hashToken(
                token,
                vocabSize
            )
        );

    // Pad remaining positions with 0
    while (ids.length < seqLength) {
        ids.push(0);
    }

    return ids;
}

// ── Fetch + cache REAL partitioned dataset ─────────────────

type CachedDataset = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    x: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y: any;
};

const datasetCache: Record<
    string,
    CachedDataset
> = {};

/**
 * Fetch the actual dataset partition from the backend,
 * tokenize the text, convert labels to one-hot tensors,
 * and cache the result for subsequent rounds.
 *
 * @param tf        TensorFlow.js module
 * @param language  Language being trained
 * @param partition Backend dataset partition
 */
async function getOrCreateDataset(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tf: any,
    language: string,
    partition: string
): Promise<CachedDataset> {
    // Use language + partition as cache key
    // so switching languages never uses the wrong dataset.
    const cacheKey =
        `${language}:${partition}`;

    // Reuse already downloaded dataset
    // if (datasetCache[cacheKey]) {
    //     console.log(
    //         `[FL] Using cached dataset for ${language} (${partition})`
    //     );

    //     return datasetCache[cacheKey];
    // }

    console.log(
        `[FL] Fetching real dataset for ${language} from partition ${partition}...`
    );

    const response = await fetch(
        `${BACKEND_URL}/dataset/partition/${partition}`
    );

    if (!response.ok) {
        throw new Error(
            `Failed to fetch real dataset for ${language}: ${response.status}`
        );
    }

    const {
        texts,
        labels,
    } = await response.json();

    if (
        !texts ||
        texts.length === 0
    ) {
        throw new Error(
            `Dataset for ${language} came back empty`
        );
    }

    if (
        !labels ||
        labels.length === 0
    ) {
        throw new Error(
            `Labels for ${language} came back empty`
        );
    }

    if (
        texts.length !==
        labels.length
    ) {
        throw new Error(
            `Dataset mismatch for ${language}: ${texts.length} texts but ${labels.length} labels`
        );
    }

    // const seqLength = 100;
    // const vocabSize = 5000;

    // // Find unique class labels
    // const uniqueLabels =
    //     Array.from(
    //         new Set(
    //             labels as string[]
    //         )
    //     );

    // const numClasses = Math.max(
    //     uniqueLabels.length,
    //     2
    // );

    // console.log(
    //     `[FL] ${language}: ${texts.length} samples, ${uniqueLabels.length} classes`
    // );
    const seqLength = 100;
    const vocabSize = 5000;

    // Always use the fixed global vocabulary (3 classes) — NOT the unique
    // labels found in this partition, since each partition only contains
    // one language and would otherwise produce a 1- or 2-wide one-hot
    // vector that doesn't match the model's fixed 3-unit output layer.
    const numClasses = GLOBAL_LABELS.length;

    console.log(
        `[FL] ${language}: ${texts.length} samples, ${numClasses} global classes`
    );

    // Tokenize REAL text
    const tokenized = (
        texts as string[]
    ).map((text) =>
        tokenizeText(
            text,
            seqLength,
            vocabSize
        )
    );

    // Convert string labels into integer class indices
    // const labelIndices = (
    //     labels as string[]
    // ).map((label) =>
    //     uniqueLabels.indexOf(
    //         label
    //     )
    // );
        // Convert string labels into integer class indices using the fixed
    // global vocabulary, so index 0/1/2 means the same language for
    // every client (case-insensitive match, just in case of casing
    // differences between backend and frontend).
    const labelIndices = (
        labels as string[]
    ).map((label) => {
        const idx = GLOBAL_LABELS.findIndex(
            (l) => l.toLowerCase() === label.toLowerCase()
        );
        if (idx === -1) {
            console.warn(
                `[FL] Unrecognized label "${label}" — defaulting to class 0 (${GLOBAL_LABELS[0]})`
            );
            return 0;
        }
        return idx;
    });

    // Create input tensor
    const x = tf.tensor2d(
        tokenized,
        [
            tokenized.length,
            seqLength,
        ],
        "int32"
    );

    // Create one-hot encoded labels
    const y = tf.tidy(() =>
        tf
            .oneHot(
                tf.tensor1d(
                    labelIndices,
                    "int32"
                ),
                numClasses
            )
            .toFloat()
    );

    datasetCache[cacheKey] = {
        x,
        y,
    };

    console.log(
        `[FL] Real dataset loaded and cached for ${language} (${partition})`
    );

    return datasetCache[cacheKey];
}

// ── US-05: Local browser training ──────────────────────────

/**
 * Train the model locally in the browser on the REAL
 * dataset partition assigned to this client.
 *
 * @param model      TF.js model to train
 * @param language   Language being trained
 * @param partition  Dataset partition assigned by server
 * @param epochs     Number of local epochs per round
 */
export async function trainLocally(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: any,
    language: string,
    partition: string,
    epochs = 1
): Promise<TrainingResult> {
    const tf = await import(
        "@tensorflow/tfjs"
    );

    // Fetch real dataset and wait for it
    // to finish loading.
    const {
        x: xData,
        y: yData,
    } =
        await getOrCreateDataset(
            tf,
            language,
            partition
        );

    let finalAccuracy = 0;
    let finalLoss = 0;

    try {
        console.log(
            `[FL] Starting local training — ${language} / ${partition} / ${epochs} epochs`
        );

        const history =
            await model.fit(
                xData,
                yData,
                {
                    epochs,
                    batchSize: 16,
                    validationSplit: 0.1,
                    verbose: 0,
                    shuffle: true,
                }
            );

        const epochHistory =
            history.history;

        // finalAccuracy =
        //     (epochHistory[ "acc"]?.[epochs - 1] as number) ||
        //     (epochHistory[  "accuracy"]?.[epochs - 1] as number) ||
        //     0;

        // finalLoss =
        //     (epochHistory[
        //         "loss"
        //     ]?.[epochs - 1] as number) ||
        //     0;
        // Use val_accuracy to show realistic generalisation
// Training accuracy is always inflated due to overfitting
           finalAccuracy =
                (epochHistory["val_acc"]?.[epochs - 1] as number) ||
                (epochHistory["val_accuracy"]?.[epochs - 1] as number) ||
                (epochHistory["acc"]?.[epochs - 1] as number) ||
                (epochHistory["accuracy"]?.[epochs - 1] as number) ||
                0;

            finalLoss =
                (epochHistory["val_loss"]?.[epochs - 1] as number) ||
                (epochHistory["loss"]?.[epochs - 1] as number) ||
                0;  

        console.log(
            `[FL] Local training complete — accuracy: ${finalAccuracy.toFixed(
                4
            )}, loss: ${finalLoss.toFixed(4)}`
        );
    } finally {
        // Do NOT dispose xData/yData here.
        // They are cached and reused in later rounds.
    }

    return {
        accuracy:
            parseFloat(
                finalAccuracy.toFixed(
                    4
                )
            ),
        loss:
            parseFloat(
                finalLoss.toFixed(
                    4
                )
            ),
    };
}

// ── Extract weights for transmission ───────────────────────

/**
 * Extract model weights as {shape, data} objects for JSON
 * transmission.
 *
 * Tensors cannot be JSON serialized directly, and the shape
 * must travel with the flattened data so the server (and any
 * client re-loading this model) can correctly reconstruct
 * each tensor.
 */
export async function extractWeights(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: any
): Promise<
    {
        shape: number[];
        data: number[];
    }[]
> {
    const weights =
        model.getWeights();

    const extracted =
        await Promise.all(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            weights.map(
                async (
                    tensor: any
                ) => {
                    const data =
                        await tensor.data();

                    return {
                        shape:
                            tensor.shape as number[],
                        data:
                            Array.from(
                                data
                            ) as number[],
                    };
                }
            )
        );

    return extracted;
}

// ── US-10: Submit weights to server for FedAvg ─────────────

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
    metrics: {
        accuracy: number;
        loss: number;
    }
): Promise<SubmitResult> {
    const weights =
        await extractWeights(
            model
        );

    const response =
        await fetch(
            `${BACKEND_URL}/submit-update`,
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json",
                },
                body: JSON.stringify(
                    {
                        client_id:
                            clientId,
                        weights:
                            weights,
                        dataset_size:
                            datasetSize,
                        metrics:
                            metrics,
                        round:
                            roundNum,
                    }
                ),
            }
        );

    if (!response.ok) {
        const error =
            await response
                .json()
                .catch(
                    () => ({})
                );

        throw new Error(
            `Weight submission failed: ${response.status} — ${JSON.stringify(
                error
            )}`
        );
    }

    return response.json() as Promise<SubmitResult>;
}