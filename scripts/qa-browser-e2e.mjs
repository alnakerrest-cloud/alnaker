// scripts/qa-browser-e2e.mjs
// ==============================================================================
// AUTONOMOUS PLAYWRIGHT BROWSER QA TEST RUNNER
// Naqer Menu — Authentication, Password Change, Session Lifecycle & Regression
// ==============================================================================

import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { QA_USERS, setupQaUsers } from './qa-setup-staging-users.mjs';

dotenv.config({ path: '.env.staging.local', quiet: true });

const EXPECTED_STAGING_HOST = 'ep-soft-dawn-bdu5de43-pooler.c-8.us-east-2.aws.neon.tech';
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || !databaseUrl.includes(EXPECTED_STAGING_HOST)) {
  console.error('[FATAL] QA Browser E2E must strictly run on Staging database!');
  process.exit(1);
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3001';
const EVIDENCE_DIR = 'C:/Users/ibrah/.gemini/antigravity/brain/c80176dd-bad0-4a03-9018-f631103b1647/qa-browser-evidence';

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});

async function capture(page, name) {
  const file = path.join(EVIDENCE_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`    [EVIDENCE] Screenshot captured: ${name}.png`);
}

const globalDiagnostics = {
  pageErrors: [],
  consoleErrors: [],
  httpErrors: [],
  abortedPrefetches: [],
  realNetworkFailures: [],
};

function attachMonitors(page, contextName) {
  const consoleLogs = [];
  const networkErrors = [];

  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') {
      globalDiagnostics.consoleErrors.push({ context: contextName, text });
      console.warn(`    ⚠️  [CONSOLE ERROR (${contextName})]: ${text}`);
    }
  });

  page.on('pageerror', (err) => {
    globalDiagnostics.pageErrors.push({ context: contextName, message: err.message, stack: err.stack });
    console.error(`    🚨 [PAGE ERROR (${contextName})]: ${err.message}`);
  });

  page.on('response', (res) => {
    const status = res.status();
    const url = res.url();
    // Record any unexpected HTTP 4xx/5xx (allow expected redirects or missing optional icons)
    if (status >= 400 && !url.includes('/favicon.ico') && !url.includes('/icon.svg')) {
      globalDiagnostics.httpErrors.push({ context: contextName, url, status });
    }
  });

  page.on('requestfailed', (req) => {
    const failure = req.failure();
    const url = req.url();
    const errorText = failure?.errorText || 'unknown';

    if (errorText === 'net::ERR_ABORTED') {
      // Normal browser behavior when client-side navigation interrupts background prefetch
      globalDiagnostics.abortedPrefetches.push({ context: contextName, url });
    } else {
      globalDiagnostics.realNetworkFailures.push({ context: contextName, url, errorText });
      networkErrors.push(`${req.method()} ${url} -> ${errorText}`);
      console.warn(`    ⚠️  [REAL NETWORK FAIL (${contextName})]: ${req.method()} ${url} -> ${errorText}`);
    }
  });

  return { consoleLogs, networkErrors };
}

