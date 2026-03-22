# Full Project Overview — URL Shortener

> Easy language mein poora codebase samjhao — backend se frontend tak, har file ka kaam, kyun likha, kya karta hai.

---

## Project Kya Hai?

Ek **URL Shortener** app hai — jaise bit.ly ya tinyurl.com.
Long URL dete ho → short URL milti hai → koi bhi us short URL pe click kare toh original URL pe redirect ho jata hai.

**Extra features:**
- Analytics (kaun click kiya, kahan se, kaunse device se)
- QR Code generation aur customization
- Password protected links
- Expiry date wali links
- API Keys (developers ke liye)
- Webhooks (click hone pe notification)
- Collections / Link-in-Bio (Linktree jaisa)
- A/B Testing (ek link se 2 jagah traffic split)
- Smart Routing (India se aaye toh alag URL, mobile se aaye toh alag)

---

## Project Structure

```
project/
├── backend/          ← Node.js + Express + TypeScript + Prisma (API server)
└── frontend/         ← Next.js + React + TypeScript + Tailwind (UI)
```

---

# BACKEND

## Tech Stack
- **Node.js + Express** — HTTP server
- **TypeScript** — Type-safe JavaScript
- **Prisma** — Database ORM (SQL likhne ki jagah TypeScript objects)
- **PostgreSQL** — Main database
- **JWT** — Login tokens
- **bcryptjs** — Password hashing
- **Winston** — Logging
- **Zod** — Input validation

---

## `backend/src/server.ts` — Entry Point

**Kya karta hai:** Server start karta hai.

```
1. Database se connect karo (Prisma)
2. HTTP server start karo (port 3000)
3. Graceful shutdown handle karo (Ctrl+C ya Docker stop)
4. Crash hone pe log karo
```

**Kyun graceful shutdown?**
Agar server abruptly band ho toh in-flight requests fail ho jaate hain.
Graceful shutdown mein: naye requests band karo, purane complete hone do, phir DB disconnect karo.

---

## `backend/src/app.ts` — Express App Setup

**Kya karta hai:** Saare middleware aur routes ek jagah register karta hai.

**Middleware order (bahut important hai):**
1. **Helmet** — Security headers (XSS, clickjacking se bachao)
2. **CORS** — Frontend (port 3001) ko backend (port 3000) se baat karne do
3. **Compression** — Response size 60-80% kam karo (gzip)
4. **Morgan** — Har HTTP request log karo
5. **Body Parser** — JSON request body parse karo
6. **Cookie Parser** — Password unlock cookies read karo
7. **Routes** — Business logic

**Route order kyun matter karta hai:**
`/@username` (collections public page) redirect se PEHLE register hona chahiye,
warna `/:shortUrl` catch-all route usse intercept kar leta.


---

## `backend/src/db/prisma.ts` — Database Connection

**Kya karta hai:** Ek Prisma Client instance banata hai aur poori app mein share karta hai (Singleton pattern).

**Kyun Singleton?**
Development mein hot-reload pe baar baar naye DB connections bante hain — memory leak hoti hai.
Singleton ensure karta hai ki sirf ek hi connection ho.

**Usage kisi bhi file mein:**
```typescript
import prisma from '../db/prisma';
const url = await prisma.url.findUnique({ where: { shortUrl: 'abc1234' } });
```

---

## `backend/prisma/schema.prisma` — Database Schema

**Kya karta hai:** Database ki structure define karta hai — kaun si tables hain, kaun se columns hain.

**Tables:**

| Table | Kaam |
|-------|------|
| `users` | Registered users — email, password hash |
| `api_keys` | Developer API keys — hash store hota hai, raw key nahi |
| `urls` | Har short URL ka record |
| `analytics` | Har click ka record (country, device, browser) |
| `ab_tests` | A/B test variants (JSON mein store) |
| `routing_rules` | Geo/Device based smart redirect rules |
| `webhooks` | Click notification endpoints |
| `url_reports` | Malicious URL reports |
| `collections` | Link-in-Bio pages |
| `collection_links` | Collection ke andar ke links |

