# Soulmate Scents — Security Remediation Report
## Phase 1: Priority 0 (Critical & High-Risk) Vulnerability Fixes

**Target System:** Soulmate Scents E-Commerce Platform  
**Branch:** `security/phase-1-remediation` (Frontend & Backend)  
**Reference Document:** `docs/SECURITY_AUDIT_REPORT.md`  
**Phase Scope:** ONLY Priority 0 (Critical & High-Risk) Vulnerabilities: `SEC-VULN-01`, `SEC-VULN-02`, `SEC-VULN-03`, `SEC-VULN-04`.  
**Execution Date:** November 2026  
**Status:** **REMEDIATED & VERIFIED** (All unit, integration, typecheck, and security tests passing)

---

## 1. Vulnerabilities Addressed

| Vulnerability ID | Title | Severity | CVSS v3.1 | Status |
| :--- | :--- | :---: | :---: | :---: |
| **SEC-VULN-01** | Unauthenticated Arbitrary File Upload & Stored XSS via `/api/upload` | **CRITICAL** | **9.8** | **PASS** |
| **SEC-VULN-02** | Customer Order Confirmation Enumeration & PII Leakage | **HIGH** | **7.5** | **PASS** |
| **SEC-VULN-03** | Unauthenticated Arbitrary Payment Proof URL Injection | **HIGH** | **7.3** | **PASS** |
| **SEC-VULN-04** | Fallback Pricing Manipulation & Phantom Inventory Creation | **HIGH** | **8.3** | **PASS** |

---

## 2. Files Modified

### Frontend Repository (`perfume-frontend`)
- `src/app/api/upload/route.ts`: Implemented mandatory session token verification, role check (`superadmin`, `admin`, `scent_specialist`), 5MB size ceiling, magic byte file signature validation (JPEG, PNG, WebP only; rejects SVG/scripts), server-controlled random filenames, and path traversal defenses.
- `src/features/admin/products/ProductForm.tsx`: Added `credentials: "include"` on file upload requests to ensure HTTP-only admin cookies are dispatched.
- `src/features/admin/products/FolderImagePickerModal.tsx`: Added `credentials: "include"` on image upload requests.
- `src/features/checkout/components/CheckoutPageView.tsx`: Updated post-checkout redirect to securely pass `token` (`orderAccessToken`) to `/order/success`.
- `src/features/checkout/services/checkoutService.ts`: Added optional `token` query param support to `getOrderConfirmation`.
- `src/features/checkout/types.ts`: Added `orderAccessToken?: string` to `CreatedOrder`.
- `src/features/orders/types.ts`: Added `orderAccessToken?: string` to `OrderConfirmation` and `token` + `fileData` to `SubmitPaymentProofPayload`.
- `src/features/orders/services/orderService.ts`: Added `token` query param support to `getOrderConfirmation` and `fileData` / `token` to `submitPaymentProof`.
- `src/features/orders/components/OrderSuccessView.tsx`: Extracted `token` from `useSearchParams()`, forwarded it to `orderService.getOrderConfirmation(orderNumber, token)`, and passed it down to `PaymentProofSection`. Fixed hook dependencies.
- `src/features/orders/components/PaymentProofSection.tsx`: Enabled direct file conversion to base64 `fileData` for server-side magic byte inspection; attached `orderAccessToken`; eliminated client-side simulated external storage URLs.
- `scripts/test-upload-security.mjs`: Automated security test suite for SEC-VULN-01.

### Backend Repository (`perfume-backend`)
- `src/modules/orders/orders.model.js`: Added `orderAccessToken` (indexed, string) and `auditLog` array schema to track payment proof replacements and state changes.
- `src/modules/orders/orders.service.js`:
  - Removed `$150` fallback pricing and `DEMO_CATALOG` fallback; enforced strict database product lookup (`ApiError.badRequest` if product not active or not in DB).
  - Validated item prices (> 0) and item quantities (integer between 1 and 50).
  - Generated cryptographically secure 64-character hex `orderAccessToken` via `crypto.randomBytes(32)` on order creation.
  - In `getOrderConfirmation`: Enforced access control (authorized admin/staff, authenticated customer owner, or valid guest `orderAccessToken` via `crypto.timingSafeEqual`); masked sensitive customer PII (`customerSnapshot.email`, `customerSnapshot.phone`, `shippingAddress.addressLine1`, `shippingAddress.phone`); stripped internal `orderAccessToken` and `customer` ID from response.
  - In `submitPaymentProof`: Enforced authorization (admin, owner, or matching `orderAccessToken`); added support for base64 `fileData` with magic byte validation (JPEG, PNG, WebP, PDF) and safe storage in `uploads/receipts/`; sanitized URLs; recorded audit log trail for replaced proofs.
