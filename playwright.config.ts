import { defineConfig } from "@playwright/test";

// إعدادات اختبار القبول النهائي. تُشغَّل برأس مرئي عبر: npx playwright test --headed
// بطيء بسيط (slowMo) ليمكن متابعة المستخدم لكل خطوة؛ يُضبط عبر المتغير SLOWMO.
const SLOWMO = Number(process.env.SLOWMO ?? 0);

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
    baseURL: process.env.BASE_URL ?? "http://127.0.0.1:3001",
    trace: "retain-on-failure",
    screenshot: "on",
    video: "off",
    launchOptions: { slowMo: SLOWMO },
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
