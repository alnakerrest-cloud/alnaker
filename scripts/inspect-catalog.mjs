import { curatedCatalog } from './curated-photo-catalog.mjs';

const keys = Object.keys(curatedCatalog);
console.log('Total entries in curatedCatalog:', keys.length);

const sources = {};
const licenses = {};
const confidences = {};

keys.forEach(k => {
  const item = curatedCatalog[k];
  const src = item.source ? item.source.split('(')[0].trim() : 'Unknown';
  sources[src] = (sources[src] || 0) + 1;
  const lic = item.license || 'Unknown';
  licenses[lic] = (licenses[lic] || 0) + 1;
  const conf = item.confidence || 'Unknown';
  confidences[conf] = (confidences[conf] || 0) + 1;
});

console.log('Sources breakdown:', sources);
console.log('Licenses breakdown:', licenses);
console.log('Confidence breakdown:', confidences);
