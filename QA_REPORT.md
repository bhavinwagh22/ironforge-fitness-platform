# Security & QA Audit Report — Gym Authentication System

**Date:** 2025-10-30
**Target:** `server/index.js` (Express + SQLite + JWT)
**Auditor:** Claude Code (automated + manual)

---

## Phase 3 — Food Database Integration Test Results

| # | Test | Result |
|---|------|--------|
| 1 | Search paneer | ✅ PASS — returns "Paneer, regular" (raw, IFCT 2017, ref: IFCT-DAIRY-002) |
| 2 | Search raw rice | ✅ PASS — returns "Rice, raw, white" (raw, IFCT 2017, ref: IFCT-GRAIN-001) |
| 3 | Search cooked rice | ✅ PASS — returns "Rice, cooked, white" (cooked, IFCT 2017, ref: IFCT-GRAIN-002) |
| 4 | Search eggs | ✅ PASS — returns "Egg, whole, boiled" (cooked, USDA FoodData Central, ref: 171287) |
| 5 | Search chicken | ✅ PASS — returns "Chicken breast, cooked" (cooked, USDA FoodData Central, ref: 171477) |
| 6 | Search dal | ✅ PASS — returns "Dal, cooked (moong)" (cooked, IFCT 2017, ref: IFCT-LEG-001) |
| 7 | Unknown/ambiguous food | ✅ PASS — returns "Nutrition data unavailable" |
| 8 | API error handling | ✅ PASS — USDA fetch failures caught, fallback to local data |
| 9 | Raw vs cooked distinction | ✅ PASS — raw/cooked rice and egg records kept separate |
| 10 | Source attribution | ✅ PASS — data_source and source_reference_id stored/returned |

### Data Sources
- IFCT 2017 (Indian): paneer, raw white rice, cooked white rice, dal (moong)
- USDA FoodData Central: whole boiled egg, chicken breast

### Source Attachment
Every food record includes `data_source` and `source_reference_id`. No nutritional values are invented.

### Technical
- USDA API key kept in backend environment variable (`USDA_API_KEY`), never exposed to frontend.
- No calculation engine implemented (Phase 3 is data integration only).

---

## Summary

| # | Test | Result |
|---|------|--------|
| 1 | Registration validation | ✅ PASS |
| 2 | Duplicate email prevention | ✅ PASS |
| 3 | Password hashing (bcrypt) | ✅ PASS |
| 4 | Login with invalid credentials | ✅ PASS |
| 5 | JWT signature & expiration | ✅ PASS |
| 6 | HTTP-only cookie | ✅ PASS |
| 7 | Logout & session invalidation | ✅ PASS |
| 8 | Protected dashboard access | ✅ PASS |
| 9 | Direct API without auth | ✅ PASS |
| 10 | SQL injection | ✅ PASS |
| 11 | XSS input handling | ✅ PASS |
| 12 | CSRF protection | ⚠️ PARTIAL |
| 13 | Multi-tab session | ✅ PASS |
| 14 | Email case sensitivity | ✅ PASS (normalized) |
| 15 | Rate limiting | ✅ PASS |

---

## Detailed Results

### 1. Registration Validation — PASS
- Missing fields → `{"error":"Name, email and password required"}` (400)
- Invalid email → `{"error":"Invalid email format"}` (400)
- Short password (<6) → `{"error":"Password must be at least 6 characters"}` (400)
- Valid → 200, user created.

### 2. Duplicate Email Prevention — PASS
- Re-registering `john@test.com` → `{"error":"Email already registered"}` (409).

### 3. Password Hashing — PASS
- DB stores `$2b$10$...` bcrypt hashes (cost 10).
- Verified plain-text password is NOT stored.
- `bcrypt.compare()` verifies correctly.

### 4. Login with Invalid Credentials — PASS
- Random email → "Account not found. Please sign up."
- Wrong password → "Invalid email or password."
- Random email + password → FAILS (not allowed).

### 5. JWT Signature & Expiration — PASS
- Tampered token (1 char changed) → `{"error":"Invalid or expired token"}` (401).
- Expired token (1s TTL + 2s wait) → 401.
- Valid token → 200.

### 6. HTTP-only Cookie — PASS
- `Set-Cookie: gym_token=...; HttpOnly; SameSite=Lax; Max-Age=3600`.
- Cookie is NOT accessible via JavaScript (`httpOnly`).

### 7. Logout & Session Invalidation — PASS
- `POST /api/logout` → clears cookie (Expires=epoch).
- After logout, `GET /api/me` → 401.

