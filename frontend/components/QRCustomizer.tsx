'use client';

import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, RefreshCw, Palette, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ── Preset styles ────────────────────────────────────────────────
const PRESETS = [
  { name: 'Classic',    dark: '#000000', light: '#ffffff', bg: 'bg-white',   preview: 'text-black' },
  { name: 'Ocean',      dark: '#0ea5e9', light: '#f0f9ff', bg: 'bg-sky-50',  preview: 'text-sky-500' },
  { name: 'Forest',     dark: '#16a34a', light: '#f0fdf4', bg: 'bg-green-50',preview: 'text-green-600' },
  { name: 'Sunset',     dark: '#ea580c', light: '#fff7ed', bg: 'bg-orange-50',preview: 'text-orange-600' },
  { name: 'Purple',     dark: '#7c3aed', light: '#faf5ff', bg: 'bg-purple-50',preview: 'text-purple-600' },
  { name: 'Rose',       dark: '#e11d48', light: '#fff1f2', bg: 'bg-rose-50', preview: 'text-rose-600' },
  { name: 'Dark Mode',  dark: '#ffffff', light: '#1e293b', bg: 'bg-slate-800',preview: 'text-white' },
  { name: 'Gold',       dark: '#b45309', light: '#fffbeb', bg: 'bg-amber-50', preview: 'text-amber-700' },
];

const SIZES = [
  { label: 'Small (256px)',  value: 256 },
  { label: 'Medium (512px)', value: 512 },
  { label: 'Large (1024px)', value: 1024 },
];

const ECL_OPTIONS = [
  { label: 'Low (7%)',    value: 'L', desc: 'Smallest QR' },
  { label: 'Medium (15%)',value: 'M', desc: 'Balanced' },
  { label: 'High (25%)',  value: 'Q', desc: 'Recommended' },
  { label: 'Max (30%)',   value: 'H', desc: 'With logo' },
];

interface Props {
  code: string;
  shortUrl: string;
}

export default function QRCustomizer({ code, shortUrl }: Props) {
  const [dark,  setDark]  = useState('#000000');
  const [light, setLight] = useState('#ffffff');
  const [size,  setSize]  = useState(512);
  const [ecl,   setEcl]   = useState<'L'|'M'|'Q'|'H'>('M');
  const [activePreset, setActivePreset] = useState(0);
  const [tab, setTab] = useState<'style'|'download'>('style');

  const applyPreset = (idx: number) => {
    const p = PRESETS[idx];
    setDark(p.dark);
    setLight(p.light);
    setActivePreset(idx);
  };

  const downloadUrl = (format: 'png' | 'svg') =>
    `${API_URL}/${code}/qr?format=${format}&size=${size}&dark=${encodeURIComponent(dark)}&light=${encodeURIComponent(light)}&ecl=${ecl}`;

  const handleDownload = async (format: 'png' | 'svg') => {
    try {
      const res  = await fetch(downloadUrl(format));
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `qr-${code}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`QR downloaded as ${format.toUpperCase()}`);
    } catch {
      toast.error('Download failed');
    }
  };

  const handleShare = async () => {
    const url = `${API_URL}/${code}/qr?size=512&dark=${encodeURIComponent(dark)}&light=${encodeURIComponent(light)}&ecl=${ecl}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'QR Code', url: shortUrl });
        toast.success('Shared!');
      } catch { /* user cancelled */ }
    } else {
      navigator.clipboard.writeText(shortUrl);
      toast.success('URL copied to clipboard!');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Palette className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">QR Code Customizer</h3>
            <p className="text-xs text-slate-500">Design a beautiful QR code for sharing</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-0">
        {/* Left: Controls */}
        <div className="p-4 sm:p-6 border-b md:border-b-0 md:border-r border-slate-200 space-y-5">

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {(['style', 'download'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition capitalize ${tab === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                {t === 'style' ? '🎨 Style' : '⬇️ Download'}
              </button>
            ))}
          </div>

          {tab === 'style' && (
            <>
              {/* Color Presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Color Presets</label>
                <div className="grid grid-cols-4 gap-2">
                  {PRESETS.map((p, i) => (
                    <button key={i} onClick={() => applyPreset(i)}
                      className={`relative p-2 rounded-xl border-2 transition flex flex-col items-center gap-1 ${activePreset === i ? 'border-primary-500 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}
                      style={{ background: p.light }}
                    >
                      <div className="w-6 h-6 rounded-md" style={{ background: p.dark }} />
                      <span className="text-[10px] font-medium" style={{ color: p.dark }}>{p.name}</span>
                      {activePreset === i && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary-500 rounded-full flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Colors */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Custom Colors</label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 mb-1 block">QR Color</label>
                    <div className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg">
                      <input type="color" value={dark} onChange={e => { setDark(e.target.value); setActivePreset(-1); }}
                        className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                      <span className="text-xs font-mono text-slate-600">{dark}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 mb-1 block">Background</label>
                    <div className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg">
                      <input type="color" value={light} onChange={e => { setLight(e.target.value); setActivePreset(-1); }}
                        className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                      <span className="text-xs font-mono text-slate-600">{light}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Correction */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Error Correction</label>
                <div className="grid grid-cols-2 gap-2">
                  {ECL_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setEcl(opt.value as any)}
                      className={`p-2.5 rounded-xl border-2 text-left transition ${ecl === opt.value ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <div className="text-xs font-semibold text-slate-900">{opt.label}</div>
                      <div className="text-[10px] text-slate-500">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === 'download' && (
            <>
              {/* Size */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Export Size</label>
                <div className="space-y-2">
                  {SIZES.map(s => (
                    <button key={s.value} onClick={() => setSize(s.value)}
                      className={`w-full p-3 rounded-xl border-2 text-left transition flex items-center justify-between ${size === s.value ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <span className="text-sm font-medium text-slate-900">{s.label}</span>
                      {size === s.value && <div className="w-2 h-2 rounded-full bg-primary-500" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Download buttons */}
              <div className="space-y-2">
                <button onClick={() => handleDownload('png')}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-sm transition">
                  <Download className="w-4 h-4" /> Download PNG
                </button>
                <button onClick={() => handleDownload('svg')}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition">
                  <Download className="w-4 h-4" /> Download SVG (Vector)
                </button>
                <button onClick={handleShare}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-xl font-semibold text-sm transition">
                  <Share2 className="w-4 h-4" /> Share URL
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right: Live Preview */}
        <div className="p-4 sm:p-6 flex flex-col items-center justify-center gap-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide self-start">Live Preview</p>

          <div className="relative p-4 rounded-2xl shadow-lg border border-slate-200 transition-all"
            style={{ background: light }}>
            <QRCodeSVG
              value={shortUrl}
              size={180}
              level={ecl}
              fgColor={dark}
              bgColor={light}
              includeMargin={false}
            />
          </div>

          <div className="text-center">
            <p className="text-xs text-slate-500 truncate max-w-[200px]">{shortUrl}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {PRESETS[activePreset]?.name || 'Custom'} · {ecl} correction
            </p>
          </div>

          {/* Quick download from preview */}
          <div className="flex gap-2 w-full">
            <button onClick={() => handleDownload('png')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold transition">
              <Download className="w-3.5 h-3.5" /> PNG
            </button>
            <button onClick={() => handleDownload('svg')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition">
              <Download className="w-3.5 h-3.5" /> SVG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
