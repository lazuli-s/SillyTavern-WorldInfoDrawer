#!/usr/bin/env node
'use strict';

const { execFileSync } = require('node:child_process');

const listJsFiles = () => {
  const output = execFileSync('git', ['ls-files', '*.js'], { encoding: 'utf8' }).trim();
  if (!output) {
    return [];
  }
  return output.split('\n').filter(Boolean);
};

const checkFileSyntax = (file) => {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    return { file, ok: true };
  } catch (error) {
    const stderr = error.stderr?.toString() || '';
    const stdout = error.stdout?.toString() || '';
    const message = stderr || stdout || error.message;
    return { file, ok: false, message };
  }
};

const files = listJsFiles();
if (!files.length) {
  console.log('No JavaScript files found to parse.');
  process.exit(0);
}

const failures = [];
for (const file of files) {
  const result = checkFileSyntax(file);
  if (!result.ok) {
    failures.push(result);
    console.error(`Syntax error in ${file}:`);
    console.error(result.message.trim());
  } else {
    console.log(`Parsed: ${file}`);
  }
}

if (failures.length) {
  console.error(`\n${failures.length} file(s) failed syntax checks.`);
  process.exit(1);
}

console.log('All JavaScript files parsed successfully.');
