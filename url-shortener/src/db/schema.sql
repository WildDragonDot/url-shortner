-- ============================================================
-- URL Shortener — Complete Database Schema
-- PostgreSQL
-- ============================================================

-- ─── USERS TABLE ────────────────────────────────────────────
-- Registered users jo apni URLs manage kar sakte hain
-- user_id NULL hoga anonymous users ke liye
CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,         -- bcrypt hashed password
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── API KEYS TABLE ─────────────────────────────────────────
-- Developers ke liye programmatic access
-- Raw key sirf ek baar dikhate hain, DB mein hashed store hoti hai
CREATE TABLE IF NOT EXISTS api_keys (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT REFERENCES users(id) ON DELETE CASCADE,
  key_hash    VARCHAR(255) UNIQUE NOT NULL,   -- SHA-256 hashed key
  key_prefix  VARCHAR(12) NOT NULL,           -- "sk_abc123..." display ke liye
  name        VARCHAR(100),                   -- "Production Key", "Dev Key"
  last_used   TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NULL,               -- NULL = never expires
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── URLS TABLE ─────────────────────────────────────────────
-- Core table — har short URL ka record
CREATE TABLE IF NOT EXISTS urls (
  id            BIGSERIAL PRIMARY KEY,
  short_url     VARCHAR(16) UNIQUE NOT NULL,  -- 7-char base62 code ya custom alias
  long_url      TEXT NOT NULL,                -- original URL
  user_id       BIGINT REFERENCES users(id) ON DELETE SET NULL NULL,
  status        VARCHAR(10) DEFAULT 'active', -- active | disabled | deleted
  password_hash VARCHAR(255) NULL,            -- NULL = no password protection
  -- OG meta tags (WhatsApp/Slack preview ke liye, async fetch hoti hain)
  og_title       TEXT NULL,
  og_description TEXT NULL,
  og_image       TEXT NULL,
  og_fetched_at  TIMESTAMPTZ NULL,
  -- Timestamps
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NULL              -- NULL = never expires
);

-- Short URL pe fast lookup (redirect ka critical path)
CREATE INDEX IF NOT EXISTS idx_urls_short_url ON urls(short_url);
-- Dedup check ke liye (same long URL dobara submit hone pe)
CREATE INDEX IF NOT EXISTS idx_urls_long_url  ON urls(long_url);
-- User dashboard ke liye
CREATE INDEX IF NOT EXISTS idx_urls_user_id   ON urls(user_id);

-- ─── ANALYTICS TABLE ────────────────────────────────────────
-- Har redirect ka record — async insert hota hai (redirect slow nahi hota)
CREATE TABLE IF NOT EXISTS analytics (
  id          BIGSERIAL PRIMARY KEY,
  short_url   VARCHAR(16) NOT NULL,
  clicked_at  TIMESTAMPTZ DEFAULT NOW(),
  ip_address  VARCHAR(45),                   -- IPv4 ya IPv6
  user_agent  TEXT,
  source      VARCHAR(20) DEFAULT 'direct',  -- direct | qr_scan | api
  referrer    VARCHAR(500),                  -- kahan se aaya user
  -- Geo data (geoip-lite se parse hota hai)
  country     VARCHAR(2),                    -- ISO code: IN, US, GB
  city        VARCHAR(100),
  -- Device data (ua-parser-js se parse hota hai)
  device      VARCHAR(20),                   -- mobile | desktop | tablet
  browser     VARCHAR(50),                   -- Chrome | Safari | Firefox
  os          VARCHAR(50),                   -- Android | iOS | Windows
  -- A/B testing ke liye
  ab_variant  VARCHAR(10) NULL               -- 'A' | 'B' | NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_short_url  ON analytics(short_url);
CREATE INDEX IF NOT EXISTS idx_analytics_clicked_at ON analytics(clicked_at);

-- ─── AB TESTS TABLE ─────────────────────────────────────────
-- Ek short URL se multiple destinations pe traffic split
CREATE TABLE IF NOT EXISTS ab_tests (
  id         BIGSERIAL PRIMARY KEY,
  short_url  VARCHAR(16) NOT NULL REFERENCES urls(short_url) ON DELETE CASCADE,
  -- variants JSON: [{ "url": "...", "weight": 50 }, { "url": "...", "weight": 50 }]
  variants   JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ROUTING RULES TABLE ────────────────────────────────────
-- Geo/Device based smart redirect rules
-- Example: India se aao → Hindi page, iOS → App Store
CREATE TABLE IF NOT EXISTS routing_rules (
  id          BIGSERIAL PRIMARY KEY,
  short_url   VARCHAR(16) NOT NULL REFERENCES urls(short_url) ON DELETE CASCADE,
  rule_type   VARCHAR(20) NOT NULL,  -- geo | device | os
  condition   VARCHAR(50) NOT NULL,  -- 'IN' | 'mobile' | 'iOS'
  target_url  TEXT NOT NULL,
  priority    INT DEFAULT 0,         -- bada number = pehle check hoga
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── WEBHOOKS TABLE ─────────────────────────────────────────
-- Jab URL click ho toh external endpoint pe notify karo
CREATE TABLE IF NOT EXISTS webhooks (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT REFERENCES users(id) ON DELETE CASCADE,
  short_url  VARCHAR(16) NULL,       -- NULL = user ki saari URLs ke liye
  endpoint   TEXT NOT NULL,          -- https://yourserver.com/webhook
  secret     VARCHAR(64) NOT NULL,   -- HMAC signature verify karne ke liye
  events     TEXT[] DEFAULT '{click}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── URL REPORTS TABLE ──────────────────────────────────────
-- Users malicious/spam URLs report kar sakte hain
CREATE TABLE IF NOT EXISTS url_reports (
  id          BIGSERIAL PRIMARY KEY,
  short_url   VARCHAR(16) NOT NULL,
  reason      VARCHAR(100),          -- phishing | spam | malware | other
  reported_by VARCHAR(45),           -- reporter ka IP address
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── COLLECTIONS TABLE ──────────────────────────────────────
-- Link-in-Bio feature — short.ly/@username pe multiple links
CREATE TABLE IF NOT EXISTS collections (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT REFERENCES users(id) ON DELETE CASCADE,
  slug        VARCHAR(50) UNIQUE NOT NULL,  -- @username
  title       VARCHAR(100),
  description TEXT,
  theme       VARCHAR(20) DEFAULT 'default',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collection_links (
  id            BIGSERIAL PRIMARY KEY,
  collection_id BIGINT REFERENCES collections(id) ON DELETE CASCADE,
  short_url     VARCHAR(16) REFERENCES urls(short_url) ON DELETE CASCADE,
  label         VARCHAR(100),   -- "My YouTube", "Buy My Course"
  position      INT DEFAULT 0,  -- display order
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
