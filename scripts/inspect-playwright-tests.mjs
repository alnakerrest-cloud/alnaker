import fs from 'fs';

const content = fs.readFileSync('scripts/qa-browser-e2e.mjs', 'utf8');
const lines = content.split('\n');

const tests = [];
const regex = /await\s+test\s*\(\s*["'`]([^"'`]+)["'`]/g;
let match;
while ((match = regex.exec(content)) !== null) {
  tests.push(match[1]);
}
console.log(`\nFound ${tests.length} Playwright test definitions in qa-browser-e2e.mjs:`);
tests.forEach((t, i) => console.log(`${i+1}. ${t}`));


// Check browser launch options
const browserLines = lines.filter(l => l.includes('chromium.launch') || l.includes('newContext') || l.includes('viewport'));
console.log('\n--- Browser launch / context configuration ---');
browserLines.forEach(l => console.log(l.trim()));
