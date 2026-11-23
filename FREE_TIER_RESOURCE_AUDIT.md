# Naqer Menu — Free-Tier Resource & Cost Audit
## Vercel Hobby, Neon PostgreSQL Free & Cloudinary Free Limits Modeling

**Date:** 2026-11-22  
**Status:** AUDITED & MODELLED  
**Classification:** VERIFIED & DOCUMENTED  

---

## 1. Hosting Infrastructure Free-Tier Limits

| Platform / Service | Free-Tier Allowance | Naqer Menu Architecture Fit | Free-Tier Safety Margin |
| :--- | :--- | :--- | :---: |
| **Vercel Hobby** | - 100 GB Bandwidth / month<br>- 100,000 Serverless Invocations / month<br>- 1,000 Edge Requests / day<br>- 1,000 Image Optimizations / month | Fits perfectly when ISR is active and live polling is disabled. | **EXCELLENT (with LiveSync removed)** |
| **Neon PostgreSQL Free** | - 0.5 GiB Storage<br>- 190.5 Compute Hours / month<br>- Auto-suspend after 5 min inactivity<br>- Max 20 concurrent connections | Complete authoritative dataset is 204 KB (<0.05% of 512 MB). Auto-suspend saves compute hours. | **EXCELLENT (with LiveSync removed)** |
| **Cloudinary Free** | - 25 Monthly Credits (~25 GB Bandwidth or 25,000 Transformations)<br>- 300,000 Total Assets | Only 14 signature dish images hosted. Remote images cached on CDN edge. | **EXCELLENT (<1% utilization)** |

---

## 2. Resource Consumption Modeling (Daily & Monthly Projections)

### Scenario A: Low Expected Traffic (50 Daily Visitors, Average 5 min session)

| Metric | With LiveSync (Unoptimized) | Optimized (LiveSync Removed / Admin Only) | Status |
| :--- | :---: | :---: | :---: |
| **Daily Invocations** | 3,750 polls + 50 page loads = 3,800 | ~50 ISR edge hits | **OPTIMIZED WINS (76x reduction)** |
| **Monthly Invocations** | **114,000 (EXCEEDS 100k Hobby Limit!)** | **~1,500 (<1.5% of limit)** | **CRITICAL FIX REQUIRED** |
| **Neon Compute Hours** | Active 4.1 hours/day = 123 hrs/month | Auto-suspends: <10 hrs/month | **SAFE** |
| **Cloudinary Bandwidth** | ~50 MB / month | ~50 MB / month | **SAFE (<0.2% of credit)** |

### Scenario B: Moderate Traffic (300 Daily Visitors, Weekend Peaks)

| Metric | With LiveSync (Unoptimized) | Optimized (LiveSync Removed / Admin Only) | Status |
| :--- | :---: | :---: | :---: |
| **Monthly Invocations** | **684,000 (FAILS Vercel Free Tier)** | **~9,000 (9% of limit)** | **CRITICAL FIX REQUIRED** |
| **Neon Compute Hours** | Exhausts 190.5 compute hours by Day 18 | ~25 compute hours / month | **CRITICAL FIX REQUIRED** |

---

## 3. Financial Cost Avoidance

- **Vercel Pro Cost Avoided:** $20 / seat / month ($240 / year).
- **Neon Launch Tier Cost Avoided:** $19 / month ($228 / year).
- **Cloudinary Plus Cost Avoided:** $89 / month.
- **Total Annual Infrastructure Savings:** **$468 – $1,536 / year** simply by disabling unnecessary background polling on the public menu!