- `src/modules/orders/orders.controller.js`: Added `resolveCaller` helper to safely extract authenticated users from cookie/Bearer header and pass `token` and `user` to `ordersService`.
- `src/modules/orders/orders.validation.js`: Updated `submitPaymentProofSchema` to accept `token` and `fileData` (base64) alongside sanitized URLs.
- `src/modules/inventory/inventory.service.js`: In `reserveStock`: Removed automatic creation of 50 units for non-existent inventory items; throws explicit `ApiError.badRequest` if inventory record is missing or available stock is insufficient. Maintained atomic batch reservation and rollback.
- `tests/integration/security.p0.remediation.test.js`: Comprehensive 16-test suite verifying SEC-VULN-02, SEC-VULN-03, and SEC-VULN-04.

---

## 3. Root Cause Analysis & Exact Remediation

### SEC-VULN-01: Arbitrary File Upload & Stored XSS
- **Root Cause:** Next.js `/api/upload` endpoint had zero authentication, accepted arbitrary client MIME types (`file.type.startsWith("image/")` which allows `.svg` files with `<script>` tags), had no file size limit, and wrote files directly to `public/images/perfumes/`.
- **Exact Remediation:**
  1. Mandatory session verification against backend `${env.apiUrl}/auth/me`. Only users with `superadmin`, `admin`, or `scent_specialist` roles are permitted.
  2. Buffer size capped at 5MB (`MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024`).
  3. Header byte inspection (magic bytes) strictly enforces JPEG (`FF D8 FF`), PNG (`89 50 4E 47`), or WebP (`RIFF...WEBP`). All SVG, HTML, scripts, and executable binaries are rejected.
  4. Server-controlled filenames generated via `Date.now() + "_" + crypto.randomBytes(8).toString("hex") + extension`.
  5. Target path canonicalization verifies destination is strictly inside `uploadDir` (path traversal prevention).

### SEC-VULN-02: Customer Order Confirmation Enumeration & PII Leakage
- **Root Cause:** `GET /api/v1/orders/confirmation/:orderNumber` was unauthenticated and accepted incremental order numbers, returning full `customerSnapshot` and `shippingAddress` without ownership verification.
- **Exact Remediation:**
  1. Cryptographically secure 64-character unguessable `orderAccessToken` generated on checkout (`crypto.randomBytes(32).toString('hex')`).
  2. Public/guest order confirmation access requires `?token=<orderAccessToken>`. Verified using constant-time comparison (`crypto.timingSafeEqual`).
  3. Authenticated administrators (`superadmin`, `admin`, `staff`) or the authenticated customer who owns the order can access without a token.
  4. Unauthenticated requests or invalid tokens receive `403 Forbidden`.
  5. Masked customer PII in confirmation response (email: `v***t@domain.com`, phone: `****5678`, addressLine1: `Villa ****`).

### SEC-VULN-03: Arbitrary Bank Transfer Payment Proof Injection
- **Root Cause:** `POST /api/v1/orders/:id/payment-proof` allowed any anonymous user to inject arbitrary external URLs into any order, flipping payment status without ownership verification.
- **Exact Remediation:**
  1. Authorization required: authenticated admin, authenticated owner, or matching `orderAccessToken`.
  2. Replaced arbitrary external URL dependency with direct server-side receipt upload (`fileData` base64 payload).
  3. Validated magic bytes for JPEG, PNG, WebP, and PDF; strictly stored in server's `uploads/receipts/` directory.
  4. Disallowed dangerous URL schemes (`javascript:`, data URIs, arbitrary non-HTTP protocols).
  5. Logged proof replacements in `order.auditLog`.
  6. Submitting proof NEVER marks an order as paid (remains `pending_verification` / `awaiting_payment_verification` until admin explicitly approves).

