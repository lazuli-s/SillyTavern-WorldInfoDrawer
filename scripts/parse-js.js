#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const ignoreDirs = new Set(['.git', 'node_modules', 'vendor']);

function isJavaScriptFile(filePath) {
  return filePath.endsWith('.js');
}

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoreDirs.has(entry.name)) {
        continue;
      }
      walk(fullPath, files);
    } else if (entry.isFile() && isJavaScriptFile(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

function checkFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(repoRoot, filePath);
  try {
    new vm.Script(code, { filename: relativePath });
    return true;
  } catch (error) {
    return checkAsModule(relativePath, code, error);
  }
}

function checkAsModule(relativePath, code, scriptError) {
  if (typeof vm.SourceTextModule === 'function') {
    try {
      new vm.SourceTextModule(code, { identifier: relativePath });
      return true;
    } catch (moduleError) {
      console.error(`Syntax error in ${relativePath}`);
      console.error(moduleError.message);
      return false;
    }
  }

  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--check'],
    { encoding: 'utf8', input: code }
  );
  if (result.status === 0) {
    return true;
  }

  console.error(`Syntax error in ${relativePath}`);
  if (result.stderr) {
    console.error(result.stderr.trim());
  } else {
    console.error(scriptError.message);
  }
  return false;
}

const jsFiles = walk(repoRoot);
if (jsFiles.length === 0) {
  console.log('No JavaScript files found.');
  process.exit(0);
}

let hasError = false;
for (const file of jsFiles) {
  if (!checkFile(file)) {
    hasError = true;
  }
}

if (hasError) {
  process.exit(1);
}
