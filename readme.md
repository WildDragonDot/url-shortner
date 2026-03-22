# URL Shortener — Interview Preparation Guide
> Stack: TypeScript + Node.js + PostgreSQL

---

## 1. Problem Statement

"Design a URL Shortener like TinyURL / Bitly"

Simple shabdon mein:
- User ek lambi URL deta hai → system ek chhoti 7-character URL return karta hai
- Jab koi chhoti URL click kare → original lambi URL pe redirect ho jaaye
- Service fast, reliable aur scalable honi chahiye

---

## 2. Clarifying Questions (Interview mein ZAROOR poochho)

| Question | Assumed Answer |
|----------|---------------|
| Short URL kitni lambi hogi? | 7 characters |
| URL kabhi expire hogi? | Optional expiry support |
| Custom alias allowed hai? | Haan, max 16 characters |
| Kitne requests per month? | 100 million new URLs/month |
| Read/Write ratio? | 200:1 (zyada reads hain) |
| Analytics chahiye? | Haan, redirect count track karna hai |
| Service 24/7 available honi chahiye? | Haan, high availability |

---

## 3. Capacity Estimation

### Traffic
```
Write (URL create):
100 million / month = ~40 URLs/second

Read (URL redirect):
Read:Write = 200:1 → 40 * 200 = 8,000 redirects/second
```

### Storage
```
Service lifetime = 100 years
Total URLs = 100M * 12 * 100 = 120 Billion URLs
Ek record = ~500 bytes
Total storage = 120B * 500 bytes = 60 TB
```

### Cache Memory
```
Daily redirects = 8000/s * 86400s = ~700 Million/day
20% cache karo (Pareto: 20% URLs = 80% traffic)
Cache size = 0.2 * 700M * 500 bytes = ~70 GB
```

### Summary
| Metric | Value |
|--------|-------|
| Write throughput | 40 URLs/sec |
| Read throughput | 8,000 redirects/sec |
| Total URLs (100 years) | 120 Billion |
| Storage | 60 TB |
| Cache | ~70 GB |
| Short URL length | 7 chars |

---

## 4. Functional vs Non-Functional Requirements

### Functional (kya karna hai)
1. Long URL → Short URL generate karo
2. Short URL click → Original URL pe redirect
3. Custom alias support
4. Analytics — kitni baar click hua
5. Optional URL expiry

### Non-Functional (kaisa karna hai)
1. High Availability — 99.99% uptime
2. Low Latency — Redirect < 10ms
3. Scalability — 8000 reads/sec handle kare
4. Durability — Data kabhi lose na ho
5. Consistency — Ek short URL sirf ek long URL pe point kare

---

## 5. API Design

### POST /create
```
Request Body:
{
  "url": "https://very-long-website.com/path",
  "alias": "mylink",              // optional, max 16 chars
  "expires_at": "2026-12-31T00:00:00Z"  // optional
}

Response 201:
{
  "short_url": "https://short.ly/abc1234",
  "long_url": "https://very-long-website.com/path",
  "qr_code": "data:image/png;base64,iVBORw0KGgo..."  // base64 QR image
}

Errors:
400 → Invalid URL
409 → Alias already taken
413 → Request too large
```

### GET /{short_url}
```
Response: 302 Found
Location: https://original-long-url.com

Errors:
404 → Not found
410 → URL expired
```

### GET /{short_url}/qr
```
Query params:
  format = png | svg     (default: png)
  size   = 64–1024       (default: 256)
  logo   = true | false  (default: false)

Response: 200 OK
Content-Type: image/png  OR  image/svg+xml
Content-Disposition: attachment; filename="qr-abc1234.png"

Errors:
404 → Short URL not found
410 → URL expired
```

### GET /{short_url}/qr/share
```
Response 200:
{
  "short_url": "https://short.ly/abc1234",
  "qr_image_url": "https://short.ly/abc1234/qr?format=png",
  "share_links": {
    "whatsapp": "https://wa.me/?text=...",
    "twitter":  "https://twitter.com/intent/tweet?...",
    "facebook": "https://www.facebook.com/sharer/...",
    "email":    "mailto:?subject=...&body=...",
    "telegram": "https://t.me/share/url?...",
    "linkedin": "https://www.linkedin.com/sharing/..."
  },
  "web_share_data": { "title": "...", "text": "...", "url": "..." }
}
```

### GET /{short_url}/qr/embed
```
Query params:
  size = 64–1024  (default: 256)

Response 200:
{
  "html":      "<a href='...'><img src='...' /></a>",
  "markdown":  "[![QR Code](...)](...)",
  "image_url": "https://short.ly/abc1234/qr?format=png&size=256"
}
```

---

## 6. Database Schema (PostgreSQL)

```sql
CREATE TABLE urls (
  id          BIGSERIAL PRIMARY KEY,
  short_url   VARCHAR(16) UNIQUE NOT NULL,
  long_url    TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NULL
);

CREATE INDEX idx_short_url ON urls(short_url);
CREATE INDEX idx_long_url  ON urls(long_url);

CREATE TABLE analytics (
  id         BIGSERIAL PRIMARY KEY,
  short_url  VARCHAR(16) NOT NULL,
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT
);
```

SQL kyun choose kiya?
- ACID transactions chahiye (duplicate short URL nahi banne chahiye)
- INSERT IF NOT EXISTS easily support karta hai
- Read replicas se scale kar sakte hain

---

## 7. Short URL Generation — 4 Algorithms

### Algorithm 1: Random Base62
```
Base62 = [a-z A-Z 0-9] = 62 chars
7 chars → 62^7 = 3,500 Billion combinations

Steps:
1. 7 random chars choose karo
2. DB mein check karo — exists?
3. Nahi → save karo | Haan → retry (max 5)

Problem: DB bhar ne pe collisions badhte hain → slow
```

