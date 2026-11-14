import dotenv from 'dotenv';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import https from 'https';
dotenv.config({ path: '.env.local' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

function checkUrl(url) {
  return new Promise((resolve) => {
    https.get(url, { method: 'HEAD' }, (res) => {
      resolve({ url, status: res.statusCode });
    }).on('error', (err) => {
      resolve({ url, status: 'ERROR', error: err.message });
    });
  });
}

async function verifyImages() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT pi.id, pi."productId", pi.url, pi."publicId", pi."isPrimary", p."nameAr"
      FROM "ProductImage" pi
      JOIN "Product" p ON pi."productId" = p.id
      ORDER BY pi.id
    `);

    const images = res.rows;
    console.log(`Auditing ${images.length} product images...`);

    const cloudinaryImages = images.filter(i => i.url.startsWith('https://res.cloudinary.com'));
    const localImages = images.filter(i => i.url.startsWith('/images/'));
    const otherImages = images.filter(i => !i.url.startsWith('https://res.cloudinary.com') && !i.url.startsWith('/images/'));

    console.log(`Cloudinary images count: ${cloudinaryImages.length}`);
    console.log(`Local images count: ${localImages.length}`);
    console.log(`Other images count: ${otherImages.length}`);

    // Check Cloudinary HTTP status
    console.log("Checking Cloudinary HTTP HEAD reachability for all Cloudinary images...");
    const cloudinaryChecks = await Promise.all(cloudinaryImages.map(img => checkUrl(img.url)));
    const cldStatusCounts = {};
    for (const c of cloudinaryChecks) {
      cldStatusCounts[c.status] = (cldStatusCounts[c.status] || 0) + 1;
    }
    console.log("Cloudinary HTTP Status breakdown:", cldStatusCounts);

    // Check local files on disk
    console.log("Checking local filesystem presence in public/ folder...");
    let localFound = 0;
    let localMissing = 0;
    const missingSamples = [];
    for (const img of localImages) {
      const diskPath = path.join(process.cwd(), 'public', img.url);
      if (fs.existsSync(diskPath)) {
        localFound++;
      } else {
        localMissing++;
        if (missingSamples.length < 5) missingSamples.push({ name: img.nameAr, url: img.url, diskPath });
      }
    }
    console.log(`Local files on disk: ${localFound} found, ${localMissing} missing`);
    if (missingSamples.length > 0) {
      console.log("Missing samples:", missingSamples);
    }

    // Check for duplicate URLs across different products
    const urlMap = new Map();
    for (const img of images) {
      const list = urlMap.get(img.url) || [];
      list.push(img);
      urlMap.set(img.url, list);
    }
    const duplicates = [];
    for (const [url, list] of urlMap.entries()) {
      if (list.length > 1) {
        duplicates.push({ url, count: list.length, products: list.map(x => x.nameAr) });
      }
    }
    console.log(`Images shared/duplicated across products: ${duplicates.length}`);
    if (duplicates.length > 0) {
      console.log("Shared image URLs samples:", duplicates.slice(0, 5));
    }

  } finally {
    client.release();
    await pool.end();
  }
}

verifyImages().catch(err => {
  console.error("Image verification error:", err);
  process.exit(1);
});