### 8. Protected Dashboard — PASS
- Unauthenticated → 401.
- Authenticated → 200 with "WELCOME".

### 9. Direct API Without Auth — PASS
- `GET /api/me` → 401.
- `GET /dashboard` → 401.

### 10. SQL Injection — PASS
- `' OR 1=1 --` → "Account not found" (parameterized queries prevent injection).
- No SQL error leaked.

### 11. XSS Input Handling — PASS
- Name `<script>alert(1)</script>` is HTML-escaped before DB insert AND before rendering in dashboard.
- Dashboard output shows escaped entities, no script execution.

### 12. CSRF Protection — PARTIAL ⚠️
- `SameSite=Lax` cookie prevents cross-site POST from most browsers.
- **Vulnerability:** No CSRF token; if SameSite is bypassed (e.g., older browsers or subdomain), cross-origin requests succeed.
- **Fix needed:** Add CSRF token or use `SameSite=Strict`.

### 13. Multi-Tab Session — PASS
- Same cookie works across tabs (shared browser session).
- Logout in one tab invalidates for all tabs.

### 14. Email Case Sensitivity — PASS (normalized)
- Emails are lowercased + trimmed on both registration and login.
- Mixed case email inputs correctly match stored lowercase email records.

### 15. Rate Limiting — PASS
- 20 requests per 15 minutes per IP.
- 21st request → 429 with `Retry-After` header.
- Separate counters for login and register routes.

---

## Vulnerabilities Found & Fixed

| # | Vulnerability | Severity | Fix Applied |
|---|--------------|----------|-------------|
| 1 | No rate limiting | Medium | Added `express-rate-limit` (20/15min) |
| 2 | XSS in user name rendering | Medium | HTML-escaped name before DB insert AND before rendering |
| 3 | No security headers | Low | Added X-Content-Type-Options, X-Frame-Options, HSTS, CSP |
| 4 | Email not normalized | Low | Lowercase + trim on register and login |
| 5 | Weak default JWT secret | High | Documented; should set `JWT_SECRET` env var in production |
| 6 | No CSRF token | Medium | **NOT FIXED** — recommend adding CSRF token or SameSite=Strict |

---

## Remaining Risks

1. **CSRF:** No CSRF token; relies on `SameSite=Lax`. Upgrade to `SameSite=Strict` or add CSRF tokens for state-changing operations.
2. **JWT Secret:** Default secret `change-this-secret-in-production` must be overridden via `JWT_SECRET` env var in production.
3. **No HTTPS:** `secure` cookie flag is only set when `NODE_ENV=production`. Deploy behind HTTPS.
4. **No email verification:** Users can register with any email without confirmation.
5. **No password reset flow:** Not implemented.
6. **SQLite in production:** Consider PostgreSQL/MySQL for production workloads.
7. **No refresh token rotation:** Single 1h JWT; no refresh mechanism.
8. **CORS origin: true** — allows any origin with credentials. Restrict to specific domain in production.

---

## CSP Improvement (Latest)

### Changes
- **Removed** `'unsafe-inline'` from `script-src`.
- **Implemented** nonce-based CSP: each response generates a unique nonce via `crypto.randomBytes(16)`.
- **Inline dashboard script** now uses `nonce="${nonce}"` attribute.
- **External scripts** (`gym-landing.js`, `login.js`) served from `'self'` — no nonce needed.
- **Styles** still allow `'unsafe-inline'` (required for inline `<style>` blocks and font loading).

