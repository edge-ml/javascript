// Loads the IIFE browser bundle like a <script> tag would, with onnxruntime-web as global `ort`.
const vm = require("vm"), fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const ort = require(path.join(root, "node_modules/onnxruntime-web"));
const fx = path.join(root, "__tests__/fixtures/random_forest");
const ctx = { ort, fetch, console, setTimeout, Float32Array, Uint8Array, ArrayBuffer, Response };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "dist/index.browser.js"), "utf8") + "\n;globalThis.edgeML = edgeML;", ctx);
(async () => {
  const { OnnxPredictor } = ctx.edgeML;
  console.log("exports:", Object.keys(ctx.edgeML).join(","));
  const p = await OnnxPredictor.load(fs.readFileSync(path.join(fx, "model.onnx")), JSON.parse(fs.readFileSync(path.join(fx, "manifest.json"))));
  const ref = JSON.parse(fs.readFileSync(path.join(fx, "reference.json")));
  let ok = 0;
  for (let i = 0; i < ref.windows.length; i++) {
    const r = await p.predictWindow(ref.windows[i]);
    if (r.index === ref.python_predictions[i] && r.scores.every((s, j) => Math.abs(s - ref.onnx_scores[i][j]) < 1e-4)) ok++;
  }
  console.log(`browser bundle + onnxruntime-web: ${ok}/${ref.windows.length} windows match Python`);
  if (ok !== ref.windows.length) process.exit(1);
})().catch(e => { console.error("FAIL", e); process.exit(1); });
