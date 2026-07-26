const fs = require('fs');
const path = require('path');

// These packages sit in node_modules at runtime because they
// cannot be bundled into server.mjs by esbuild:
//   better-sqlite3     — native addon (.node binary)
//   bindings           — transitive dep (loaded by better-sqlite3)
//   file-uri-to-path   — transitive dep (loaded by bindings)
//   yjs                — loaded via createRequire (must be singleton)
//   y-websocket        — loaded via createRequire (must be singleton)
//   lib0               — transitive dep (yjs, y-websocket)
//   y-protocols        — transitive dep (y-websocket)
// transitive closure: externalRuntime + their deps (no bundler flag needed)
const EXTERNAL_PACKAGES = [
  'better-sqlite3',   // native addon
  'bindings',          // better-sqlite3 → bindings
  'file-uri-to-path',  // bindings → file-uri-to-path
  'yjs',               // createRequire singleton
  'y-websocket',       // createRequire singleton
  'lib0',              // yjs / y-websocket / y-protocols → lib0
  'y-protocols',       // y-websocket → y-protocols
  'lodash.debounce',   // y-websocket → lodash.debounce
  'isomorphic.js',     // lib0 → isomorphic.js
];

function copyRecursive(src, dest, base) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Resolve symlinks; skip any that point outside server/node_modules
    let actualPath = srcPath;
    if (entry.isSymbolicLink()) {
      const target = fs.readlinkSync(srcPath);
      const resolved = path.resolve(path.dirname(srcPath), target);
      if (!resolved.startsWith(base)) continue;
      actualPath = resolved;
    }

    const stat = fs.statSync(actualPath);
    if (stat.isDirectory()) {
      copyRecursive(actualPath, destPath, base);
    } else {
      fs.copyFileSync(actualPath, destPath);
    }
  }
}

exports.default = async function (context) {
  const { appOutDir } = context;
  const srcBase = path.join(__dirname, '..', 'server', 'node_modules');
  const destBase = path.join(appOutDir, 'resources', 'server', 'node_modules');

  if (!fs.existsSync(srcBase)) {
    console.warn('server/node_modules not found, skipping');
    return;
  }

  console.log(`Copying ${EXTERNAL_PACKAGES.length} external packages to ${destBase}...`);

  for (const pkg of EXTERNAL_PACKAGES) {
    const src = path.join(srcBase, pkg);
    if (!fs.existsSync(src)) {
      console.warn(`  WARNING: ${pkg} not found, skipping`);
      continue;
    }
    const dest = path.join(destBase, pkg);
    copyRecursive(src, dest, srcBase);
    console.log(`  ✓ ${pkg}`);
  }

  console.log('Done — external packages copied');
};
