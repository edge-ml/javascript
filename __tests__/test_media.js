const fs = require("fs");
const os = require("os");
const path = require("path");
const edgeML = require("../dist/index");

const URL = "https://edge-ml.example/";
const MEDIA = { _id: "m1", kind: "audio", name: "voice", start: 1000, end: 3000, durationMs: 2000 };

// Replaces global fetch with a router; records every call. Multipart bodies
// are recorded as { field: value }, files as { name, bytes }.
function mockFetch(routes) {
    const calls = [];
    global.fetch = jest.fn(async (url, init = {}) => {
        let body;
        if (init.body instanceof FormData) {
            body = {};
            for (const [field, value] of init.body.entries()) {
                body[field] = typeof value === "string"
                    ? value
                    : { name: value.name, bytes: Buffer.from(await value.arrayBuffer()).toString() };
            }
        } else if (init.body) {
            body = JSON.parse(init.body);
        }
        const call = { url, method: init.method, headers: init.headers, body };
        calls.push(call);
        const key = `${init.method} ${url.replace("https://edge-ml.example", "")}`;
        const handler = routes[key];
        if (!handler) return new Response(JSON.stringify({ detail: "no route " + key }), { status: 404 });
        const res = await handler(body, calls);
        if (res instanceof Response) return res;
        return new Response(JSON.stringify(res), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    return calls;
}

afterEach(() => {
    delete global.fetch;
});

describe("uploadMedia", () => {
    it("sends a Buffer as multipart form data", async () => {
        const calls = mockFetch({ "POST /api/v1/deviceapi/dataset/media/WRITE/d1": () => MEDIA });
        const media = await edgeML.uploadMedia(URL, "WRITE", "d1", Buffer.from("sound"), {
            kind: "audio", name: "voice", start: 1000.4, fileName: "voice.mp3",
        });
        expect(media).toEqual(MEDIA);
        expect(calls[0].body).toEqual({
            file: { name: "voice.mp3", bytes: "sound" }, kind: "audio", name: "voice", start: "1000",
        });
        // fetch has to set the multipart boundary itself
        expect(calls[0].headers).toBeUndefined();
    });

    it("sends only what was given", async () => {
        const calls = mockFetch({ "POST /api/v1/deviceapi/dataset/media/WRITE/d1": () => MEDIA });
        await edgeML.uploadMedia(URL, "WRITE", "d1", new Uint8Array([104, 105]).buffer);
        expect(calls[0].body).toEqual({ file: { name: "recording", bytes: "hi" } });
    });

    it("takes a Blob or File", async () => {
        const calls = mockFetch({ "POST /api/v1/deviceapi/dataset/media/WRITE/d1": () => MEDIA });
        await edgeML.uploadMedia(URL, "WRITE", "d1", new File(["clip"], "clip.webm", { type: "video/webm" }));
        expect(calls[0].body.file).toEqual({ name: "clip.webm", bytes: "clip" });
    });

    it("reads a file path in Node.js", async () => {
        const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "edgeml-")), "walk.mp4");
        fs.writeFileSync(file, "frames");
        const calls = mockFetch({ "POST /api/v1/deviceapi/dataset/media/WRITE/d1": () => MEDIA });
        await edgeML.uploadMedia(URL, "WRITE", "d1", file);
        expect(calls[0].body.file).toEqual({ name: "walk.mp4", bytes: "frames" });
        await expect(edgeML.uploadMedia(URL, "WRITE", "d1", file + ".missing")).rejects.toThrow("ENOENT");
    });

    it("rejects bad arguments before sending anything", async () => {
        const calls = mockFetch({});
        const buf = Buffer.from("x");
        await expect(edgeML.uploadMedia(URL, "WRITE", "", buf)).rejects.toThrow("needs the id of a dataset");
        await expect(edgeML.uploadMedia(URL, "WRITE", "d1", buf, { kind: "photo" })).rejects.toThrow("'audio' or 'video'");
        await expect(edgeML.uploadMedia(URL, "WRITE", "d1", buf, { start: "now" })).rejects.toThrow("unix timestamp");
        await expect(edgeML.uploadMedia(URL, "WRITE", "d1", { not: "a file" })).rejects.toThrow("file must be");
        expect(calls).toHaveLength(0);
    });

    it("passes on why the server refused a file", async () => {
        mockFetch({
            "POST /api/v1/deviceapi/dataset/media/WRITE/d1": () =>
                new Response(JSON.stringify({ detail: "This video format (avi/mpeg4) cannot be played in the browser." }), { status: 400 }),
        });
        await expect(edgeML.uploadMedia(URL, "WRITE", "d1", Buffer.from("x"))).rejects.toThrow(
            "400: This video format (avi/mpeg4) cannot be played in the browser."
        );
    });
});

