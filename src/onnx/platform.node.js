// Node.js implementation (the browser builds swap in platform.browser.js).

const pickOrt = (m) => (m && m.InferenceSession ? m : m && m.default && m.default.InferenceSession ? m.default : null);

/** Loads onnxruntime-node, falling back to onnxruntime-web. */
export async function loadRuntime() {
  for (const load of [() => import("onnxruntime-node"), () => import("onnxruntime-web")]) {
    try {
      const ort = pickOrt(await load());
      if (ort) return ort;
    } catch (e) {
      // not installed — try the next one
    }
  }
  return null;
}

export const RUNTIME_HINT = "npm install onnxruntime-node";

export async function readFile(path) {
  const fs = await import("fs");
  return (fs.promises || fs.default.promises).readFile(path);
}