### Algorithm 2: Counter + Base62 (BEST)
```
Steps:
1. Auto-increment counter (100000000000 se shuru)
2. Har nayi URL pe counter++
3. Counter → Base62 convert karo
   100000000000 → "1L9zO9O" (7 chars)

Faayda: Kabhi collision nahi, DB check nahi karna

Distributed scaling → Zookeeper:
  Server 1: counter range 1 to 10M
  Server 2: counter range 10M to 20M
  Server 3: counter range 20M to 30M
```

### Algorithm 3: MD5 Hash
```
Steps:
1. Long URL ka MD5 hash nikalo (32 hex chars)
2. Pehle 7 chars lo
3. Collision? → Next 7 chars try karo

Use case: Same URL ko same short URL dena ho (deterministic)
Problem: Collisions possible hain
```

### Algorithm 4: KGS (Key Generation Service)
```
Steps:
1. Offline service chalao → crores of 7-char keys pre-generate kare
2. "unused_keys" table mein store karo
3. URL shorten karna ho → ek key lo, "used_keys" mein move karo

Faayda: Bahut fast, no collision
Nuksan: KGS single point of failure → Standby replica rakhna padega
```

---

## 8. Complete System Flow

### Write Path (URL Create)
```
User → POST /create { url: "https://long-url.com" }
  ↓
[Validation] — Valid URL? Length OK? Alias valid?
  ↓
[Dedup Check] — Kya yeh URL pehle se DB mein hai?
  YES → existing short_url return karo
  NO  ↓
[Encoder] — 7-char base62 generate karo
  ↓
[PostgreSQL] — INSERT INTO urls
  ↓
[LRU Cache] — Cache mein bhi daal do
  ↓
Response: { short_url, long_url } → HTTP 201
```

### Read Path (Redirect) — CRITICAL
```
User → GET /abc1234
  ↓
[LRU Cache Check] ← 80% requests yahan resolve hoti hain
  │
  CACHE HIT → long_url mila
    ├── Expiry check: expired? → 410 Gone
    └── HTTP 302 → Location: long_url
          └── [Analytics Emit — ASYNC, non-blocking]
  │
  CACHE MISS
    ↓
  [PostgreSQL Query]
  SELECT long_url, expires_at WHERE short_url = 'abc1234'
    ├── NOT FOUND → 404
    └── FOUND
          ├── Cache mein store karo
          ├── Expiry check → 410 if expired
          └── HTTP 302 → Location: long_url
                └── [Analytics Emit — ASYNC]
```

---

## 9. System Architecture

```
              [Client / Browser]
                     |
              [Load Balancer]
             /               \
    [Node.js Server 1]   [Node.js Server 2]
    [LRU Cache]          [LRU Cache]
             \               /
              [PostgreSQL Primary]  ──→  [Read Replica]
                     |
              [Analytics Queue]
              (Async, non-blocking)
```

---

## 10. Why HTTP 302 and not 301?

| | 301 Permanent | 302 Temporary |
|--|--------------|---------------|
| Browser behavior | Cache kar leta hai | Har baar server se guzarta hai |
| Analytics | Miss ho jaata hai | Har redirect track hota hai |
| URL Shortener ke liye | Wrong | Correct |

Answer: 302 use karte hain taaki har redirect hamare server se guzre aur analytics track ho sake.

---

## 11. Caching Strategy

LRU (Least Recently Used) Eviction:
```
Cache full ho gayi → Sabse purana entry nikalo, naya daal do

Cache: [A, B, C, D, E]  (A = oldest)
Naya F aaya → A nikalo
Cache: [B, C, D, E, F]
```

Cache Update:
- Write-through: URL create hote hi cache mein daal do
- Cache miss pe: DB se fetch karo, cache mein store karo

---

## 12. Scaling Strategies

### App Servers
```
Load Balancer → Multiple Node.js servers
Ek server down? Traffic doosre pe jaata hai
Traffic badha? Naye servers add karo
```

### Database
```
Primary DB → sirf writes (40/sec)
Read Replicas → sirf reads (8000/sec)
```

### Counter Distribution (Zookeeper)
```
Problem: Ek counter ek server pe → bottleneck
Solution: Zookeeper counter ranges assign karta hai

Server 1 → 1 to 10M
Server 2 → 10M to 20M
Server 3 → 20M to 30M
```

---

## 13. Single Points of Failure aur Solutions

| Component | SPOF Risk | Solution |
|-----------|-----------|----------|
| App Server | Haan | Multiple servers + Load Balancer |
| Database | Haan | Primary + Read Replicas + Failover |
| KGS | Haan | Standby KGS replica |
| Load Balancer | Haan | Active-Passive LB |

---

## 14. Common Interview Questions aur Answers

**Q1: SQL ya NoSQL kyun choose kiya?**
SQL (PostgreSQL) kyunki ACID chahiye, duplicate short URLs nahi banne chahiye. NoSQL eventually consistent hota hai jo yahan problem create kar sakta hai.

**Q2: Short URL 7 chars kyun?**
62^7 = 3,500 Billion combinations. Humein 120 Billion chahiye (100 years). 7 chars sufficient hai with room to spare.

**Q3: Collision kaise handle karoge?**
Counter-based approach mein collision possible hi nahi. Random approach mein DB check + retry (max 5).

**Q4: Cache eviction policy kya use karoge?**
LRU — kyunki recently accessed URLs dobara access hone ki probability zyada hai.

**Q5: Analytics slow nahi karega redirect ko?**
Nahi — analytics async emit karte hain. Redirect response pehle jaata hai, analytics background mein process hoti hai.

