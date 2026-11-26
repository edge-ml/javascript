const path = require("path");
const { OnnxPredictor, PredictorError, Resampler } = require("../dist/index");

// Models that take sound (manifest schema 2), exported by the edge-ml backend
// with reference outputs computed in Python — see __tests__/fixtures/README.md.
const FIXTURES = path.join(__dirname, "fixtures");
const load = (name) =>
    OnnxPredictor.fromFiles(path.join(FIXTURES, name, "model.onnx"), path.join(FIXTURES, name, "manifest.json"));
const reference = (name) => require(path.join(FIXTURES, name, "reference.json"));
const floats = (b64) => {
    const buf = Buffer.from(b64, "base64");
    return new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
};

const T0 = 1800000000000;

// Resampling seconds of 48 kHz sound takes a few seconds under coverage
// instrumentation (npm test, and the publish job); without it, 5 s of sound
// take about 0.15 s.
jest.setTimeout(30000);

describe.each(["audio_mixed", "audio_only"])("OnnxPredictor with sound (%s)", (name) => {
    let predictor;
    let ref;
    const mixed = name === "audio_mixed";
    beforeAll(async () => {
        predictor = await load(name);
        ref = reference(name);
    });
    beforeEach(() => predictor.reset());

    const inputs = (k) => ({ sensors: mixed ? ref.sensors[k] : undefined, audio: floats(ref.audio[k]) });

    // feeds window k as a device would: sensors on their own timestamps, then sound
    const feed = (k, end, audio, sampleRate, chunk = 1000) => {
        if (mixed) {
            const step = ref.window_ms / ref.sensor_samples;
            const rows = ref.sensors[k];
            // a live stream also has data from before the window (the window
            // may end a little earlier, at the end of the resampled sound)
            predictor.addSample(rows[0], end - ref.window_ms - step);
            rows.forEach((row, i) => predictor.addSample(row, end - ref.window_ms + i * step));
            predictor.addSample(rows[rows.length - 1], end);
        }
        for (let i = 0; i < audio.length; i += chunk) {
            const part = audio.subarray(i, Math.min(audio.length, i + chunk));
            const time = end - ((audio.length - (i + part.length)) * 1000) / sampleRate;
            predictor.addAudio(part, { sampleRate, time });
        }
    };

    it("reads the inputs from the manifest", () => {
        expect(predictor.multiInput).toBe(true);
        expect(predictor.labels).toEqual(["still", "shaking"]);
        expect(predictor.windowMs).toBe(500);
        expect(predictor.audioSampleRate).toBe(8000);
        expect(predictor.sensors).toEqual(mixed ? ["acc_x", "acc_y"] : []);
        expect(predictor.windowSize).toBe(mixed ? 25 : 0);
        expect(predictor.inputUnits.map((u) => u.name)).toEqual(predictor.sensors);
    });

    it("matches the scores of the Python export and the Python pipeline", async () => {
        for (let k = 0; k < ref.audio.length; k++) {
            const res = await predictor.predictInputs(inputs(k));
            res.scores.forEach((s, j) => expect(s).toBeCloseTo(ref.onnx_scores[k][j], 4));
            expect(res.index).toBe(ref.python_predictions[k]);
            expect(res.prediction).toBe(["still", "shaking"][res.index]);
        }
    });

    it("buffers sensors and sound into the same window", async () => {
        expect(predictor.isReady).toBe(false);
        feed(1, T0 + 5000, floats(ref.audio[1]), 8000);
        expect(predictor.isReady).toBe(true);
        const buffered = await predictor.predict();
        const direct = await predictor.predictInputs(inputs(1));
        buffered.scores.forEach((s, j) => expect(s).toBeCloseTo(direct.scores[j], 4));
    });

    it("uses the latest window when more is buffered", async () => {
        feed(0, T0 + 5000, floats(ref.audio[0]), 8000);
        feed(1, T0 + 5500, floats(ref.audio[1]), 8000);
        const res = await predictor.predict();
        res.scores.forEach((s, j) => expect(s).toBeCloseTo(ref.onnx_scores[1][j], 4));
    });

    it("predicts the same from 48 kHz microphone input", async () => {
        // the resampler needs a little sound after a sample before it can output
        // it (~2 ms), so only windows with sound before them can be compared;
        // the first window starts with the recording
        const withLead = ref.streams.map((st, k) => k).filter((k) => ref.streams[k].lead_ms > 0);
        expect(withLead.length).toBeGreaterThanOrEqual(3);
        for (const k of withLead) {
            predictor.reset();
            feed(k, T0 + 10000 * (k + 1), floats(ref.streams[k].audio_48k), 48000, 4096);
            const res = await predictor.predict();
            expect(res.index).toBe(ref.python_predictions[k]);
            res.scores.forEach((s, j) => expect(Math.abs(s - ref.onnx_scores[k][j])).toBeLessThan(0.5));
        }
    });

    it("waits for enough sound", async () => {
        feed(0, T0, floats(ref.audio[0]).subarray(0, 1000), 8000);
        expect(predictor.isReady).toBe(false);
        await expect(predictor.predict()).rejects.toThrow(PredictorError);
    });

    it("accepts 16-bit PCM", async () => {
        const audio = floats(ref.audio[2]);
        const pcm = Int16Array.from(audio, (x) => Math.max(-32768, Math.min(32767, Math.round(x * 32768))));
        if (mixed) feed(2, T0 + 500, new Float32Array(0), 8000);
        predictor.addPcm16(pcm, { sampleRate: 8000, time: T0 + 500 });
        expect((await predictor.predict()).index).toBe(ref.python_predictions[2]);
    });
});

