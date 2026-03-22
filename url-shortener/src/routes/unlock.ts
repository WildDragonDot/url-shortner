/**
 * src/routes/unlock.ts
 * Password-protected URL unlock. Prisma version.
 *
 * GET  /:shortUrl/unlock → HTML form dikhao (browser ke liye)
 * POST /:shortUrl/unlock → Password verify karo aur redirect karo
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db/prisma';
import logger from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /{shortUrl}/unlock:
 *   get:
 *     tags: [URLs]
 *     summary: Password unlock form dikhao (HTML page)
 *     security: []
 *     parameters:
 *       - in: path
 *         name: shortUrl
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: HTML unlock form }
 *       404: { description: URL not found }
 */
router.get('/:shortUrl/unlock', async (req: Request, res: Response) => {
  const { shortUrl } = req.params;

  try {
    const record = await prisma.url.findUnique({
      where:  { shortUrl },
      select: { passwordHash: true, status: true },
    });

    if (!record || record.status === 'deleted')
      return res.status(404).send('<h2>URL not found</h2>');

    // Password nahi hai — seedha redirect karo
    if (!record.passwordHash) return res.redirect(`/${shortUrl}`);

    const error = req.query.error === '1' ? '<p style="color:red">Incorrect password. Try again.</p>' : '';

    // Simple HTML form — frontend ke bina bhi kaam kare
    return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unlock Link</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #f5f5f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #fff; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,.1); width: 100%; max-width: 380px; }
    h2 { margin-bottom: .5rem; font-size: 1.4rem; }
    p.sub { color: #666; font-size: .9rem; margin-bottom: 1.5rem; }
    label { display: block; font-size: .85rem; font-weight: 600; margin-bottom: .4rem; }
    input[type=password] { width: 100%; padding: .65rem .9rem; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; outline: none; }
    input[type=password]:focus { border-color: #6366f1; }
    button { margin-top: 1rem; width: 100%; padding: .75rem; background: #6366f1; color: #fff; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; }
    button:hover { background: #4f46e5; }
    .err { color: #dc2626; font-size: .85rem; margin-top: .75rem; }
  </style>
</head>
<body>
  <div class="card">
    <h2>🔒 Protected Link</h2>
    <p class="sub">This link is password protected. Enter the password to continue.</p>
    <form method="POST" action="/${shortUrl}/unlock">
      <label for="password">Password</label>
      <input type="password" id="password" name="password" placeholder="Enter password" autofocus required>
      <button type="submit">Unlock &amp; Continue</button>
      <div class="err">${error}</div>
    </form>
  </div>
</body>
</html>`);
  } catch (err) {
    logger.error('Unlock GET error', { error: (err as Error).message });
    return res.status(500).send('<h2>Internal server error</h2>');
  }
});

/**
 * @swagger
 * /{shortUrl}/unlock:
 *   post:
 *     tags: [URLs]
 *     summary: Password-protected URL unlock karo
 *     security: []
 *     parameters:
 *       - in: path
 *         name: shortUrl
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password: { type: string }
 *     responses:
 *       302: { description: Redirect to original URL after unlock }
 *       401: { description: Wrong password }
 *       404: { description: URL not found }
 */
router.post('/:shortUrl/unlock', async (req: Request, res: Response) => {
  const { shortUrl } = req.params;
  const { password } = req.body;

  if (!password) return res.status(400).json({ error: 'Password is required' });

  try {
    const record = await prisma.url.findUnique({
      where:  { shortUrl },
      select: { passwordHash: true, status: true },
    });

    if (!record || record.status === 'deleted')
      return res.status(404).json({ error: 'URL not found' });

    if (!record.passwordHash) return res.redirect(`/${shortUrl}`);

    const isValid = await bcrypt.compare(password, record.passwordHash);
    if (!isValid) {
      // Form submit se aaya hai toh HTML redirect, API se aaya hai toh JSON
      const isApiRequest = req.headers['content-type']?.includes('application/json');
      if (isApiRequest) return res.status(401).json({ error: 'Incorrect password' });
      return res.redirect(`/${shortUrl}/unlock?error=1`);
    }

    res.cookie(`unlock_${shortUrl}`, `unlocked_${shortUrl}`, {
      maxAge:   3600000,
      httpOnly: true,
      sameSite: 'strict',
      secure:   process.env.NODE_ENV === 'production',
    });

    return res.redirect(`/${shortUrl}`);
  } catch (err) {
    logger.error('Unlock error', { error: (err as Error).message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
