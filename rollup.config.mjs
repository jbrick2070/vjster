// SPDX-License-Identifier: GPL-2.0-or-later
// One config, several bundles (PLAN.md 3.1). A bundle whose entry file does
// not exist yet is skipped with a notice, so `npm run build` works from
// Phase 0 on and grows as the phases add their entry files.
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

const nodeBuiltins = [
  "node:crypto",
  "node:events",
  "node:http",
  "node:https",
  "node:net",
  "node:os",
  "node:path",
  "node:stream",
  "node:tls",
  "node:url",
  "node:util",
  "node:zlib"
];

/**
 * Bundles in the order the phases add them. `node` picks the resolver flavor.
 * `required` is false until the bundle's phase lands; from then on a missing
 * entry file is a build error, not a skipped bundle.
 */
const bundles = [
  {
    name: "plugin (Phase 1 step 5)",
    input: "src/plugin/plugin.ts",
    output: { file: "com.jbrick2070.vjster.sdPlugin/bin/plugin.js", format: "esm", sourcemap: true },
    node: true,
    required: false
  },
  {
    name: "extension service worker (Phase 1 step 4)",
    input: "src/extension/background.ts",
    output: { file: "extension-dist/background.js", format: "esm", sourcemap: true },
    node: false,
    required: false
  },
  {
    name: "extension bridge, isolated world (Phase 1 step 4)",
    input: "src/extension/content-bridge.ts",
    output: { file: "extension-dist/content-bridge.js", format: "iife", sourcemap: true },
    node: false,
    required: false
  },
  {
    name: "extension adapter, main world (Phase 1 step 4)",
    input: "src/extension/content-main.ts",
    output: { file: "extension-dist/content-main.js", format: "iife", sourcemap: true },
    node: false,
    required: false
  },
  {
    name: "extension options page (Phase 1 step 4)",
    input: "src/extension/options.ts",
    output: { file: "extension-dist/options.js", format: "esm", sourcemap: true },
    node: false,
    required: false
  },
  {
    name: "OBS browser-source page (Phase 2)",
    input: "src/page/player.ts",
    output: { file: "page/player.js", format: "iife", sourcemap: true },
    node: false,
    required: false
  }
];

// Paths are resolved against this file, not the working directory, so the
// existence check gives the same answer wherever rollup is started from.
const root = dirname(fileURLToPath(import.meta.url));

const present = [];
for (const bundle of bundles) {
  if (existsSync(resolve(root, bundle.input))) {
    present.push(bundle);
  } else if (bundle.required) {
    throw new Error(`[rollup] missing entry for ${bundle.name}: ${bundle.input}`);
  } else {
    console.log(`[rollup] not yet: ${bundle.name}, ${bundle.input} does not exist`);
  }
}

if (present.length === 0) {
  // Rollup rejects an empty config list; in Phase 0 there is nothing to build.
  console.log("[rollup] nothing to build yet; the first bundle arrives in Phase 1 step 4");
  process.exit(0);
}

export default present.map(({ input, output, node }) => ({
  input,
  output,
  external: node ? nodeBuiltins : [],
  plugins: [
    typescript({ tsconfig: "./tsconfig.json", include: ["src/**/*.ts"], noEmit: false }),
    nodeResolve(
      node
        ? { browser: false, exportConditions: ["node"], preferBuiltins: true }
        : { browser: true, preferBuiltins: false }
    ),
    commonjs()
  ]
}));
