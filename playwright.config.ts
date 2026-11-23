import { defineConfig } from "@playwright/test";
import { loadStagingEnv } from "./tests/staging-env";

// إعدادات اختبار القبول النهائي. تُشغَّل برأس مرئي عبر: npx playwright test --headed
// بطيء بسيط (slowMo) ليمكن متابعة المستخدم لكل خطوة؛ يُضبط عبر المتغير SLOWMO.
loadStagingEnv();

const SLOWMO = Number(process.env.SLOWMO ?? 0);
const BASE_URL = "http://127.0.0.1:3002";

if (process.env.BASE_URL && process.env.BASE_URL !== BASE_URL) {
  throw new Error("STAGING GUARD REFUSAL: Playwright BASE_URL must target the isolated local staging server.");
}

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1, // تسلسلي: متصفح مرئي واحد يمكن متابعته + لا سباقات كتابة على القاعدة
  retries: 0, // أمانة النتيجة: لا إعادة محاولة تُخفي فشلًا حقيقيًا
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "on",
    video: "off",
    launchOptions: {
      slowMo: SLOWMO,
      executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    },
  },
  webServer: {
    command: "npx next dev --hostname 127.0.0.1 --port 3002",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      ...process.env,
      NAQER_TEST_ENV: "staging",
      STAGING_MODE: "1",
      STAGING_CLOUDINARY_ENABLED: "1",
      USE_BACKUP_DATA: "false",
    } as Record<string, string>,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
