#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

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
    console.error(`Syntax error in ${relativePath}`);
    console.error(error.message);
    return false;
  }
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