**Important design decisions:**
- `id` fields `BigInt` hain — future mein billions of records handle kar sake
- `passwordHash` store hota hai, password nahi — security ke liye
- `status` enum hai: `active | disabled | deleted` — soft delete (data permanently nahi jaata)
- `ogTitle/ogImage` async fetch hote hain — URL creation slow nahi hoti

---

## `backend/src/middleware/auth.ts` — Authentication

**Kya karta hai:** Har request mein check karta hai ki user logged in hai ya nahi.

**Do functions:**

**`authMiddleware` (optional auth):**
- `Authorization: Bearer <token>` header check karo
- Token `sk_` se shuru ho → API Key hai → DB mein hash dhundo
- Token `sk_` se shuru nahi → JWT token hai → verify karo
- Valid ho → `req.userId` set karo
- Invalid/missing → silently continue (anonymous user)

**`requireAuth` (mandatory auth):**
- `req.userId` nahi hai → 401 return karo
- Hai → next() call karo

**API Key flow:**
```
Raw key: sk_abc123...
↓ SHA-256 hash
DB mein stored hash se match karo
↓ Match ho + expired nahi
req.userId = key ka owner
```

---

## `backend/src/middleware/rateLimit.ts` — Rate Limiting

**Kya karta hai:** Ek IP se zyada requests aane pe block karta hai.

**Kyun zaroori hai?**
Bina rate limit ke koi bot 1 second mein lakhs URLs create kar sakta hai — spam, DDoS.

**Different limits:**

| Limiter | Limit | Kyun |
|---------|-------|------|
| `anonymousCreateLimiter` | 5 URLs/day | Guest users spam na kar sake |
| `authCreateLimiter` | 100 URLs/min | Logged-in users ke liye relaxed |
| `redirectLimiter` | 60/min | DDoS se bachao |
| `authLimiter` | 5/min | Brute force password attacks se bachao |
| `unlockLimiter` | 5/15min | Password unlock brute force se bachao |

---

## `backend/src/middleware/validate.ts` — Request Validation

**Kya karta hai:** Route handler se pehle request body validate karta hai Zod schema se.

**Usage:**
```typescript
router.post('/create', validate(createUrlSchema), handler)
// Agar validation fail → 400 error with field-level messages
// Pass → req.body = validated + type-safe data
```

---

## `backend/src/utils/validation.ts` — Zod Schemas

**Kya karta hai:** Har endpoint ke liye input validation rules define karta hai.

**Schemas:**
- `registerSchema` — email format, password min 8 chars
- `loginSchema` — email + password required
- `createUrlSchema` — valid URL, optional alias (3-16 chars, alphanumeric), optional password, optional expiry
- `bulkCreateSchema` — array of URLs, max 100
- `createApiKeySchema` — optional name + expiry
- `createWebhookSchema` — HTTPS endpoint required
- `createCollectionSchema` — slug (3-50 chars)
- `createAbTestSchema` — min 2 variants, weights sum = 100

---

## `backend/src/utils/logger.ts` — Logging

**Kya karta hai:** `console.log` ki jagah structured logging karta hai.

**Kyun Winston?**
- Log levels: `error > warn > info > http > debug`
- Development: colorized readable format
- Production: JSON format (Datadog, CloudWatch ke liye parseable)
- File logging: `logs/errors.log` (sirf errors) + `logs/combined.log` (sab)
- File rotation: 10MB ke baad naya file

**Usage:**
```typescript
logger.info('URL created', { code, userId });
logger.error('DB error', { error: err.message });
```

---

## `backend/src/utils/swagger.ts` — API Documentation

**Kya karta hai:** `http://localhost:3000/api-docs` pe interactive API docs serve karta hai.

Route files mein JSDoc comments se automatically spec generate hoti hai.
Browser mein jaao → saare endpoints dekho → live test karo.


---

# BACKEND ROUTES

## `backend/src/routes/auth.ts` — Authentication Routes

