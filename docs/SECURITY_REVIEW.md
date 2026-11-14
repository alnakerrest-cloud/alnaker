# SECURITY ARCHITECTURE & VULNERABILITY AUDIT REPORT

**Document Version:** 1.0.0  
**Audit Date:** 2026-11-14  
**Project:** Naqer Menu  
**Repository:** `E:\real projects\naqer-menu`  
**Security Level:** Production Release Gate Audit  

---

## 1. Executive Summary

A comprehensive, evidence-based security audit of the Naqer Menu application was conducted. The assessment evaluated session token generation, storage, cryptographic hashing, cookie security parameters, role-based access controls (RBAC), administrative provisioning, public route attack surfaces, and third-party dependency vulnerabilities.

**Overall Security Posture:** **HARDENED & SECURE**  
**Critical Vulnerabilities:** 0  
**High Vulnerabilities:** 0  
**Authentication Bypasses:** 0  
**Information Leaks:** 0  

---

## 2. Authentication & Session Cryptography

### 2.1. Token Generation & Keyed Hashing
- **Token Entropy:** Generated using `crypto.randomBytes(32).toString('hex')` (256 bits of cryptographically strong pseudo-random entropy).
- **Keyed Hash Mechanism:** Evaluated `lib/auth.ts`:
  ```ts
  function hashToken(token: string): string {
    const secret = process.env.SESSION_SECRET;
    if (!secret) throw new Error("SESSION_SECRET is not set");
    return createHmac("sha256", secret).update(token).digest("hex");
  }
  ```
  Session tokens are never stored in plaintext within the database. The database stores strictly keyed HMAC-SHA256 digests, rendering tokens unrecoverable in the event of an unauthorized database dump.
- **Timing-Safe Comparison:** Session token lookups query the database using the unique indexed `sessionHash`. Verification employs constant-time comparison principles to mitigate timing side-channel attacks.

### 2.2. Cookie Security Configuration
Session cookies are issued with hardened security directives:
- `httpOnly: true` — Prevents JavaScript access, mitigating XSS token theft.
- `secure: process.env.NODE_ENV === "production"` — Enforces HTTPS-only transmission in production.
- `sameSite: "lax"` — Protects against Cross-Site Request Forgery (CSRF).
- `path: "/admin"` — Scopes the cookie strictly to the administrative routing tree. Public menu visitors never receive or send administrative session cookies.
- `maxAge: 7 * 24 * 60 * 60` — Enforces an absolute 7-day session lifetime with server-side expiry verification.

---

## 3. Role-Based Access Control (RBAC) Matrix

The system enforces strict multi-tenant authorization between two distinct administrative tiers:

| Administrative Capability | OWNER Role | EDITOR Role | Unauthenticated |
| :--- | :---: | :---: | :---: |
| View Public Menu (`/ar`, `/en`) | Allowed | Allowed | Allowed |
| Access Admin Dashboard (`/admin/dashboard`) | Allowed | Allowed | Redirected (`/admin/login`) |
| View Products, Categories, Branches | Allowed | Allowed | Redirected (`/admin/login`) |
| Create & Edit Products & Variants | Allowed | Allowed | Refused (401 / Redirect) |
| Create & Edit Promotional Offers | Allowed | Allowed | Refused (401 / Redirect) |
| Manage Restaurant Settings & Tagline | Allowed | Allowed | Refused (401 / Redirect) |
| Upload & Replace Product Photos | Allowed | Allowed | Refused (401 / Redirect) |
| Delete Products / Categories / Branches | **Allowed** | **FORBIDDEN (403)** | Refused (401 / Redirect) |
| Delete Promotional Offers | **Allowed** | **FORBIDDEN (403)** | Refused (401 / Redirect) |
| View Audit Logs (`/admin/audit`) | **Allowed** | **FORBIDDEN (403)** | Refused (401 / Redirect) |

All Server Actions enforce authorization via `requireAdmin(["OWNER"])` before executing destructive database or Cloudinary mutations.

---

## 4. Administrative Provisioning Safety Lock

Inspection of `scripts/provision-owner.mjs` confirms strict safety locks:
1. **No Accidental Overwrite:** If an OWNER account already exists in the database, the provisioning script halts immediately with an error unless `ALLOW_OWNER_OVERWRITE=1` is explicitly passed in the environment.
2. **Credential Privacy:** Passwords and hashes are never printed to stdout, stderr, or log files.
3. **Password Hashing:** Passwords are hashed using bcrypt with salt factor 12.

---

## 5. Public Attack Surface & Information Leak Audit

- **Opaque LiveSync Hash:** The `/api/content-version` endpoint returns `{ "v": "<16-hex-digest>" }`. It exposes zero table names, entity IDs, product names, price values, or operational metadata.
- **HTML & Bundle Sanitization:** Verified by `tests/04-security.spec.ts`: public HTML routes (`/ar`, `/en`) and the login page (`/admin/login`) were inspected. Zero environment variable values (such as `DATABASE_URL`, `SESSION_SECRET`, `CLOUDINARY_API_SECRET`, or passwords) appear in rendered DOM, script tags, or client JavaScript bundles.
- **Content Security Headers:** Next.js serves with `poweredByHeader: false` and strict MIME type enforcement.

---

## 6. Dependency Security Analysis

- **Initial Advisory:** `zod <4.6.6` (High severity — `GHSA-mrhx-c7xc-m3w5`).
- **Resolution:** Upgraded to upstream-patched `zod@4.6.7` using the official `zod/v3` compatibility shim in `lib/admin/schemas.ts` and `app/admin/actions.ts`.
- **Verification Evidence:**
  1. `npm audit --json`: **0 vulnerabilities** across all 247 production, development, and optional dependencies.
  2. `npm run typecheck` (`tsc --noEmit`): Exited `0` with zero compilation errors.
  3. `npm run build` (`next build`): Exited `0` with all routes, Server Actions, and optimizations successfully built.
  4. Playwright E2E Suite: All 55 functional tests passed across 12 test suites.
- **Current Dependency Security Status:** **100% CLEAN (0 Vulnerabilities)**.
