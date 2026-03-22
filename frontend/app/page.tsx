'use client';

import { useEffect, useState } from 'react';
import URLShortener from '@/components/URLShortener';
import { Link2, BarChart3, Shield, Zap, Sparkles } from 'lucide-react';
import Footer from '@/components/Footer';
import { useAuth } from '@/lib/auth-context';

export default function Home() {
  const { isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-6 sm:py-8 md:py-12 px-3 xs:px-4 relative overflow-hidden">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 border border-primary-200 rounded-full mb-3 sm:mb-4">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary-600" />
            <span className="text-xs sm:text-sm font-medium text-primary-700">Fast, Secure & Free</span>
          </div>
          
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-3 sm:mb-4 leading-tight">
            Shorten URLs.
            <span className="bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent"> Track Clicks.</span>
            <br />
            Grow Your Business.
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-slate-600 mb-6 sm:mb-8 max-w-2xl mx-auto">
            Create short, memorable links with powerful analytics, QR codes, and advanced features.
          </p>

          {/* URL Shortener Form */}
          <URLShortener />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-8 sm:py-12 md:py-16 px-3 xs:px-4 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-2 sm:mb-3">
              Why Choose ShortURL?
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto mb-2">
              Everything you need to manage and track your links effectively
            </p>
            <p className="text-xs sm:text-sm text-primary-600 font-semibold">
              Free users: 5 URLs/day • Registered users: Unlimited URLs + Analytics
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <FeatureCard
              icon={<Zap className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />}
              title="Lightning Fast"
              description="Create short URLs in milliseconds with our optimized infrastructure"
              gradient="from-yellow-400/10 to-orange-400/10"
            />
            <FeatureCard
              icon={<BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />}
              title="Detailed Analytics"
              description="Track clicks, locations, devices, and more with real-time analytics"
              gradient="from-blue-400/10 to-cyan-400/10"
            />
            <FeatureCard
              icon={<Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />}
              title="Secure & Private"
              description="Password protection, expiry dates, and enterprise-grade security"
              gradient="from-green-400/10 to-emerald-400/10"
            />
            <FeatureCard
              icon={<Link2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />}
              title="Custom Aliases"
              description="Create branded short links with custom aliases and domains"
              gradient="from-purple-400/10 to-pink-400/10"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-8 sm:py-12 md:py-16 px-3 xs:px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 to-primary-800"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAgNHYyaDJ2LTJoLTJ6bS0yIDJ2Mmgydi0yaC0yem0wLTR2Mmgydi0yaC0yem0yLTJ2LTJoLTJ2Mmgyem0tMiAwdi0yaC0ydjJoMnptLTItMnYtMmgtMnYyaDJ6bTItNHYyaDJ2LTJoLTJ6bS0yIDR2Mmgydi0yaC0yem00LTR2Mmgydi0yaC0yem0yLTJ2Mmgydi0yaC0yeiIvPjwvZz48L2c+PC9zdmc+')] opacity-10"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-3 sm:mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-sm sm:text-base text-primary-100 mb-4 sm:mb-6 max-w-2xl mx-auto">
            Sign up now and get access to advanced features like analytics, QR codes, and more.
          </p>
          <a
            href="/register"
            className="inline-block px-5 sm:px-6 py-2.5 sm:py-3 bg-white text-primary-600 rounded-lg sm:rounded-xl hover:bg-slate-50 hover:shadow-2xl transition-all font-semibold shadow-xl text-sm sm:text-base"
          >
            Create Free Account
          </a>
        </div>
      </section>
      <Footer />
    </div>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description,
  gradient 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  gradient: string;
}) {
  return (
    <div className="group relative">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} rounded-lg sm:rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity`}></div>
      <div className="relative p-3 sm:p-4 bg-white/80 backdrop-blur-sm rounded-lg sm:rounded-xl border border-slate-200/60 hover:border-primary-300/60 hover:shadow-xl transition-all">
        <div className="mb-2 sm:mb-3 inline-flex p-2 sm:p-2.5 bg-primary-50 rounded-lg group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <h3 className="text-sm sm:text-base font-semibold text-slate-900 mb-1 sm:mb-1.5">{title}</h3>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
