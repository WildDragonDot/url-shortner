/**
 * src/services/qr.ts — QR Code generation with customization support
 */

import QRCode from 'qrcode';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger';

export interface QROptions {
  size?:            number;
  format?:          'png' | 'svg';
  logo?:            boolean;
  darkColor?:       string;   // hex e.g. '#000000'
  lightColor?:      string;   // hex e.g. '#ffffff'
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
}

export async function generateQRBuffer(url: string, opts: QROptions = {}): Promise<Buffer> {
  const size  = Math.min(opts.size ?? 256, 1024);
  const dark  = opts.darkColor  || '#000000';
  const light = opts.lightColor || '#ffffff';
  const ecl   = opts.errorCorrection || (opts.logo ? 'H' : 'M');

  const qrBuffer = await QRCode.toBuffer(url, {
    width:  size,
    margin: 2,
    color:  { dark, light },
    errorCorrectionLevel: ecl,
  });

  if (!opts.logo) return qrBuffer;

  const logoPath = path.join(process.cwd(), 'public', 'logo.png');
  if (!fs.existsSync(logoPath)) {
    logger.warn('Logo file not found at public/logo.png — returning QR without logo');
    return qrBuffer;
  }

  const logoSize   = Math.floor(size * 0.2);
  const logoBuffer = await sharp(logoPath).resize(logoSize, logoSize).toBuffer();

  return sharp(qrBuffer)
    .composite([{ input: logoBuffer, gravity: 'center' }])
    .png()
    .toBuffer();
}

export async function generateQRSvg(url: string, opts: QROptions = {}): Promise<string> {
  const dark  = opts.darkColor  || '#000000';
  const light = opts.lightColor || '#ffffff';

  return QRCode.toString(url, {
    type:   'svg',
    margin: 2,
    color:  { dark, light },
    errorCorrectionLevel: opts.errorCorrection || 'M',
  });
}

export async function generateQRBase64(url: string, opts: QROptions = {}): Promise<string> {
  const buffer = await generateQRBuffer(url, opts);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}
