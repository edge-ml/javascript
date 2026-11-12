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
 * Unit of a time-series. `quantity` is a quantity id of the unit catalog
 * (see `fetchUnits`), e.g. "acceleration", or a label of your own; `unit` is
 * a unit id of that quantity, e.g. "g". Training converts series of catalog
 * quantities to the quantity's default unit.
 */
export interface SeriesUnit {
    unit?: string;
    quantity?: string;
}

/** A time-series name, or a name with its unit, e.g. `{ name: "accX", unit: "g", quantity: "acceleration" }`. */
export type TimeSeriesSpec = string | ({ name: string } & SeriesUnit);

/**
 * Creates a dataset and returns a collector that uploads datapoints incrementally.
 * @param datasetLabel label for the whole dataset as "{labeling}_{label}"
 */
export function datasetCollector(
    url: string, key: string, name: string, useDeviceTime: true, timeSeries: TimeSeriesSpec[],
    metaData?: Record<string, string>, datasetLabel?: string
): Promise<DatasetCollectorServerTime>;
export function datasetCollector(
    url: string, key: string, name: string, useDeviceTime: false, timeSeries: TimeSeriesSpec[],
    metaData?: Record<string, string>, datasetLabel?: string
): Promise<DatasetCollectorOwnTime>;

/** A label over a time range (unix ms, both ends inclusive), e.g. "walk" of the labeling "activity". */
export interface DatasetLabel {
    labeling: string;
    label: string;
    start: number;
    end: number;
}

export interface DatasetUpload {
    name: string;
    /** data as [unix ms, value] pairs, optionally with the unit of the series */
    timeSeries: ({ name: string; data: [number, number][] } & SeriesUnit)[];
    metaData?: Record<string, string>;
    /** label for the whole dataset (its time-series and recordings) as "{labeling}_{label}" */
    labeling?: string;
    /** labels over time ranges */
    labels?: DatasetLabel[];
    /** audio and video recordings to add to the dataset */
    media?: ({ file: MediaFile } & MediaOptions)[];
}

/** A dataset that only holds recordings: `timeSeries` can be left out. */
export type MediaDatasetUpload = Omit<DatasetUpload, "timeSeries" | "media"> & {
    timeSeries?: DatasetUpload["timeSeries"];
    media: ({ file: MediaFile } & MediaOptions)[];
};

/** Uploads a whole dataset. Resolves to the id of the new dataset. */
export function sendDataset(url: string, key: string, dataset: DatasetUpload | MediaDatasetUpload): Promise<string>;

/**
 * Adds labels over time ranges to a dataset, e.g. to one that holds
 * recordings. Labelings and labels that do not exist yet are created.
 */
export function addLabels(url: string, key: string, datasetId: string, labels: DatasetLabel[]): Promise<void>;

// ---------------------------------------------------------------- audio and video

/** A File or Blob (browser), a Buffer or ArrayBuffer, or a file path (Node.js). */
export type MediaFile = Blob | ArrayBuffer | ArrayBufferView | string;

export interface MediaOptions {
    /** checked against the file; detected from it when omitted */
    kind?: "audio" | "video";
    /** name of the recording; defaults to the file name */
    name?: string;
    /**
     * unix ms at which the recording begins on the dataset timeline; defaults
     * to the start of the dataset (or now, for a dataset without data)
     */
    start?: number;
    /** file name to send for a Buffer/ArrayBuffer, which has none */
    fileName?: string;
}

/** An audio or video recording of a dataset. */
export interface MediaSeries {
    _id: string;
    kind: "audio" | "video";
    name: string;
    /** unix ms at which the recording begins on the dataset timeline */
    start: number;
    /** start + durationMs */
    end: number;
    durationMs: number;
    mimeType: string;
    /** bytes */
    size: number;
    /** "processing" while the waveform shown in the web app is computed */
    status: "processing" | "ready";
    hasPeaks: boolean;
    meta: {
        container?: string;
        videoCodec?: string | null;
        audioCodec?: string | null;
        width?: number;
        height?: number;
        fps?: number;
        sampleRate?: number;
        channels?: number;
    };
}

