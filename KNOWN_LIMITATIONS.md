# KNOWN LIMITATIONS & ARCHITECTURAL BOUNDARIES

This document transparently records the deliberate architectural decisions, platform constraints, and operational boundaries of **Naqer Menu**.

---

## 1. Intentional Architectural Scope Boundaries

Naqer Menu was engineered to be exceptionally lightweight, fast, and hosted on zero-overhead or minimal-tier infrastructure. The following capabilities are **intentionally excluded**:

| Feature | Status | Architectural Rationale |
| :--- | :---: | :--- |
| **In-App Payment Gateway** | Excluded | Eliminates PCI-DSS compliance requirements, payment processing commissions, and merchant gateway overhead. Customers order via WhatsApp and settle via Cash on Delivery or in-person. |
| **Realtime Driver / GPS Tracking** | Excluded | Avoids expensive persistent background telemetry, continuous mobile GPS pings, third-party mapping subscriptions (Google Maps API / Mapbox), and server polling overhead. |
| **WebSockets / Server-Sent Events (SSE)** | Excluded | Serverless hosting (Vercel) terminates long-lived connections. Eliminates the cost of dedicated WebSocket brokers (e.g. Pusher, Ably) and prevents serverless concurrency lockouts. |
| **Internal Order State Machine / Kitchen Display** | Excluded | Orders are dispatched directly into WhatsApp conversations managed by restaurant dispatchers. No background order database polling is required. |

---

## 2. Operational & Technical Limits

### WhatsApp URL Length Bounds
- WhatsApp dispatches customer orders via deep-links (`https://wa.me/[phone]?text=[encoded_summary]`).
- Desktop browsers and mobile WhatsApp clients comfortably parse URLs up to ~2,000 characters.
- **Limit:** Orders containing more than 35-40 distinct items with extensive modifier notes may approach URL length limits on legacy mobile browsers. The checkout system automatically optimizes string spacing and summarizes items cleanly to prevent truncation.

### Neon Serverless PostgreSQL Auto-Suspend
- Neon Serverless Postgres pauses compute instances after ~5 minutes of zero database queries to conserve resources.
- **Behavior:** The very first cold-start visitor after a prolonged inactivity period may experience a brief ~500ms connection wake-up latency. Subsequent queries execute in sub-10ms.
- **Mitigation:** High-traffic static pages and menu queries benefit from Next.js caching and static generation, mitigating database queries during normal browsing.

### Cloudinary Free Tier Resource Quotas
- Cloudinary free tier accounts include 25 Monthly Credits (approx. 25,000 transformations or 25 GB storage/bandwidth).
- **Behavior:** 137 of the 151 product images are stored locally in the Next.js bundle as highly compressed WebP files (`public/images/products/`). Only 14 heritage scans and new dynamically uploaded images utilize Cloudinary, ensuring monthly consumption remains well below free-tier limits.

### Local Browser Offline Storage
- The customer shopping cart is persisted in browser `localStorage`.
- **Behavior:** If a customer switches from mobile browser to desktop or clears their browser history, the active shopping cart does not automatically synchronize across devices.

---

## 3. Maintenance & Scalability Recommendations

1. **Catalog Growth:** If the menu expands beyond 500 products, implement paginated table queries in the Admin Dashboard products table.
2. **High-Concurrence Promotions:** During high-volume marketing campaigns (e.g. Ramadan promotions), consider upgrading the Neon compute branch to prevent auto-suspending and enable Neon connection pooling (`-pooler` connection string).
