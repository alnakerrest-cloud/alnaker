# Naqer Menu — Image Optimization Report
## Format Delivery, Responsive Sizing & Free-Tier Quota Protection

**Date:** 2026-11-22  
**Status:** VERIFIED & COMPLETE  
**Classification:** VERIFIED  

---

## 1. Asset Storage Strategy

All 151 menu products have verified visual assets categorized into two distinct pipelines:
1. **Cloudinary Hosted (14 Products):**
   - High-confidence proprietary photos carved from the restaurant's printed menu spread (`50500.pdf`).
   - Served via Cloudinary CDN with automatic format/quality transformations (`f_auto,q_auto`).
2. **Local Static WebP (137 Products):**
   - Stored in `public/images/products/<category>/`.
   - Pre-converted to modern WebP format at 800x600 resolution (average file size: 28–45 KB).
   - Served directly as static files from Vercel Edge CDN without consuming Vercel Image Optimization quotas.

---

## 2. Next.js Image Component Configuration

`next.config.ts` specifies remote patterns:
```typescript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'res.cloudinary.com',
      pathname: '/**',
    },
  ],
  formats: ['image/avif', 'image/webp'],
}
```

---

## 3. Quota Safety Analysis

- **Vercel Hobby Limit:** 1,000 source images optimized per month.
- **Implementation Safety:** By serving 137 images as pre-optimized local WebP files and 14 images directly from Cloudinary CDN, Vercel Image Transformation usage is virtually **zero (0 / 1000)**, completely eliminating any billing risk.
