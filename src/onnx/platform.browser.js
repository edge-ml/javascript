// Browser implementation (swapped in for platform.node.js by the browser builds).
// The runtime is not imported here so that apps which only collect data do not
// need onnxruntime-web: it is taken from the global `ort` of
// <script src=".../onnxruntime-web/dist/ort.min.js">, or passed in with
// OnnxPredictor.setRuntime(ort) / { ort } when using a bundler.

export async function loadRuntime() {
  const g = typeof globalThis !== "undefined" ? globalThis : window;
  return g.ort && g.ort.InferenceSession ? g.ort : null;
}

export const RUNTIME_HINT =
  'add <script src="https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js"></script>, ' +
  'or `import * as ort from "onnxruntime-web"` and call OnnxPredictor.setRuntime(ort)';

export async function readFile() {
  throw new Error("OnnxPredictor.fromFiles is only available in Node.js; use fromUrls in the browser");
}
