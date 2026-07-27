const fs = require('fs');
const path = require('path');

// These packages sit in node_modules at runtime because they
// cannot be bundled into server.mjs by esbuild.
// With npm workspaces, hoisted packages live in root node_modules.
const EXTERNAL_PACKAGES = [
  'better-sqlite3',
  'bindings',
  'file-uri-to-path',
  'yjs',
  'y-websocket',
  'lib0',
  'y-protocols',
  'lodash.debounce',
  'isomorphic.js',
];

function copyRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Resolve symlinks (workspaces hoists via symlinks)
    let actualPath = srcPath;
    if (entry.isSymbolicLink()) {
      actualPath = fs.realpathSync(srcPath);
    }

    const stat = fs.statSync(actualPath);
    if (stat.isDirectory()) {
      copyRecursive(actualPath, destPath);
    } else {
      fs.copyFileSync(actualPath, destPath);
    }
  }
}

function findPackage(pkgName, roots) {
  for (const dir of roots) {
    const p = path.join(dir, pkgName);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

exports.default = async function (context) {
  const { appOutDir } = context;
  const searchRoots = [
    path.join(__dirname, '..', 'server', 'node_modules'),
    path.join(__dirname, '..', 'node_modules'),
  ].filter((d) => fs.existsSync(d));

  if (searchRoots.length === 0) {
    console.warn('no node_modules found, skipping');
    return;
  }

  const destBase = path.join(appOutDir, 'resources', 'server', 'node_modules');
  console.log(`Copying ${EXTERNAL_PACKAGES.length} external packages to ${destBase}...`);

  for (const pkg of EXTERNAL_PACKAGES) {
    const src = findPackage(pkg, searchRoots);
    if (!src) {
      console.warn(`  WARNING: ${pkg} not found, skipping`);
      continue;
    }
    const dest = path.join(destBase, pkg);
    copyRecursive(src, dest);
    console.log(`  ✓ ${pkg}`);
  }

  console.log('Done — external packages copied');
};
