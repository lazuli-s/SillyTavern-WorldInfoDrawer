# New Feature - Encoding Repair Script

Adds a repository script that detects and repairs common mojibake/corrupted-text patterns in text files.

---

## Summary

- Added `scripts/fix-corrupted-text.js`.
- Added npm commands:
  - `npm run fix:encoding:scan` (dry run)
  - `npm run fix:encoding` (write fixes)
- The script scans text files, scores corruption patterns, and only applies fixes when the repaired result is objectively better.

---

## Why This Feature Is Needed

Some files were saved through a mismatched encoding path on Windows, producing broken text like `Ã`, `â`, and `ðŸ` sequences. Manual fixing is slow and error-prone. This script provides a repeatable, safer repair process.

---

## How It Works

- Recursively scans selected paths (default: current folder).
- Skips `.git/`, `node_modules/`, and `vendor/`.
- Targets text extensions by default (`.md`, `.js`, `.json`, `.css`, `.html`, `.yml`, `.yaml`, `.txt`).
- Detects likely corruption patterns.
- Attempts Windows-1252-to-UTF8 repair.
- Applies repair only when:
  - content changed, and
  - corruption score improved.

---

## Usage

```bash
npm run fix:encoding:scan
npm run fix:encoding
node scripts/fix-corrupted-text.js --write .clinerules tasks
```

---

## Files Changed

- `scripts/fix-corrupted-text.js`
- `package.json`

---

## Status

- [x] Script implemented
- [x] npm commands added
- [x] Task documentation created
