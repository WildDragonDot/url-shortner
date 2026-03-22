'use client';

import Link from 'next/link';
import { Link2, Github, Twitter, Mail, Heart } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-300 border-t border-slate-700">
      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 py-6 xs:py-8 sm:py-10 md:py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 xs:gap-6 sm:gap-8 mb-6 xs:mb-8">
          {/* Brand Section - Full width on mobile */}
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-3 xs:mb-4 group">
              <div className="p-1.5 xs:p-2 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg xs:rounded-xl shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/40 transition-all">
                <Link2 className="w-4 h-4 xs:w-5 xs:h-5 text-white" />
              </div>
              <span className="text-lg xs:text-xl font-bold bg-gradient-to-r from-primary-400 to-primary-500 bg-clip-text text-transparent">
                ShortURL
              </span>
            </Link>
            <p className="text-xs xs:text-sm text-slate-400 mb-3 xs:mb-4 leading-relaxed">
              Fast, secure, and free URL shortening service with powerful analytics and QR codes.
            </p>
            <div className="flex items-center gap-2 xs:gap-3">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all hover:scale-110 active:scale-95"
                aria-label="GitHub"
              >
                <Github className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all hover:scale-110 active:scale-95"
                aria-label="Twitter"
              >
                <Twitter className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
              </a>
              <a
                href="mailto:support@shorturl.com"
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all hover:scale-110 active:scale-95"
                aria-label="Email"
              >
                <Mail className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-white font-semibold mb-2 xs:mb-3 text-xs xs:text-sm sm:text-base">Product</h3>
            <ul className="space-y-1.5 xs:space-y-2">
              <li>
                <Link href="/" className="text-xs xs:text-sm text-slate-400 hover:text-primary-400 transition-colors block py-0.5">
                  URL Shortener
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-xs xs:text-sm text-slate-400 hover:text-primary-400 transition-colors block py-0.5">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/#features" className="text-xs xs:text-sm text-slate-400 hover:text-primary-400 transition-colors block py-0.5">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-xs xs:text-sm text-slate-400 hover:text-primary-400 transition-colors block py-0.5">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h3 className="text-white font-semibold mb-2 xs:mb-3 text-xs xs:text-sm sm:text-base">Resources</h3>
            <ul className="space-y-1.5 xs:space-y-2">
              <li>
                <a href="#" className="text-xs xs:text-sm text-slate-400 hover:text-primary-400 transition-colors block py-0.5">
                  API Docs
                </a>
              </li>
              <li>
                <a href="#" className="text-xs xs:text-sm text-slate-400 hover:text-primary-400 transition-colors block py-0.5">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-xs xs:text-sm text-slate-400 hover:text-primary-400 transition-colors block py-0.5">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="text-xs xs:text-sm text-slate-400 hover:text-primary-400 transition-colors block py-0.5">
                  Status
                </a>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-white font-semibold mb-2 xs:mb-3 text-xs xs:text-sm sm:text-base">Company</h3>
            <ul className="space-y-1.5 xs:space-y-2">
              <li>
                <a href="#" className="text-xs xs:text-sm text-slate-400 hover:text-primary-400 transition-colors block py-0.5">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="text-xs xs:text-sm text-slate-400 hover:text-primary-400 transition-colors block py-0.5">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-xs xs:text-sm text-slate-400 hover:text-primary-400 transition-colors block py-0.5">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="text-xs xs:text-sm text-slate-400 hover:text-primary-400 transition-colors block py-0.5">
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-4 xs:pt-6 sm:pt-8 border-t border-slate-700">
          <div className="flex flex-col xs:flex-row items-center justify-between gap-2 xs:gap-3 sm:gap-4">
            <p className="text-xs text-slate-400 text-center xs:text-left order-2 xs:order-1">
              © {currentYear} ShortURL. All rights reserved.
            </p>
            <p className="text-xs text-slate-400 flex items-center gap-1 order-1 xs:order-2">
              Made with <Heart className="w-3 h-3 text-red-500 fill-red-500 animate-pulse" /> by developers
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
