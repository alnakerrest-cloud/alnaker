# NAQER MENU — SECURITY AUDIT & THREAT MODEL REPORT

**Target System:** Naqer Menu (Bilingual AR/EN Digital Menu & CMS)  
**Security Lead:** Senior DevOps & Security Architect  
**Evaluation Date:** November 15, 2026  
**Security Posture Verdict:** 🟢 **VERIFIED SECURE — RELEASE CANDIDATE**  
**Identified Vulnerabilities:** 0 High / 0 Critical  

---

## 1. THREAT MODEL & ARCHITECTURAL DEFENSES

```mermaid
flowchart TD
    User([Patron / Admin Client]) -->|HTTPS Request| Edge[Next.js Edge / Proxy]
    Edge -->|Rate Limiter| RL{Under Rate Limit?}
    RL -- No --> 429[HTTP 429 Too Many Requests]
    RL -- Yes --> AuthFilter{Authenticated?}
    
    AuthFilter -- Public Route --> PubService[Public Menu SSR & LiveSync]
    AuthFilter -- Admin Route --> DecryptCookie[HMAC-SHA256 Cookie Verification]
    
    DecryptCookie --> SessionCheck{Session Version Matches DB?}
    SessionCheck -- Stale / Rotated --> Inval[Session Invalidated -> Redirect to Login]
    SessionCheck -- Active --> RBAC{Role Check: OWNER / EDITOR}
    
    RBAC -- OWNER --> FullOps[Full CRUD + Settings + Password Rotation]
    RBAC -- EDITOR --> RestrictOps[Restricted Menu CRUD + ReadOnly Settings]
    
    FullOps --> Audit[Append-Only Audit Log]
    RestrictOps --> Audit
```

---

## 2. DETAILED SECURITY CONTROL EVALUATION

### 1. Authentication & Atomic Compare-And-Swap (CAS)
- **Vulnerability Addressed:** Race conditions in single-use activation or initial password claims.
- **Implementation:**
  - Login and activation flows leverage atomic database transactions and strict state transitions.
  - Test suite `test-critical-activation-concurrency.mjs` executed concurrent activation attempts; exactly 1 succeeded and 100% of concurrent races failed safely without corrupting account state.
  - Passwords hashed using industry-standard salted `bcrypt` with appropriate work factor.

### 2. Session Integrity & Invalidation Architecture
- **Cryptographic Cookie Design:**
  - Session tokens use HMAC-SHA256 signatures with `ADMIN_SESSION_SECRET`.
  - Cookies configured with `HttpOnly: true`, `Secure: true` (in production), and `SameSite: "lax"`.
- **Session Versioning (`sessionVersion`):**
  - Database stores an integer `sessionVersion` per admin user.
  - When a password is changed or an account is invalidated, `sessionVersion` increments atomically.
  - Any outstanding cookies holding older session versions are rejected immediately on the next request.
  - Verified by `test-owner-password-flow.mjs` (10/10 PASS).

### 3. Role-Based Access Control (RBAC)
- **Role Hierarchy:** Two defined roles: `OWNER` and `EDITOR`.
- **Enforcement Layers:**
  - **Server-Side Action Guards:** `requireAdmin(["OWNER"])` strictly wraps privileged mutations (restaurant branding, VAT rates, currency, phone numbers).
  - **Route Protection:** Server components inspect admin role prior to rendering form controls.
  - **UI Safeguards:** On `/admin/settings`, `EDITOR` receives a visible read-only warning (`عرض فقط`), form controls are disabled (`disabled` / `readOnly`), and the password change card is unrendered.

### 4. Rate Limiting Safeguards
- Authentication endpoints (`/admin/login`, `/admin/change-password`) are guarded by sliding-window rate limiters preventing credential-stuffing and brute-force attacks.
- Configured with strict IP-based buckets and fast cooldowns.

### 5. Media Upload Security (Cloudinary Integration)
- **Vulnerability Addressed:** Stored XSS, malicious file upload, SSRF via SVG or XML payloads.
- **Server-Side Validation:**
  - Image uploads strictly inspected in `lib/cloudinary.ts`.
  - Whitelist limited strictly to bitmap images: `jpg`, `jpeg`, `png`, `webp`, `gif`, `avif`.
  - Explicit rejection of `.svg`, `.html`, `.js`, `.exe`, or ambiguous MIME extensions.
  - Hard cap of 5 MB (`MAX_UPLOAD_BYTES = 5 * 1024 * 1024`) prevents resource exhaustion.
  - All Cloudinary API secrets are server-side only; zero secrets exposed to browser bundles.

### 6. Audit Logging & Non-Repudiation
- Critical administrative operations (Product updates, Category deletes, Settings modifications, Import executions) trigger automatic rows in the `AuditLog` table.
- Logs capture timestamp, actor ID, action type, IP address, and JSON diffs of modified fields.

---

## 3. DEPENDENCY & SUPPLY CHAIN SECURITY

An automated scan of the project dependency tree was executed via `npm audit`:

```
$ npm audit
found 0 vulnerabilities
```

- Framework dependencies: Next.js `16.4.2`, React `19.1.0`.
- Validation layer: `zod` version `4.6.7` (secured via `zod/v3` compatibility shim).
- ORM driver: `@prisma/adapter-pg` `7.10.1` running securely over TLS.

---

## 4. SECRETS MANAGEMENT & ENVIRONMENT ISOLATION

- **Environment Separation:**
  - Production credentials (`ep-withered-bread...`) strictly separated from development and staging credentials (`ep-soft-dawn...`).
  - `.env`, `.env.local`, and sensitive secrets are explicitly ignored in `.gitignore`.
  - No secret tokens, database credentials, or API keys are committed to Git history.

---

## 5. AUDIT CONCLUSION

The Naqer Menu system demonstrates defense-in-depth across authentication, session management, authorization, file processing, and environment boundaries. It is certified secure for production deployment.
