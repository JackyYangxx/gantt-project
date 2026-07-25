const fs = require('fs');
const path = require('path');

// Copy server/node_modules while skipping circular symlinks
// (e.g., server/node_modules/gantt-project → project root)
// that cause ELOOP on Windows CI when using cpSync with dereference.
function copyNodeModules(src, dest, base) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    let actualPath = srcPath;
    if (entry.isSymbolicLink()) {
      const target = fs.readlinkSync(srcPath);
      const resolved = path.resolve(path.dirname(srcPath), target);
      const relative = path.relative(base, resolved);
      if (relative.startsWith('..') || path.isAbsolute(relative)) continue;
      actualPath = resolved;
    }

    const stat = fs.statSync(actualPath);
    if (stat.isDirectory()) {
      copyNodeModules(actualPath, destPath, base);
    } else {
      fs.copyFileSync(actualPath, destPath);
    }
  }
}

exports.default = async function (context) {
  const { appOutDir } = context;
  const srcDir = path.join(__dirname, '..', 'server', 'node_modules');
  const destDir = path.join(appOutDir, 'resources', 'server', 'node_modules');

  if (!fs.existsSync(srcDir)) {
    console.warn('server/node_modules not found, skipping copy');
    return;
  }

  console.log(`Copying server/node_modules to ${destDir}...`);
  copyNodeModules(srcDir, destDir, srcDir);
  console.log('server/node_modules copied successfully');
};