describe("sendDataset with media", () => {
    it("uploads recordings after the time-series", async () => {
        const calls = mockFetch({
            "POST /api/v1/deviceapi/dataset/init/WRITE": () => ({ id: "d1" }),
            "POST /api/v1/deviceapi/dataset/append/WRITE/d1": () => undefined,
            "POST /api/v1/deviceapi/dataset/media/WRITE/d1": () => MEDIA,
        });
        const id = await edgeML.sendDataset(URL, "WRITE", {
            name: "walk",
            timeSeries: [{ name: "accX", data: [[1000, 1]] }],
            media: [
                { file: Buffer.from("a"), fileName: "cam.mp4", start: 1000 },
                { file: Buffer.from("b"), fileName: "mic.wav", name: "microphone" },
            ],
        });
        expect(id).toBe("d1");
        expect(calls.map((c) => c.url.split("/deviceapi/")[1])).toEqual([
            "dataset/init/WRITE", "dataset/append/WRITE/d1", "dataset/media/WRITE/d1", "dataset/media/WRITE/d1",
        ]);
        expect(calls[2].body).toEqual({ file: { name: "cam.mp4", bytes: "a" }, start: "1000" });
        expect(calls[3].body).toEqual({ file: { name: "mic.wav", bytes: "b" }, name: "microphone" });
    });

    it("creates a dataset that only holds recordings", async () => {
        const calls = mockFetch({
            "POST /api/v1/deviceapi/dataset/init/WRITE": () => ({ id: "d1" }),
            "POST /api/v1/deviceapi/dataset/media/WRITE/d1": () => MEDIA,
        });
        await edgeML.sendDataset(URL, "WRITE", { name: "interview", media: [{ file: Buffer.from("a") }] });
        expect(calls[0].body).toEqual({ name: "interview", metaData: {}, timeSeries: [] });
        expect(calls).toHaveLength(2); // nothing to append
    });

    it("still needs time-series or media", async () => {
        mockFetch({});
        await expect(edgeML.sendDataset(URL, "WRITE", { name: "empty" })).rejects.toThrow("needs a name and a timeSeries array");
        await expect(edgeML.sendDataset(URL, "WRITE", { name: "x", timeSeries: [], media: [{}] })).rejects.toThrow("media must be");
    });
});

describe("listDatasets and downloadMedia", () => {
    it("lists datasets with their recordings", async () => {
        mockFetch({
            "GET /api/v1/deviceapi/project/READ": () => ({
                datasets: [
                    { _id: "d1", name: "walk", timeSeries: [{ name: "accX" }], mediaSeries: [MEDIA] },
                    { _id: "d0", name: "from before recordings", timeSeries: [] },
                ],
                labelings: [],
            }),
        });
        const datasets = await edgeML.listDatasets(URL, "READ");
        expect(datasets.map((d) => [d.name, d.mediaSeries.length])).toEqual([["walk", 1], ["from before recordings", 0]]);
        expect(datasets[0].mediaSeries[0].durationMs).toBe(2000);
    });

    it("downloads a recording", async () => {
        mockFetch({
            "GET /api/v1/deviceapi/dataset/media/READ/d1/m1": () => new Response(Buffer.from("sound"), { status: 200 }),
        });
        const data = await edgeML.downloadMedia(URL, "READ", "d1", "m1");
        expect(data).toBeInstanceOf(ArrayBuffer);
        expect(Buffer.from(data).toString()).toBe("sound");
    });
});
