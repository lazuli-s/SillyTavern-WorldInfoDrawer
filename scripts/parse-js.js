const fs = require('fs');
const vm = require('vm');

const files = ['src/index.js', 'src/Settings.js'];
const errors = [];

for (const file of files) {
  try {
    const code = fs.readFileSync(file, 'utf8');
    new vm.Script(code, { filename: file });
    console.log(`Parsed OK: ${file}`);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      errors.push(`Missing file: ${file}`);
    } else {
      errors.push(`Syntax error in ${file}: ${error.message}`);
    }
  }
}

if (errors.length > 0) {
  for (const message of errors) {
    console.error(message);
  }
  process.exit(1);
}
