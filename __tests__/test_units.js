const fs = require("fs");
const path = require("path");
const edgeML = require("../dist/index");
const { OnnxPredictor, UnitError } = edgeML;

const FIXTURES = path.join(__dirname, "fixtures");
const MODEL = path.join(FIXTURES, "random_forest", "model.onnx");
const OLD_MANIFEST = JSON.parse(fs.readFileSync(path.join(FIXTURES, "random_forest", "manifest.json")));
const INPUT_UNITS = require(path.join(FIXTURES, "input_units.json"));
const CATALOG = require(path.join(FIXTURES, "unit_catalog.json"));
const ref = require(path.join(FIXTURES, "random_forest", "reference.json"));

// The same model, as exported by a backend with units:
// x in m/s^2 (acceleration), y in degC (temperature), z in a custom unit "ue".
const MANIFEST = { ...OLD_MANIFEST, input: { ...OLD_MANIFEST.input, units: INPUT_UNITS } };
const G = 9.80665;

const load = (manifest, opts) => OnnxPredictor.load(fs.readFileSync(MODEL), manifest, opts);

// Records what the model is fed by wrapping session.run.
function recordInputs(predictor) {
    const inputs = [];
    const run = predictor.session.run.bind(predictor.session);
    predictor.session.run = (feeds) => {
        const t = feeds[predictor.manifest.input.name];
        const n = predictor.sensors.length;
        inputs.push(Array.from({ length: t.dims[1] }, (_, r) => Array.from(t.data.slice(r * n, (r + 1) * n))));
        return run(feeds);
    };
    return inputs;
}

describe("OnnxPredictor units", () => {
    it("reads the expected units from the manifest", async () => {
        const p = await load(MANIFEST);
        expect(p.inputUnits.map((u) => [u.name, u.quantity, u.unit])).toEqual([
            ["x", "acceleration", "m/s^2"],
            ["y", "temperature", "degC"],
            ["z", "strain", "ue"],
        ]);
        expect(p.inputUnits[0].conversions.g).toEqual({ scale: G, offset: 0 });
    });

    it("converts declared units to the units the model expects", async () => {
        const p = await load(MANIFEST, { units: { x: "g", y: "degF", z: "ue" } });
        const inputs = recordInputs(p);
        const window = ref.windows[0];
        // the same physical values, delivered in g and degF
        const delivered = window.map(([x, y, z]) => [x / G, (y * 9) / 5 + 32, z]);
        const converted = await p.predictWindow(delivered);
        inputs[0].forEach((row, r) => {
            expect(row[0]).toBeCloseTo(window[r][0], 4);
            expect(row[1]).toBeCloseTo(window[r][1], 4);
            expect(row[2]).toBeCloseTo(window[r][2], 4);
        });

        const plain = await load(MANIFEST);
        expect(converted.prediction).toBe((await plain.predictWindow(window)).prediction);
    });

    it("converts buffered datapoints too", async () => {
        const p = await load(MANIFEST, { units: { x: "mg" } });
        const inputs = recordInputs(p);
        ref.timestamps[0].forEach((t, r) => {
            const [x, y, z] = ref.windows[0][r];
            p.addSample({ x: (x / G) * 1000, y, z }, t);
        });
        await p.predict();
        inputs[0].forEach((row, r) => expect(row[0]).toBeCloseTo(ref.windows[0][r][0], 4));
    });

    it("passes undeclared sensors and the expected unit through unchanged", async () => {
        const p = await load(MANIFEST, { units: { x: "m/s^2" } });
        const inputs = recordInputs(p);
        await p.predictWindow(ref.windows[0]);
        inputs[0].forEach((row, r) => row.forEach((v, c) => expect(v).toBeCloseTo(ref.windows[0][r][c], 5)));
    });

    it("throws a UnitError for units the model cannot convert from", async () => {
        await expect(load(MANIFEST, { units: { x: "degC" } })).rejects.toBeInstanceOf(UnitError);
        await expect(load(MANIFEST, { units: { x: "furlong" } })).rejects.toThrow(
            "'x' is declared in 'furlong', but the model expects m/s^2 (acceleration) and cannot convert from 'furlong'. Accepted units: m/s^2, g, mg, cm/s^2."
        );
        // custom quantity: only its own unit is accepted
        await expect(load(MANIFEST, { units: { z: "mm/m" } })).rejects.toThrow("Deliver it in ue");

        const p = await load(MANIFEST);
        expect(() => p.setUnits({ y: "rad" })).toThrow(UnitError);
        expect(() => p.setUnits({ y: 5 })).toThrow(TypeError);
    });

    it("accepts unit labels and aliases with the catalog", async () => {
        await expect(load(MANIFEST, { units: { y: "°F" } })).rejects.toBeInstanceOf(UnitError);
        const p = await load(MANIFEST, { units: { x: "m/s²", y: "°F" }, catalog: CATALOG });
        const inputs = recordInputs(p);
        await p.predictWindow(ref.windows[0].map(([x, y, z]) => [x, (y * 9) / 5 + 32, z]));
        inputs[0].forEach((row, r) => expect(row[1]).toBeCloseTo(ref.windows[0][r][1], 4));
    });

    it("ignores units of sensors the model does not use", async () => {
        await expect(load(MANIFEST, { units: { gyroX: "rad/s" } })).resolves.toBeInstanceOf(OnnxPredictor);
    });

    it("setUnits replaces earlier declarations", async () => {
        const p = await load(MANIFEST, { units: { x: "g" } });
        p.setUnits({});
        const inputs = recordInputs(p);
        await p.predictWindow(ref.windows[0]);
        expect(inputs[0][0][0]).toBeCloseTo(ref.windows[0][0][0], 5);
    });
});

