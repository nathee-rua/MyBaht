'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CircleDollarSign, Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Check your email for the confirmation link!');
        router.push('/login');
      }
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: 'linear-gradient(180deg, #0D0B1A 0%, #1A1530 50%, #0D0B1A 100%)' }}
    >
      <div className="relative z-10 w-full max-w-sm animate-scale-in">
        {/* Back button */}
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm mb-8 transition-colors hover:text-purple-400"
          style={{ color: '#9CA3AF' }}
        >
          <ArrowLeft size={16} />
          {t('auth.login')}
        </Link>

        {/* Logo area */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}
          >
            <CircleDollarSign size={28} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-white">MyBaht</span>
        </div>

        {/* Heading */}
        <h1
          className="text-center text-2xl font-bold mb-2"
          style={{
            background: 'linear-gradient(135deg, #A78BFA, #7C3AED)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {t('auth.register')}
        </h1>
        <p className="text-center text-sm mb-8" style={{ color: '#9CA3AF' }}>
          {t('auth.subtitle')}
        </p>

        {/* Register form */}
        <form onSubmit={handleRegister} className="space-y-4">
          {/* Email */}
          <div className="relative">
            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#6B7280' }} />
            <input
              id="register-email"
              type="email"
              placeholder={t('auth.email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              id="register-password"
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

          {/* Confirm Password */}
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#6B7280' }} />
            <input
              id="register-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder={t('auth.confirmPassword')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
              style={{ color: '#6B7280' }}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Register button */}
          <button
            id="register-submit"
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
              boxShadow: '0 4px 15px rgba(124, 58, 237, 0.3)',
            }}
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {t('auth.register')}
          </button>
        </form>

        {/* Login link */}
        <p className="text-center text-sm mt-6" style={{ color: '#9CA3AF' }}>
          Already have an account?{' '}
          <Link href="/login" className="font-medium" style={{ color: '#A78BFA' }}>
            {t('auth.login')}
          </Link>
        </p>
      </div>
    </div>
  );
}
