import {
  resolveEffectiveBranch,
  resolveEffectiveBranches,
  normalizeOrderingMode,
  ORDERING_MODE_FEATURES,
  ORDERING_MODES_META,
  type BranchOverrideSettings
} from '../lib/order-settings-types';

console.log('=== NAQER MENU POST-FIX REGRESSION AUDIT SUITE ===\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail: string = '') {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${testName}: ${detail}`);
    failedTests++;
  }
}

// ---------------------------------------------------------
// 1. Separation of Administrative (isActive) vs Operational (isOpen)
// ---------------------------------------------------------
console.log('--- 1. ADMINISTRATIVE (isActive) VS OPERATIONAL (isOpen) SEPARATION ---');

// Test 1.1: Base active branch without override
const b1 = { id: 'gamasa', nameAr: 'فرع جمصة', isActive: true, isOrderable: true };
const res1 = resolveEffectiveBranch(b1, undefined);
assert(res1.isActive === true, '1.1 Base active branch has isActive=true');
assert(res1.isOpen === true, '1.2 Base active branch defaults to isOpen=true');
assert(res1.isOrderable === true, '1.3 Base active branch has isOrderable=true');

// Test 1.2: Inactive branch in DB (isActive: false) - override CANNOT make it active or orderable
const b2 = { id: 'inactive-branch', nameAr: 'فرع معطل إدارياً', isActive: false, isOrderable: true };
const ov2: BranchOverrideSettings = { isOpen: true, isOrderable: true };
const res2 = resolveEffectiveBranch(b2, ov2);
assert(res2.isActive === false, '1.4 Inactive branch in DB strictly keeps isActive=false');
assert(res2.isOrderable === false, '1.5 Inactive branch CANNOT be made orderable by override');

// Test 1.3: Active branch in DB, but operational temporary closure (isOpen: false)
// CRITICAL: isActive MUST remain true (administrative state), while isOpen=false (operational state)
const b3 = { id: 'gamasa', nameAr: 'فرع جمصة', isActive: true, isOrderable: true };
const ov3: BranchOverrideSettings = { isOpen: false, isOrderable: true };
const res3 = resolveEffectiveBranch(b3, ov3);
assert(res3.isActive === true, '1.6 Operational closure DOES NOT wipe administrative isActive (remains true)');
assert(res3.isOpen === false, '1.7 Operational closure sets effective isOpen=false');
assert(res3.isOrderable === false, '1.8 Operational closure (isOpen=false) automatically sets isOrderable=false');

// Test 1.4: Active branch in DB, orders paused (isOpen: true, isOrderable: false)
const b4 = { id: 'gamasa', nameAr: 'فرع جمصة', isActive: true, isOrderable: true };
const ov4: BranchOverrideSettings = { isOpen: true, isOrderable: false };
const res4 = resolveEffectiveBranch(b4, ov4);
assert(res4.isActive === true, '1.9 Operational order pause keeps isActive=true');
assert(res4.isOpen === true, '1.10 Operational order pause keeps isOpen=true (open for viewing)');
assert(res4.isOrderable === false, '1.11 Operational order pause sets isOrderable=false');

// Test 1.5: Base branch with isOrderable=false in DB, override trying to set isOrderable: true
const b5 = { id: 'exhibition-branch', nameAr: 'فرع للعرض فقط', isActive: true, isOrderable: false };
const ov5: BranchOverrideSettings = { isOpen: true, isOrderable: true };
const res5 = resolveEffectiveBranch(b5, ov5);
assert(res5.isActive === true, '1.12 Base unorderable branch keeps isActive=true');
assert(res5.isOpen === true, '1.13 Base unorderable branch keeps isOpen=true');
assert(res5.isOrderable === false, '1.14 Base unorderable branch in DB CANNOT be forced orderable by override');

// Test 1.6: Array resolution with resolveEffectiveBranches
const branchesList = [b1, b2, b3];
const overridesMap = {
  'gamasa': { isOpen: true, isOrderable: true },
  'inactive-branch': { isOpen: true, isOrderable: true },
};
const resList = resolveEffectiveBranches(branchesList, overridesMap);
assert(resList[0].isActive === true && resList[0].isOpen === true && resList[0].isOrderable === true, '1.15 Gamasa active, open & orderable');
assert(resList[1].isActive === false && resList[1].isOrderable === false, '1.16 Inactive branch stays administratively inactive & unorderable');

// ---------------------------------------------------------
// 2. Delivery & Takeaway Flags & Delivery Fee Verification
// ---------------------------------------------------------
console.log('\n--- 2. DELIVERY & TAKEAWAY FLAGS & FEES ---');

