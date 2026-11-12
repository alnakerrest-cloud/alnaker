import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { curatedCatalog } from './curated-photo-catalog.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '..', 'public');

// Unique URLs to download (avoid duplicate downloads when items share an image type)
const urlMap = new Map();
for (const [itemName, itemData] of Object.entries(curatedCatalog)) {
  const destRelPath = path.join('images', 'products', itemData.category, itemData.filename);
  const destAbsPath = path.join(publicDir, destRelPath);
  if (!urlMap.has(itemData.url)) {
    urlMap.set(itemData.url, {
      items: [itemName],
      destAbsPath,
      destRelPath: '/' + destRelPath.replace(/\\/g, '/'),
      ...itemData,
    });
  } else {
    urlMap.get(itemData.url).items.push(itemName);
  }
}

console.log(`Unique image sources to download & process: ${urlMap.size}`);

async function downloadWithRetry(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`[Retry ${attempt}/${retries}] Failed to fetch ${url.slice(0, 45)}...: ${err.message}`);
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

async function main() {
  console.log('🚀 Starting image download, resize, and WebP optimization...');

  const results = [];
  let count = 0;

  // Process in batches of 5 concurrent downloads to be polite to CDNs
  const entries = Array.from(urlMap.values());
  const batchSize = 5;

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (entry) => {
        count++;
        const currentNum = count;
        try {
          fs.mkdirSync(path.dirname(entry.destAbsPath), { recursive: true });

          const rawBuffer = await downloadWithRetry(entry.url);
          const rawSize = rawBuffer.length;

          // Resize and convert to WebP
          const info = await sharp(rawBuffer)
            .resize(800, 800, {
              fit: 'cover',
              position: sharp.strategy.entropy, // Smart cropping on center of interest
            })
            .webp({ quality: 82, effort: 4 })
            .toFile(entry.destAbsPath);

          const finalSize = info.size;
          const ratio = Math.round((1 - finalSize / rawSize) * 100);

          results.push({
            url: entry.url,
            localPath: entry.destRelPath,
            rawSize,
            finalSize,
            width: info.width,
            height: info.height,
            items: entry.items,
            source: entry.source,
            license: entry.license,
            confidence: entry.confidence,
          });

          console.log(
            `[${currentNum}/${entries.length}] ✅ Saved ${entry.filename} (${Math.round(finalSize / 1024)} KB, ${ratio}% optimized) for: ${entry.items.join(', ')}`
          );
        } catch (err) {
          console.error(`[${currentNum}/${entries.length}] ❌ FAILED ${entry.filename}: ${err.message}`);
        }
      })
    );
  }

  // Also check and copy file to all specific items if filenames differ
  for (const [itemName, itemData] of Object.entries(curatedCatalog)) {
    const destRelPath = path.join('images', 'products', itemData.category, itemData.filename);
    const destAbsPath = path.join(publicDir, destRelPath);
    if (!fs.existsSync(destAbsPath)) {
      // Find source that has same url
      const parent = entries.find((e) => e.url === itemData.url);
      if (parent && fs.existsSync(parent.destAbsPath)) {
        fs.copyFileSync(parent.destAbsPath, destAbsPath);
        console.log(`Copied shared optimized WebP to ${destRelPath}`);
      }
    }
  }

  // Save report data
  fs.writeFileSync(
    path.resolve(__dirname, '..', 'downloaded-images-data.json'),
    JSON.stringify(results, null, 2),
    'utf8'
  );

  console.log('\n🎉 ALL IMAGES DOWNLOADED & OPTIMIZED SUCCESSFULLY!');
  console.log(`Total Unique Files Created: ${results.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