**Base path:** `/auth`

| Endpoint | Kaam |
|----------|------|
| `POST /auth/register` | Naya account banao — email + password → JWT token |
| `POST /auth/login` | Login karo → JWT token (7 din valid) |
| `POST /auth/logout` | Logout (client-side token clear, stateless JWT) |
| `POST /auth/forgot-password` | Reset token generate karo (1 hour valid) |
| `POST /auth/reset-password` | Token verify karke password change karo |
| `DELETE /auth/account` | Account + saara data permanently delete karo |

**Security details:**
- Password: `bcrypt` hash (cost factor 12) — brute force practically impossible
- JWT: `HS256` algorithm, 7 days expiry
- Reset token: `crypto.randomBytes(32)` → SHA-256 hash DB mein store
- Forgot password: Same response whether email exists or not (security — enumeration attack se bachao)
- Rate limit: 5 attempts/minute (brute force se bachao)

---

## `backend/src/routes/create.ts` — URL Creation

**Endpoints:**
- `POST /create` — Single URL shorten karo
- `POST /bulk/create` — Max 100 URLs ek saath

**Single URL creation flow:**
```
1. Rate limit check (anonymous: 5/day, logged-in: 100/min)
2. UTM params append karo (agar diye hain)
3. Malicious URL check (Google Safe Browsing / pattern matching)
4. Dedup check — same user ki same URL already hai?
5. Alias conflict check
6. Password hash (agar diya)
7. DB insert (TEMP placeholder ke saath)
8. Base62 short code generate karo (DB id se)
9. DB update (TEMP → actual code)
10. LRU cache mein store karo
11. QR code generate karo
12. OG tags async fetch karo (fire and forget)
13. Response return karo
```

**Kyun TEMP placeholder?**
DB insert ke baad `id` milta hai → `id` se Base62 code generate hota hai → phir update.
Ek atomic operation mein nahi ho sakta kyunki id pehle chahiye.

---

## `backend/src/routes/redirect.ts` — URL Redirect (Critical Path)

**Endpoint:** `GET /:shortUrl`

**Yeh sabse important route hai** — har click yahan se guzarta hai.

**Flow (speed optimized):**
```
1. LRU Cache check (< 1ms)
   ↓ Miss hone pe
2. DB query
3. Status check (deleted/disabled/expired)
4. Password check (cookie se)
5. Smart routing (Geo/Device rules)
6. A/B test variant select
7. 302 Redirect → user chala gaya ✓
   ↓ Background mein (non-blocking)
8. Analytics DB insert (async)
9. Webhooks fire (async)
```

**Kyun async analytics?**
User ko redirect PEHLE milna chahiye — analytics baad mein save ho.
Agar analytics synchronous hoti toh redirect slow ho jaata.

---

## `backend/src/routes/manage.ts` — URL Management

**Base path:** `/urls` (auth required)

| Endpoint | Kaam |
|----------|------|
| `GET /urls` | Apni saari URLs (paginated, 20/page) |
| `GET /urls/:code` | Single URL detail |
| `PATCH /urls/:code` | URL update (long_url ya expires_at) |
| `DELETE /urls/:code` | Soft delete (status = 'deleted') |
| `PATCH /urls/:code/toggle` | Active ↔ Disabled toggle |

**Soft delete kyun?**
Hard delete se analytics data bhi chali jaati.
Soft delete mein status = 'deleted' set karo — data rehta hai, redirect nahi hota.

---

## `backend/src/routes/analytics.ts` — Analytics Routes

**Base path:** `/urls/:code/analytics` (auth required, owner only)

| Endpoint | Kaam |
|----------|------|
| `GET /summary` | Total, unique, today, week, month clicks |
| `GET /breakdown?by=country` | Country/device/browser/os/referrer breakdown |
| `GET /timeseries?period=7d` | Daily click counts (7d/30d/90d) |

---

## `backend/src/routes/qr.ts` — QR Code Routes