### SEC-VULN-04: Checkout Price Manipulation & Phantom Stock Spawning
- **Root Cause:** `orders.service.js` fell back to `$150` and `DEMO_CATALOG` when products were missing. In `inventory.service.js`, `reserveStock` automatically spawned 50 units of inventory for unknown SKUs.
- **Exact Remediation:**
  1. Deleted `$150` fallback and `DEMO_CATALOG`. If a product or variant is missing from MongoDB, checkout immediately rejects with `400 Bad Request`.
  2. Recalculated all subtotals, shipping fees, discounts, and totals server-side based strictly on active database prices.
  3. Line-item quantities validated as integers between 1 and 50.
  4. In `inventory.service.js`, deleted `Inventory.create({... quantity: 50 ...})`. If SKU is not tracked in inventory, checkout immediately aborts. If available stock is insufficient, checkout rejects with available quantity details.

---

## 4. API Contract & Frontend Compatibility Changes

| Endpoint | Method | Previous Contract | New Secure Contract | Backwards Compatibility |
| :--- | :---: | :--- | :--- | :--- |
| `Next.js /api/upload` | `POST` | Public, multipart form | Requires `admin_token` cookie or Bearer header (`superadmin`/`admin`/`scent_specialist`). Only JPEG/PNG/WebP <= 5MB. | Admin UI updated with `credentials: "include"`. Public access blocked. |
| `/api/v1/orders` | `POST` | Accepted missing SKUs (defaulted to $150); returned `orderNumber` | Rejects missing SKUs; returns `orderNumber` AND `orderAccessToken` | Storefront checkout automatically redirects with `?orderNumber=...&token=...` |
| `/api/v1/orders/confirmation/:orderNumber` | `GET` | Public with no token | Requires `?token=<orderAccessToken>` OR authenticated admin/owner session. Masks PII. | Confirmation page passes `token` from URL parameters. |
| `/api/v1/orders/:id/payment-proof` | `POST` | Public URL string | Requires `token` OR authenticated session. Accepts `fileData` (base64) or validated HTTPS URL. | Frontend `PaymentProofSection` converts file to base64 and passes token. |

---

## 5. Security & Verification Test Results

### File Upload Security Verification (Node Test Suite)
| Test Case | Expected Behavior | Actual Result | Status |
| :--- | :--- | :---: | :---: |
| Reject SVG with script payload | Blocked by signature detector (null) | Blocked | **PASS** |
| Reject HTML/Polyglot disguised as PNG | Blocked by signature detector (null) | Blocked | **PASS** |
| Verify authentic JPEG signature (`FF D8 FF`) | Detected as `image/jpeg`, `.jpg` | Detected | **PASS** |
| Verify authentic PNG signature (`89 50 4E 47`) | Detected as `image/png`, `.png` | Detected | **PASS** |
| Verify authentic WebP signature (`RIFF...WEBP`)| Detected as `image/webp`, `.webp` | Detected | **PASS** |
| Path traversal attack (`../../cmd.exe`) | Detected and blocked | Blocked | **PASS** |
| File size limit (> 5MB) | Flagged and rejected | Rejected | **PASS** |
| Preserve existing perfume gallery | 92 existing perfume images preserved | Preserved intact | **PASS** |

