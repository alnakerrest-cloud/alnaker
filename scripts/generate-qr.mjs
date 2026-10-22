// Generates print-ready QR files (SVG + 2048px PNG) for the menu.
// Usage:  NEXT_PUBLIC_SITE_URL=https://your-domain.com npm run qr
//     or: node scripts/generate-qr.mjs https://your-domain.com
import { mkdir, writeFile } from 'node:fs/promises';
import QRCode from 'qrcode';

const site = (process.argv[2] ?? process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
if (!site) {
  console.error('Pass the site URL: node scripts/generate-qr.mjs https://your-domain.com');
  process.exit(1);
}

const target = `${site}/?src=qr`;
const opts = { errorCorrectionLevel: 'H', margin: 2, color: { dark: '#5C2A26', light: '#FFFFFF' } };

await mkdir('public/qr', { recursive: true });
await writeFile('public/qr/naqer-menu-qr.svg', await QRCode.toString(target, { ...opts, type: 'svg' }));
await QRCode.toFile('public/qr/naqer-menu-qr.png', target, { ...opts, width: 2048 });

console.log(`QR for ${target}\n  -> public/qr/naqer-menu-qr.svg\n  -> public/qr/naqer-menu-qr.png`);
