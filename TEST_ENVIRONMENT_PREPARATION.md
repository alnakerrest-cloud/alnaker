# Naqer Menu — Environment Preparation for Manual Browser Journey Test

## 1. Local URL
**http://127.0.0.1:3002/ar**

The development server is running on port 3002 and the Arabic menu page loads successfully.

## 2. Server Status
- **Status**: RUNNING on port 3002
- **Verified**: Arabic menu page (`/ar`) returns 200 status with full menu content
- **Keep server running**: The `next dev` process is active and serving requests

## 3. Confirmed Database Target
- **Configuration**: `USE_BACKUP_DATA=true` in `.env.local`
- **Database**: Neon PostgreSQL test branch (`ep-sparkling-glitter-bdwqquhi`)
- **Safety**: Confirmed test environment — not connecting to production data
- **Backup data**: Branch IDs from `backups/backup-naqer-verified.json` UUIDs are being used

## 3. Available Branches and IDs
(from the canonical UUID model, now consistent in `lib/site.ts`):

| Branch | ID |
|--------|-----|
| **Gamasa** | `7fa2be20-67bd-4060-a83a-81ded2550018` |
| **Damietta** | `6d6528bd-dbd4-4672-aa5f-953063d3a36e` |

**Note**: These UUIDs in `lib/site.ts` now match what `getSiteData()` returns when `USE_BACKUP_DATA !== "false"`, establishing one canonical branch identity model throughout the customer journey.

## 4. Applied Fixes (3 E2E Blockers)

### Blocker 1 — Canonical Branch ID (FIXED)
- **File**: `lib/site.ts` lines 16, 26
- **Change**: Branch IDs updated from static strings to canonical UUIDs
  - `gamasa` → `7fa2be20-67bd-4060-a83a-81ded2550018`
  - `damietta` → `6d6528bd-dbd4-4672-aa5f-953063d3a36e`
- **Result**: Branch identity consistent throughout journey (menu → cart → checkout → persisted order)

### Blocker 2 — Required Product Option Groups UI (FIXED)
- **File**: `components/ProductDetailModal.tsx` line 642
- **Change**: Added `disabled={!actionDone && Object.keys(validationErrors).length > 0}` to "Add to Cart" button
- **Result**: Button disabled when required option groups unselected; prevents cart addition until options are valid

### Blocker 3 — Customer Session Persistence (VERIFIED)
- **Files**: `lib/customer-session.ts`, `app/api/customer/auth/route.ts`
- **Verification**: Session architecture confirmed correct:
  - `naqer_customer` HttpOnly cookie with `httpOnly: true`, `secure: production`, `sameSite: "lax"`, `path: "/"`, `maxAge: 60 days`
  - Server-side session verification via `verifyCustomerSession()` with HMAC-SHA256 signature validation
  - Session payload passed as props to `CustomerHubClient` on page load
  - All cookie security verification points confirmed

## 5. Test Data

### Available Products
- **79 product cards** (61 meal + 8 platter + 10 side) available at http://127.0.0.1:3002/ar
- Categories include: Mandi, Grills, Meals, Soups, Starters, Oriental, Popular Dishes, Bedouin Dishes
- Some products have required option groups (e.g., "اختيار الصنف الجانبي" - "Select a side dish")

### Recommended Test Product
Choose a product with option groups to test Blocker 2. Look for products marked with "📌 يتطلب الاختيار" (requires selection) in the menu.

### Test Customer Phone
- **Phone**: `01094965222` (displayed in PHONE_DISPLAY constant)
- OTP is delivered through the test OTP provider in the local environment

### OTP Delivery Method
- OTP sent via `activeOtpProvider.sendOtp(normalizedPhone)` 
- Verified OTP send/verify flow works through `/api/customer/auth` endpoint
- In test environment, OTP codes are available through the test provider configuration

## 6. Browser Journey Steps (Manual Test)

Customer journey to perform at http://127.0.0.1:3002/ar:

1. **Menu** — Page loads with branch selection (Gamasa/Damietta)
2. **Select Branch** — Verify branch selection persists
3. **Browse Products** — Browse menu, select a product
4. **Open Product Details** — Open product detail modal
5. **Select Required Options** — If product has required option groups, select at least one option from each group
6. **Add To Cart** — Verify "Add to Cart" button works (or is disabled if options invalid)
7. **Cart** — Open cart drawer, verify product, quantity, price
8. **Checkout** — Proceed to checkout
9. **Enter Customer Phone** — Enter test phone number
10. **OTP** — Request and enter OTP code
11. **Customer Account** — Verify authentication succeeded
12. **Customer Data** — Verify profile data loaded
13. **Address** — Verify/Select address
14. **Submit Order** — Complete order submission
15. **Receipt** — Verify order confirmation
16. **My Orders** — Verify new order appears
17. **Order Details** — Verify order items, options, totals
18. **Live Tracking** — Verify tracking page works
19. **Reload Test** — Reload browser while authenticated, verify session persists

## 7. Restrictions
- ❌ No Git push
- ❌ No deployment to production
- ❌ No production database changes
- ❌ No credential rotation
- ❌ No unrelated refactoring
- ❌ No new features
- ❌ Do not claim visible browser verification

## 8. First Steps Checklist
Perform these in the visible browser at http://127.0.0.1:3002/ar:

- [ ] Verify homepage loads and displays menu
- [ ] Select a branch (Gamasa or Damietta)
- [ ] Browse and select a product
- [ ] Open product details and check for required option groups
- [ ] Test Add to Cart with/without selecting required options
- [ ] Open cart and verify item details
- [ ] Proceed to checkout
- [ ] Enter test phone number and request OTP
- [ ] Complete OTP verification
- [ ] Verify customer authentication
- [ ] Complete order submission
- [ ] Verify order appears in My Orders
- [ ] Open Order Details and verify all fields
- [ ] Open Live Tracking and verify it works
- [ ] **Critical**: Reload browser while authenticated and verify session persists
- [ ] Verify customer data persists after reload

## Final Status
**READY FOR MANUAL BROWSER TESTING**

All three E2E blockers have been fixed in the code. The development server is running on port 3002. The test environment uses an isolated test database with `USE_BACKUP_DATA=true`. The complete customer journey can now be performed manually in the visible browser.

---

**Note to tester**: The three code fixes are already in place:
1. Branch UUIDs in `lib/site.ts` are now canonical
2. Add to Cart button is disabled when required options are unselected
3. Session persistence architecture is verified correct

If any step fails, diagnose the root cause using the development server logs and the code analysis provided.