| Endpoint | Kaam |
|----------|------|
| `GET /:shortUrl/qr` | QR image download (PNG/SVG) |
| `GET /:shortUrl/qr/share` | WhatsApp/Twitter/Facebook share links |
| `GET /:shortUrl/qr/embed` | HTML/Markdown embed code |

**Query params for customization:**
- `format=png|svg` — format
- `size=256` — size in pixels (64-1024)
- `dark=#000000` — QR color
- `light=#ffffff` — background color
- `ecl=L|M|Q|H` — error correction level

---

## `backend/src/routes/apiKeys.ts` — API Key Management

**Base path:** `/api-keys` (auth required)

| Endpoint | Kaam |
|----------|------|
| `POST /api-keys` | Naya key generate karo (sirf ek baar dikhega) |
| `GET /api-keys` | Apne saare keys dekho (prefix only, hash nahi) |
| `DELETE /api-keys/:id` | Key revoke karo |

**Security:**
- Raw key: `sk_` + 32 random bytes (64 hex chars)
- DB mein: SHA-256 hash store hota hai
- Raw key sirf create response mein ek baar aata hai — save karo!

---

## `backend/src/routes/webhooks.ts` — Webhook Management

**Base path:** `/webhooks` (auth required)

Jab koi URL click kare toh tumhare server pe POST request bhejo.

| Endpoint | Kaam |
|----------|------|
| `POST /webhooks` | Naya webhook register karo |
| `GET /webhooks` | Apne saare webhooks |
| `PATCH /webhooks/:id` | Update karo |
| `DELETE /webhooks/:id` | Delete karo |

**HMAC Signature:**
Har webhook request mein `X-Signature: sha256=<hash>` header hota hai.
Receiver verify kar sakta hai ki request genuine hai.

---

## `backend/src/routes/collections.ts` — Link-in-Bio

**Kya hai:** Linktree jaisa feature — `/@username` pe ek page pe multiple links.

**Public route (no auth):**
- `GET /@:username` — Public collection page

**Auth required routes:**
- `POST /collections` — Collection banao
- `GET /collections` — Apni collections
- `PATCH /collections/:slug` — Update
- `DELETE /collections/:slug` — Delete
- `POST /collections/:slug/links` — Link add karo
- `DELETE /collections/:slug/links/:id` — Link remove karo
- `PATCH /collections/:slug/links/reorder` — Links reorder karo

**Kyun alag `publicRouter` aur `router`?**
Public route (`/@username`) ko auth nahi chahiye.
Agar sab ek router mein hote toh `requireAuth` public page bhi block kar deta.

---

## `backend/src/routes/health.ts` — Health Check

**Endpoint:** `GET /health`

Load balancer aur monitoring tools ke liye.
DB ping karta hai → sab theek hai toh `{ status: 'ok' }` return karta hai.


---

# BACKEND SERVICES

## `backend/src/services/cache.ts` — LRU Cache

**Kya karta hai:** In-memory cache — DB queries kam karta hai.

**LRU (Least Recently Used) kya hai?**
Cache full hone pe sabse purani (least recently used) entry hata do, naya add karo.
URL shortener mein 20% URLs = 80% traffic (Pareto principle) — popular URLs cache mein rehte hain.

**Implementation:**
JavaScript `Map` insertion order maintain karta hai.
- `get()`: Entry delete karo aur wapas add karo → "most recent" ho jaati hai
- `set()`: Cache full hai → `map.keys().next().value` (oldest) delete karo
- `delete()`: URL update/delete hone pe stale data remove karo

**Size:** 1000 entries (configurable)
**Production mein:** Redis use karo (multiple servers ke liye distributed cache)

---

## `backend/src/services/encoder.ts` — Short Code Generator

**Kya karta hai:** DB id se 7-character short code generate karta hai.

**Algorithm: Counter + Base62**
- Base62 characters: `a-z` (26) + `A-Z` (26) + `0-9` (10) = 62 total
- 7 chars → 62^7 = 3,500 Billion combinations
- DB id → Base62 encode → 7-char code

