'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      return alert('Passwords do not match');
    }

    if (password.length < 8) {
      return alert('Password must be at least 8 characters');
    }

    setLoading(true);
    try {
      await register(email, password);
      router.push('/dashboard');
    } catch (err) {
      // Error handled by auth context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-3 xs:px-4 py-8 xs:py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl xs:rounded-2xl shadow-lg p-5 xs:p-6 sm:p-8 border border-gray-100">
          {/* Header */}
          <div className="text-center mb-6 xs:mb-8">
            <div className="inline-flex p-2.5 xs:p-3 bg-primary-100 rounded-xl mb-3 xs:mb-4">
              <UserPlus className="w-6 h-6 xs:w-8 xs:h-8 text-primary-600" />
            </div>
            <h1 className="text-2xl xs:text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
            <p className="text-sm xs:text-base text-gray-600">Start shortening URLs for free</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3 xs:space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 xs:px-4 py-2.5 xs:py-3 text-sm xs:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password (min 8 characters)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
                className="w-full px-3 xs:px-4 py-2.5 xs:py-3 text-sm xs:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 xs:px-4 py-2.5 xs:py-3 text-sm xs:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 xs:py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium shadow-sm active:scale-[0.98] min-h-[44px] text-sm xs:text-base"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs xs:text-sm text-gray-600 mt-5 xs:mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