**Q6: Agar same long URL do baar submit ho?**
Dedup check karte hain — long_url pe index hai, existing short_url return karte hain.

**Q7: Custom alias aur generated URL mein conflict?**
Dono same table mein store hain. Alias bhi short_url column mein jaata hai. Uniqueness constraint handle karta hai conflict.

**Q8: URL expiry kaise implement karoge?**
expires_at column store karo. Redirect ke time check karo — agar past mein hai toh 410 Gone return karo.

**Q9: System ko aur scale karna ho toh?**
- Database sharding (short_url hash pe)
- Redis distributed cache (in-memory ke badle)
- CDN edge pe caching
- Kafka for analytics pipeline

**Q10: Security concerns kya hain?**
- Rate limiting (spam se bachao)
- URL validation (malicious URLs block karo)
- API key authentication
- Max URL length enforce karo

---

## 15. Project Structure (TypeScript + Node.js)

```
src/
  routes/
    create.ts       → POST /create handler
    redirect.ts     → GET /:shortUrl handler
    qr.ts           → GET /:shortUrl/qr handler
    health.ts       → GET /health handler
  services/
    encoder.ts      → Short URL generation algorithms
    cache.ts        → LRU cache implementation
    analytics.ts    → Async analytics emitter
    qr.ts           → QR code generation (qrcode npm package)
  db/
    postgres.ts     → DB connection + queries
    schema.sql      → Table definitions
  middleware/
    validation.ts   → Input validation
    logger.ts       → Request logging
  app.ts            → Express app setup
  server.ts         → Server entry point
```

---

## 16. QR Code Feature — Full Implementation

### Dependencies
```bash
npm install qrcode sharp
npm install --save-dev @types/qrcode @types/sharp
```
- `qrcode` → QR generation (PNG, SVG, base64)
- `sharp` → Logo/branding overlay PNG pe

---

### QR Features List

| Feature | Endpoint / Mechanism |
|---------|---------------------|
| PNG download | GET /:shortUrl/qr?format=png |
| SVG download | GET /:shortUrl/qr?format=svg |
| Size customize | GET /:shortUrl/qr?size=512 |
| Logo embed | GET /:shortUrl/qr?logo=true |
| Base64 in API | POST /create response mein |
| Share links | GET /:shortUrl/qr/share |
| Embed code | GET /:shortUrl/qr/embed |
| QR scan analytics | Alag track hota hai redirect se |

---

### QR Service (src/services/qr.ts)
```typescript
import QRCode from 'qrcode';
import sharp from 'sharp';

export interface QROptions {
  size?: number;    // default 256
  format?: 'png' | 'svg';
  logo?: boolean;   // brand logo center mein
}

// PNG Buffer — download / serve ke liye
export async function generateQRBuffer(
  url: string,
  opts: QROptions = {}
): Promise<Buffer> {
  const size = opts.size ?? 256;
  const qrBuffer = await QRCode.toBuffer(url, {
    width: size,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });

  if (!opts.logo) return qrBuffer;

  // Logo center mein overlay karo (brand identity ke liye)
  const logoSize = Math.floor(size * 0.2); // QR ka 20%
  const logo = await sharp('public/logo.png')
    .resize(logoSize, logoSize)
    .toBuffer();

  return sharp(qrBuffer)
    .composite([{
      input: logo,
      gravity: 'center',
    }])
    .png()
    .toBuffer();
}

// SVG string — vector format, infinitely scalable
export async function generateQRSvg(url: string): Promise<string> {
  return QRCode.toString(url, { type: 'svg', margin: 2 });
}

// Base64 Data URL — API response mein embed ke liye
export async function generateQRBase64(
  url: string,
  opts: QROptions = {}
): Promise<string> {
  const buf = await generateQRBuffer(url, opts);
  return `data:image/png;base64,${buf.toString('base64')}`;
}
```

---

### QR Route (src/routes/qr.ts)
```typescript
import { Router, Request, Response } from 'express';
import { getUrlFromDB } from '../db/postgres';
import { generateQRBuffer, generateQRSvg } from '../services/qr';

const router = Router();

// ─── Main QR endpoint ───────────────────────────────────────────
// GET /:shortUrl/qr?format=png|svg&size=256&logo=true
router.get('/:shortUrl/qr', async (req: Request, res: Response) => {
  const { shortUrl } = req.params;
  const format = (req.query.format as string) ?? 'png';
  const size   = Math.min(parseInt(req.query.size as string) || 256, 1024);
  const logo   = req.query.logo === 'true';

  const record = await getUrlFromDB(shortUrl);
  if (!record) return res.status(404).json({ error: 'Not found' });
  if (record.expires_at && new Date(record.expires_at) < new Date()) {
    return res.status(410).json({ error: 'URL expired' });
  }

  const targetUrl = `https://short.ly/${shortUrl}`;

  if (format === 'svg') {
    const svg = await generateQRSvg(targetUrl);
    // SVG download header — browser mein file save ho jaayegi
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Content-Disposition', `attachment; filename="qr-${shortUrl}.svg"`);
    return res.send(svg);
  }

  // Default: PNG
  const qrBuffer = await generateQRBuffer(targetUrl, { size, logo });
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', `attachment; filename="qr-${shortUrl}.png"`);
  res.send(qrBuffer);
});