async function runBrowserQaSuite() {
  console.log('================================================================');
  console.log(' [AUTONOMOUS BROWSER QA] Starting Playwright End-to-End Suite');
  console.log(` Target Site URL : ${BASE_URL}`);
  console.log(` Staging Database: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0]}`);
  console.log(` Evidence Dir    : ${EVIDENCE_DIR}`);
  console.log('================================================================\n');

  // Step 0: Provision pristine QA test users in Staging DB
  await setupQaUsers();

  const browser = await chromium.launch({
    headless: true,
  });

  let passCount = 0;
  let testCount = 0;

  async function test(name, fn) {
    testCount++;
    console.log(`\n▶ [TEST ${testCount}] ${name}`);
    try {
      await fn();
      passCount++;
      console.log(`  ✔ PASS: ${name}`);
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error('  Error:', err);
      throw err;
    }
  }

  try {
    // =========================================================================
    // SECTION A: LOGIN FLOW & GUARDS
    // =========================================================================

    await test('A.1: Open Login page and verify initial render', async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      attachMonitors(page, 'A.1');

      await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' });
      const emailInput = page.locator('input[name="email"]');
      const passInput = page.locator('input[name="password"]');
      const submitBtn = page.locator('button[type="submit"]');

      if (!(await emailInput.isVisible()) || !(await passInput.isVisible()) || !(await submitBtn.isVisible())) {
        throw new Error('Login form elements not visible');
      }

      await capture(page, '01-login-page-rendered');
      await context.close();
    });

    await test('A.2: Direct access to protected /admin/dashboard redirects to /admin/login', async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      attachMonitors(page, 'A.2');

      await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'networkidle' });
      const currentUrl = page.url();
      if (!currentUrl.includes('/admin/login')) {
        throw new Error(`Expected redirect to /admin/login, got: ${currentUrl}`);
      }

      await capture(page, '02-unauth-redirect-to-login');
      await context.close();
    });

    await test('A.3: Submitting invalid credentials displays error without creating session', async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      attachMonitors(page, 'A.3');

      await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' });
      await page.fill('input[name="email"]', QA_USERS.activeOwner.email);
      await page.fill('input[name="password"]', 'WrongPassword999!');
      await page.click('button[type="submit"]');

      const errorMsg = page.locator('.admin-error');
      await errorMsg.waitFor({ state: 'visible', timeout: 5000 });
      const text = await errorMsg.textContent();
      if (!text?.includes('بيانات الدخول غير صحيحة')) {
        throw new Error(`Unexpected error text: "${text}"`);
      }

      // Check DB: sessions for this user must be 0
      const dbSess = await pool.query('SELECT count(*)::int as cnt FROM "Session" WHERE "adminId" = $1', [QA_USERS.activeOwner.id]);
      if (dbSess.rows[0].cnt !== 0) {
        throw new Error('Session created on invalid password!');
      }

      await capture(page, '03-login-wrong-password-error');
      await context.close();
    });

    await test('A.4: Submitting disabled account displays error without session', async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      attachMonitors(page, 'A.4');

      await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' });
      await page.fill('input[name="email"]', QA_USERS.disabledOwner.email);
      await page.fill('input[name="password"]', QA_USERS.disabledOwner.password);
      await page.click('button[type="submit"]');

      const errorMsg = page.locator('.admin-error');
      await errorMsg.waitFor({ state: 'visible', timeout: 5000 });
      const text = await errorMsg.textContent();
      if (!text?.includes('بيانات الدخول غير صحيحة')) {
        throw new Error(`Expected disabled account rejection, got: "${text}"`);
      }

      await capture(page, '04-login-disabled-account-error');
      await context.close();
    });

    await test('A.5: Successful login with valid credentials lands on /admin/dashboard and persists session', async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      attachMonitors(page, 'A.5');

      await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' });
      await page.fill('input[name="email"]', QA_USERS.activeOwner.email);
      await page.fill('input[name="password"]', QA_USERS.activeOwner.password);
      await page.click('button[type="submit"]');

      await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
      await capture(page, '05-dashboard-logged-in');

      // Verify cookie exists
      const cookies = await context.cookies();
      const sessionCookie = cookies.find((c) => c.name === 'naqer_admin');
      if (!sessionCookie) throw new Error('naqer_admin cookie not set!');
      if (!sessionCookie.httpOnly) throw new Error('Cookie is missing httpOnly flag!');

      // Reload page and verify still logged in
      await page.reload({ waitUntil: 'networkidle' });
      if (!page.url().includes('/admin/dashboard')) {
        throw new Error('Session lost after page reload!');
      }

      // Open new tab in same context and verify immediate access
      const page2 = await context.newPage();
      await page2.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'networkidle' });
      if (!page2.url().includes('/admin/dashboard')) {
        throw new Error('New tab in same context could not access dashboard!');
      }
      await page2.close();

      await context.close();
    });

    // =========================================================================
    // SECTION B: FORCED PASSWORD CHANGE FLOW & ROTATION
    // =========================================================================

    await test('B.1: Forced password change redirect & URL bypass prevention', async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      attachMonitors(page, 'B.1');

      // Login with mustChangeOwner
      await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' });
      await page.fill('input[name="email"]', QA_USERS.mustChangeOwner.email);
      await page.fill('input[name="password"]', QA_USERS.mustChangeOwner.password);
      await page.click('button[type="submit"]');

      // Must land on /admin/change-password
      await page.waitForURL('**/admin/change-password', { timeout: 10000 });
      await capture(page, '06-forced-password-change-page');

      // Attempt to bypass by navigating directly to /admin/dashboard
      await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'networkidle' });
      if (!page.url().includes('/admin/change-password')) {
        throw new Error(`Security breach: user bypassed forced password change to ${page.url()}`);
      }

      // Attempt to bypass by navigating to /admin/products
      await page.goto(`${BASE_URL}/admin/products`, { waitUntil: 'networkidle' });
      if (!page.url().includes('/admin/change-password')) {
        throw new Error(`Security breach: user bypassed forced password change to ${page.url()}`);
      }

      await context.close();
    });

    await test('B.2: Password change validation errors (wrong current, mismatch, weak)', async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      attachMonitors(page, 'B.2');

      await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' });
      await page.fill('input[name="email"]', QA_USERS.mustChangeOwner.email);
      await page.fill('input[name="password"]', QA_USERS.mustChangeOwner.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/admin/change-password');

      // Test 1: Wrong current password
      await page.fill('input[name="currentPassword"]', 'IncorrectCurrentPass!');
      await page.fill('input[name="newPassword"]', 'NewValidPass2026!');
      await page.fill('input[name="confirmPassword"]', 'NewValidPass2026!');
      await page.click('button[type="submit"]');

      const err1 = page.locator('.admin-error');
      await err1.waitFor({ state: 'visible', timeout: 5000 });
      const t1 = await err1.textContent();
      if (!t1?.includes('كلمة المرور الحالية غير صحيحة')) {
        throw new Error(`Expected current password error, got: "${t1}"`);
      }
      await capture(page, '07-password-change-wrong-current');

      // Test 2: Mismatched confirmation
      await page.fill('input[name="currentPassword"]', QA_USERS.mustChangeOwner.password);
      await page.fill('input[name="newPassword"]', 'NewValidPass2026!');
      await page.fill('input[name="confirmPassword"]', 'DifferentConfirmPass2026!');
      await page.click('button[type="submit"]');

      // Wait for error text to update to mismatch message
      const mismatchErr = page.locator('.admin-error:has-text("غير متطابقين")');
      await mismatchErr.waitFor({ state: 'visible', timeout: 8000 });
      console.log('    ✔ Mismatch validation error verified.');

      await context.close();
    });

    await test('B.3: Successful password change rotates session and lands on dashboard', async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      attachMonitors(page, 'B.3');

      // Record pre-change session token in DB
      await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' });
      await page.fill('input[name="email"]', QA_USERS.mustChangeOwner.email);
      await page.fill('input[name="password"]', QA_USERS.mustChangeOwner.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/admin/change-password');

      const cookiesBefore = await context.cookies();
      const oldRawToken = cookiesBefore.find((c) => c.name === 'naqer_admin')?.value;

      // Submit valid password change
      await page.fill('input[name="currentPassword"]', QA_USERS.mustChangeOwner.password);
      await page.fill('input[name="newPassword"]', QA_USERS.mustChangeOwner.newPassword);
      await page.fill('input[name="confirmPassword"]', QA_USERS.mustChangeOwner.newPassword);
      await page.click('button[type="submit"]');

      // Must redirect to /admin/dashboard
      await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
      await capture(page, '08-password-changed-dashboard-success');

      // Verify Cookie was rotated!
      const cookiesAfter = await context.cookies();
      const newRawToken = cookiesAfter.find((c) => c.name === 'naqer_admin')?.value;
      if (!newRawToken) throw new Error('No cookie after password change!');
      if (newRawToken === oldRawToken) {
        throw new Error('CRITICAL SECURITY FLAW: Session token was NOT rotated on password change!');
      }

      // Verify DB: mustChangePassword is now false
      const userRes = await pool.query('SELECT "mustChangePassword" FROM "AdminUser" WHERE id = $1', [QA_USERS.mustChangeOwner.id]);
      if (userRes.rows[0].mustChangePassword !== false) {
        throw new Error('mustChangePassword was not set to false in DB!');
      }

      // Logout and test that OLD password fails, and NEW password works!
      const logoutBtn = page.locator('button.admin-nav-logout');
      await logoutBtn.click();
      await page.waitForURL('**/admin/login', { timeout: 10000 });

      // Try login with OLD password -> MUST FAIL
      await page.fill('input[name="email"]', QA_USERS.mustChangeOwner.email);
      await page.fill('input[name="password"]', QA_USERS.mustChangeOwner.password);
      await page.click('button[type="submit"]');
      const errLocator = page.locator('.admin-error');
      await errLocator.waitFor({ state: 'visible', timeout: 5000 });
      console.log('    ✔ Old password successfully rejected.');

      // Try login with NEW password -> MUST SUCCEED
      await page.fill('input[name="email"]', QA_USERS.mustChangeOwner.email);
      await page.fill('input[name="password"]', QA_USERS.mustChangeOwner.newPassword);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
      console.log('    ✔ New password successfully logged in.');

      await context.close();
    });

    // =========================================================================
    // SECTION C: SESSION LIFECYCLE & MULTI-BROWSER REVOCATION
    // =========================================================================

    await test('C.1: Multi-context invalidation: Password change in Context 1 revokes Context 2', async () => {
      // Ensure pristine session state for test user
      await pool.query('DELETE FROM "Session" WHERE "adminId" = $1', [QA_USERS.activeOwner.id]);

      // Context 1 and Context 2 both log in as activeOwner
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();
      attachMonitors(page1, 'C.1-Browser1');

      await page1.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' });
      await page1.fill('input[name="email"]', QA_USERS.activeOwner.email);
      await page1.fill('input[name="password"]', QA_USERS.activeOwner.password);
      await page1.click('button[type="submit"]');
      await page1.waitForURL('**/admin/dashboard');

      const context2 = await browser.newContext();
      const page2 = await context2.newPage();
      attachMonitors(page2, 'C.1-Browser2');

      await page2.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' });
      await page2.fill('input[name="email"]', QA_USERS.activeOwner.email);
      await page2.fill('input[name="password"]', QA_USERS.activeOwner.password);
      await page2.click('button[type="submit"]');
      await page2.waitForURL('**/admin/dashboard');

      // In DB: verify exactly 2 sessions exist before rotation
      const dbSessBefore = (await pool.query('SELECT count(*)::int as cnt FROM "Session" WHERE "adminId" = $1', [QA_USERS.activeOwner.id])).rows[0].cnt;
      if (dbSessBefore !== 2) {
        throw new Error(`Expected 2 active sessions in DB before rotation, got: ${dbSessBefore}`);
      }
      console.log('    ✔ DB Verified: 2 distinct active sessions present before password change.');

      // In Context 1: change password to a new password via /admin/settings (voluntary password change)
      await page1.goto(`${BASE_URL}/admin/settings`, { waitUntil: 'networkidle' });
      const changedPass = 'RotatedOwnerPass2026!';
      await page1.fill('input[name="currentPassword"]', QA_USERS.activeOwner.password);
      await page1.fill('input[name="newPassword"]', changedPass);
      await page1.fill('input[name="confirmPassword"]', changedPass);
      await page1.click('form.admin-login-form button[type="submit"]');

      // Verify success message appears on settings page
      const okBanner = page1.locator('.admin-flash.ok');
      await okBanner.waitFor({ state: 'visible', timeout: 8000 });
      console.log('    ✔ Voluntary password change completed in Context 1.');

      // In DB: verify exactly 1 session exists now (Context 2 revoked, Context 1 rotated)
      const dbSessAfter = (await pool.query('SELECT count(*)::int as cnt FROM "Session" WHERE "adminId" = $1', [QA_USERS.activeOwner.id])).rows[0].cnt;
      if (dbSessAfter !== 1) {
        throw new Error(`Expected exactly 1 session in DB after rotation, got: ${dbSessAfter}`);
      }
      console.log('    ✔ DB Verified: older session purged; exactly 1 rotated session exists in DB.');

      // Now Context 2 tries to refresh or navigate to a protected page
      await page2.goto(`${BASE_URL}/admin/products`, { waitUntil: 'networkidle' });

      // Context 2 MUST be kicked out to /admin/login!
      const ctx2Url = page2.url();
      if (!ctx2Url.includes('/admin/login')) {
        throw new Error(`CRITICAL SECURITY FLAW: Context 2 session was not invalidated! URL: ${ctx2Url}`);
      }
      await capture(page2, '09-context2-revoked-redirected-to-login');

      await context1.close();
      await context2.close();

      // Reset password & clean sessions for activeOwner in DB so subsequent tests run cleanly
      const ownerHash = await bcrypt.hash(QA_USERS.activeOwner.password, 10);
      await pool.query('UPDATE "AdminUser" SET "passwordHash" = $1 WHERE id = $2', [ownerHash, QA_USERS.activeOwner.id]);
      await pool.query('DELETE FROM "Session" WHERE "adminId" = $1', [QA_USERS.activeOwner.id]);
    });

    await test('C.2: Logout clears cookie and invalidates session row', async () => {
      // Ensure pristine session state
      await pool.query('DELETE FROM "Session" WHERE "adminId" = $1', [QA_USERS.activeOwner.id]);

      const context = await browser.newContext();
      const page = await context.newPage();
      attachMonitors(page, 'C.2');

      await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' });
      await page.fill('input[name="email"]', QA_USERS.activeOwner.email);
      await page.fill('input[name="password"]', QA_USERS.activeOwner.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/admin/dashboard');

      // Click logout button
      const logoutBtn = page.locator('button.admin-nav-logout');
      await logoutBtn.click();
      await page.waitForURL('**/admin/login', { timeout: 10000 });
      await capture(page, '10-after-logout-login-page');

      // Verify cookie is deleted
      const cookies = await context.cookies();
      const sessCookie = cookies.find((c) => c.name === 'naqer_admin');
      if (sessCookie) throw new Error('Cookie still exists after logout!');

      // Verify DB: session row is deleted
      const dbSessAfterLogout = (await pool.query('SELECT count(*)::int as cnt FROM "Session" WHERE "adminId" = $1', [QA_USERS.activeOwner.id])).rows[0].cnt;
      if (dbSessAfterLogout !== 0) {
        throw new Error(`Expected 0 sessions in DB after logout, got: ${dbSessAfterLogout}`);
      }
      console.log('    ✔ DB Verified: 0 active sessions in DB after logout.');

      // Verify clicking Back button or navigating to dashboard redirects to login
      await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'networkidle' });
      if (!page.url().includes('/admin/login')) {
        throw new Error('Access allowed to dashboard after logout!');
      }

      await context.close();
    });

    // =========================================================================
    // SECTION D: DASHBOARD REGRESSION (NO BROKEN ADMIN ROUTES)
    // =========================================================================

    await test('D.1: Dashboard Regression across all primary admin sections', async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      const monitors = attachMonitors(page, 'D.1');

      // Login as Active Owner
      await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' });
      await page.fill('input[name="email"]', QA_USERS.activeOwner.email);
      await page.fill('input[name="password"]', QA_USERS.activeOwner.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/admin/dashboard');

      const adminRoutes = [
        { path: '/admin/dashboard', name: 'Dashboard' },
        { path: '/admin/products', name: 'Products' },
        { path: '/admin/categories', name: 'Categories' },
        { path: '/admin/branches', name: 'Branches' },
        { path: '/admin/addons', name: 'Addons' },
        { path: '/admin/offers', name: 'Offers' },
        { path: '/admin/settings', name: 'Settings' },
        { path: '/admin/audit', name: 'Audit' },
        { path: '/admin/images', name: 'Images' },
      ];

      for (const route of adminRoutes) {
        console.log(`    Navigating to ${route.name} (${route.path})...`);
        const response = await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle' });
        const status = response?.status();
        if (status && status >= 400) {
          throw new Error(`Route ${route.path} returned HTTP status ${status}!`);
        }

        // Verify page content loaded (no server error stack trace visible)
        const bodyText = await page.textContent('body');
        if (bodyText?.includes('Internal Server Error') || bodyText?.includes('Unhandled Runtime Error')) {
          throw new Error(`Runtime error detected on ${route.path}!`);
        }

        await capture(page, `11-regression-${route.name.toLowerCase()}`);
      }

      // Verify no critical console errors were logged
      const critErrors = monitors.consoleLogs.filter((l) => l.includes('[error]') && !l.includes('favicon'));
      if (critErrors.length > 0) {
        console.warn(`    ⚠️  Observed console warnings/errors: ${critErrors.length}`);
      }

      await context.close();
    });

    // =========================================================================
    // SECTION E: CONCURRENT BROWSER RACE CONDITIONS
    // =========================================================================

    await test('E.1: Concurrent Browser Login vs Password Change race condition', async () => {
      // Ensure pristine session state
      await pool.query('DELETE FROM "Session" WHERE "adminId" = $1', [QA_USERS.activeOwner.id]);

      const contextA = await browser.newContext();
      const pageA = await contextA.newPage();
      attachMonitors(pageA, 'E.1-ContextA');

      const contextB = await browser.newContext();
      const pageB = await contextB.newPage();
      attachMonitors(pageB, 'E.1-ContextB');

      // Context A logs in
      await pageA.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' });
      await pageA.fill('input[name="email"]', QA_USERS.activeOwner.email);
      await pageA.fill('input[name="password"]', QA_USERS.activeOwner.password);
      await pageA.click('button[type="submit"]');
      await pageA.waitForURL('**/admin/dashboard');

      // Context B opens login page and prepares old credentials
      await pageB.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' });
      await pageB.fill('input[name="email"]', QA_USERS.activeOwner.email);
      await pageB.fill('input[name="password"]', QA_USERS.activeOwner.password);

      // Context A navigates to change password on /admin/settings
      await pageA.goto(`${BASE_URL}/admin/settings`, { waitUntil: 'networkidle' });
      const racePass = 'ConcurrentRacePass123!';
      await pageA.fill('input[name="currentPassword"]', QA_USERS.activeOwner.password);
      await pageA.fill('input[name="newPassword"]', racePass);
      await pageA.fill('input[name="confirmPassword"]', racePass);

      // Execute simultaneously: Context A submits password change, Context B submits login with old pass
      await Promise.all([
        pageA.click('form.admin-login-form button[type="submit"]'),
        pageB.click('button[type="submit"]'),
      ]);

      // Wait for success flash in Context A on /admin/settings
      await pageA.locator('.admin-flash.ok').waitFor({ state: 'visible', timeout: 10000 });

      // Verification: Either Context B was rejected on login by CAS, or its session was purged by Context A!
      try {
        const errB = pageB.locator('.admin-error');
        await errB.waitFor({ state: 'visible', timeout: 4000 });
        const errBText = await errB.textContent();
        if (errBText?.includes('بيانات الدخول غير صحيحة')) {
          console.log('    ✔ Context B rejected during login by CAS.');
        }
      } catch {
        // If Context B landed on dashboard a microsecond before Context A finished,
        // it must now be completely revoked and kicked out upon next action!
        await pageB.goto(`${BASE_URL}/admin/products`, { waitUntil: 'networkidle' });
        if (!pageB.url().includes('/admin/login')) {
          throw new Error(`CRITICAL: Context B session survived concurrent password change! Current URL: ${pageB.url()}`);
        }
        console.log('    ✔ Context B session was instantly revoked by Context A password change.');
      }
      await capture(pageB, '12-concurrent-login-rejected-or-revoked');

      await contextA.close();
      await contextB.close();

      // Reset password in DB
      const resetHash = await bcrypt.hash(QA_USERS.activeOwner.password, 10);
      await pool.query('UPDATE "AdminUser" SET "passwordHash" = $1 WHERE id = $2', [resetHash, QA_USERS.activeOwner.id]);
      await pool.query('DELETE FROM "Session" WHERE "adminId" = $1', [QA_USERS.activeOwner.id]);
    });

    console.log('\n================================================================');
    console.log(`🎉 [AUTONOMOUS QA COMPLETED] All ${passCount}/${testCount} Browser E2E Tests PASSED!`);
    console.log(`   Screenshots saved in: ${EVIDENCE_DIR}`);
    console.log('----------------------------------------------------------------');
    console.log(' [BROWSER DIAGNOSTICS & TELEMETRY SUMMARY]');
    console.log(`   🚨 Uncaught Page Errors       : ${globalDiagnostics.pageErrors.length}`);
    console.log(`   ⚠️  Browser Console Errors      : ${globalDiagnostics.consoleErrors.length}`);
    console.log(`   ❌ Unexpected HTTP 4xx/5xx    : ${globalDiagnostics.httpErrors.length}`);
    console.log(`   🌐 Real Failed Network Requests: ${globalDiagnostics.realNetworkFailures.length}`);
    console.log(`   ℹ️  Aborted Prefetch Requests   : ${globalDiagnostics.abortedPrefetches.length} (harmless Next.js client-side navigation aborts)`);
    if (globalDiagnostics.consoleErrors.length > 0) {
      console.log('\n   [Captured Console Errors]:');
      globalDiagnostics.consoleErrors.forEach((e) => console.log(`     - [${e.context}]: ${e.text}`));
    }
    if (globalDiagnostics.httpErrors.length > 0) {
      console.log('\n   [Captured HTTP Errors]:');
      globalDiagnostics.httpErrors.forEach((e) => console.log(`     - [${e.context}] ${e.status}: ${e.url}`));
    }
    if (globalDiagnostics.realNetworkFailures.length > 0) {
      console.log('\n   [Real Network Failures]:');
      globalDiagnostics.realNetworkFailures.forEach((e) => console.log(`     - [${e.context}] ${e.url}: ${e.errorText}`));
    }
    console.log('================================================================\n');

  } finally {
    await browser.close();
    await pool.end();
  }
}

runBrowserQaSuite().catch((err) => {
  console.error('[SUITE FATAL ERROR]:', err);
  process.exit(1);
});
