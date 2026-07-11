'use client';

import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, RefreshCw, Key, ShieldCheck, Sparkles, Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { AIProvider, UserSettings, AIModel } from '@/types';
import { AI_PROVIDERS } from '@/lib/ai-providers';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface AISettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function AISettingsDialog({ open, onClose }: AISettingsDialogProps) {
  const { t } = useI18n();
  const [provider, setProvider] = useState<AIProvider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [models, setModels] = useState<AIModel[]>([]);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        if (data.ai_provider) setProvider(data.ai_provider as AIProvider);
        if (data.ai_model) setModel(data.ai_model);
        
        // We will fetch the masked key or the decrypted key if needed,
        // but since we save it server-side, we can just load the models if a key is already saved.
        // Let's populate the API key field with a placeholder if it exists in DB.
        if (data.ai_api_key_encrypted) {
          setApiKey('••••••••••••••••••••••••••••••••');
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Error loading settings: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchModels = async () => {
    if (!apiKey) {
      toast.error('API Key is required to fetch models');
      return;
    }

    setFetchingModels(true);
    try {
      const response = await fetch('/api/ai/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to fetch models');
      }

      const data = await response.json();
      setModels(data);
      if (data.length > 0) {
        setModel(data[0].id);
      }
      toast.success(`Fetched ${data.length} vision models!`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Fetch models failed: ${errorMsg}`);
    } finally {
      setFetchingModels(false);
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey || !model) {
      toast.error('API Key and Model are required');
      return;
    }

    setTestingConnection(true);
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey,
          model,
          isTest: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Connection test failed');
      }

      toast.success('Connection test successful! Vision model is ready.');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Test failed: ${errorMsg}`);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update settings. If key is placeholder, do not overwrite the key.
      const isPlaceholder = apiKey === '••••••••••••••••••••••••••••••••';
      const payload: Record<string, unknown> = {
        ai_provider: provider,
        ai_model: model,
      };

      if (!isPlaceholder) {
        payload.ai_api_key = apiKey; // API route will encrypt this securely before saving
      }

      const response = await fetch('/api/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to save settings');
      }

      toast.success('AI settings saved successfully');
      onClose();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Save failed: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-bg-secondary border border-border rounded-3xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/20">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-accent-purple" />
            <span className="font-bold text-text-primary">{t('settings.ai')}</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-secondary/40 rounded-full text-text-secondary">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-accent-purple/5 border border-accent-purple/20 text-xs text-text-secondary">
            <div className="flex items-center gap-1.5 font-bold text-accent-purple-light">
              <ShieldCheck size={14} />
              <span>Secure Storage</span>
            </div>
            <p className="mt-0.5 leading-relaxed">
              Your API keys are encrypted at the database level using pgcrypto. They are decrypted only during server-side AI requests.
            </p>
          </div>

          {/* Provider Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-text-secondary">{t('ai.provider')}</label>
            <div className="flex flex-wrap gap-2 justify-center">
              {AI_PROVIDERS.map((prov) => (
                <button
                  key={prov.id}
                  type="button"
                  onClick={() => {
                    setProvider(prov.id);
                    setModels([]);
                    setModel('');
                    setApiKey('');
                  }}
                  className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl border transition w-[calc(25%-6px)] min-w-[72px] ${
                    provider === prov.id
                      ? 'border-accent-purple bg-accent-purple/10 text-white font-bold'
                      : 'border-border/40 bg-bg-primary/45 text-text-secondary'
                  }`}
                >
                  <span className="text-xl mb-1">{prov.icon}</span>
                  <span className="text-[10px] truncate w-full text-center">{prov.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* API Key Input */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-text-secondary">{t('ai.apiKey')}</label>
            <div className="relative">
              <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                id="ai-api-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Enter your ${provider.toUpperCase()} API Key`}
                className="w-full bg-bg-primary/50 border border-border/60 rounded-2xl py-3 pl-10 pr-10 text-sm text-text-primary focus:outline-none focus:border-accent-purple placeholder:text-text-muted font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Fetch Models Button */}
          <button
            type="button"
            onClick={handleFetchModels}
            disabled={fetchingModels || !apiKey}
            className="flex items-center justify-center gap-2 bg-secondary/50 border border-border/40 hover:bg-border/30 rounded-2xl py-2.5 text-xs font-semibold text-text-primary transition disabled:opacity-50"
          >
            {fetchingModels ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            <span>Fetch Available Vision Models</span>
          </button>

          {/* Model Selection */}
          {models.length > 0 || model ? (
            <div className="flex flex-col gap-2 animate-scale-in">
              <label className="text-xs font-semibold text-text-secondary">{t('ai.model')}</label>
              <select
                id="ai-model-select"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-bg-primary/50 border border-border/60 rounded-2xl py-3 px-4 text-sm text-text-primary focus:outline-none focus:border-accent-purple"
              >
                {models.length > 0 ? (
                  models.map((m) => (
                    <option key={m.id} value={m.id} className="bg-bg-secondary text-text-primary text-xs">
                      {m.name} ({m.id})
                    </option>
                  ))
                ) : (
                  <option value={model} className="bg-bg-secondary text-text-primary text-xs">
                    {model}
                  </option>
                )}
              </select>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-bg-primary/40 border-t border-border/20 flex gap-3">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testingConnection || !apiKey || !model}
            className="flex-1 bg-secondary/80 hover:bg-secondary border border-border/40 text-text-primary rounded-2xl py-3 text-xs font-semibold transition disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {testingConnection && <RefreshCw size={12} className="animate-spin" />}
            <span>{t('ai.testConnection')}</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || !model}
            className="flex-1 bg-accent-purple hover:bg-accent-purple-light text-white rounded-2xl py-3 text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {loading && <RefreshCw size={12} className="animate-spin" />}
            <span>{t('common.save')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