// ─── Share Links endpoint ────────────────────────────────────────
// GET /:shortUrl/qr/share
// Returns pre-built share URLs for WhatsApp, Twitter, Email, etc.
router.get('/:shortUrl/qr/share', async (req: Request, res: Response) => {
  const { shortUrl } = req.params;

  const record = await getUrlFromDB(shortUrl);
  if (!record) return res.status(404).json({ error: 'Not found' });

  const shortLink  = `https://short.ly/${shortUrl}`;
  const qrImageUrl = `https://short.ly/${shortUrl}/qr?format=png`;
  const encoded    = encodeURIComponent(shortLink);
  const msg        = encodeURIComponent(`Check this out: ${shortLink}`);

  res.json({
    short_url:   shortLink,
    qr_image_url: qrImageUrl,
    share_links: {
      whatsapp: `https://wa.me/?text=${msg}`,
      twitter:  `https://twitter.com/intent/tweet?url=${encoded}&text=Check+this+out`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
      email:    `mailto:?subject=Shared+Link&body=${msg}`,
      telegram: `https://t.me/share/url?url=${encoded}&text=Check+this+out`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,
    },
    // Web Share API ke liye (mobile browsers)
    web_share_data: {
      title: 'Shared via short.ly',
      text:  `Check this out: ${shortLink}`,
      url:   shortLink,
    },
  });
});

// ─── Embed Code endpoint ─────────────────────────────────────────
// GET /:shortUrl/qr/embed
// Returns HTML snippet jo koi bhi apni website pe paste kar sake
router.get('/:shortUrl/qr/embed', async (req: Request, res: Response) => {
  const { shortUrl } = req.params;
  const size = parseInt(req.query.size as string) || 256;

  const record = await getUrlFromDB(shortUrl);
  if (!record) return res.status(404).json({ error: 'Not found' });

  const qrImageUrl = `https://short.ly/${shortUrl}/qr?format=png&size=${size}`;
  const shortLink  = `https://short.ly/${shortUrl}`;

  const htmlEmbed = `<a href="${shortLink}" target="_blank" rel="noopener">
  <img src="${qrImageUrl}" alt="QR Code" width="${size}" height="${size}" />
</a>`;

  const markdownEmbed = `[![QR Code](${qrImageUrl})](${shortLink})`;

  res.json({
    html:     htmlEmbed,
    markdown: markdownEmbed,
    image_url: qrImageUrl,
  });
});

export default router;
```

---

### POST /create — Updated Response
```typescript
res.status(201).json({
  short_url:    shortUrl,
  long_url:     url,
  qr_code:      qrBase64,           // data:image/png;base64,...
  qr_url:       `${shortUrl}/qr`,   // direct image endpoint
  share_url:    `${shortUrl}/qr/share`,
  embed_url:    `${shortUrl}/qr/embed`,
});
```

---

### QR Scan Analytics — Alag Track karo
```sql
-- analytics table mein source column add karo
ALTER TABLE analytics ADD COLUMN source VARCHAR(20) DEFAULT 'direct';
-- source values: 'direct', 'qr_scan', 'api'

-- QR scan detect karna:
-- Mobile browsers QR scan pe User-Agent mein koi special header nahi hota
-- Lekin ?ref=qr query param add kar sakte hain QR URL mein
-- QR URL: https://short.ly/abc1234?ref=qr
```

```typescript
// redirect.ts mein
const source = req.query.ref === 'qr' ? 'qr_scan' : 'direct';
emitAnalytics({ shortUrl, ip, userAgent, source }); // async
```

---

### Client-Side: Web Share API (Frontend)
```typescript
// Mobile pe native share sheet open hoti hai
async function shareQR(shortUrl: string, qrImageUrl: string) {
  const response = await fetch(qrImageUrl);
  const blob     = await response.blob();
  const file     = new File([blob], 'qr-code.png', { type: 'image/png' });

  if (navigator.canShare?.({ files: [file] })) {
    // QR image file directly share karo (WhatsApp, Messages, etc.)
    await navigator.share({ files: [file], title: 'QR Code', url: shortUrl });
  } else {
    // Fallback: link share karo
    await navigator.share({ title: 'Short Link', url: shortUrl });
  }
}
```

---

### QR Caching Strategy
```
QR images heavy compute nahi hain, lekin agar logo overlay ho toh thoda time lagta hai.

Cache key: qr:{shortUrl}:{size}:{logo}
TTL: same as URL expiry, ya 24 hours default

