/**
 * src/services/qr.ts
 *
 * QR Code generation service.
 *
 * Kya karta hai?
 *   - PNG buffer generate karta hai (download/serve ke liye)
 *   - SVG string generate karta hai (vector, print ke liye)
 *   - Base64 Data URL generate karta hai (API response mein embed ke liye)
 *   - Logo overlay support (brand identity ke liye) — sharp library se
 *
 * Library: qrcode (pure JS, no external API)
 * Logo overlay: sharp (fast image processing)
 *
 * QR code mein kya encode hota hai?
 *   Short URL: http://localhost:3000/abc1234
 *   Scan karo → browser mein short URL khulta hai → redirect hota hai
 */

import QRCode from 'qrcode';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

/**
 * QR generation ke options.
 */
export interface QROptions {
  size?:   number;           // pixels mein (default: 256, max: 1024)
  format?: 'png' | 'svg';   // output format
  logo?:   boolean;          // center mein logo lagao (public/logo.png chahiye)
}

/**
 * PNG Buffer generate karta hai.
 * Binary image data — HTTP response mein directly bhej sakte hain.
 *
 * @param url  - QR mein encode karna wala URL
 * @param opts - Size aur logo options
 * @returns    - PNG image buffer
 */
export async function generateQRBuffer(url: string, opts: QROptions = {}): Promise<Buffer> {
  const size = Math.min(opts.size ?? 256, 1024); // max 1024px

  // QR code PNG generate karo
  const qrBuffer = await QRCode.toBuffer(url, {
    width:  size,
    margin: 2,
    color: {
      dark:  '#000000', // QR modules ka color
      light: '#ffffff', // background color
    },
    errorCorrectionLevel: 'H', // High — logo overlay ke liye zaroori (30% damage tolerate)
  });

  // Logo overlay nahi chahiye → seedha return karo
  if (!opts.logo) return qrBuffer;

  // ── Logo overlay ─────────────────────────────────────────
  // public/logo.png hona chahiye — agar nahi hai toh bina logo ke return karo
  const logoPath = path.join(process.cwd(), 'public', 'logo.png');
  if (!fs.existsSync(logoPath)) {
    console.warn('Logo file not found at public/logo.png — returning QR without logo');
    return qrBuffer;
  }

  // Logo ko QR ka 20% size karo (QR readable rehta hai error correction ki wajah se)
  const logoSize = Math.floor(size * 0.2);
  const logoBuffer = await sharp(logoPath)
    .resize(logoSize, logoSize)
    .toBuffer();

  // Logo ko QR ke center mein composite karo
  return sharp(qrBuffer)
    .composite([{ input: logoBuffer, gravity: 'center' }])
    .png()
    .toBuffer();
}

/**
 * SVG string generate karta hai.
 * Vector format — infinitely scalable, print ke liye perfect.
 * File size bhi PNG se chhota hota hai.
 *
 * @param url - QR mein encode karna wala URL
 * @returns   - SVG XML string
 */
export async function generateQRSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type:   'svg',
    margin: 2,
  });
}

/**
 * Base64 Data URL generate karta hai.
 * API response mein directly embed kar sakte hain — alag request nahi lagti.
 *
 * Format: "data:image/png;base64,iVBORw0KGgo..."
 *
 * @param url  - QR mein encode karna wala URL
 * @param opts - Size aur logo options
 * @returns    - Base64 encoded data URL string
 */
export async function generateQRBase64(url: string, opts: QROptions = {}): Promise<string> {
  const buffer = await generateQRBuffer(url, opts);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}