**Kyun counter approach?**
- Random approach: DB bhar ne pe collisions badhte hain, har baar DB check karna padta
- Counter approach: Kabhi collision nahi (har id unique), DB check nahi chahiye

**Example:**
```
id = 1000000 → "b7K2mNp" (7 chars)
id = 1000001 → "b7K2mNq" (next code)
```

---

## `backend/src/services/analytics.ts` — Analytics Processor

**Kya karta hai:** Click data process karke DB mein save karta hai.

**`emitAnalytics()`** — Fire and forget:
```
IP address → geoip-lite → country/city
User-Agent → ua-parser-js → device/browser/OS
→ DB insert (async, non-blocking)
```

**`getAnalyticsSummary()`** — Total, unique, today, week, month counts

**`getAnalyticsBreakdown()`** — Prisma `groupBy` se country/device/browser breakdown

**`getAnalyticsTimeseries()`** — Raw SQL query (Prisma groupBy date truncation support limited hai)

---

## `backend/src/services/ogFetcher.ts` — OG Tag Fetcher

**Kya karta hai:** URL create hone ke baad background mein original URL se Open Graph meta tags fetch karta hai.

**Kyun?**
WhatsApp/Slack pe share karne pe preview card dikhta hai (title, image).
Yeh data `og:title`, `og:image` meta tags se aata hai.

**Flow:**
```
1. URL fetch karo (5s timeout)
2. Sirf pehle 50KB read karo (OG tags head mein hote hain)
3. </head> milne pe stop karo
4. Regex se og:title, og:description, og:image parse karo
5. DB mein save karo
```

**Fire and forget** — URL creation slow nahi hoti.

---

## `backend/src/services/maliciousCheck.ts` — Malicious URL Detection

**Kya karta hai:** URL create karne se pehle check karta hai ki malicious toh nahi.

**Two-layer check:**
1. **Google Safe Browsing API** (agar `SAFE_BROWSING_KEY` env var set hai)
2. **Basic pattern matching** (known malicious domains, suspicious patterns)

**Agar API key nahi hai:** Basic check karta hai — production mein API key lagao.

---

## `backend/src/services/qr.ts` — QR Code Generator

**Kya karta hai:** QR code images generate karta hai.

**Functions:**
- `generateQRBuffer()` — PNG buffer (customizable colors, size, logo overlay)
- `generateQRSvg()` — SVG string (vector, scalable)
- `generateQRBase64()` — Base64 data URL (HTML mein directly embed)

**Logo overlay:** `sharp` library se QR ke center mein logo composite karta hai.
Logo ke liye `H` error correction level use karo (30% damage tolerate karta hai).

---

## `backend/src/services/webhook.ts` — Webhook Notifier

**Kya karta hai:** URL click hone pe registered endpoints pe signed POST request bhejta hai.

**HMAC-SHA256 signature:**
```
body = JSON.stringify(payload)
signature = HMAC-SHA256(secret, body)
Header: X-Signature: sha256=<signature>
```
Receiver verify kar sakta hai ki request genuine hai.

**Retry logic:** Fail hone pe exponential backoff — 1s, 2s, 4s (max 3 attempts)

---

## `backend/src/tests/apiKey.test.ts` — API Key Tests

**Kya karta hai:** API key authentication ke test cases.

**Test scenarios:**
1. Valid key → URLs list, create, api-keys list kaam karta hai
2. Invalid/wrong key → 401
3. No key → 401 on protected routes
4. Revoked key → delete ke baad 401
5. Expired key → 401 (past expiry), future expiry → 200
6. Public routes → redirect bina key ke kaam karta hai
7. Cross-user isolation → User B ka key User A ki URL delete nahi kar sakta

**Run karo:**
```bash
cd backend
npm run test:apikey
```


---

# FRONTEND

## Tech Stack
- **Next.js 14** — React framework (App Router)
- **TypeScript** — Type safety
- **Tailwind CSS** — Utility-first styling
- **Axios** — HTTP requests
- **React Hook Form + Zod** — Form validation
- **Recharts** — Charts
- **react-hot-toast** — Notifications
- **qrcode.react** — QR code rendering
- **lucide-react** — Icons