Redis mein store karo (Buffer as base64 string):
SET qr:abc1234:256:false <base64> EX 86400
```

---

### Interview mein QR ke baare mein poochha jaaye toh

**Q: QR code server-side kyun generate kiya, client-side kyun nahi?**
Server-side isliye — consistent branding, logo overlay, aur analytics track ho sake (QR scan vs direct click).

**Q: SVG vs PNG — kab kya use karein?**
SVG → print, large displays (infinitely scalable, small file size)
PNG → WhatsApp share, email attachment, web embed

**Q: QR scan aur direct click alag kaise track karoge?**
QR URL mein `?ref=qr` parameter embed karo. Redirect handler is param ko dekh ke analytics mein `source: 'qr_scan'` store karta hai.

**Q: QR cache kab invalidate hoga?**
URL expire hone pe ya manually delete karne pe. Cache key mein size aur logo flag bhi include hai taaki different variants alag cache hon.

---

## 18. Missing Features — Production-Grade Completeness

---

### Feature 1: User Authentication & Dashboard

**Kyun zaroori hai:** Bina auth ke koi bhi kisi ki URLs delete/edit kar sakta hai.

```sql
-- Users table
CREATE TABLE users (
  id           BIGSERIAL PRIMARY KEY,
  email        VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  api_key      VARCHAR(64) UNIQUE NOT NULL,  -- programmatic access ke liye
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- urls table mein user_id add karo
ALTER TABLE urls ADD COLUMN user_id BIGINT REFERENCES users(id) NULL;
-- NULL = anonymous user
```

```
New Endpoints:
POST /auth/register   → Account banao
POST /auth/login      → JWT token lo
GET  /dashboard       → Apni saari URLs dekho (paginated)
```

```typescript
// JWT middleware
// Authorization: Bearer <token>
export function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return next(); // anonymous allowed
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  req.userId = payload.userId;
  next();
}
```

---

### Feature 2: URL Management (Update / Delete / Disable)

**Kyun zaroori hai:** User galat URL shorten kar le toh? Ya link temporarily band karna ho?

```sql
-- urls table mein status column add karo
ALTER TABLE urls ADD COLUMN status VARCHAR(10) DEFAULT 'active';
-- status values: 'active', 'disabled', 'deleted'
```

```
New Endpoints:
PATCH  /urls/:shortUrl        → long_url ya expires_at update karo
DELETE /urls/:shortUrl        → URL delete karo (soft delete)
PATCH  /urls/:shortUrl/toggle → active ↔ disabled toggle
```

```typescript
// PATCH /urls/:shortUrl
// Sirf owner hi update kar sake
router.patch('/:shortUrl', authMiddleware, async (req, res) => {
  const { long_url, expires_at } = req.body;
  const record = await getUrlFromDB(req.params.shortUrl);

  if (record.user_id !== req.userId)
    return res.status(403).json({ error: 'Forbidden' });

  await updateUrl(req.params.shortUrl, { long_url, expires_at });
  cache.delete(req.params.shortUrl); // cache invalidate karo
  res.json({ message: 'Updated' });
});
```

Redirect mein status check:
```typescript
if (record.status === 'disabled') return res.status(403).json({ error: 'Link disabled' });
if (record.status === 'deleted')  return res.status(404).json({ error: 'Not found' });
```

---

### Feature 3: Advanced Analytics

**Kyun zaroori hai:** Sirf click count kaafi nahi — marketer ko country, device, referrer chahiye.

```sql
-- analytics table ko enhance karo
CREATE TABLE analytics (
  id          BIGSERIAL PRIMARY KEY,
  short_url   VARCHAR(16) NOT NULL,
  clicked_at  TIMESTAMPTZ DEFAULT NOW(),
  ip_address  VARCHAR(45),
  user_agent  TEXT,
  source      VARCHAR(20) DEFAULT 'direct',  -- direct, qr_scan, api
  -- Parsed fields (async worker fill karega)
  country     VARCHAR(2),    -- ISO code: IN, US, GB
  city        VARCHAR(100),
  device      VARCHAR(20),   -- mobile, desktop, tablet
  browser     VARCHAR(50),   -- Chrome, Safari, Firefox
  os          VARCHAR(50),   -- Android, iOS, Windows
  referrer    VARCHAR(500)   -- kahan se aaya (google.com, t.co, etc.)
);

CREATE INDEX idx_analytics_short_url ON analytics(short_url);
CREATE INDEX idx_analytics_clicked_at ON analytics(clicked_at);
```

```
Analytics Endpoints:
GET /urls/:shortUrl/analytics/summary
  → { total_clicks, unique_clicks, clicks_today, clicks_this_week }

GET /urls/:shortUrl/analytics/breakdown?by=country|device|browser|referrer
  → [{ label: 'India', count: 4500, percentage: 45 }, ...]

GET /urls/:shortUrl/analytics/timeseries?period=7d|30d|90d
  → [{ date: '2026-03-15', clicks: 234 }, ...]
```

```typescript
// Async analytics worker — redirect slow nahi hoga
async function processAnalytics(data: AnalyticsRaw) {
  const geo    = await geoip.lookup(data.ip);       // ip → country/city
  const parsed = UAParser(data.userAgent);           // UA → device/browser/os

  await db.query(`INSERT INTO analytics (...) VALUES (...)`, [
    data.shortUrl, data.ip, data.userAgent, data.source,
    geo?.country, geo?.city,
    parsed.device.type ?? 'desktop',
    parsed.browser.name,
    parsed.os.name,
    data.referrer,
  ]);
}
```

---

### Feature 4: Rate Limiting

**Kyun zaroori hai:** Bina rate limit ke koi bot 1 second mein lakhs URLs create kar sakta hai.

```typescript
import rateLimit from 'express-rate-limit';

// Anonymous users ke liye strict limit
export const createLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 10,               // 10 URLs/minute anonymous
  keyGenerator: (req) => req.ip,
  message: { error: 'Too many requests, slow down' },
});

// Authenticated users ke liye relaxed limit
export const authCreateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,              // 100 URLs/minute logged-in user
  keyGenerator: (req) => req.userId ?? req.ip,
});

// Redirect pe bhi limit (DDoS protection)
export const redirectLimiter = rateLimit({
  windowMs: 1000,        // 1 second
  max: 50,               // 50 redirects/sec per IP
});
```

```
Rate Limit Headers (response mein):
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1711234567
```

---

### Feature 5: Bulk URL Shortening

**Kyun zaroori hai:** Marketing teams ko ek baar mein 100s of URLs shorten karni hoti hain.

```
POST /bulk/create
Request:
{
  "urls": [
    { "url": "https://example.com/page1", "alias": "p1" },
    { "url": "https://example.com/page2" },
    { "url": "https://example.com/page3" }
  ]
}

