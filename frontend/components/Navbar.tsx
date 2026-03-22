'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Link2, LogOut, LayoutDashboard, Home } from 'lucide-react';

export default function Navbar() {
  const { isAuthenticated, isLoading, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-200/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 xs:h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5 xs:gap-2 group">
            <div className="p-1.5 xs:p-2 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg xs:rounded-xl shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/40 transition-all">
              <Link2 className="w-4 h-4 xs:w-5 xs:h-5 text-white" />
            </div>
            <span className="text-base xs:text-lg sm:text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
              ShortURL
            </span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-1 xs:gap-2">
            {isLoading ? (
              // Placeholder to prevent layout shift
              <div className="flex items-center gap-1 xs:gap-2">
                <div className="w-12 xs:w-16 h-8 xs:h-10 bg-slate-100 rounded-lg xs:rounded-xl animate-pulse" />
                <div className="w-14 xs:w-20 h-8 xs:h-10 bg-slate-100 rounded-lg xs:rounded-xl animate-pulse" />
              </div>
            ) : isAuthenticated ? (
              <>
                <Link
                  href="/"
                  className="flex items-center gap-1.5 xs:gap-2 px-2 xs:px-3 sm:px-4 py-1.5 xs:py-2 text-slate-700 hover:text-primary-600 hover:bg-slate-50 rounded-lg xs:rounded-xl transition-all active:scale-95 min-h-[44px]"
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline font-medium text-sm">Home</span>
                </Link>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 xs:gap-2 px-2 xs:px-3 sm:px-4 py-1.5 xs:py-2 text-slate-700 hover:text-primary-600 hover:bg-slate-50 rounded-lg xs:rounded-xl transition-all active:scale-95 min-h-[44px]"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline font-medium text-sm">Dashboard</span>
                </Link>
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 xs:gap-2 px-2 xs:px-3 sm:px-4 py-1.5 xs:py-2 text-red-600 hover:bg-red-50 rounded-lg xs:rounded-xl transition-all active:scale-95 min-h-[44px]"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline font-medium text-sm">Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 xs:px-4 py-1.5 xs:py-2 text-sm text-slate-700 hover:text-primary-600 hover:bg-slate-50 rounded-lg xs:rounded-xl transition-all font-medium active:scale-95 min-h-[44px] flex items-center"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-3 xs:px-4 sm:px-5 py-1.5 xs:py-2 sm:py-2.5 text-sm bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg xs:rounded-xl hover:shadow-lg hover:shadow-primary-500/30 transition-all font-medium active:scale-95 min-h-[44px] flex items-center"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