describe("Models without units (backwards compatibility)", () => {
    it("reports every input as unknown", async () => {
        const p = await load(OLD_MANIFEST);
        expect(p.inputUnits).toEqual([
            { name: "x", quantity: null, unit: "", conversions: {} },
            { name: "y", quantity: null, unit: "", conversions: {} },
            { name: "z", quantity: null, unit: "", conversions: {} },
        ]);
    });

    it("passes values through even when the app declares units", async () => {
        const p = await load(OLD_MANIFEST, { units: { x: "g", y: "degF" } });
        const res = await p.predictWindow(ref.windows[0]);
        res.scores.forEach((s, j) => expect(s).toBeCloseTo(ref.onnx_scores[0][j], 4));
    });

    it("treats inputs with unknown units in a new manifest the same way", async () => {
        const units = INPUT_UNITS.map((u) => ({ ...u, quantity: null, unit: "", conversions: {} }));
        const p = await load({ ...OLD_MANIFEST, input: { ...OLD_MANIFEST.input, units } }, { units: { x: "g" } });
        const res = await p.predictWindow(ref.windows[0]);
        res.scores.forEach((s, j) => expect(s).toBeCloseTo(ref.onnx_scores[0][j], 4));
    });
});

describe("Units on upload and the unit catalog", () => {
    function mockFetch(routes) {
        const calls = [];
        global.fetch = jest.fn(async (url, init = {}) => {
            const body = init.body ? JSON.parse(init.body) : undefined;
            calls.push({ url, method: init.method || "GET", body });
            const handler = routes[`${init.method || "GET"} ${url.replace("https://edge-ml.example", "")}`];
            if (!handler) return new Response(JSON.stringify({ detail: "no route" }), { status: 404 });
            return new Response(JSON.stringify(handler(body)), { status: 200 });
        });
        return calls;
    }
    afterEach(() => delete global.fetch);

    const URL = "https://edge-ml.example";
    const routes = {
        "POST /api/v1/deviceapi/dataset/init/W": () => ({ id: "ds1" }),
        "POST /api/v1/deviceapi/dataset/append/W/ds1": () => null,
    };

    it("datasetCollector sends units and keeps plain names plain", async () => {
        const calls = mockFetch(routes);
        const c = await edgeML.datasetCollector(URL, "W", "rec", false, [
            "plain",
            { name: "accX", unit: "g", quantity: "acceleration" },
            { name: "strain", unit: "ue" },
        ]);
        expect(calls[0].body.timeSeries).toEqual([
            "plain",
            { name: "accX", unit: "g", quantity: "acceleration" },
            { name: "strain", unit: "ue", quantity: null },
        ]);
        c.addDataPoint(1, "accX", 1);
        c.addDataPoint(1, "plain", 2);
        expect(() => c.addDataPoint(1, "accY", 1)).toThrow("invalid time-series name");
        await c.onComplete();
        expect(calls[1].body.data.map((d) => d.name)).toEqual(["accX", "plain"]);
    });

    it("datasetCollector rejects series without a name", async () => {
        mockFetch(routes);
        await expect(edgeML.datasetCollector(URL, "W", "rec", true, [{ unit: "g" }])).rejects.toThrow("needs a name");
        await expect(edgeML.datasetCollector(URL, "W", "rec", true, [])).rejects.toThrow("non-empty");
    });

    it("sendDataset sends units on init and only data on append", async () => {
        const calls = mockFetch(routes);
        await edgeML.sendDataset(URL, "W", {
            name: "whole",
            timeSeries: [
                { name: "temp", unit: "degF", quantity: "temperature", data: [[1, 70]] },
                { name: "accX", data: [[1, 0.5]] },
            ],
        });
        expect(calls[0].body.timeSeries).toEqual([{ name: "temp", unit: "degF", quantity: "temperature" }, "accX"]);
        expect(calls[1].body.data).toEqual([
            { name: "temp", data: [[1, 70]] },
            { name: "accX", data: [[1, 0.5]] },
        ]);
    });

    it("fetchUnits returns the catalog", async () => {
        const calls = mockFetch({ "GET /ml/units/": () => CATALOG });
        const catalog = await edgeML.fetchUnits(URL + "/");
        expect(catalog.quantities.find((q) => q.id === "acceleration").defaultUnit).toBe("m/s^2");
        expect(calls[0].url).toBe("https://edge-ml.example/ml/units/");
    });
});
