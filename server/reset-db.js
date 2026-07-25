import { unlinkSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const dir = join(dirname(fileURLToPath(import.meta.url)), 'data');

if (!existsSync(dir)) {
  console.log('No data directory found, nothing to reset.');
  process.exit(0);
}

const files = readdirSync(dir).filter(f => f.startsWith('gantt.db'));
for (const f of files) {
  unlinkSync(join(dir, f));
}
console.log(`Deleted ${files.length} database file(s)`);