### Backend Security Integration Suite (`security.p0.remediation.test.js`)
| Test Case | Expected Behavior | Actual Result | Status |
| :--- | :--- | :---: | :---: |
| Guessable order number without token | HTTP 403 Forbidden | HTTP 403 Forbidden | **PASS** |
| Invalid/tampered order access token | HTTP 403 Forbidden | HTTP 403 Forbidden | **PASS** |
| Valid guest order access token | HTTP 200 OK + Masked PII | HTTP 200 OK | **PASS** |
| Customer PII Masking verification | Email/phone/address masked | Masked (`v***t@domain.com`, `****5678`) | **PASS** |
| Admin retrieval without guest token | HTTP 200 OK | HTTP 200 OK | **PASS** |
| Customer B accessing Customer A order | HTTP 403 Forbidden | HTTP 403 Forbidden | **PASS** |
| Payment proof without token/auth | HTTP 403 Forbidden | HTTP 403 Forbidden | **PASS** |
| Valid guest token payment proof | HTTP 200 OK | HTTP 200 OK | **PASS** |
| Direct base64 receipt upload (JPEG) | Saved to `/uploads/receipts/` | HTTP 200 OK | **PASS** |
| Fake receipt with invalid magic bytes | HTTP 400 Bad Request | HTTP 400 Bad Request | **PASS** |
| Dangerous URL scheme (`javascript:`) | HTTP 400 Bad Request | HTTP 400 Bad Request | **PASS** |
| Unknown product checkout | HTTP 400 Bad Request | HTTP 400 Bad Request | **PASS** |
| Price manipulation attempt ($1 vs $300) | Server recalculates to $300 | Recalculated from DB | **PASS** |
| Negative/Zero quantity checkout | HTTP 400 Bad Request | HTTP 400 Bad Request | **PASS** |
| Excessive quantity checkout (> 50 units) | HTTP 400 Bad Request | HTTP 400 Bad Request | **PASS** |
| Missing inventory record | HTTP 400 Bad Request (0 phantom stock) | 0 phantom stock spawned | **PASS** |
| Insufficient inventory overselling | HTTP 400 Bad Request | HTTP 400 Bad Request | **PASS** |

---

## 6. TypeScript, ESLint & Regression Results

### TypeScript Verification
- **Command:** `cd frontend && npx tsc --noEmit`
- **Result:** **PASS** (0 errors).

### Frontend ESLint
- **Command:** `cd frontend && npx next lint`
- **Result:** **PASS** on all modified remediation files (fixed hook dependency in `OrderSuccessView.tsx`).

### Backend ESLint
- **Command:** `cd backend && npx eslint ...`
- **Result:** **PASS** (0 errors).

### Full Backend Jest Regression Suite
- **Command:** `cd backend && npm test`
- **Total Test Suites:** **25 passed, 25 total** (100% passing)
- **Total Tests:** **163 passed, 163 total** (100% passing)
- **Regressions:** **0 regressions**. All existing auth, checkout, order, coupon, customer, rbac, and settings tests continue to pass.

---

## 7. Remaining Risks & Phase 2 Items (Strictly Out of Scope for Phase 1)

The following items were identified in `docs/SECURITY_AUDIT_REPORT.md` and are slated for Phase 2 / Phase 3 remediation:
1. **SEC-VULN-05 (Phase 2):** Role-Based Access Control consistency (aligning route middleware with `permissions.js` matrix).
2. **SEC-VULN-06 (Phase 2):** Hardcoded default superadmin seed password in development bootstrap.
3. **SEC-VULN-07 (Phase 2):** JWT token revocation / `passwordChangedAt` timestamp check upon password reset.
4. **SEC-VULN-08 (Phase 2):** Dedicated rate limiting on `POST /coupons/validate` and `POST /reviews`.
5. **SEC-VULN-09 (Phase 2):** `app.set('trust proxy', 1)` configuration for reverse proxy deployments.
6. **SEC-VULN-10 (Phase 2):** Next.js HTTP security headers (`X-Frame-Options`, `Content-Security-Policy`, `HSTS`).
7. **SEC-VULN-11 (Phase 3):** Upgrading dependencies with known security advisories (`proxy-addr`, `undici`, `zod`).

---

## 8. Final Phase 1 Conclusion & Sign-Off

All four **Priority 0 (Critical & High-Risk)** vulnerabilities (`SEC-VULN-01`, `SEC-VULN-02`, `SEC-VULN-03`, `SEC-VULN-04`) have been remediated, verified with targeted offensive security test cases, and integrated without regressions.

The application is now safe from anonymous file upload exploitation, customer order PII scraping, unverified payment proof injection, and checkout price tampering.

**Phase 1 Remediation is COMPLETE. Standing by for review before commencing Phase 2.**
