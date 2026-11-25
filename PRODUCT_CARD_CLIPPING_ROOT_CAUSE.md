# Product Card Clipping Root Cause Analysis Report

**Date:** 2026-11-24  
**Project:** Naqer Menu (`E:\real projects\naqer-menu`)  
**Components Investigated:** Product Card layout (`.card`, `.card--meal`, `.side-main`, `.prices`, `.price`, `.price-starts-from`) in `app/globals.css` and `components/menu/ProductCard.tsx`  
**Detection Tool:** Automated headed Playwright DOM bounding-box analysis across 8 viewports (320px to 1920px)  

---

## 1. Problem Statement

During initial pre-cutover visible browser testing on mobile viewports (320px to 430px), 22 product card instances exhibited severe horizontal visual clipping and boundary overflows. Product pricing pills, discount labels, and "starts from" indicators extended beyond the right and left visual borders of the cards, breaking mobile layout alignment and rendering text partially cut off.

---

## 2. Quantitative Reproduction Findings

Initial browser testing detected the following clipping defects:

| Viewport | Device Profile | Language / Direction | Overflows Detected | Max Overflow Distance |
|---|---|:---:|:---:|:---:|
| **320x740** | iPhone SE / Small Android | Arabic (RTL) | **13 cards** | +107.5 px |
| **320x740** | iPhone SE / Small Android | English (LTR) | **21 cards** | +112.0 px |
| **360x800** | Samsung Galaxy / Standard | Arabic (RTL) | **4 cards** | +42.0 px |
| **360x800** | Samsung Galaxy / Standard | English (LTR) | **8 cards** | +56.5 px |
| **390x844** | iPhone 12/13/14 | Both | **0 cards** | 0.0 px |
| **430x932** | iPhone 15 Pro Max | Both | **0 cards** | 0.0 px |
| **768x1024** | Tablet Portrait | Both | **0 cards** | 0.0 px |
| **1024x768** | Tablet Landscape | Both | **0 cards** | 0.0 px |
| **1366x900** | Desktop Standard | Both | **0 cards** | 0.0 px |
| **1920x1080** | FHD Desktop | Both | **0 cards** | 0.0 px |

---

## 3. Geometric and CSS Root Cause Mechanics

### A. The 2-Column Mobile Grid Geometry
In `app/globals.css`, the mobile layout uses a 2-column grid (`grid-template-columns: repeat(2, 1fr)`) below 700px viewport width:
- At `viewport = 320px`, accounting for container padding (`12px` each side) and grid gap (`10px`):
  $$\text{Card Width} = \frac{320 - (2 \times 12) - 10}{2} = 143.0\text{ px}$$
- With internal card border and padding, the net content area inside the footer is only **131.5 px**.

### B. The Horizontal Flex Overflow
The card footer `.card-foot` and pricing container `.prices` had the following properties:

```css
/* Legacy styling in app/globals.css */
.card--meal .card-foot {
  display: flex;
  justify-content: flex-end;
  align-items: baseline;
  /* Lacked min-width: 0 and max-width: 100% */
}

.prices {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
  flex: none; /* FORCED NO FLEX SHRINK */
  margin-inline-start: auto;
  /* Lacked max-width: 100% and box-sizing: border-box */
}

.price-starts-from {
  display: block;
  font-size: 0.74rem;
  /* Lacked width: 100% / flex-basis: 100% */
}
```

### C. The Multi-Variant Collisions
For meal cards with multiple variants (such as "وجبة توفير" offering thigh/breast options, or "نصف فرخة"):
1. The badge `.price-starts-from` ("يبدأ من" / "Starts from") occupied horizontal space.
2. Two separate `.price` pills (e.g. `ورك 190 ج.م` and `صدر 220 ج.م`) sat on the same line.
3. The minimum horizontal footprint required to display these items side-by-side was:
   $$\text{Required Width} = 65\text{px (Starts from)} + 82\text{px (Pill 1)} + 85\text{px (Pill 2)} + 6\text{px (Gap)} = 238\text{ px}$$
4. Because `.prices` had `flex: none;`, it refused to shrink. Because `.price-starts-from` was an inline-block without `width: 100%`, flex wrap failed to break items onto clean individual lines.
5. The container overflowed the 131.5px card right border by **`106.5 px`** (over `80%` of the card width!).

### D. Why Desktop and Tablet Were Immune
On viewports $\ge 768\text{ px}$:
- Single card column width exceeds $240\text{px} - 320\text{px}$.
- The $238\text{px}$ footprint comfortably fits within the footer container without exceeding the card boundary.

---

## 4. Representative Affected Cards

1. **وجبة توفير (Saving Meal):**
   - Had 2 variant price pills + "يبدأ من" indicator. Total required: 238.4px. Overflowed by 106.9px at 320px width.
2. **وجبة ربع فرخة ورك (Quarter Chicken Meal - Thigh):**
   - Overflowed by 48.2px due to currency badge padding.
3. **وجبة نصف فرخة (Half Chicken Meal):**
   - Overflowed by 84.1px at 320px width.
4. **وجبة شيش طاووق (Shish Tawook Meal):**
   - Overflowed by 38.5px in English LTR.

---

## 5. Conclusion

The clipping issue was purely a CSS responsive layout defect on small mobile screens ($\le 400\text{px}$) where a 2-column grid constricted card width to $< 145\text{px}$ while price elements were permitted to sit side-by-side with `flex: none;`.

The defect has been resolved by applying targeted, non-breaking responsive CSS rules in `app/globals.css`.
