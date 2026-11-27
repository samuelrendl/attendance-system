// Bundles each scripts/*.ts into a self-contained dist/scripts/*.mjs.
// The production image ships these next to the standalone server (whose
// traced node_modules only cover the app), so `node scripts/<name>.mjs`
// works inside the app container. See README "Production stack".
import { build } from "esbuild";

await build({
  entryPoints: ["scripts/*.ts"],
  outdir: "dist/scripts",
  outExtension: { ".js": ".mjs" },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  // pg's optional native binding; never installed.
  external: ["pg-native"],
  // Bundled CommonJS dependencies (like pg) call require().
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: "warning",
});
