'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Send, Sparkles, AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';

export default function TelegramSettingsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [linked, setLinked] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/telegram/link');
      if (response.ok) {
        const data = await response.json();
        setLinked(data.linked);
      }
    } catch {
      toast.error('Failed to load status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleGenerateCode = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/telegram/link', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        setCode(data.code);
        toast.success('Linking code generated successfully!');
      } else {
        toast.error('Failed to generate code');
      }
    } catch {
      toast.error('Error generating link code');
    } finally {
      setGenerating(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm('Are you sure you want to unlink your Telegram account?')) return;

    setUnlinking(true);
    try {
      const response = await fetch('/api/telegram/link', { method: 'DELETE' });
      if (response.ok) {
        setLinked(false);
        setCode(null);
        toast.success('Telegram account unlinked');
      } else {
        toast.error('Failed to unlink');
      }
    } catch {
      toast.error('Error unlinking account');
    } finally {
      setUnlinking(false);
    }
  };

  return (
    <div className="page-container px-4 pt-4 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-border/20">
        <button
          onClick={() => router.push('/settings')}
          className="p-1.5 hover:bg-secondary/40 rounded-xl text-text-secondary"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-text-primary">{t('telegram.connect')}</h1>
      </div>

      {/* Connection Status Card */}
      <div className="card-base p-6 flex flex-col items-center text-center gap-4">
        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center border ${
          linked 
            ? 'bg-income-green/10 border-income-green/30 text-income-green' 
            : 'bg-secondary/20 border-border/40 text-text-muted'
        }`}>
          <Send size={28} className={linked ? '' : 'rotate-45'} />
        </div>

        <div>
          <h2 className="text-base font-bold text-text-primary">
            {linked ? t('telegram.linked') : t('telegram.unlinked')}
          </h2>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">
            {linked
              ? 'Your account is linked to Telegram! Send receipt photos to process them automatically.'
              : 'Link your Telegram account to upload slips and receipts on the go.'}
          </p>
        </div>

        {linked && (
          <button
            onClick={handleUnlink}
            disabled={unlinking}
            className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 font-bold rounded-2xl py-3 text-xs transition disabled:opacity-50"
          >
            {unlinking ? 'Unlinking...' : 'Disconnect Telegram Account'}
          </button>
        )}
      </div>

      {/* Instructions & Code Generator (If not linked) */}
      {!linked && (
        <div className="flex flex-col gap-4 animate-scale-in">
          {/* Action box */}
          <div className="card-base p-5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Sparkles size={16} className="text-accent-purple" />
              <span>Link via Bot Code</span>
            </h3>

            <p className="text-xs text-text-secondary leading-relaxed">
              1. Open Telegram and search for the bot <b>@MyBahtBot</b> or click the button below.
              <br />
              2. Click Start or type <code>/start</code>.
              <br />
              3. Click <b>Generate Code</b> below and send <code>/link [code]</code> to the bot.
            </p>

            <a
              href="https://t.me/MyBahtBot"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-2xl py-3 text-xs transition text-center block"
            >
              Open @MyBahtBot in Telegram
            </a>

            <div className="border-t border-border/10 my-1"></div>

            {code ? (
              <div className="flex flex-col items-center gap-2 p-4 bg-bg-primary/50 border border-border/40 rounded-2xl animate-scale-in">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Your One-Time Code</span>
                <span className="text-3xl font-extrabold text-accent-purple-light tracking-widest">{code}</span>
                <span className="text-[9px] text-text-muted">Expires in 10 minutes</span>
              </div>
            ) : (
              <button
                onClick={handleGenerateCode}
                disabled={generating}
                className="w-full bg-accent-purple hover:bg-accent-purple-light text-white font-bold rounded-2xl py-3 text-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {generating && <RefreshCw size={14} className="animate-spin" />}
                <span>Generate Linking Code</span>
              </button>
            )}
          </div>

          {/* Notice */}
          <div className="flex gap-3 p-4 bg-secondary/10 border border-border/20 rounded-2xl text-[11px] text-text-secondary leading-relaxed">
            <AlertCircle size={16} className="text-accent-purple flex-shrink-0" />
            <p>
              Linking your Telegram account grants the bot permission to parse your receipt images and create expense entries. The bot only reads messages sent directly to it.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
