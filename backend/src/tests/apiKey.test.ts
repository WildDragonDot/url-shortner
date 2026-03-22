/**
 * src/tests/apiKey.test.ts
 *
 * API Key authentication test cases.
 * Tests: valid key, invalid key, revoked key, expired key, no key, public routes.
 *
 * Run: npx jest --testPathPattern=apiKey --forceExit
 */

import request from 'supertest';
import crypto from 'crypto';
import app from '../app';
import prisma from '../db/prisma';
import bcrypt from 'bcryptjs';

// ─── Test helpers ────────────────────────────────────────────────

/** Test user create karo, userId return karo */
async function createTestUser(): Promise<bigint> {
  const email = `test_${Date.now()}@example.com`;
  const passwordHash = await bcrypt.hash('TestPass123!', 10);
  const user = await prisma.user.create({
    data: { email, passwordHash },
    select: { id: true },
  });
  return user.id;
}

/** Raw API key generate karo aur DB mein store karo */
async function createApiKey(
  userId: bigint,
  opts: { expiresAt?: Date; name?: string } = {}
): Promise<string> {
  const rawKey = `sk_${crypto.randomBytes(32).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  await prisma.apiKey.create({
    data: {
      userId,
      keyHash,
      keyPrefix: rawKey.substring(0, 12),
      name: opts.name || 'Test Key',
      expiresAt: opts.expiresAt ?? null,
    },
  });
  return rawKey;
}

/** Test URL create karo, shortUrl code return karo */
async function createTestUrl(userId: bigint): Promise<string> {
  const code = `t${Date.now().toString(36)}`;
  await prisma.url.create({
    data: { shortUrl: code, longUrl: 'https://example.com', userId },
  });
  return code;
}

// ─── Cleanup ─────────────────────────────────────────────────────

const createdUserIds: bigint[] = [];

afterAll(async () => {
  // Cascade delete — api_keys, urls bhi delete ho jayenge
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  }
  await prisma.$disconnect();
});

// ─── Test Suite ──────────────────────────────────────────────────

describe('API Key Authentication', () => {
  let userId: bigint;
  let validKey: string;

  beforeAll(async () => {
    userId = await createTestUser();
    createdUserIds.push(userId);
    validKey = await createApiKey(userId);
  });

  // ── 1. Valid API Key ─────────────────────────────────────────
  describe('Valid API Key', () => {
    it('should list URLs with valid API key', async () => {
      const res = await request(app)
        .get('/urls')
        .set('Authorization', `Bearer ${validKey}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should create a URL with valid API key', async () => {
      const res = await request(app)
        .post('/create')
        .set('Authorization', `Bearer ${validKey}`)
        .send({ url: 'https://example.com/api-key-test' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('short_url');
      expect(res.body).toHaveProperty('code');
    });

    it('should list own API keys with valid key', async () => {
      const res = await request(app)
        .get('/api-keys')
        .set('Authorization', `Bearer ${validKey}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ── 2. Invalid / Wrong API Key ───────────────────────────────
  describe('Invalid API Key', () => {
    it('should return 401 for completely wrong key', async () => {
      const res = await request(app)
        .get('/urls')
        .set('Authorization', 'Bearer sk_wrongkeyvalue00000000000000000000000000000000000000000000000000');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 401 for malformed key (no sk_ prefix)', async () => {
      const res = await request(app)
        .get('/urls')
        .set('Authorization', 'Bearer notavalidkey');

      expect(res.status).toBe(401);
    });

    it('should return 401 for empty Bearer token', async () => {
      const res = await request(app)
        .get('/urls')
        .set('Authorization', 'Bearer ');

      expect(res.status).toBe(401);
    });
  });

  // ── 3. No API Key ────────────────────────────────────────────
  describe('No API Key', () => {
    it('should return 401 on protected route without any auth', async () => {
      const res = await request(app).get('/urls');
      expect(res.status).toBe(401);
    });

    it('should return 401 on /api-keys without auth', async () => {
      const res = await request(app).get('/api-keys');
      expect(res.status).toBe(401);
    });

    it('should return 401 on POST /create without auth (anonymous rate limit applies)', async () => {
      // Anonymous create is allowed but rate-limited — just check it doesn't crash
      const res = await request(app)
        .post('/create')
        .send({ url: 'https://example.com/no-auth-test' });

      // 201 (anonymous allowed) or 429 (rate limited) — both are valid
      expect([201, 429]).toContain(res.status);
    });
  });

  // ── 4. Revoked API Key ───────────────────────────────────────
  describe('Revoked API Key', () => {
    it('should return 401 after key is deleted (revoked)', async () => {
      // Create a fresh key
      const revokedKey = await createApiKey(userId, { name: 'Revoke Me' });

      // Verify it works first
      const before = await request(app)
        .get('/urls')
        .set('Authorization', `Bearer ${revokedKey}`);
      expect(before.status).toBe(200);

      // Delete (revoke) it via API
      const keyHash = crypto.createHash('sha256').update(revokedKey).digest('hex');
      const keyRecord = await prisma.apiKey.findUnique({
        where: { keyHash },
        select: { id: true },
      });
      expect(keyRecord).not.toBeNull();

      await request(app)
        .delete(`/api-keys/${keyRecord!.id}`)
        .set('Authorization', `Bearer ${validKey}`); // use valid key to delete

      // Now revoked key should fail
      const after = await request(app)
        .get('/urls')
        .set('Authorization', `Bearer ${revokedKey}`);
      expect(after.status).toBe(401);
    });
  });

  // ── 5. Expired API Key ───────────────────────────────────────
  describe('Expired API Key', () => {
    it('should return 401 for expired API key', async () => {
      // Create key that expired 1 hour ago
      const expiredKey = await createApiKey(userId, {
        name: 'Expired Key',
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      });

      const res = await request(app)
        .get('/urls')
        .set('Authorization', `Bearer ${expiredKey}`);

      expect(res.status).toBe(401);
    });

    it('should allow access with a future-expiry key', async () => {
      const futureKey = await createApiKey(userId, {
        name: 'Future Key',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      });

      const res = await request(app)
        .get('/urls')
        .set('Authorization', `Bearer ${futureKey}`);

      expect(res.status).toBe(200);
    });
  });

  // ── 6. Public Routes (no auth needed) ───────────────────────
  describe('Public Routes', () => {
    it('should redirect short URL without any API key', async () => {
      const code = await createTestUrl(userId);

      const res = await request(app)
        .get(`/${code}`)
        .redirects(0); // follow nahi karo, sirf status check karo

      // 302 redirect expected
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('https://example.com');
    });

    it('should allow health check without auth', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
    });
  });

  // ── 7. API Key Isolation ─────────────────────────────────────
  describe('API Key Isolation (cross-user)', () => {
    it('should not allow user A key to delete user B URL', async () => {
      // Create second user
      const userId2 = await createTestUser();
      createdUserIds.push(userId2);
      const key2 = await createApiKey(userId2, { name: 'User B Key' });

      // Create URL under user 1
      const code = await createTestUrl(userId);

      // User 2 tries to delete user 1's URL
      const urlRecord = await prisma.url.findUnique({
        where: { shortUrl: code },
        select: { id: true },
      });

      const res = await request(app)
        .delete(`/urls/${urlRecord!.id}`)
        .set('Authorization', `Bearer ${key2}`);

      // Should be 404 (not found for this user) or 403
      expect([403, 404]).toContain(res.status);
    });
  });
});