const ovDeliveryFalse: BranchOverrideSettings = { isOpen: true, isOrderable: true, allowDelivery: false, allowTakeaway: true };
const resDelivery = resolveEffectiveBranch(b1, ovDeliveryFalse);
assert((resDelivery as any).allowDelivery === false, '2.1 allowDelivery: false in override is respected');
assert((resDelivery as any).allowTakeaway === true, '2.2 allowTakeaway: true in override is respected');

const ovNoDelivery: BranchOverrideSettings = { isOpen: true, isOrderable: true };
const resNoDelivery = resolveEffectiveBranch(b1, ovNoDelivery);
assert((resNoDelivery as any).allowDelivery === undefined, '2.3 allowDelivery is not forced to false if omitted in override');
assert((resNoDelivery as any).allowTakeaway === undefined, '2.4 allowTakeaway is not forced to false if omitted in override');
assert(!('deliveryFee' in resNoDelivery), '2.5 Resolver does not inject deliveryFee=0 into branch entity');

// ---------------------------------------------------------
// 3. Ordering Modes Normalization & Features (A, B, C, D)
// ---------------------------------------------------------
console.log('\n--- 3. ORDERING MODES A, B, C, D ---');

// Mode A: FULL_ORDERING
const modeA = normalizeOrderingMode('FULL_ORDERING');
assert(modeA === 'FULL_ORDERING', '3.1 Mode A normalizes to FULL_ORDERING');
assert(ORDERING_MODES_META[modeA].letter === 'A', '3.2 Mode A letter is A');
assert(ORDERING_MODE_FEATURES[modeA].allowOrderCreation === true, '3.3 Mode A allows order creation');
assert(ORDERING_MODE_FEATURES[modeA].orderBackendStorage === true, '3.4 Mode A stores order in DB');
assert(ORDERING_MODE_FEATURES[modeA].customerLiveTracking === true, '3.5 Mode A enables live tracking');

// Mode B: WHATSAPP_DATABASE
const modeB = normalizeOrderingMode('WHATSAPP_DATABASE');
assert(modeB === 'WHATSAPP_DATABASE', '3.6 Mode B normalizes to WHATSAPP_DATABASE');
assert(ORDERING_MODES_META[modeB].letter === 'B', '3.7 Mode B letter is B');
assert(ORDERING_MODE_FEATURES[modeB].allowOrderCreation === true, '3.8 Mode B allows order creation');
assert(ORDERING_MODE_FEATURES[modeB].orderBackendStorage === true, '3.9 Mode B stores order in DB');
assert(ORDERING_MODE_FEATURES[modeB].whatsappRedirection === true, '3.10 Mode B enables WhatsApp redirection');
assert(ORDERING_MODE_FEATURES[modeB].customerLiveTracking === false, '3.11 Mode B disables live customer tracking (saves resources)');
assert(ORDERING_MODE_FEATURES[modeB].customerPolling === false, '3.12 Mode B disables customer polling');

// Mode C: DISPLAY_ONLY
const modeC = normalizeOrderingMode('DISPLAY_ONLY');
assert(modeC === 'DISPLAY_ONLY', '3.13 Mode C normalizes to DISPLAY_ONLY');
assert(ORDERING_MODES_META[modeC].letter === 'C', '3.14 Mode C letter is C');
assert(ORDERING_MODE_FEATURES[modeC].allowOrderCreation === false, '3.15 Mode C blocks order creation');

// Mode D: TEMPORARILY_CLOSED
const modeD = normalizeOrderingMode('TEMPORARILY_CLOSED');
assert(modeD === 'TEMPORARILY_CLOSED', '3.16 Mode D normalizes to TEMPORARILY_CLOSED');
assert(ORDERING_MODES_META[modeD].letter === 'D', '3.17 Mode D letter is D');
assert(ORDERING_MODE_FEATURES[modeD].allowOrderCreation === false, '3.18 Mode D blocks order creation');

// Fallback & Alias Normalization
assert(normalizeOrderingMode('VIEW_AND_ORDER') === 'FULL_ORDERING', '3.19 VIEW_AND_ORDER maps to FULL_ORDERING');
assert(normalizeOrderingMode('VIEW_ONLY') === 'DISPLAY_ONLY', '3.20 VIEW_ONLY maps to DISPLAY_ONLY');
assert(normalizeOrderingMode(null) === 'WHATSAPP_DATABASE', '3.21 null/undefined default mode is WHATSAPP_DATABASE');

// ---------------------------------------------------------
// Summary
// ---------------------------------------------------------
console.log('\n=== AUDIT SUMMARY ===');
console.log(`Total assertions: ${passedTests + failedTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('ALL REGRESSION AUDIT ASSERTIONS VERIFIED SUCCESSFULLY.');
}