---

## `frontend/app/layout.tsx` — Root Layout

**Kya karta hai:** Poori app ka wrapper — har page pe yeh render hota hai.

**Kya include karta hai:**
- `AuthProvider` — Authentication state poori app mein available
- `AnimatedBackground` — Floating icons background
- `Navbar` — Top navigation bar
- `ErrorBoundary` — Koi bhi component crash kare toh graceful error show karo
- `Toaster` — Toast notifications (top-right)

---

## `frontend/app/page.tsx` — Landing Page (Home)

**Kya karta hai:** Main landing page — URL shortener form + features section.

**Sections:**
1. Hero section — `URLShortener` component (main form)
2. Features section — 4 feature cards (Fast, Analytics, Secure, Custom Aliases)
3. CTA section — "Create Free Account" button
4. Footer

**Note:** Authenticated users bhi landing page dekh sakte hain — redirect nahi hota.
Home button click karne pe yahi page dikhta hai.

---

## `frontend/app/dashboard/page.tsx` — Dashboard

**Kya karta hai:** Logged-in users ka main page — URLs manage karo.

**6 Tabs:**

| Tab | Kaam |
|-----|------|
| My URLs | Apni saari short URLs, stats, QR, delete, toggle |
| Bulk Create | Ek saath multiple URLs create karo |
| Advanced | A/B Testing, Smart Routing rules |
| Collections | Link-in-Bio pages manage karo |
| Webhooks | Click notifications setup karo |
| API Keys | Developer API keys manage karo |

**My URLs tab features:**
- Stats cards (total URLs, total clicks, avg clicks, active rate)
- Search + filter (active/disabled)
- Bulk select + bulk delete (checkboxes)
- URL creation timeline chart (Recharts AreaChart)
- Per-URL: copy, QR expand, analytics link, toggle, delete
- Pagination (10 per page)
- Account Settings modal (delete account)

---

## `frontend/app/login/page.tsx` — Login Page

Simple email + password form.
Submit → `authContext.login()` → JWT token localStorage mein save → dashboard redirect.
"Forgot password?" link → `/forgot-password` page.

---

## `frontend/app/register/page.tsx` — Register Page

Email + password + confirm password form.
Password min 8 chars, confirm match check.
Submit → `authContext.register()` → auto login → dashboard redirect.

---

## `frontend/app/forgot-password/page.tsx` — Forgot Password

Email form → `POST /auth/forgot-password` → reset token milta hai (dev mein response mein, prod mein email).

---

## `frontend/app/reset-password/page.tsx` — Reset Password

Token + new password form → `POST /auth/reset-password` → password change → login page redirect.

---

## `frontend/app/analytics/[code]/page.tsx` — Analytics Page

**Kya karta hai:** Ek specific URL ka detailed analytics dashboard.

**Sections:**
1. URL info header (short URL, original URL, status, expiry)
2. Action buttons (toggle, edit, delete)
3. QR Code section (download PNG/SVG, share)
4. Summary stats (6 cards: total, unique, today, week, month, avg/day)
5. Charts:
   - Clicks over time (LineChart)
   - Clicks trend (AreaChart)
   - Device breakdown (PieChart)
   - Device distribution (RadialBarChart)
   - Country breakdown (BarChart)
   - Browser breakdown (BarChart)
   - OS breakdown (BarChart)
   - Referrer breakdown (BarChart)
6. QR Customizer component
7. A/B Test info (agar configured hai)
8. Routing Rules info (agar configured hai)
9. Export CSV button

---

## `frontend/app/u/[username]/page.tsx` — Public Collections Page

**Kya karta hai:** `/@username` pe public Link-in-Bio page dikhata hai.

`GET /@:username` backend se collection data fetch karta hai → links list dikhata hai.

---

## `frontend/lib/api.ts` — API Client

