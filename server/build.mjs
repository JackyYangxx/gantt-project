import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, 'src');

// Packages that the source code imports but which cannot be bundled
// by esbuild (native addon or loaded via createRequire for singleton).
const NODE_MODULE_DEPS = [
  'better-sqlite3',  // native addon (.node binary)
  'yjs',             // loaded via createRequire in ws.js (must be singleton)
  'y-websocket',     // same reason
];

async function main() {
  // Step 1: Bundle everything into a single ESM file
  await esbuild.build({
    entryPoints: [path.join(ROOT, 'index.js')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node18',
    outfile: path.join(__dirname, 'dist', 'server.mjs'),
    external: Array.from(NODE_MODULE_DEPS),
    // Provide require() in ESM context so bundled CJS modules can resolve
    // Node builtins like require('events'), require('fs'), etc.
    // Note: esbuild already generates `import { createRequire } from "module"`
    // for ws.js, so createRequire is in scope at the module level.
    banner: {
      js: [
        `const __bundle_require = createRequire(import.meta.url);`,
        `const require = __bundle_require;`,
      ].join('\n'),
    },
  });

  console.log('✓ Server bundled to dist/server.mjs');
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
