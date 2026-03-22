'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { urlAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { Link2, Copy, QrCode, Download, Settings, ChevronDown, ChevronUp, Lock, Calendar, Type, ExternalLink, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

// Zod Schema for validation
const urlSchema = z.object({
  url: z.string()
    .min(1, 'URL is required')
    .url('Please enter a valid URL')
    .max(2048, 'URL is too long (max 2048 characters)'),
  alias: z.string()
    .min(3, 'Alias must be at least 3 characters')
    .max(16, 'Alias must be at most 16 characters')
    .regex(/^[a-zA-Z0-9_-]*$/, 'Alias can only contain letters, numbers, hyphens, and underscores')
    .optional()
    .or(z.literal('')),
  password: z.string()
    .min(4, 'Password must be at least 4 characters')
    .optional()
    .or(z.literal('')),
  expiresAt: z.string().optional().or(z.literal('')),
});

type URLFormData = z.infer<typeof urlSchema>;

// Helper functions for anonymous user limits
const DAILY_LIMIT = 5;
const STORAGE_KEY = 'anonymous_url_count';
const STORAGE_DATE_KEY = 'anonymous_url_date';

function getAnonymousUrlCount(): number {
  if (typeof window === 'undefined') return 0;
  
  const today = new Date().toDateString();
  const storedDate = localStorage.getItem(STORAGE_DATE_KEY);
  
  // Reset count if it's a new day
  if (storedDate !== today) {
    localStorage.setItem(STORAGE_DATE_KEY, today);
    localStorage.setItem(STORAGE_KEY, '0');
    return 0;
  }
  
  return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
}

function incrementAnonymousUrlCount(): void {
  if (typeof window === 'undefined') return;
  
  const current = getAnonymousUrlCount();
  localStorage.setItem(STORAGE_KEY, String(current + 1));
}

function getRemainingUrls(): number {
  return Math.max(0, DAILY_LIMIT - getAnonymousUrlCount());
}

