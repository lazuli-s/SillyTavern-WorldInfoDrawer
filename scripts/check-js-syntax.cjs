const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');
const ignoreDirs = new Set(['.git', 'node_modules']);
const ignorePathSegments = [path.join('vendor', 'sillytavern')];

function shouldIgnoreDir(dirPath) {
  if (ignoreDirs.has(path.basename(dirPath))) {
    return true;
  }

  return ignorePathSegments.some((segment) => dirPath.includes(segment));
}

function isModuleCode(source) {
  return /(^|\n)\s*(import|export)\s/m.test(source);
}

function collectJsFiles(startDir, files = []) {
  const entries = fs.readdirSync(startDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(startDir, entry.name);
    if (entry.isDirectory()) {
      if (shouldIgnoreDir(fullPath)) {
        continue;
      }
      collectJsFiles(fullPath, files);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

function formatError(filePath, error) {
  const location = error.loc
    ? `:${error.loc.line}:${error.loc.column}`
    : '';
  return `${filePath}${location} - ${error.name}: ${error.message}`;
}

function checkFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const parseAsModule = isModuleCode(source);
  try {
    if (parseAsModule) {
      new vm.SourceTextModule(source, { identifier: filePath });
    } else {
      new vm.Script(source, { filename: filePath });
    }
    return null;
  } catch (error) {
    return formatError(filePath, error);
  }
}

const jsFiles = collectJsFiles(rootDir);
const errors = [];

for (const filePath of jsFiles) {
  const errorMessage = checkFile(filePath);
  if (errorMessage) {
    errors.push(errorMessage);
  }
}

if (errors.length) {
  console.error('JavaScript syntax errors detected:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Checked ${jsFiles.length} JavaScript file(s) with no syntax errors.`);
