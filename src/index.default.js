// Entry of the CommonJS and <script> (IIFE) builds: they expose a single
// object (`module.exports` / the `edgeML` global); the ES module builds use
// index.js with named exports plus the same default export.
import edgeML from "./index";

export default edgeML;
