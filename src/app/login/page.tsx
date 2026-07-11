'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, CircleDollarSign, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(t('common.success'));
        router.push('/');
        router.refresh();
      }
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        toast.error(error.message);
        setGoogleLoading(false);
      }
    } catch {
      toast.error(t('common.error'));
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: 'linear-gradient(180deg, #0D0B1A 0%, #1A1530 50%, #0D0B1A 100%)' }}
    >
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 opacity-5">
          <Shield size={120} className="text-purple-500" />
        </div>
        <div className="absolute bottom-32 right-8 opacity-5">
          <CircleDollarSign size={140} className="text-purple-500" />
        </div>
        <div className="absolute top-1/3 right-16 opacity-[0.03]">
          <Shield size={80} className="text-purple-400" />
        </div>
        <div className="absolute bottom-1/3 left-16 opacity-[0.03]">
          <CircleDollarSign size={100} className="text-purple-400" />
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-sm animate-scale-in">
        {/* Logo area */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}
          >
            <CircleDollarSign size={28} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-white">MyBaht</span>
        </div>

        {/* Welcome heading */}
        <h1
          className="text-center text-2xl font-bold mb-2"
          style={{
            background: 'linear-gradient(135deg, #A78BFA, #7C3AED)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {t('auth.welcome')}
        </h1>
        <p className="text-center text-sm mb-8" style={{ color: '#9CA3AF' }}>
          {t('auth.subtitle')}
        </p>

        {/* Login form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div className="relative">
            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#6B7280' }} />
            <input
              id="login-email"
              type="email"
              placeholder={t('auth.email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-xl text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
              style={{
                background: '#1A1530',
                border: '1px solid #3D3660',
              }}
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#6B7280' }} />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder={t('auth.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-12 py-3.5 rounded-xl text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
              style={{
                background: '#1A1530',
                border: '1px solid #3D3660',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
              style={{ color: '#6B7280' }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Login button */}
          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
              boxShadow: '0 4px 15px rgba(124, 58, 237, 0.3)',
            }}
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {t('auth.login')}
          </button>
        </form>

        {/* Register link */}
        <Link href="/register">
          <button
            id="goto-register"
            type="button"
            className="w-full mt-3 py-3.5 rounded-xl font-semibold text-sm transition-all hover:bg-purple-500/10 cursor-pointer"
            style={{
              color: '#A78BFA',
              border: '1px solid #7C3AED',
            }}
          >
            {t('auth.register')}
          </button>
        </Link>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px" style={{ background: '#3D3660' }} />
          <span className="text-xs" style={{ color: '#6B7280' }}>
            {t('auth.social')}
          </span>
          <div className="flex-1 h-px" style={{ background: '#3D3660' }} />
        </div>

        {/* Google login */}
        <button
          id="google-login"
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="w-full py-3.5 rounded-xl text-white font-medium text-sm transition-all hover:border-purple-500/50 cursor-pointer flex items-center justify-center gap-3 disabled:opacity-50"
          style={{
            background: '#1A1530',
            border: '1px solid #3D3660',
          }}
        >
          {googleLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          Google
        </button>
      </div>
    </div>
  );
}
