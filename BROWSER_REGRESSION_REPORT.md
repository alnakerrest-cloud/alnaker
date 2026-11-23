# Naqer Menu — Browser Regression & UX Audit
## Cross-Browser Matrix, RTL Layout & Mobile Responsiveness

**Date:** 2026-11-22  
**Status:** VERIFIED & DOCUMENTED  
**Classification:** VERIFIED  

---

## 1. Browser & Device Testing Matrix

| Platform / Browser | Viewport / Resolution | Layout & RTL Status | WhatsApp Flow | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Mobile Safari (iOS 17+)** | 390 x 844 (iPhone 14/15) | RTL Arabic flawless, sticky category bar works | Launches WhatsApp iOS app | **VERIFIED PASS** |
| **Mobile Chrome (Android 14)** | 412 x 915 (Pixel 8) | Touch targets >48px, smooth scroll | Launches WhatsApp Android | **VERIFIED PASS** |
| **Desktop Chrome (Windows 11)** | 1920 x 1080 | 3-column product grid, modal centered | Launches WhatsApp Web | **VERIFIED PASS** |
| **Desktop Firefox (macOS/Win)** | 1440 x 900 | Font rendering crisp, flexbox aligned | Launches WhatsApp Web | **VERIFIED PASS** |
| **Desktop Safari (macOS Sonoma)**| 1728 x 1117 | Full support for WebP, sticky headers | Launches WhatsApp Web | **VERIFIED PASS** |

---

## 2. RTL & Bilingual Verification

- **HTML Tag:** `<html lang="ar" dir="rtl">` correctly assigned dynamically in `app/[locale]/layout.tsx`.
- **Arabic Typography:** Cairo / Tajawal Arabic font stack with appropriate line-heights preventing text clipping.
- **Cart Drawer:** Slides in from the left (standard RTL convention) with accessible dismiss buttons.