export default function URLShortener() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [remainingUrls, setRemainingUrls] = useState<number | null>(null);
  const { isAuthenticated } = useAuth();

  // Update remaining URLs on client side only
  useEffect(() => {
    if (!isAuthenticated && typeof window !== 'undefined') {
      setRemainingUrls(getRemainingUrls());
    }
  }, [isAuthenticated, result]); // Update when result changes

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<URLFormData>({
    resolver: zodResolver(urlSchema),
    mode: 'onBlur',
  });


  const onSubmit = async (data: URLFormData) => {
    // Check anonymous user limit
    if (!isAuthenticated) {
      const remaining = getRemainingUrls();
      if (remaining <= 0) {
        toast.error('Daily limit reached! Sign up to create unlimited URLs.', { duration: 5000 });
        return;
      }
    }

    setLoading(true);
    try {
      const res = await urlAPI.create({
        url: data.url,
        alias: data.alias || undefined,
        password: data.password || undefined,
        expires_at: data.expiresAt || undefined,
      });
      
      // Increment count for anonymous users
      if (!isAuthenticated) {
        incrementAnonymousUrlCount();
        setRemainingUrls(getRemainingUrls()); // Update UI
      }
      
      setResult(res.data);
      toast.success('🎉 Short URL created!');
      reset();
      setShowAdvanced(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create short URL');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('📋 Copied to clipboard!');
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 xs:px-4">
      {/* Anonymous User Limit Banner - Only show when form is visible */}
      {!result && !isAuthenticated && remainingUrls !== null && (
        <div className="mb-4 xs:mb-6 p-3 xs:p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl xs:rounded-2xl animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-2 xs:gap-3">
            <AlertCircle className="w-4 h-4 xs:w-5 xs:h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs xs:text-sm font-semibold text-amber-900 mb-1">
                {remainingUrls > 0 ? (
                  <>You have {remainingUrls} {remainingUrls === 1 ? 'URL' : 'URLs'} remaining today</>
                ) : (
                  <>Daily limit reached!</>
                )}
              </p>
              <p className="text-xs text-amber-700">
                {remainingUrls > 0 ? (
                  <>Free users can create {DAILY_LIMIT} URLs per day. </>
                ) : (
                  <>You've used all {DAILY_LIMIT} free URLs today. </>
                )}
                <Link href="/register" className="font-semibold text-amber-900 hover:text-amber-950 underline">
                  Sign up free
                </Link>
                {' '}for unlimited URLs, analytics & more!
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Form - Hide when result is shown */}
      {!result && (
      <div className="relative">
        <div className="relative bg-white rounded-xl xs:rounded-2xl sm:rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] hover:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.2)] transition-shadow duration-300 border border-slate-200/80 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-slate-50 to-white p-3 xs:p-4 sm:p-6 md:p-8 border-b border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 xs:gap-3 sm:gap-4">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-primary-500 rounded-xl xs:rounded-2xl blur-lg opacity-30"></div>
                <div className="relative p-2 xs:p-2.5 sm:p-3.5 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl xs:rounded-2xl shadow-[0_8px_20px_-4px_rgba(37,99,235,0.4)]">
                  <Link2 className="w-4 h-4 xs:w-5 xs:h-5 sm:w-7 sm:h-7 text-white" />
                </div>
              </div>
              <div className="min-w-0">
                <h2 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 truncate">Shorten Your URL</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5 hidden xs:block">Transform long links into short, shareable URLs</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-3 xs:p-4 sm:p-6 md:p-8 space-y-3 xs:space-y-4 sm:space-y-6">
            {/* Main URL Input */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs xs:text-sm font-semibold text-slate-700">
                <ExternalLink className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-primary-600" />
                Enter your long URL
              </label>
              <input
                type="url"
                {...register('url')}
                placeholder="https://example.com/your-long-url"
                className={`w-full px-3 xs:px-4 sm:px-5 py-2.5 xs:py-3 sm:py-4 text-sm sm:text-base bg-slate-50 border-2 rounded-lg xs:rounded-xl sm:rounded-2xl focus:bg-white focus:outline-none outline-none transition-all text-slate-900 placeholder:text-slate-400 ${
                  errors.url ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-primary-500'
                }`}
              />
              {errors.url && (
                <p className="text-xs xs:text-sm text-red-600 flex items-center gap-1">
                  <span className="font-medium">⚠</span> {errors.url.message}
                </p>
              )}
            </div>

            {/* Advanced Options Toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full px-3 xs:px-4 sm:px-5 py-2.5 xs:py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg xs:rounded-xl transition-all group/toggle active:scale-[0.98]"
            >
              <div className="flex items-center gap-1.5 xs:gap-2">
                <Settings className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-primary-600 group-hover/toggle:rotate-90 transition-transform duration-300" />
                <span className="text-xs xs:text-sm font-semibold text-slate-700">Advanced Options</span>
              </div>
              {showAdvanced ? (
                <ChevronUp className="w-4 h-4 xs:w-5 xs:h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 xs:w-5 xs:h-5 text-slate-400" />
              )}
            </button>

            {/* Advanced Options */}
            {showAdvanced && (
              <div className="space-y-3 xs:space-y-4 sm:space-y-5 p-3 xs:p-4 sm:p-6 bg-gradient-to-br from-slate-50 to-slate-50/50 rounded-xl xs:rounded-2xl border border-slate-200/60 animate-in slide-in-from-top-2 duration-300">
                {/* Custom Alias */}
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 xs:gap-2 text-xs xs:text-sm font-semibold text-slate-700">
                    <Type className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-primary-600" />
                    Custom Alias
                    <span className="text-xs font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    {...register('alias')}
                    placeholder="my-custom-link"
                    className={`w-full px-3 xs:px-4 py-2.5 xs:py-3 text-sm bg-white border-2 rounded-lg xs:rounded-xl outline-none transition-all text-slate-900 placeholder:text-slate-400 ${
                      errors.alias ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-primary-500'
                    }`}
                  />
                  {errors.alias && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <span className="font-medium">⚠</span> {errors.alias.message}
                    </p>
                  )}
                  {!errors.alias && (
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                      Create a memorable, branded short link
                    </p>
                  )}
                </div>

                {/* Password Protection */}
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 xs:gap-2 text-xs xs:text-sm font-semibold text-slate-700">
                    <Lock className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-primary-600" />
                    Password Protection
                    <span className="text-xs font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="password"
                    {...register('password')}
                    placeholder="Enter password"
                    className={`w-full px-3 xs:px-4 py-2.5 xs:py-3 text-sm bg-white border-2 rounded-lg xs:rounded-xl outline-none transition-all text-slate-900 placeholder:text-slate-400 ${
                      errors.password ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-primary-500'
                    }`}
                  />
                  {errors.password && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <span className="font-medium">⚠</span> {errors.password.message}
                    </p>
                  )}
                  {!errors.password && (
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                      Secure your link with a password
                    </p>
                  )}
                </div>

                {/* Expiry Date */}
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 xs:gap-2 text-xs xs:text-sm font-semibold text-slate-700">
                    <Calendar className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-primary-600" />
                    Expiry Date
                    <span className="text-xs font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="datetime-local"
                    {...register('expiresAt')}
                    className="w-full px-3 xs:px-4 py-2.5 xs:py-3 text-sm bg-white border-2 border-slate-200 rounded-lg xs:rounded-xl focus:border-primary-500 outline-none transition-all text-slate-900"
                  />
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                    Auto-expire link after a specific date
                  </p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || (!isAuthenticated && remainingUrls !== null && remainingUrls <= 0)}
              className="relative w-full group/btn overflow-hidden rounded-lg xs:rounded-xl sm:rounded-2xl shadow-[0_8px_24px_-4px_rgba(37,99,235,0.4)] hover:shadow-[0_12px_32px_-4px_rgba(37,99,235,0.5)] transition-all active:scale-[0.98] min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[0_8px_24px_-4px_rgba(37,99,235,0.4)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600 rounded-lg xs:rounded-xl sm:rounded-2xl transition-transform group-hover/btn:scale-105"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-1000"></div>
              <div className="relative px-3 xs:px-4 sm:px-6 py-2.5 xs:py-3 sm:py-4 flex items-center justify-center gap-2 text-white font-bold text-sm xs:text-base sm:text-lg">
                {loading ? (
                  <>
                    <div className="w-4 h-4 xs:w-5 xs:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Creating...</span>
                  </>
                ) : (!isAuthenticated && remainingUrls !== null && remainingUrls <= 0) ? (
                  <>
                    <Lock className="w-4 h-4 xs:w-5 xs:h-5" />
                    <span>Daily Limit Reached</span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4 xs:w-5 xs:h-5" />
                    <span>Shorten URL</span>
                  </>
                )}
              </div>
            </button>
          </form>
        </div>
      </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-4 xs:mt-6 sm:mt-8 relative animate-in slide-in-from-bottom-4 duration-500">
          {/* Anonymous User Upgrade Prompt */}
          {!isAuthenticated && (
            <div className="mb-4 p-3 xs:p-4 bg-gradient-to-r from-primary-50 to-blue-50 border-2 border-primary-200 rounded-xl xs:rounded-2xl">
              <div className="flex items-start gap-2 xs:gap-3">
                <div className="p-1.5 xs:p-2 bg-primary-100 rounded-lg shrink-0">
                  <AlertCircle className="w-4 h-4 xs:w-5 xs:h-5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs xs:text-sm font-semibold text-primary-900 mb-1">
                    Want to track this URL's performance?
                  </p>
                  <p className="text-xs text-primary-700 mb-2">
                    Sign up to get analytics, manage your URLs, and create unlimited short links!
                  </p>
                  <Link 
                    href="/register"
                    className="inline-flex items-center gap-1.5 px-3 xs:px-4 py-1.5 xs:py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium text-xs xs:text-sm active:scale-95"
                  >
                    Create Free Account
                  </Link>
                </div>
              </div>
            </div>
          )}
          
          <div className="relative bg-white rounded-xl xs:rounded-2xl sm:rounded-3xl shadow-[0_20px_60px_-15px_rgba(16,185,129,0.2)] border border-emerald-200/80 overflow-hidden">
            {/* Success Header */}
            <div className="bg-gradient-to-br from-emerald-50 to-white p-3 xs:p-4 border-b border-emerald-100 shadow-sm">
              <div className="flex items-center gap-2 xs:gap-3">
                <div className="p-1.5 xs:p-2 bg-emerald-500 rounded-lg xs:rounded-xl shadow-[0_4px_12px_-2px_rgba(16,185,129,0.4)] shrink-0">
                  <svg className="w-4 h-4 xs:w-5 xs:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm xs:text-base font-bold text-slate-900 truncate">Success! Your Short URL is Ready</h3>
                  <p className="text-xs text-slate-500 hidden xs:block">Share it anywhere you want</p>
                </div>
              </div>
            </div>

            <div className="p-3 xs:p-4 sm:p-5 space-y-3 xs:space-y-4">
              {/* Short URL Display */}
              <div className="space-y-1.5">
                <label className="text-xs xs:text-sm font-semibold text-slate-700">Your Short URL</label>
                <div className="flex items-center gap-2 p-2.5 xs:p-3 bg-gradient-to-br from-primary-50 to-primary-100/50 rounded-lg xs:rounded-xl border-2 border-primary-200 group/copy hover:border-primary-300 transition-all">
                  <input
                    type="text"
                    value={result.short_url}
                    readOnly
                    className="flex-1 bg-transparent outline-none text-primary-700 font-bold text-sm xs:text-base sm:text-lg min-w-0"
                  />
                  <button
                    onClick={() => copyToClipboard(result.short_url)}
                    className="p-2 xs:p-2.5 sm:p-3 hover:bg-primary-200 rounded-lg xs:rounded-xl transition-all active:scale-95 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-4 h-4 xs:w-5 xs:h-5 text-primary-600" />
                  </button>
                </div>
              </div>

              {/* Original URL */}
              <div className="p-2.5 xs:p-3 bg-slate-50 rounded-lg xs:rounded-xl border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 mb-1">ORIGINAL URL</p>
                <p className="text-xs xs:text-sm text-slate-700 truncate">{result.long_url}</p>
              </div>

              {/* QR Code Section */}
              <div className="flex flex-col sm:flex-row gap-3 xs:gap-4 items-center sm:items-center p-3 xs:p-4 bg-gradient-to-br from-slate-50 to-white rounded-xl xs:rounded-2xl border border-slate-200 shadow-sm">
                <div className="relative group/qr shrink-0">
                  <div className="relative p-2 xs:p-3 bg-white border-2 border-slate-200 rounded-lg xs:rounded-xl shadow-[0_8px_20px_-4px_rgba(0,0,0,0.1)]">
                    <QRCodeSVG value={result.short_url} size={100} className="xs:hidden" />
                    <QRCodeSVG value={result.short_url} size={120} className="hidden xs:block" />
                  </div>
                </div>
                
                <div className="flex-1 space-y-2 xs:space-y-3 w-full">
                  <div className="text-center sm:text-left">
                    <h4 className="font-bold text-sm xs:text-base text-slate-900 mb-1">QR Code Ready!</h4>
                    <p className="text-xs xs:text-sm text-slate-600">Scan to visit your short URL instantly</p>
                  </div>
                  <div className="flex flex-col xs:flex-row gap-2">
                    <a
                      href={result.qr_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg xs:rounded-xl transition-all font-medium text-sm text-slate-700 active:scale-95 min-h-[44px]"
                    >
                      <QrCode className="w-4 h-4" />
                      <span className="hidden xs:inline">View Full Size</span>
                      <span className="xs:hidden">View</span>
                    </a>
                    <a
                      href={`${result.qr_url}?format=png&size=512`}
                      download
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg xs:rounded-xl transition-all font-medium text-sm shadow-[0_4px_12px_-2px_rgba(37,99,235,0.4)] hover:shadow-[0_6px_16px_-2px_rgba(37,99,235,0.5)] active:scale-95 min-h-[44px]"
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden xs:inline">Download PNG</span>
                      <span className="xs:hidden">Download</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Create Another Button */}
            <div className="p-3 xs:p-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setResult(null);
                  reset();
                }}
                className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg xs:rounded-xl transition-all font-medium text-sm flex items-center justify-center gap-2 active:scale-95 min-h-[44px]"
              >
                <Link2 className="w-4 h-4 xs:w-5 xs:h-5" />
                Create Another URL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
