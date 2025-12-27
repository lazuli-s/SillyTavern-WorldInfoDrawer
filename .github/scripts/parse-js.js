const fs = require('fs');
const path = require('path');
const vm = require('vm');

const IGNORE_DIRS = new Set(['.git', 'node_modules']);
const IGNORE_PATHS = [path.normalize('vendor/sillytavern')];

function shouldIgnoreDir(dirPath) {
  const base = path.basename(dirPath);
  if (IGNORE_DIRS.has(base)) {
    return true;
  }
  return IGNORE_PATHS.some((ignored) => dirPath.includes(ignored));
}

async function walk(dir, files = []) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (shouldIgnoreDir(fullPath)) {
        continue;
      }
      await walk(fullPath, files);
      continue;
    }
    if (entry.isFile() && fullPath.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

async function parseFile(filePath) {
  const code = await fs.promises.readFile(filePath, 'utf8');
  new vm.SourceTextModule(code, { identifier: filePath });
}

async function main() {
  const root = process.cwd();
  const files = await walk(root);
  let hasErrors = false;

  for (const file of files) {
    try {
      await parseFile(file);
    } catch (error) {
      hasErrors = true;
      const message = error && error.message ? error.message : String(error);
      console.error(`Syntax error in ${file}: ${message}`);
    }
  }

  if (hasErrors) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`Parse script failed: ${error.message || error}`);
  process.exit(1);
});