describe("OnnxPredictor schema checks", () => {
    it("refuses sound for sensor models and single windows for sound models", async () => {
        const sensorModel = await load("torch_dense");
        expect(sensorModel.multiInput).toBe(false);
        expect(() => sensorModel.addAudio(new Float32Array(10), { sampleRate: 16000 })).toThrow("does not take sound");
        const mixed = await load("audio_mixed");
        await expect(mixed.predictWindow([[0, 0]])).rejects.toThrow("predictInputs");
        expect(() => mixed.addAudio(new Float32Array(10), {})).toThrow("sampleRate");
    });
});

describe("Resampler", () => {
    const tone = (freq, rate, seconds) =>
        Float32Array.from({ length: Math.round(rate * seconds) }, (_, i) => Math.sin((2 * Math.PI * freq * i) / rate));
    const rms = (xs) => Math.sqrt(xs.reduce((a, x) => a + x * x, 0) / xs.length);

    it("keeps a tone in the passband", () => {
        const out = new Resampler(48000, 16000).process(tone(1000, 48000, 1));
        expect(out.length).toBeGreaterThan(15800);
        expect(rms(out.subarray(500, 15000))).toBeCloseTo(Math.SQRT1_2, 2);
        // output sample i is the input at time i / 16 kHz: compare with the ideal tone
        const ideal = tone(1000, 16000, 1);
        let err = 0;
        for (let i = 500; i < 15000; i++) err = Math.max(err, Math.abs(out[i] - ideal[i]));
        expect(err).toBeLessThan(0.01);
    });

    it("filters out what would alias", () => {
        // 10 kHz is above the 8 kHz Nyquist frequency of 16 kHz audio
        const out = new Resampler(48000, 16000).process(tone(10000, 48000, 1));
        expect(rms(out.subarray(500, 15000))).toBeLessThan(0.01);
    });

    it("does not depend on how the input is split", () => {
        const input = tone(440, 44100, 0.5).map((x, i) => x + 0.3 * Math.sin(i * 0.37));
        const whole = new Resampler(44100, 16000).process(input);
        const r = new Resampler(44100, 16000);
        const parts = [];
        for (let i = 0, n = 1; i < input.length; i += n, n = (n * 7) % 997 + 1) parts.push(...r.process(input.subarray(i, i + n)));
        expect(parts.length).toBe(whole.length);
        parts.forEach((x, i) => expect(x).toBeCloseTo(whole[i], 5));
    });

    it("converts up and passes equal rates through", () => {
        const out = new Resampler(8000, 16000).process(tone(500, 8000, 0.5));
        expect(rms(out.subarray(200, 7500))).toBeCloseTo(Math.SQRT1_2, 2);
        const same = tone(500, 16000, 0.01);
        expect(Array.from(new Resampler(16000, 16000).process(same))).toEqual(Array.from(same));
    });
});

// TimeGridBuffer is internal; exercise it through OnnxPredictor with a stub session.
function gridPredictor(sensors, samples, windowMs) {
    const seen = [];
    const ort = { Tensor: class { constructor(type, data, dims) { Object.assign(this, { type, data, dims }); } } };
    const session = {
        run: async (feeds) => {
            const t = feeds.raw_window;
            const rows = [];
            for (let i = 0; i < t.dims[1]; i++) rows.push(Array.from(t.data.slice(i * t.dims[2], (i + 1) * t.dims[2])));
            seen.push(rows);
            return { scores: { data: Float32Array.from([0.25, 0.75]) } };
        },
    };
    const manifest = {
        schema_version: 2, format: "onnx",
        window: { duration_ms: windowMs, stride_ms: windowMs },
        inputs: [{ name: "raw_window", kind: "sensors", shape: [1, samples, sensors.length], timeseries: sensors, units: [] }],
        output: { name: "scores", type: "probabilities", labels: ["a", "b"] },
    };
    return { predictor: new OnnxPredictor(session, manifest, ort), seen };
}

describe("windows of a fixed duration", () => {
    it("interpolate each sensor onto the grid of the window", async () => {
        const { predictor, seen } = gridPredictor(["a", "b"], 4, 100);
        for (let t = 0; t <= 200; t += 30) predictor.addDatapoint("a", t, t); // a(t) = t
        for (let t = 0; t <= 200; t += 7) predictor.addDatapoint("b", -t, t); // b(t) = -t
        await predictor.predict();
        // ends at the earlier last timestamp, a's 180 ms
        expect(seen[0]).toEqual([[80, -80], [105, -105], [130, -130], [155, -155]]);
    });

    it("need data for the whole window", async () => {
        const { predictor } = gridPredictor(["a"], 4, 100);
        predictor.addDatapoint("a", 1, 1000);
        predictor.addDatapoint("a", 1, 1050);
        expect(predictor.isReady).toBe(false);
        await expect(predictor.predict()).rejects.toThrow(PredictorError);
    });

    it("downmix stereo sound", async () => {
        const ref = require(path.join(FIXTURES, "audio_only", "reference.json"));
        const predictor = await load("audio_only");
        const mono = floats(ref.audio[1]);
        const stereo = new Float32Array(mono.length * 2);
        // left carries the sound, right is silent with the opposite sign: the mix is half the sound
        mono.forEach((x, i) => { stereo[2 * i] = x * 2; stereo[2 * i + 1] = 0; });
        predictor.addAudio(stereo, { sampleRate: 8000, channels: 2, time: T0 });
        const res = await predictor.predict();
        res.scores.forEach((s, j) => expect(s).toBeCloseTo(ref.onnx_scores[1][j], 3));
    });
});