Response 207 Multi-Status:
{
  "results": [
    { "status": 201, "short_url": "https://short.ly/p1",      "long_url": "..." },
    { "status": 201, "short_url": "https://short.ly/abc1234", "long_url": "..." },
    { "status": 409, "error": "Alias already taken",          "long_url": "..." }
  ],
  "summary": { "success": 2, "failed": 1 }
}
```

```typescript
// Bulk insert — ek DB round-trip mein
router.post('/bulk/create', authMiddleware, async (req, res) => {
  const { urls } = req.body;
  if (urls.length > 100) return res.status(400).json({ error: 'Max 100 URLs per request' });

  const results = await Promise.allSettled(
    urls.map((item) => createShortUrl(item.url, item.alias, req.userId))
  );

  res.status(207).json({ results: results.map(formatResult) });
});
```

---

### Feature 6: Password-Protected URLs

**Kyun zaroori hai:** Private links jo sirf authorized log access kar sakein.

```sql
ALTER TABLE urls ADD COLUMN password_hash VARCHAR(255) NULL;
-- NULL = no password
```

```
Flow:
1. POST /create mein "password" field optional
2. GET /abc1234 → agar password_hash set hai → 401 + redirect to /abc1234/unlock
3. POST /abc1234/unlock { "password": "secret" } → verify → session token set → redirect
```

```typescript
// Redirect mein password check
if (record.password_hash) {
  const unlockToken = req.cookies[`unlock_${shortUrl}`];
  if (!unlockToken || !verifyUnlockToken(unlockToken, shortUrl)) {
    return res.redirect(`/unlock?url=${shortUrl}`); // password page pe bhejo
  }
}

// POST /:shortUrl/unlock
router.post('/:shortUrl/unlock', async (req, res) => {
  const { password } = req.body;
  const record = await getUrlFromDB(req.params.shortUrl);
  const valid = await bcrypt.compare(password, record.password_hash);
  if (!valid) return res.status(401).json({ error: 'Wrong password' });

  // Short-lived cookie set karo
  const token = generateUnlockToken(req.params.shortUrl);
  res.cookie(`unlock_${req.params.shortUrl}`, token, { maxAge: 3600000, httpOnly: true });
  res.redirect(`/${req.params.shortUrl}`);
});
```

---

### Feature 7: UTM Parameter Support

**Kyun zaroori hai:** Marketers Google Analytics campaigns track karte hain UTM params se.

```
POST /create mein UTM fields add karo:
{
  "url": "https://mysite.com/landing",
  "utm": {
    "source":   "newsletter",
    "medium":   "email",
    "campaign": "summer_sale",
    "term":     "shoes",
    "content":  "banner_v2"
  }
}

System automatically append karega:
https://mysite.com/landing?utm_source=newsletter&utm_medium=email&utm_campaign=summer_sale
```

```typescript
function appendUTM(url: string, utm: UTMParams): string {
  const parsed = new URL(url);
  if (utm.source)   parsed.searchParams.set('utm_source',   utm.source);
  if (utm.medium)   parsed.searchParams.set('utm_medium',   utm.medium);
  if (utm.campaign) parsed.searchParams.set('utm_campaign', utm.campaign);
  if (utm.term)     parsed.searchParams.set('utm_term',     utm.term);
  if (utm.content)  parsed.searchParams.set('utm_content',  utm.content);
  return parsed.toString();
}
```

---

### Feature 8: Webhook Notifications

**Kyun zaroori hai:** External systems ko real-time notify karna ho jab URL click ho.

```sql
CREATE TABLE webhooks (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT REFERENCES users(id),
  short_url  VARCHAR(16),          -- NULL = sab URLs ke liye
  endpoint   TEXT NOT NULL,        -- https://yourserver.com/hook
  secret     VARCHAR(64) NOT NULL, -- HMAC signature ke liye
  events     TEXT[] DEFAULT '{click}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

```typescript
// Redirect ke baad async webhook fire karo
async function fireWebhook(shortUrl: string, clickData: ClickData) {
  const hooks = await getWebhooksForUrl(shortUrl);

  for (const hook of hooks) {
    const payload = JSON.stringify({ event: 'click', short_url: shortUrl, ...clickData });
    const sig = crypto.createHmac('sha256', hook.secret).update(payload).digest('hex');

    // Fire and forget — retry logic with exponential backoff
    fetch(hook.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': `sha256=${sig}`,  // receiver verify kar sake
      },
      body: payload,
    }).catch(() => scheduleRetry(hook, payload)); // fail hone pe retry
  }
}
```

---

### Updated Project Structure
```
src/
  routes/
    create.ts         → POST /create, POST /bulk/create
    redirect.ts       → GET /:shortUrl
    manage.ts         → PATCH/DELETE /:shortUrl, toggle
    qr.ts             → GET /:shortUrl/qr, /share, /embed
    analytics.ts      → GET /:shortUrl/analytics/*
    auth.ts           → POST /auth/register, /auth/login
    dashboard.ts      → GET /dashboard
    unlock.ts         → POST /:shortUrl/unlock
    health.ts         → GET /health
  services/
    encoder.ts        → Short URL generation
    cache.ts          → LRU / Redis cache
    analytics.ts      → Async analytics processor
    qr.ts             → QR generation
    webhook.ts        → Webhook fire + retry
    utm.ts            → UTM param builder
  middleware/
    auth.ts           → JWT verification
    rateLimit.ts      → Rate limiting rules
    validation.ts     → Input validation
  db/
    postgres.ts       → DB connection + queries
    schema.sql        → All table definitions
  app.ts
  server.ts
```

---

### Complete Feature Checklist

| Feature | Status |
|---------|--------|
| URL shortening (Base62) | ✅ Covered |
| Custom alias | ✅ Covered |
| URL expiry | ✅ Covered |
| QR code (PNG/SVG/share/embed) | ✅ Covered |
| Basic analytics (click count) | ✅ Covered |
| Caching (LRU/Redis) | ✅ Covered |
| Scaling (replicas, Zookeeper) | ✅ Covered |
| User auth + dashboard | ✅ Section 18 |
| URL update/delete/disable | ✅ Section 18 |
| Advanced analytics (geo/device) | ✅ Section 18 |
| Rate limiting | ✅ Section 18 |
| Bulk URL shortening | ✅ Section 18 |
| Password-protected URLs | ✅ Section 18 |
| UTM parameter support | ✅ Section 18 |
| Webhook notifications | ✅ Section 18 |
| Link Preview (OG tags) | ✅ Section 19 |
| Malicious URL detection | ✅ Section 19 |
| API Key management | ✅ Section 19 |
| Link-in-Bio / Collections | ✅ Section 19 |
| A/B Testing / Traffic Split | ✅ Section 19 |
| Geo-based redirect | ✅ Section 19 |
| Device-based redirect | ✅ Section 19 |
| Custom domain support | ✅ Section 19 |

---

## 19. Advanced Features — Enterprise Level

---

### Feature 9: Link Preview (OG Meta Tags)

**Kyun zaroori hai:** WhatsApp, Slack, Twitter pe share karo toh sirf URL nahi, preview card dikhni chahiye.

```
Problem: short.ly/abc1234 share karo → koi preview nahi dikhta
Solution: /:shortUrl/preview page serve karo jo OG tags ke saath ho
```

```typescript
// GET /:shortUrl/preview — HTML page with OG meta tags
router.get('/:shortUrl/preview', async (req, res) => {
  const record = await getUrlFromDB(req.params.shortUrl);
  if (!record) return res.status(404).send('Not found');

  // Original page ke OG tags fetch karo (async, cached)
  const ogData = await fetchOGTags(record.long_url);

  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta property="og:title"       content="${ogData.title ?? record.long_url}" />
  <meta property="og:description" content="${ogData.description ?? ''}" />
  <meta property="og:image"       content="${ogData.image ?? ''}" />
  <meta property="og:url"         content="https://short.ly/${req.params.shortUrl}" />
  <meta http-equiv="refresh"      content="0; url=/${req.params.shortUrl}" />
</head>
<body>Redirecting...</body>
</html>`);
});
```

```sql
-- OG data cache karo DB mein (baar baar fetch na karna pade)
ALTER TABLE urls ADD COLUMN og_title       TEXT NULL;
ALTER TABLE urls ADD COLUMN og_description TEXT NULL;
ALTER TABLE urls ADD COLUMN og_image       TEXT NULL;
ALTER TABLE urls ADD COLUMN og_fetched_at  TIMESTAMPTZ NULL;
```

---

### Feature 10: Malicious URL Detection

**Kyun zaroori hai:** Phishing/malware URLs shorten karke spread kiye ja sakte hain — legal liability bhi hai.

```typescript
// Google Safe Browsing API se check karo
async function isMaliciousUrl(url: string): Promise<boolean> {
  const response = await fetch(
    `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${process.env.SAFE_BROWSING_KEY}`,
    {
      method: 'POST',
      body: JSON.stringify({
        client: { clientId: 'short.ly', clientVersion: '1.0' },
        threatInfo: {
          threatTypes:      ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'],
          platformTypes:    ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries:    [{ url }],
        },
      }),
    }
  );
  const data = await response.json();
  return data.matches?.length > 0; // matches hain → malicious
}

