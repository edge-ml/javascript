// onnxruntime-node creates its output tensors with the typed arrays of Node's
// main realm, while Jest runs tests in a separate VM realm, so its
// `instanceof Float32Array` checks fail. Share the main realm's constructors.
const { TestEnvironment } = require("jest-environment-node");

const SHARED = [
    "ArrayBuffer", "Float32Array", "Float64Array", "Int8Array", "Uint8Array", "Uint8ClampedArray",
    "Int16Array", "Uint16Array", "Int32Array", "Uint32Array", "BigInt64Array", "BigUint64Array",
];

module.exports = class OnnxEnvironment extends TestEnvironment {
    constructor(config, context) {
        super(config, context);
        for (const name of SHARED) this.global[name] = globalThis[name];
    }
};
