#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_EXTENSIONS = new Set([
    '.md',
    '.js',
    '.json',
    '.css',
    '.html',
    '.yml',
    '.yaml',
    '.txt',
]);

const EXCLUDED_DIRS = new Set([
    '.git',
    'node_modules',
    'vendor',
]);

const CP1252_EXTRA_ENCODE = new Map([
    [0x20AC, 0x80],
    [0x201A, 0x82],
    [0x0192, 0x83],
    [0x201E, 0x84],
    [0x2026, 0x85],
    [0x2020, 0x86],
    [0x2021, 0x87],
    [0x02C6, 0x88],
    [0x2030, 0x89],
    [0x0160, 0x8A],
    [0x2039, 0x8B],
    [0x0152, 0x8C],
    [0x017D, 0x8E],
    [0x2018, 0x91],
    [0x2019, 0x92],
    [0x201C, 0x93],
    [0x201D, 0x94],
    [0x2022, 0x95],
    [0x2013, 0x96],
    [0x2014, 0x97],
    [0x02DC, 0x98],
    [0x2122, 0x99],
    [0x0161, 0x9A],
    [0x203A, 0x9B],
    [0x0153, 0x9C],
    [0x017E, 0x9E],
    [0x0178, 0x9F],
]);

const MOJIBAKE_SCORE_REGEX = /(Ã.|Â.|â.|ðŸ|ï»¿|�)/g;

function parseArgs(argv) {
    const options = {
        write: false,
        roots: [],
        extensions: new Set(DEFAULT_EXTENSIONS),
    };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--write') {
            options.write = true;
            continue;
        }
        if (arg === '--ext') {
            const next = argv[i + 1];
            if (!next) {
                throw new Error('--ext requires a comma-separated value, example: --ext .md,.js');
            }
            i++;
            options.extensions = new Set(
                next
                    .split(',')
                    .map((v) => v.trim())
                    .filter(Boolean)
                    .map((v) => (v.startsWith('.') ? v : `.${v}`)),
            );
            continue;
        }
        if (arg === '--help' || arg === '-h') {
            printHelp();
            process.exit(0);
        }
        options.roots.push(arg);
    }

    if (options.roots.length === 0) {
        options.roots.push('.');
    }

    return options;
}

function printHelp() {
    console.log(
        [
            'Usage:',
            '  node scripts/fix-corrupted-text.js [--write] [--ext .md,.js] [paths...]',
            '',
            'Examples:',
            '  node scripts/fix-corrupted-text.js',
            '  node scripts/fix-corrupted-text.js --write .clinerules tasks',
            '',
            'Notes:',
            '  - Default mode is dry run (no files are written).',
            '  - --write applies fixes to files that score as improved.',
            '  - vendor/, node_modules/, and .git/ are skipped.',
        ].join('\n'),
    );
}

function collectFiles(rootPath, extensions, outFiles) {
    const stat = fs.statSync(rootPath, { throwIfNoEntry: false });
    if (!stat) {
        return;
    }

    if (stat.isFile()) {
        const ext = path.extname(rootPath).toLowerCase();
        if (extensions.has(ext)) {
            outFiles.push(path.resolve(rootPath));
        }
        return;
    }

    const entries = fs.readdirSync(rootPath, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(rootPath, entry.name);
        if (entry.isDirectory()) {
            if (EXCLUDED_DIRS.has(entry.name)) {
                continue;
            }
            collectFiles(full, extensions, outFiles);
            continue;
        }
        if (!entry.isFile()) {
            continue;
        }
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.has(ext)) {
            outFiles.push(path.resolve(full));
        }
    }
}

function looksCorrupted(text) {
    return MOJIBAKE_SCORE_REGEX.test(text);
}

function mojibakeScore(text) {
    const matches = text.match(MOJIBAKE_SCORE_REGEX);
    return matches ? matches.length : 0;
}

function countReplacementChars(text) {
    const matches = text.match(/\uFFFD/g);
    return matches ? matches.length : 0;
}

function encodeWindows1252(input) {
    const bytes = [];

    for (const char of input) {
        const codePoint = char.codePointAt(0);
        if (codePoint <= 0xff) {
            bytes.push(codePoint);
            continue;
        }
        const mapped = CP1252_EXTRA_ENCODE.get(codePoint);
        if (mapped !== undefined) {
            bytes.push(mapped);
            continue;
        }
        bytes.push(0x3f);
    }

    return Uint8Array.from(bytes);
}

function repairPass(input) {
    const cp1252Bytes = encodeWindows1252(input);
    return Buffer.from(cp1252Bytes).toString('utf8');
}

function repairText(original) {
    let current = original;
    let currentScore = mojibakeScore(current) + countReplacementChars(current) * 3;

    for (let i = 0; i < 2; i++) {
        const candidate = repairPass(current);
        const candidateScore = mojibakeScore(candidate) + countReplacementChars(candidate) * 3;
        if (candidateScore >= currentScore) {
            break;
        }
        current = candidate;
        currentScore = candidateScore;
    }

    return current;
}

function run() {
    const { write, roots, extensions } = parseArgs(process.argv.slice(2));
    const files = [];

    for (const root of roots) {
        collectFiles(path.resolve(root), extensions, files);
    }

    let scanned = 0;
    let candidates = 0;
    let changed = 0;

    for (const filePath of files) {
        scanned++;
        const original = fs.readFileSync(filePath, 'utf8');
        if (!looksCorrupted(original)) {
            continue;
        }

        const repaired = repairText(original);
        if (repaired === original) {
            continue;
        }

        const beforeScore = mojibakeScore(original) + countReplacementChars(original) * 3;
        const afterScore = mojibakeScore(repaired) + countReplacementChars(repaired) * 3;
        if (afterScore >= beforeScore) {
            continue;
        }

        candidates++;
        const rel = path.relative(process.cwd(), filePath);
        if (write) {
            fs.writeFileSync(filePath, repaired, 'utf8');
            changed++;
            console.log(`FIXED      ${rel} (score ${beforeScore} -> ${afterScore})`);
        } else {
            console.log(`WOULD_FIX  ${rel} (score ${beforeScore} -> ${afterScore})`);
        }
    }

    console.log('');
    console.log(`Scanned files: ${scanned}`);
    console.log(`Fix candidates: ${candidates}`);
    console.log(write ? `Files fixed: ${changed}` : 'Dry run only (no files modified).');
}

run();