// POST /create mein use karo
const malicious = await isMaliciousUrl(longUrl);
if (malicious) return res.status(400).json({ error: 'URL flagged as malicious' });
```

```sql
-- Reported URLs track karo
CREATE TABLE url_reports (
  id         BIGSERIAL PRIMARY KEY,
  short_url  VARCHAR(16) NOT NULL,
  reason     VARCHAR(100),          -- phishing, spam, malware
  reported_by VARCHAR(45),          -- reporter IP
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

```
POST /:shortUrl/report  → User manually report kar sake
Admin panel mein review queue hoga
```

---

### Feature 11: API Key Management

**Kyun zaroori hai:** Developers programmatically URLs shorten karte hain — JWT har baar nahi chahiye.

```sql
CREATE TABLE api_keys (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT REFERENCES users(id),
  key_hash    VARCHAR(255) UNIQUE NOT NULL,  -- hashed store karo
  key_prefix  VARCHAR(8) NOT NULL,           -- display ke liye: "sk_abc123..."
  name        VARCHAR(100),                  -- "Production Key", "Dev Key"
  last_used   TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

```
Endpoints:
POST   /api-keys          → Naya key generate karo
GET    /api-keys          → Apne saare keys dekho
DELETE /api-keys/:id      → Key revoke karo
POST   /api-keys/:id/rotate → Key rotate karo (old invalidate, new generate)

Usage:
Authorization: Bearer sk_abc123xxxxxxxxxxxxx
```

```typescript
// Key generate karo — sirf ek baar dikhao, phir hash store karo
function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw    = `sk_${crypto.randomBytes(32).toString('hex')}`;
  const hash   = crypto.createHash('sha256').update(raw).digest('hex');
  const prefix = raw.substring(0, 10);
  return { raw, hash, prefix }; // raw sirf response mein bhejo, DB mein hash
}
```

---

### Feature 12: Link-in-Bio / Collections (Linktree Style)

**Kyun zaroori hai:** Creators ko ek page pe multiple links chahiye hote hain — Instagram bio ke liye.

```sql
CREATE TABLE collections (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT REFERENCES users(id),
  slug        VARCHAR(50) UNIQUE NOT NULL,  -- short.ly/@username
  title       VARCHAR(100),
  description TEXT,
  theme       VARCHAR(20) DEFAULT 'default',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE collection_links (
  id            BIGSERIAL PRIMARY KEY,
  collection_id BIGINT REFERENCES collections(id),
  short_url     VARCHAR(16) REFERENCES urls(short_url),
  label         VARCHAR(100),   -- "My YouTube", "Buy My Course"
  position      INT DEFAULT 0,  -- order
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

```
Endpoints:
POST /collections              → Collection banao
POST /collections/:slug/links  → Link add karo
GET  /@:username               → Public page serve karo (HTML)

Example: short.ly/@johndoe → page with all links
```

---

### Feature 13: A/B Testing — Traffic Split

**Kyun zaroori hai:** Marketers do landing pages test karte hain — 50% traffic A pe, 50% B pe.

```sql
CREATE TABLE ab_tests (
  id        BIGSERIAL PRIMARY KEY,
  short_url VARCHAR(16) NOT NULL,
  variants  JSONB NOT NULL,
  -- variants: [{ url: "...", weight: 50 }, { url: "...", weight: 50 }]
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

```typescript
// Redirect mein A/B check
async function resolveRedirectUrl(shortUrl: string, userId?: string): Promise<string> {
  const abTest = await getABTest(shortUrl);
  if (!abTest) return getUrlFromDB(shortUrl).then(r => r.long_url);

  // Weighted random selection
  const rand = Math.random() * 100;
  let cumulative = 0;
  for (const variant of abTest.variants) {
    cumulative += variant.weight;
    if (rand <= cumulative) return variant.url;
  }
  return abTest.variants[0].url;
}
```

```
POST /urls/:shortUrl/ab-test
{
  "variants": [
    { "url": "https://landing-a.com", "weight": 50 },
    { "url": "https://landing-b.com", "weight": 50 }
  ]
}

Analytics mein variant bhi track hoga:
INSERT INTO analytics (..., ab_variant) VALUES (..., 'A')
```

---

### Feature 14: Geo & Device Based Redirect (Smart Routing)

**Kyun zaroori hai:** India se aao → Hindi page, iOS se aao → App Store, Android → Play Store.

```sql
CREATE TABLE routing_rules (
  id        BIGSERIAL PRIMARY KEY,
  short_url VARCHAR(16) NOT NULL,
  rule_type VARCHAR(20) NOT NULL,  -- 'geo', 'device', 'os'
  condition VARCHAR(50) NOT NULL,  -- 'IN', 'mobile', 'iOS'
  target_url TEXT NOT NULL,
  priority  INT DEFAULT 0,         -- higher = check first
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

```typescript
async function resolveSmartRedirect(shortUrl: string, req: Request): Promise<string> {
  const rules = await getRoutingRules(shortUrl); // priority order mein
  const geo   = geoip.lookup(req.ip);
  const ua    = UAParser(req.headers['user-agent']);

  for (const rule of rules) {
    if (rule.rule_type === 'geo'    && geo?.country === rule.condition) return rule.target_url;
    if (rule.rule_type === 'device' && ua.device.type === rule.condition) return rule.target_url;
    if (rule.rule_type === 'os'     && ua.os.name === rule.condition)     return rule.target_url;
  }

  // Koi rule match nahi → default URL
  return getUrlFromDB(shortUrl).then(r => r.long_url);
}
```

```
Example use case:
short.ly/myapp
  → iOS user     → https://apps.apple.com/app/myapp
  → Android user → https://play.google.com/store/apps/myapp
  → Desktop      → https://myapp.com
```

---

### Feature 15: Custom Domain Support

**Kyun zaroori hai:** Enterprises apna domain use karna chahte hain — `go.company.com/sale` instead of `short.ly/abc`.

```sql
CREATE TABLE custom_domains (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT REFERENCES users(id),
  domain     VARCHAR(255) UNIQUE NOT NULL,  -- go.company.com
  verified   BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- urls table mein domain link karo
ALTER TABLE urls ADD COLUMN domain_id BIGINT REFERENCES custom_domains(id) NULL;
-- NULL = default short.ly domain
```

```
Setup Flow:
1. User apna domain add kare: POST /domains { "domain": "go.company.com" }
2. System ek DNS TXT record deta hai verify karne ke liye
3. User apne DNS provider pe TXT record add kare
4. GET /domains/:domain/verify → DNS check karo → verified = true
5. Ab us domain pe URLs create ho sakti hain

DNS Verification:
TXT record: _shortly-verify.go.company.com → "shortlyverify=abc123xyz"
```

```typescript
// Custom domain request handle karna
// Nginx/Load Balancer sab domains ko same server pe route karta hai
app.use(async (req, res, next) => {
  const host = req.hostname; // go.company.com
  if (host === 'short.ly') return next(); // default domain

  const domain = await getCustomDomain(host);
  if (!domain?.verified) return res.status(404).send('Domain not configured');

  req.customDomainId = domain.id; // baaki handlers use karein
  next();
});
```

---

### Updated Complete Feature Checklist

| Feature | Status |
|---------|--------|
| URL shortening (Base62) | ✅ |
| Custom alias | ✅ |
| URL expiry | ✅ |
| QR code (PNG/SVG/share/embed) | ✅ |
| Basic analytics (click count) | ✅ |
| Caching (LRU/Redis) | ✅ |
| Scaling (replicas, Zookeeper) | ✅ |
| User auth + dashboard | ✅ |
| URL update/delete/disable | ✅ |
| Advanced analytics (geo/device) | ✅ |
| Rate limiting | ✅ |
| Bulk URL shortening | ✅ |
| Password-protected URLs | ✅ |
| UTM parameter support | ✅ |
| Webhook notifications | ✅ |
| Link Preview (OG tags) | ✅ |
| Malicious URL detection | ✅ |
| API Key management | ✅ |
| Link-in-Bio / Collections | ✅ |
| A/B Testing / Traffic Split | ✅ |
| Geo & Device based redirect | ✅ |
| Custom domain support | ✅ |

---

## 17. Key Takeaways for Interview