**Kya karta hai:** Backend se communicate karne ke liye Axios instance aur API functions.

**Axios interceptor:**
```typescript
// Har request mein automatically token attach hota hai
config.headers.Authorization = `Bearer ${localStorage.getItem('token')}`
```

**API groups:**
- `authAPI` — register, login, logout, forgotPassword, resetPassword, deleteAccount
- `urlAPI` — create, bulkCreate, getAll, update, delete, toggle, bulkDelete
- `analyticsAPI` — getSummary, getBreakdown, getTimeseries
- `qrAPI` — download URL, getShareLink, getEmbedCode
- `apiKeyAPI` — create, getAll, revoke
- `webhookAPI` — create, getAll, update, delete
- `collectionAPI` — create, getAll, update, delete, addLink, removeLink, reorderLinks
- `abTestAPI` — create, get, delete
- `routingAPI` — create, getAll, delete

---

## `frontend/lib/auth-context.tsx` — Authentication Context

**Kya karta hai:** Authentication state poori app mein share karta hai (React Context).

**State:**
- `isAuthenticated` — logged in hai ya nahi
- `token` — JWT token
- `isLoading` — localStorage check ho raha hai

**Functions:**
- `login()` — API call → token save → state update
- `register()` — API call → auto login
- `logout()` — token remove → state reset
- `forgotPassword()` — API call
- `resetPassword()` — API call
- `deleteAccount()` — API call → auto logout

**localStorage use kyun?**
JWT token browser refresh pe bhi rehna chahiye.
`useEffect` mein localStorage check karo → hydration mismatch avoid karo.


---

# FRONTEND COMPONENTS

## `frontend/components/Navbar.tsx` — Navigation Bar

**Kya karta hai:** Top sticky navigation bar.

**Logged out:** Login + Sign Up buttons
**Logged in:** Home + Dashboard + Logout buttons

**Hydration trick:**
Server-side render mein `isAuthenticated` unknown hota hai.
`mounted` state se pehle placeholder show karo → hydration mismatch avoid karo.

---

## `frontend/components/URLShortener.tsx` — Main URL Form

**Kya karta hai:** Landing page ka main URL shortening form.

**Features:**
- React Hook Form + Zod validation (real-time error messages)
- Advanced options toggle (custom alias, password, expiry date)
- Anonymous user daily limit tracking (localStorage mein count store)
- Result card (short URL, copy button, QR code, download)
- "Create Another" button

**Anonymous limit logic:**
```
localStorage mein date + count store karo
Naya din → count reset
5 URLs/day limit → button disable
```

---

## `frontend/components/QRCustomizer.tsx` — QR Code Customizer

**Kya karta hai:** Analytics page pe QR code customize karne ka tool.

**Features:**
- 8 color presets (Classic, Ocean, Forest, Sunset, Purple, Rose, Dark Mode, Gold)
- Custom color pickers (QR color + background color)
- Error correction levels (L/M/Q/H)
- 3 export sizes (256/512/1024px)
- Live preview (real-time update)
- PNG + SVG download
- Share button (Web Share API ya clipboard fallback)

**Two tabs:** Style (colors + ECL) | Download (size + buttons)

---

## `frontend/components/AnimatedBackground.tsx` — Animated Background

**Kya karta hai:** Poore page pe floating icons aur animated lines dikhata hai.

CSS animations: `animate-float-slow/medium/fast`, `animate-pulse-slow/medium/fast`
SVG lines with gradient — decorative only, `pointer-events-none` (click through hota hai)

---

## `frontend/components/ErrorBoundary.tsx` — Error Boundary

**Kya karta hai:** Koi bhi React component crash kare toh poora app crash hone se bachata hai.

React class component hai (hooks mein `componentDidCatch` nahi hota).
Error hone pe: friendly error message + "Try Again" button dikhata hai.

---

## `frontend/components/Footer.tsx` — Footer

**Kya karta hai:** Landing page ka footer — links, social icons, copyright.

Sirf landing page pe dikhta hai (dashboard pe nahi).

