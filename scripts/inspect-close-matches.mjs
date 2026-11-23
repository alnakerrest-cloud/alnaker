import { curatedCatalog } from './curated-photo-catalog.mjs';

console.log('--- Close Match or Signature Presentation items ---');
for (const [name, item] of Object.entries(curatedCatalog)) {
  if (item.confidence !== 'Exact Match') {
    console.log(`- ${name} (${item.category}): [${item.confidence}] ${item.type} | URL: ${item.url}`);
  }
}
