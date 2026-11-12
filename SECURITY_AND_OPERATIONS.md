# Naqer Menu — Security & Operations Manual

This document details security guardrails, production operating standards, and access policies for the Naqer Menu digital ordering platform.

---

## 1. Authentication & Session Security Architecture

- **Password Hashing:** Passwords are encrypted using `bcryptjs` with 12 computational rounds.
- **Session Tokens:**
  - Administrative session tokens are generated using 32 cryptographically secure random bytes (`crypto.randomBytes(32)`).
  - Raw session tokens are never stored in the database. Only the SHA-256 hash (`tokenHash`) is persisted.
  - Even in the event of an unauthenticated database dump, active sessions cannot be forged or hijacked.
- **Session Cookie Attributes:**
  - `httpOnly: true` (Prevents XSS extraction via JavaScript).
  - `secure: true` (Strict HTTPS enforcement in production).
  - `sameSite: "lax"` (Mitigates CSRF vulnerabilities).
  - `path: "/"`
  - `maxAge: 7 days` (604,800 seconds).

---

## 2. Server-Side Authorization (RBAC)

The application implements strict role-based access control inside Server Actions and Route Handlers:

- **Authentication Guard (`requireAdmin()`):**
  - Validates session existence and expiration date in database.
  - Automatically deletes expired sessions.
  - Checks if user account `isActive === true`.
- **Permission Boundaries:**
  - `OWNER`: Full read/write access to all resources including `/admin/branches`, `/admin/settings`, `/admin/audit`, and user roles.
  - `EDITOR`: Restricted strictly to `/admin/products`, `/admin/categories`, and `/admin/offers`. Any attempt to access or modify settings/branches results in an immediate `FORBIDDEN` exception (HTTP 403).

---

## 3. Data Protection & Secret Sanitization

- **No Public Leaks:** The public API endpoint `/api/content-version` exposes only a 16-character content hash without revealing table names, row IDs, or server internals.
- **Environment Isolation:** Secrets are isolated to server environments. Never prefix backend credentials (`DATABASE_URL`, `SESSION_SECRET`, `CLOUDINARY_API_SECRET`) with `NEXT_PUBLIC_`.
- **Automated Secret Leak Checks:** Verified via Playwright automated test `tests/04-security.spec.ts` ensuring 0 environment variables appear in HTML markup or client bundles.

---

## 4. Input Sanitization & Upload Safety

- **Form Validation:** All mutating requests pass through Zod schemas with strict type and boundary constraints (`lib/admin/schemas.ts`).
- **Media Upload Guardrails:**
  - Cloudinary uploads require authenticated sessions.
  - Allowed image MIME types: `image/jpeg`, `image/png`, `image/webp`.
  - Max upload file size: 5 MB.
- **Cart Reconciler (`reconcileCart`):**
  - Prices submitted by the client are ignored; unit prices are re-fetched authoritatively from the database.
  - Quantities are floored to integers and bounded to `[1, 99]`.
  - Add-ons are validated against existing database `optionGroups`.

---

## 5. Operations & Incident Response

1. **Compromised Account:**
   - In PostgreSQL or via OWNER dashboard, set `AdminUser.isActive = false`.
   - All active sessions for that user will immediately fail validation on their next request.
2. **Emergency Session Invalidation:**
   - Execute: `DELETE FROM "Session";` in the database to log out all users instantly.
3. **Database Connection Errors:**
   - The database layer includes exponential retry logic (`withDbRetry`) to handle transient cold-start connection delays on serverless PostgreSQL (e.g. Neon compute wake-up).