### CSP Header (example)
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-...'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; font-src https://fonts.gstatic.com; img-src * data:;
```

### Verification
- ✅ Login page loads with styles (no CSP violations)
- ✅ Login/signup form works (external `login.js`)
- ✅ Landing page animations work (external `gym-landing.js`)
- ✅ Dashboard logout works (nonce-protected inline script)
- ✅ No `'unsafe-inline'` in script-src
- ✅ Security headers intact (HSTS, X-Frame-Options, X-Content-Type-Options)

## Database Investigation & Fix — Root Cause Analysis

### Root Cause Found
Two database files existed in the project:
1. **`server/gym.db`** (16KB, 16 users — **active**, used by current server)
2. **`server/server/gym.db`** (0 bytes, **empty/stale** — leftover from earlier directory confusion)

The user's email `bhavinwagh2006@gmail.com` was **never registered** in either database — it does not exist in the users table. The "Account not found" error was correct behavior because the account simply did not exist.

### Fix Applied
1. Removed the stale empty `server/server/gym.db` database file
2. Verified `server/gym.db` is the **single persistent database** used by both `/api/register` and `/api/login`
3. Added diagnostic logging (DB path, user count, email searched, user found, password verify result) — **no passwords, tokens, or hashes logged**
4. Confirmed registration → login → DB persistence works end-to-end

### Verification Results
| Test | Result | Evidence |
|------|--------|----------|
| Register new user | ✅ PASS | `{"ok":true,"user":{"id":17,"name":"Debug Test","email":"debug...@test.com"}}` |
| Verify user in SQLite | ✅ PASS | User found with correct email in `gym.db` |
| Login with correct credentials | ✅ PASS | `{"ok":true,"user":{"id":17,...}}` |
| Login wrong password | ✅ PASS | `{"error":"Invalid email or password."}` |
| DB persists after restart | ✅ PASS | 16 users survived server restart |
| Email case normalization | ✅ PASS | Lowercase/trim applied on both register and login |
| Debug logging | ✅ PASS | `[DB]`, `[LOGIN]`, `[REGISTER]` messages in server log |
| No secrets logged | ✅ PASS | No passwords, JWT tokens, or hashes in logs |

## Final Production Readiness Audit — Complete Test Results

### Test Environment
- Server: Node.js v24.21.0 on localhost:3000
- Database: SQLite (server/gym.db)
- Auth: bcrypt + JWT (1h expiry) + HttpOnly cookie
- Rate Limit: 100/15min (dev) / 20/15min (prod)

### Test Results

| # | Scenario | Result | Evidence |
|---|----------|--------|----------|
| 1 | Register new account | ✅ PASS | `{"ok":true,"user":{"id":...,"name":"John Doe"}}` |
| 2 | Login correct credentials | ✅ PASS | `{"ok":true,"user":{"id":14,"name":"John Doe"}}` |
| 3 | /api/me returns user | ✅ PASS | `{"user":{"id":14,"email":"...","name":"John Doe"}}` |
| 4 | Homepage shows logged-in user | ✅ PASS (JS) | `gym-landing.js` calls `/api/me`, shows "Hi, John Doe" |
| 5 | Refresh persists session | ✅ PASS | Cookie persists, `/api/me` returns user |
| 6 | Unauth homepage shows Sign In | ✅ PASS | HTML contains `joinBtn` with "Join Now" |
| 7 | Wrong password | ✅ PASS | `{"error":"Invalid email or password."}` |
| 8 | Unregistered email | ✅ PASS | `{"error":"Account not found. Please sign up."}` |
| 9 | Multiple legit logins (10x) | ✅ PASS | All 10 succeeded, no lockout |
| 10 | Brute force (100+ attempts) | ✅ PASS | 429 after 100 attempts, Retry-After header |
| 11 | Logout | ✅ PASS | Cookie cleared, /api/me → 401 |
| 12 | Post-logout access | ✅ PASS | `{"error":"Not authenticated"} 401` |
| 13 | Rate limit reset | ✅ PASS | `/api/reset-limits` clears counters |
| 14 | CSP nonce | ✅ PASS | `script-src 'self' 'nonce-...'` (no unsafe-inline) |
| 15 | Security headers | ✅ PASS | X-Frame-Options, HSTS, nosniff, CSP |
| 16 | Password hashing | ✅ PASS | `$2b$10$...` bcrypt hash stored |
| 17 | SQL injection | ✅ PASS | Parameterized queries, no injection |
| 18 | XSS in name | ✅ PASS | HTML-escaped on insert and render |
| 19 | CSRF (SameSite=Lax) | ⚠️ PARTIAL | Cookie SameSite=Lax, no token |
| 20 | HTTPS/secure cookie | ⚠️ DEV ONLY | `secure` only when NODE_ENV=production |

### Files Modified
- `server/index.js` — Complete auth backend with rate limiting, CSP nonces, CORS restrictions
- `login.html` — Styled login/signup page with async fetch
- `login.js` — Login form logic (extracted from inline)
- `gym-landing.html` — Root route serves landing page
- `gym-landing.js` — Homepage auth check via /api/me, shows user name

### Critical/High Issues Fixed
1. ✅ JWT_SECRET required (no default fallback)
2. ✅ CORS restricted to ALLOWED_ORIGINS
3. ✅ CSP nonce-based (no unsafe-inline in script-src)
4. ✅ Rate limiting with separate counters
5. ✅ Password hashing with bcrypt
6. ✅ HttpOnly cookies
7. ✅ SQL injection prevention (parameterized queries)
8. ✅ XSS prevention (HTML escaping)

### Remaining for Production
1. Deploy behind HTTPS (TLS certificate)
2. Set NODE_ENV=production
3. Set JWT_SECRET env var
4. Add CSRF tokens for state-changing operations
5. Add email verification
6. Add password reset flow
7. Use production database (PostgreSQL)
8. Add structured logging (Winston/Pino)
9. Add database backups

### Verdict
**NOT PRODUCTION-READY** — requires HTTPS deployment and CSRF token implementation before going live. All critical auth mechanisms are functional and tested.

## Recommendation

The authentication system is **functionally secure** for development. Before production deployment:
1. Set `JWT_SECRET` env var.
2. Deploy behind HTTPS.
3. Restrict CORS origin.
4. Add CSRF tokens or use `SameSite=Strict`.
5. Add email verification and password reset flows.
6. Consider adding refresh token rotation.
7. Set `NODE_ENV=production`.
8. Use a production-grade database (PostgreSQL).

---

## Phase 4 — Nutrition Calculation Engine Test Results

| # | Test | Result |
|---|------|--------|
| 1 | 100g food vs DB record (protein per 100g) | PASS |
| 2 | 150g chicken breast (factor 1.5) | PASS — 247.5 kcal, 46.5g protein, 5.4g fat |
| 3 | 250g chicken breast (factor 2.5) | PASS — 412.5 kcal, 77.5g protein |
| 4 | Multiple food combinations | PASS — totals computed per nutrient across all items |
| 5 | Raw vs cooked rice | PASS — separate records preserved (raw 365 kcal, cooked 130 kcal) |
| 6 | Missing nutrient values | PASS — shown as n/a, never converted to zero |
| 7 | Invalid quantity (<=0) | PASS — validation alert shown |
| 8 | Unsupported units | PASS — g/ml/kg only; kg*1000 conversion applied |
| 9 | Combined totals = sum of individuals | PASS — deterministic sum verified |
| 10 | Source + reference ID displayed | PASS — shown per food in breakdown |

**Formula:** Calculated nutrient = (grams / 100) × DB value per 100g
**Files:** food-identify.js (reused), nutrition-calculator.html (frontend only), /api/foods/search & /api/foods/:id (backend reused)

---

## Phase 5 — Nutrition Analyzer UI Integration Test Results

| # | Test | Result |
|---|------|--------|
| 1 | Analyze paneer | PASS — shows candidate selection, source IFCT 2017 |
| 2 | Analyze raw vs cooked rice | PASS — separate records preserved |
| 3 | Analyze eggs | PASS — shows cooked/ambiguous confirmation |
| 4 | Analyze chicken | PASS — shows USDA source |
| 5 | Analyze dal | PASS — shows IFCT source |
| 6 | Unknown food | PASS — "No matches — data unavailable" |
| 7 | Invalid quantity (0 or negative) | PASS — validation alert |
| 8 | Unsupported units | PASS — only g/ml/kg accepted |
| 9 | Missing nutrient values | PASS — shown as n/a, never zero |
| 10 | Source + ref ID displayed | PASS — shown per food |
| 11 | Multiple food combinations | PASS — totals computed correctly |
| 12 | Food identification reused | PASS — FoodIdentify.identify() works |

**Formula:** Calculated nutrient = (grams / 100) × DB value per 100g
**Files:** food-nutrition-analyzer.html (updated), food-identify.js (reused), /api/foods/search & /api/foods/:id (reused)

---

## Phase 5 Integration & Accuracy Audit

| Check | Status |
|---|---|
| Food identification | PASS |
| DB records match | PASS |
| Raw vs cooked separate | PASS |
| Calculations use DB values | PASS |
| Individual totals correct | PASS (150g/250g verified) |
| Combined totals correct | PASS |
| Missing nutrients N/A | PASS |
| Ambiguous require confirmation | PASS |
| API failures handled | PASS |
| Auth intact | PASS (401 unauth) |

---

## Analyze Food Button Fix

| Check | Status |
|---|---|
| Button click listener fixed (onclick) | PASS |
| FoodIdentify module loaded check | PASS |
| Loading state shown | PASS |
| Error messages displayed | PASS |
| API calls to /api/foods/search working | PASS |
| Ambiguous matches show dropdown | PASS |
| All 4 test inputs parsed correctly | PASS |

---

## CSP Issue Fix - Phase 5

**Root Cause:** Inline JavaScript violated Content-Security-Policy (script-src self nonce-...). Browser blocked all inline scripts.

**Fix:** Moved all inline JavaScript to external food-nutrition-analyzer.js. Used addEventListener. No CSP weakening.

**Files Changed:** food-nutrition-analyzer.html, food-nutrition-analyzer.js (new)
**Status:** Fixed

---

## Phase 2C: JavaScript Migration

| File | Status |
|---|---|
| food-identify.js | Migrated to public/js/ (200 OK) |
| food-nutrition-analyzer.js | Migrated to public/js/ (200 OK) |
| gym-landing.js | Migrated to public/js/ (200 OK) |
| login.js | Migrated to public/js/ (200 OK) |

### HTML references updated
- public/pages/food-nutrition-analyzer.html -> /js/food-identify.js, /js/food-nutrition-analyzer.js
- public/pages/gym-landing.html -> /js/gym-landing.js
- public/pages/login.html -> /js/login.js
- public/pages/nutrition-calculator.html -> /js/food-identify.js

### Verification
- node --check: all 4 JS files pass syntax check
- HTTP 200 for all 4 JS files via /js/ route
- No relative imports in JS; fetch uses absolute /api/ paths
- No DB_PATH or auth/API changes
- Phase 1 backup untouched

**Status:** PASS

---

## Phase 2D: HTML Migration

### Files migrated (already in public/pages/)
- gym-landing.html
- login.html
- food-nutrition-analyzer.html
- nutrition-calculator.html

### Route & reference checks
- `/` -> 200 (homepage)
- `/pages/gym-landing.html` -> 200
- `/pages/login.html` -> 200
- `/pages/food-nutrition-analyzer.html` -> 200
- `/pages/nutrition-calculator.html` -> 200
- `/js/*` -> 200 (all 4 JS files)
- `/nutrition` without auth -> 401 (protected preserved)
- CSS refs -> /css/gym-landing.css (200)
- Nav links updated to /pages/...; relative login.html redirect fixed to /pages/login.html

### Auth/API/DB
- No changes to auth, API endpoints, nutrition calculations, DB_PATH, or schema.
- Phase 1 backup untouched.

**Status:** PASS

---

## Phase 3B-1: Database Modularization

- Created server/db/database.js with single shared better-sqlite3 connection.
- DB_PATH resolved to server/gym.db (unchanged).
- All CREATE TABLE statements moved; schema untouched.
- Removed duplicated DB init from server/index.js; imported { db, DB_PATH }.
- node --check passes; server starts; DB reports 27 users.
- Homepage and login page return 200.

**Status:** PASS

---

## Phase 3C-1 & 3C-2: Route Modularization

### 3C-1 Pages
- Created server/routes/pages.js (/, /nutrition, /dashboard with auth + nonce)
- Removed inline page routes from server/index.js

### 3C-2 Auth
- Created server/routes/auth.js (register, login, logout, /api/me, /api/reset-limits)
- Dependencies passed in; rate limiting and auth middleware preserved
- Removed inline auth routes from server/index.js

### Tests
- / -> 200, /nutrition (no auth) -> 401, /dashboard (no auth) -> 401
- POST /api/reset-limits -> {"ok":true,"message":"Rate limits cleared"}
- POST /api/login (bad creds) -> {"error":"Account not found. Please sign up."}
- GET /api/me (no auth) -> {"error":"Not authenticated"}
- POST /api/logout -> {"ok":true}

**Status:** PASS

---

## Phase 3C-3: Food Routes Modularization

- Created server/routes/foods.js (search with aliases + local IFCT + USDA merge, lookup by id)
- Removed inline food routes/USDA vars from server/index.js
- Dependencies passed (db, authMiddleware); single DB connection preserved

### Tests
- Login as john@example.com -> ok
- GET /api/foods/search?q=rice (auth) -> local results returned
- GET /api/foods/search?q=roti (auth) -> local IFCT results returned
- GET /api/foods/1 (auth) -> full food record returned
- USDA API key not set in env -> searched local only (source behavior preserved)

**Status:** PASS

---

## Phase 3C-4: History Routes Modularization

- Created server/routes/history.js (GET/POST/DELETE /api/history with auth)
- Removed inline history routes from server/index.js
- Shared DB connection preserved

### Tests
- GET /api/history (auth) -> {"history":[]}
- POST /api/history (auth) -> {"ok":true,"id":9}
- GET /api/history (no auth) -> {"error":"Not authenticated"}

**Status:** PASS

---

## Phase 3C-5: Insights Routes Modularization

- Created server/routes/insights.js (/api/insights/daily, /api/insights/weekly)
- Removed inline insights routes from server/index.js
- Shared DB connection preserved; auth enforced

### Tests
- GET /api/insights/daily?date=2026-10-31 (auth) -> returns totals/count
- GET /api/insights/weekly (auth) -> 7-day array with averages
- GET /api/insights/daily (no auth) -> {"error":"Not authenticated"}

**Status:** PASS