/**
 * Adds an audio or video recording to a dataset (write key). The server
 * accepts what browsers can play: MP4 (H.264/AAC) and WebM video; MP3, WAV,
 * OGG, FLAC and M4A audio.
 */
export function uploadMedia(
    url: string, key: string, datasetId: string, file: MediaFile, options?: MediaOptions
): Promise<MediaSeries>;

/** Downloads a recording as it was uploaded. */
export function downloadMedia(url: string, key: string, datasetId: string, mediaId: string): Promise<ArrayBuffer>;

export interface DatasetInfo {
    _id: string;
    name: string;
    metaData: Record<string, string>;
    timeSeries: ({ _id: string; name: string; start: number | null; end: number | null; length?: number | null } & SeriesUnit)[];
    mediaSeries: MediaSeries[];
    labelings: { labelingId: string; labels: { _id: string; start: number; end: number; type: string }[] }[];
}

/** Lists the datasets of the project with their time-series and recordings (no sample values). */
export function listDatasets(url: string, key: string): Promise<DatasetInfo[]>;

// ---------------------------------------------------------------- units

export interface CatalogUnit {
    id: string;
    label: string;
    /** affine map to the quantity's base unit: base = value * scale + offset */
    scale: number;
    offset: number;
    aliases: string[];
}

export interface CatalogQuantity {
    id: string;
    label: string;
    /** the unit training converts to, and models expect */
    defaultUnit: string;
    units: CatalogUnit[];
}

export interface UnitCatalog {
    version: number;
    quantities: CatalogQuantity[];
}

/** The unit a model input expects, and how to convert other units to it. */
export interface InputUnit {
    name: string;
    /** catalog quantity id or custom label; null when unknown (e.g. models trained before units existed) */
    quantity: string | null;
    /** expected unit; "" when unknown */
    unit: string;
    /** per catalog unit id: expected = value * scale + offset */
    conversions: Record<string, { scale: number; offset: number }>;
}

/** The unit catalog of the server: quantities, their units and default units. No API key needed. */
export function fetchUnits(url: string): Promise<UnitCatalog>;

/** A declared sensor unit that the model cannot convert from. */
export class UnitError extends Error {}

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
    /** the unit each input expects (quantity null and unit "" for models trained before units existed) */
    inputUnits?: InputUnit[];
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
    /**
     * Unit each sensor delivers, e.g. `{ accX: "g" }`: values are converted to
     * the unit the model expects. Throws a UnitError if the model cannot convert.
     */
    units?: Record<string, string>;
    /** unit catalog (`fetchUnits`), to also accept unit labels and aliases such as "°C" in `units` */
    catalog?: UnitCatalog;
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
    /** unit each input expects, from the manifest */
    readonly inputUnits: InputUnit[];

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
    /**
     * Declares the unit each sensor delivers (replacing earlier declarations).
     * Throws a UnitError if the model cannot convert from a declared unit.
     */
    setUnits(units: Record<string, string>, catalog?: UnitCatalog): void;
    /** Classifies the latest window; throws PredictorError until enough samples are buffered. */
    predict(): Promise<OnnxPrediction>;
    /** Classifies one window of `windowSize` rows in `sensors` order (in the declared units). */
    predictWindow(window: number[][]): Promise<OnnxPrediction>;
}

/** Downloads a trained model (read key) and returns a ready OnnxPredictor. */
export function loadModel(url: string, key: string, modelId: string, opts?: LoadOptions): Promise<OnnxPredictor>;


declare const edgeML: {
    datasetCollector: typeof datasetCollector;
    sendDataset: typeof sendDataset;
    addLabels: typeof addLabels;
    listDatasets: typeof listDatasets;
    uploadMedia: typeof uploadMedia;
    downloadMedia: typeof downloadMedia;
    fetchUnits: typeof fetchUnits;
    UnitError: typeof UnitError;
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
