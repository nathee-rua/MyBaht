'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, CircleDollarSign, User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please enter username and password');
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const formattedEmail = username.includes('@')
        ? username.trim()
        : `${username.trim().toLowerCase()}@mybaht.local`;

      const { error } = await supabase.auth.signInWithPassword({
        email: formattedEmail,
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
          {/* Username */}
          <div className="relative">
            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#6B7280' }} />
            <input
              id="login-username"
              type="text"
              placeholder={t('auth.username')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full py-3.5 rounded-xl text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
              style={{
                background: '#1A1530',
                border: '1px solid #3D3660',
                paddingLeft: '3rem',
                paddingRight: '1rem',
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
              className="w-full py-3.5 rounded-xl text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
              style={{
                background: '#1A1530',
                border: '1px solid #3D3660',
                paddingLeft: '3rem',
                paddingRight: '3rem',
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
      </div>
    </div>
  );
}