---

## `frontend/components/dashboard/ApiKeysTab.tsx` — API Keys Tab

Dashboard mein API keys manage karo:
- Keys list (prefix, name, last used, expiry)
- Naya key create karo (name + optional expiry)
- Key revoke karo
- Raw key sirf create response mein ek baar dikhta hai

---

## `frontend/components/dashboard/WebhooksTab.tsx` — Webhooks Tab

Dashboard mein webhooks manage karo:
- Webhooks list
- Naya webhook create karo (HTTPS endpoint, specific URL ya sab URLs)
- Update/delete
- Secret sirf create response mein dikhta hai

---

## `frontend/components/dashboard/CollectionsTab.tsx` — Collections Tab

Dashboard mein Link-in-Bio pages manage karo:
- Collections list (slug, title, link count, public URL)
- Naya collection create karo
- Links add/remove karo
- Public URL: `BASE_URL/u/slug`

---

## `frontend/components/dashboard/BulkCreateTab.tsx` — Bulk Create Tab

Ek saath multiple URLs create karo:
- Textarea mein URLs paste karo (ek per line)
- Ya CSV upload karo
- Max 100 URLs
- Results table (success/failed per URL)

---

## `frontend/components/dashboard/AdvancedFeaturesTab.tsx` — Advanced Features Tab

A/B Testing aur Smart Routing:

**A/B Testing:**
- Ek short URL se 2+ destinations pe traffic split
- Variants: URL + weight (%) + label
- Weights sum = 100 hona chahiye

**Smart Routing:**
- Geo rules: India se aaye → Hindi page
- Device rules: Mobile se aaye → App Store
- OS rules: iOS → Apple link, Android → Play Store

---

# ENVIRONMENT VARIABLES

## Backend `.env`
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
BASE_URL=http://localhost:3000
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3001
SAFE_BROWSING_KEY=optional-google-api-key
LOG_LEVEL=debug
```

## Frontend `.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

# HOW TO RUN

## Backend
```bash
cd backend
npm install
npx prisma migrate dev    # DB tables create karo
npm run dev               # Development server (port 3000)
```

## Frontend
```bash
cd frontend
npm install
npm run dev               # Development server (port 3001)
```

## Tests
```bash
cd backend
npm run test:apikey       # API key tests run karo
```

## API Docs
Browser mein jaao: `http://localhost:3000/api-docs`

---

# DATA FLOW — URL Create se Redirect tak

```
User → POST /create
  ↓
Validation (Zod)
  ↓
Malicious check
  ↓
DB insert (TEMP)
  ↓
Base62 code generate (id se)
  ↓
DB update (actual code)
  ↓
LRU cache mein store
  ↓
QR generate
  ↓
Response: { short_url, qr_code, ... }
  ↓ (background)
OG tags fetch (async)

---

User → GET /abc1234
  ↓
LRU cache check (< 1ms)
  ↓ (miss)
DB query
  ↓
Status/expiry check
  ↓
Password check (cookie)
  ↓
Smart routing (geo/device)
  ↓
A/B test variant
  ↓
302 Redirect → User chala gaya ✓
  ↓ (background)
Analytics save (async)
Webhooks fire (async)
```

---

# SECURITY SUMMARY

| Feature | Implementation |
|---------|---------------|
| Password storage | bcrypt hash (cost 12) |
| JWT tokens | HS256, 7 days expiry |
| API keys | SHA-256 hash stored, raw key never saved |
| Webhook verification | HMAC-SHA256 signature |
| Rate limiting | Per-IP + per-user limits |
| Input validation | Zod schemas on all endpoints |
| SQL injection | Prisma ORM (parameterized queries) |
| XSS | Helmet headers |
| CORS | Whitelist only allowed origins |
| Malicious URLs | Google Safe Browsing API |
| Password reset | Secure random token, 1 hour expiry |

---

*Yeh document poore codebase ka A to Z overview hai. Koi bhi developer yeh padh ke project samajh sakta hai.*
