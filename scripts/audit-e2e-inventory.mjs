import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const testsDir = path.join(root, "tests");
const testFiles = [
  "01-live-sync.spec.ts",
  "02-crud.spec.ts",
  "03-responsive.spec.ts",
  "04-security.spec.ts",
  "05-crud-acceptance.spec.ts",
  "06-image-lifecycle.spec.ts",
  "07-interactive-cart.spec.ts",
  "08-addons-and-branches.spec.ts",
  "09-card-layouts-and-offers.spec.ts",
  "10-live-offers-and-visual-fix.spec.ts",
  "11-financial-calculations.spec.ts",
  "12-final-release-smoke.spec.ts",
];

const inventory = [];

for (const file of testFiles) {
  const filePath = path.join(testsDir, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${file}`);
    continue;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  // Regex to match test("...", or test.skip("...", or test.describe("...", etc.
  // We want individual test cases: test(...) or test.only or test.skip
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^\s*test(?:\.skip|\.only)?\s*\(\s*(["'`])(.*?)\1/);
    if (match) {
      const title = match[2];
      const lineNum = i + 1;

      // Now determine mutation profile by scanning the test block content
      // Let's find the closing brace or next test
      let testBlock = "";
      for (let j = i; j < Math.min(lines.length, i + 120); j++) {
        testBlock += lines[j] + "\n";
        if (j > i && lines[j].match(/^\s*\}\s*\)\s*;?\s*$/)) {
          break;
        }
      }

      const isDbWrite = /create|insert|update|save|upsert|fill\(|click\(.*save|submit/i.test(testBlock) && !/expect/i.test(line);
      const isDbDelete = /delete|remove|destroy/i.test(testBlock);
      const isDirectSql = /query\(|prisma\.\$execute|prisma\.\$query/i.test(testBlock);
      const isCloudinaryMutation = /cloudinary|upload|destroyImage|deleteImage/i.test(testBlock);
      const isAuthMutation = /login|logout|provision|session|cookie/i.test(testBlock);
      const isBrowserInteraction = /page\.|locator\(|click|fill|goto|hover/i.test(testBlock);
      const isCleanup = /deleteTestProduct|clean|afterAll|afterEach|ROLLBACK|cleanup/i.test(testBlock);

      let classification = "Read-Only / UI Verification";
      const tags = [];
      if (isDirectSql) tags.push("Direct SQL");
      if (isCloudinaryMutation) tags.push("Cloudinary Mutation");
      if (isDbDelete) tags.push("DB Delete");
      if (isDbWrite) tags.push("DB Write");
      if (isAuthMutation) tags.push("Auth / Session");
      if (isCleanup) tags.push("Cleanup Routine");
      if (isBrowserInteraction) tags.push("Browser Interaction");

      if (tags.length > 0) {
        classification = tags.join(", ");
      }

      inventory.push({
        file,
        line: lineNum,
        title,
        classification,
      });
    }
  }
}

console.log(`Audited ${inventory.length} tests across ${testFiles.length} test files.`);

// Generate markdown document
let md = `# STAGING TEST SUITE INVENTORY

**Audit Date:** ${new Date().toISOString()}  
**Repository:** \`E:\\real projects\\naqer-menu\`  
**Target Environment:** Isolated Neon Staging Database (\`ep-soft-dawn-bdu5de43\`)  
**Total Test Files:** ${testFiles.length}  
**Total Test Cases:** ${inventory.length}  

---

## 1. Summary of Test Files & Scope

| # | Test File | Test Count | Primary Scope & Focus |
|---|-----------|------------|-----------------------|
| 1 | \`tests/01-live-sync.spec.ts\` | ${inventory.filter(t => t.file === "01-live-sync.spec.ts").length} | Dual-context LiveSync, real-time polling updates without page reload |
| 2 | \`tests/02-crud.spec.ts\` | ${inventory.filter(t => t.file === "02-crud.spec.ts").length} | Product CRUD, image management, form validation |
| 3 | \`tests/03-responsive.spec.ts\` | ${inventory.filter(t => t.file === "03-responsive.spec.ts").length} | Mobile, tablet, and desktop responsive layouts & RTL rendering |
| 4 | \`tests/04-security.spec.ts\` | ${inventory.filter(t => t.file === "04-security.spec.ts").length} | Access control, unauthenticated redirects, role isolation (OWNER vs EDITOR) |
| 5 | \`tests/05-crud-acceptance.spec.ts\` | ${inventory.filter(t => t.file === "05-crud-acceptance.spec.ts").length} | Comprehensive end-to-end CRUD acceptance with visual verification |
| 6 | \`tests/06-image-lifecycle.spec.ts\` | ${inventory.filter(t => t.file === "06-image-lifecycle.spec.ts").length} | Image upload, replacement, deletion, and Cloudinary lifecycle safety |
| 7 | \`tests/07-interactive-cart.spec.ts\` | ${inventory.filter(t => t.file === "07-interactive-cart.spec.ts").length} | Customer cart, item quantity, addon calculations, WhatsApp order format |
| 8 | \`tests/08-addons-and-branches.spec.ts\` | ${inventory.filter(t => t.file === "08-addons-and-branches.spec.ts").length} | Branch selection, branch availability, addon groups and modifiers |
| 9 | \`tests/09-card-layouts-and-offers.spec.ts\` | ${inventory.filter(t => t.file === "09-card-layouts-and-offers.spec.ts").length} | Menu card display variants, badge rendering, promotional banners |
| 10 | \`tests/10-live-offers-and-visual-fix.spec.ts\` | ${inventory.filter(t => t.file === "10-live-offers-and-visual-fix.spec.ts").length} | Offer activation/deactivation synchronization and styling stability |
| 11 | \`tests/11-financial-calculations.spec.ts\` | ${inventory.filter(t => t.file === "11-financial-calculations.spec.ts").length} | Precision pricing, discounts, tax/rounding verification, order totals |
| 12 | \`tests/12-final-release-smoke.spec.ts\` | ${inventory.filter(t => t.file === "12-final-release-smoke.spec.ts").length} | Fast smoke check across public routes, admin entry, and API endpoints |

---

## 2. Granular Test Case Inventory

| File | Line | Test Name | Mutation & Execution Profile |
|------|------|-----------|------------------------------|
`;

for (const item of inventory) {
  md += `| \`${item.file}\` | L${item.line} | ${item.title.replace(/\|/g, "\\|")} | ${item.classification} |\n`;
}

md += `
---

## 3. Staging Execution Safety Constraints

1. **Isolation Enforced:** All tests execute against \`http://127.0.0.1:3002\` connected strictly to the Neon staging database (\`ep-soft-dawn-bdu5de43\`).
2. **Production Immunity:** Production project \`ep-withered-bread-bemwq8ns\` is completely inaccessible and protected by hard assertions in \`tests/staging-env.ts\`.
3. **Deterministic Cleanup:** All mutating tests prefix temporary entities with identifiable test markers (\`ZZ-\` or unique timestamp tokens) and execute teardown routines upon completion.
`;

const outputPath = path.join(root, "docs", "STAGING_TEST_INVENTORY.md");
fs.writeFileSync(outputPath, md, "utf8");
console.log(`Wrote inventory to ${outputPath}`);
