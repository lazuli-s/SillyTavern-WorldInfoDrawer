import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const files = ['index.js', 'src/Settings.js'];
const errors = [];
const repoRoot = process.cwd();

const isBuiltinSpecifier = (specifier)=>specifier.startsWith('node:');

const resolveImportPath = (specifier, referrer)=>{
  if (isBuiltinSpecifier(specifier)) {
    return null;
  }
  if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
    return null;
  }
  return path.resolve(path.dirname(referrer), specifier);
};

const findImportSpecifiers = (code)=>{
  const specifiers = [];
  const staticImportRegex = /\bimport\s+(?:[^'"]+?\s+from\s+)?['"]([^'"]+)['"]/g;
  const exportFromRegex = /\bexport\s+[^'"]*from\s+['"]([^'"]+)['"]/g;
  const dynamicImportRegex = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

  for (const regex of [staticImportRegex, exportFromRegex, dynamicImportRegex]) {
    let match;
    while ((match = regex.exec(code))) {
      specifiers.push(match[1]);
    }
  }

  return specifiers;
};

const checkSyntax = (filePath)=>{
  const result = spawnSync(process.execPath, ['--check', filePath], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || 'Syntax check failed');
  }
};

const checkImports = (filePath)=>{
  const code = fs.readFileSync(filePath, 'utf8');
  const specifiers = findImportSpecifiers(code);
  for (const specifier of specifiers) {
    if (isBuiltinSpecifier(specifier)) {
      continue;
    }
    const resolved = resolveImportPath(specifier, filePath);
    if (!resolved) {
      continue;
    }
    if (!resolved.startsWith(`${repoRoot}${path.sep}`)) {
      continue;
    }
    if (!fs.existsSync(resolved)) {
      throw new Error(`Missing import: ${specifier}`);
    }
  }
};

for (const file of files) {
  try {
    const filePath = path.resolve(file);
    if (!fs.existsSync(filePath)) {
      errors.push(`Missing file: ${file}`);
      continue;
    }
    checkSyntax(filePath);
    checkImports(filePath);
    console.log(`Parsed OK: ${file}`);
  } catch (error) {
    errors.push(`Syntax error in ${file}: ${error.message}`);
  }
}

if (errors.length > 0) {
  for (const message of errors) {
    console.error(message);
  }
  process.exit(1);
}
