// Type definitions for edge-ml

// ---------------------------------------------------------------- data upload

export interface DatasetCollectorServerTime {
    /** Adds a value; the timestamp is taken when it is added. */
    addDataPoint(sensorName: string, value: number): void;
    /** Uploads the remaining datapoints. Call once when recording is done. */
    onComplete(): Promise<void>;
}

export interface DatasetCollectorOwnTime {
    /** Adds a value at `time` (unix ms). */
    addDataPoint(time: number, sensorName: string, value: number): void;
    /** Uploads the remaining datapoints. Call once when recording is done. */
    onComplete(): Promise<void>;
}

/**
 * Creates a dataset and returns a collector that uploads datapoints incrementally.
 * @param datasetLabel label for the whole dataset as "{labeling}_{label}"
 */
export function datasetCollector(
    url: string, key: string, name: string, useDeviceTime: true, timeSeries: string[],
    metaData?: Record<string, string>, datasetLabel?: string
): Promise<DatasetCollectorServerTime>;
export function datasetCollector(
    url: string, key: string, name: string, useDeviceTime: false, timeSeries: string[],
    metaData?: Record<string, string>, datasetLabel?: string
): Promise<DatasetCollectorOwnTime>;

export interface DatasetUpload {
    name: string;
    /** data as [unix ms, value] pairs */
    timeSeries: { name: string; data: [number, number][] }[];
    metaData?: Record<string, string>;
    /** label for the whole dataset as "{labeling}_{label}" */
    labeling?: string;
}

/** Uploads a whole dataset. Resolves to the id of the new dataset. */
export function sendDataset(url: string, key: string, dataset: DatasetUpload): Promise<string>;

// ---------------------------------------------------------------- training

export interface PipelineStepOptions {
    /** option name, e.g. "Decision Tree Classifier" (see listPipelines) */
    name?: string;
    /** parameter overrides by parameter_name, e.g. { window_size: 50 } */
    parameters?: Record<string, number | string | boolean | null>;
}

export interface TrainOptions {
    /** name of the new model */
    name: string;
    /** labeling name or id */
    labeling: string;
    /** dataset names or ids; default: every dataset labeled with `labeling` */
    datasets?: string[];
    /** time-series names; default: the series all selected datasets share */
    timeSeries?: string[];
    /** label names or ids to leave out */
    disabledLabels?: string[];
    useZeroClass?: boolean;
    /**
     * Per-step overrides. The default pipeline (Sample based windowing,
     * SimpleFeatureExtractor, MinMaxNormalizer, Random Forest Classifier,
     * TestTrainSplit) can be exported to ONNX.
     */
    pipeline?: {
        windowing?: PipelineStepOptions;
        featureExtraction?: PipelineStepOptions;
        normalizer?: PipelineStepOptions;
        classifier?: PipelineStepOptions;
        evaluation?: PipelineStepOptions;
    };
}

export type TrainStatus = "waiting" | "training" | "done" | "error";

export interface ModelInfo {
    id: string;
    name: string;
    trainStatus: TrainStatus;
    stage: string | null;
    /** 0-100 for classifiers that report epochs */
    progress: number | null;
    error: string | null;
    /** download formats, "ONNX" when the model can run in the browser */
    formats: string[];
    labels: string[];
    timeSeries: string[];
    samplingRate: number | null;
    metrics: Record<string, unknown> | null;
}

export interface WaitOptions {
    /** polling interval in ms (default 2000) */
    interval?: number;
    /** give up after this many ms (default 30 min) */
    timeout?: number;
    onProgress?: (model: ModelInfo) => void;
}

/** The pipeline steps, options and parameters available for training. */
export function listPipelines(url: string, key: string): Promise<unknown[]>;
/** Starts training on the server (write key) without waiting. */
export function startTraining(url: string, key: string, options: TrainOptions): Promise<{ id: string; warnings: string[] }>;
/** Polls a model until training is done; rejects if it fails. */
export function waitForModel(url: string, key: string, modelId: string, opts?: WaitOptions): Promise<ModelInfo>;
/** Trains a model on the server (write key) and waits until it is done. */
export function trainModel(url: string, key: string, options: TrainOptions, waitOptions?: WaitOptions): Promise<ModelInfo>;
export function getModel(url: string, key: string, modelId: string): Promise<ModelInfo>;
export function listModels(url: string, key: string): Promise<ModelInfo[]>;

// ---------------------------------------------------------------- inference

export interface OnnxPrediction {
    /** label with the highest probability */
    prediction: string;
    /** index of `prediction` in `labels` */
    index: number;
    /** per-label probabilities (softmax of the logits for neural networks) */
    probabilities: number[];
    labels: string[];
    /** raw model output (logits or probabilities, see manifest.output.type) */
    scores: number[];
}

export interface LoadOptions {
    /** the onnxruntime module (onnxruntime-web / onnxruntime-node); auto-detected if omitted */
    ort?: any;
    /** passed to ort.InferenceSession.create */
    sessionOptions?: Record<string, unknown>;
}

export class PredictorError extends Error {}

/** Runs an edge-ml model exported as ONNX in the browser or Node.js. */
export class OnnxPredictor {
    /** sensor names, in model input order */
    readonly sensors: string[];
    /** label of every model output */
    readonly labels: string[];
    /** samples per window */
    readonly windowSize: number;
    readonly manifest: any;

    /** Sets the onnxruntime module (needed with bundlers in the browser). */
    static setRuntime(ort: any): void;
    static load(model: ArrayBuffer | Uint8Array, manifest: object, opts?: LoadOptions): Promise<OnnxPredictor>;
    static fromUrls(modelUrl: string, manifestUrl: string, opts?: LoadOptions): Promise<OnnxPredictor>;
    /** Node.js only. */
    static fromFiles(modelPath: string, manifestPath: string, opts?: LoadOptions): Promise<OnnxPredictor>;
    static fromServer(url: string, key: string, modelId: string, opts?: LoadOptions): Promise<OnnxPredictor>;

    /** @param time unix ms, defaults to now */
    addDatapoint(sensor: string, value: number, time?: number): void;
    /** One value per sensor with a shared timestamp. */
    addSample(values: number[] | Record<string, number>, time?: number): void;
    reset(): void;
    /** Classifies the latest window; throws PredictorError until enough samples are buffered. */
    predict(): Promise<OnnxPrediction>;
    /** Classifies one window of `windowSize` rows in `sensors` order. */
    predictWindow(window: number[][]): Promise<OnnxPrediction>;
}

/** Downloads a trained model (read key) and returns a ready OnnxPredictor. */
export function loadModel(url: string, key: string, modelId: string, opts?: LoadOptions): Promise<OnnxPredictor>;


declare const edgeML: {
    datasetCollector: typeof datasetCollector;
    sendDataset: typeof sendDataset;
    listPipelines: typeof listPipelines;
    trainModel: typeof trainModel;
    startTraining: typeof startTraining;
    waitForModel: typeof waitForModel;
    getModel: typeof getModel;
    listModels: typeof listModels;
    loadModel: typeof loadModel;
    OnnxPredictor: typeof OnnxPredictor;
    PredictorError: typeof PredictorError;
};
export default edgeML;
