import fs from 'fs';
const buf = fs.readFileSync('50500.pdf').toString('latin1');
const matches = buf.match(/[a-zA-Z]{4,}/g) || [];
console.log('Total latin words in 50500.pdf:', matches.length);
console.log('Sample latin words:', [...new Set(matches)].slice(0, 40));
