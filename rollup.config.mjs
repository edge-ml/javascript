import alias from '@rollup/plugin-alias';
import { fileURLToPath } from 'url';

const src = (file) => fileURLToPath(new URL(`./src/${file}`, import.meta.url));

// The ONNX runtimes are optional peer dependencies: never bundled, loaded at
// runtime only when a model is used.
const nodeExternal = ['onnxruntime-node', 'onnxruntime-web', 'fs'];

// no Node-only code (onnxruntime-node, fs) in browser builds
const browserPlugins = () => [
    alias({ entries: [{ find: /^\.\/platform\.node$/, replacement: src('onnx/platform.browser.js') }] }),
];

// index.js has named exports plus a default export (ES modules);
// index.default.js only the default (CommonJS module.exports / edgeML global).
// The browser default build is UMD: a <script> global and require()-able by bundlers.
export default [
    // browser builds (script tag / bundlers via the package.json "browser" field)
    {
        input: 'src/index.default.js',
        output: { name: 'edgeML', file: 'dist/index.browser.js', format: 'umd', exports: 'default' },
        plugins: browserPlugins(),
    },
    {
        input: 'src/index.js',
        output: { file: 'dist/index.browser.esm.js', format: 'es' },
        plugins: browserPlugins(),
    },

    // Node.js builds
    {
        input: 'src/index.default.js',
        external: nodeExternal,
        // require() rather than import() for the lazily loaded runtimes, so the
        // CJS build also works where dynamic import is unavailable (e.g. Jest)
        output: { file: 'dist/index.js', format: 'cjs', exports: 'default', dynamicImportInCjs: false },
    },
    {
        input: 'src/index.js',
        external: nodeExternal,
        output: { file: 'dist/index.mjs', format: 'es' },
    },
];
