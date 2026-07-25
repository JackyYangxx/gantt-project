const fs = require('fs');
const path = require('path');

exports.default = async function (context) {
  const { appOutDir } = context;
  const srcDir = path.join(__dirname, '..', 'server', 'node_modules');
  const destDir = path.join(appOutDir, 'resources', 'server', 'node_modules');

  if (!fs.existsSync(srcDir)) {
    console.warn('server/node_modules not found, skipping copy');
    return;
  }

  console.log(`Copying server/node_modules to ${destDir}...`);
  fs.cpSync(srcDir, destDir, { recursive: true, dereference: true });
  console.log('server/node_modules copied successfully');
};
