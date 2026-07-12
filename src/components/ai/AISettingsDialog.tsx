'use client';

import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, RefreshCw, Key, ShieldCheck, Sparkles, Check, ChevronUp, ChevronDown } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { AIProvider, UserSettings, AIModel } from '@/types';
import { AI_PROVIDERS, getDefaultModels } from '@/lib/ai-providers';
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
  const [showFreeOnly, setShowFreeOnly] = useState(false);

  const displayModels = models.length > 0 ? models : getDefaultModels(provider);

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  // Set default model on provider change if empty or invalid
  useEffect(() => {
    if (displayModels.length > 0) {
      const modelExists = displayModels.some(m => m.id === model);
      if (!model || !modelExists) {
        setModel(displayModels[0].id);
      }
    }
  }, [provider, models, model, displayModels]);

  const filteredModels = React.useMemo(() => {
    let result = displayModels;
    if (showFreeOnly) {
      result = result.filter(m => 
        m.id.toLowerCase().includes('free') || 
        m.name.toLowerCase().includes('free') ||
        // Gemini flash models which have free tier
        (provider === 'google' && m.id.toLowerCase().includes('flash'))
      );
    }
    return result;
  }, [displayModels, showFreeOnly, provider]);

  const handlePrevModel = () => {
    if (filteredModels.length === 0) return;
    const currentIndex = filteredModels.findIndex(m => m.id === model);
    if (currentIndex <= 0) {
      setModel(filteredModels[filteredModels.length - 1].id);
    } else {
      setModel(filteredModels[currentIndex - 1].id);
    }
  };

  const handleNextModel = () => {
    if (filteredModels.length === 0) return;
    const currentIndex = filteredModels.findIndex(m => m.id === model);
    if (currentIndex === -1 || currentIndex >= filteredModels.length - 1) {
      setModel(filteredModels[0].id);
    } else {
      setModel(filteredModels[currentIndex + 1].id);
    }
  };

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-[calc(100%-16px)] mx-2 my-2 max-w-md bg-bg-secondary border border-border rounded-2xl overflow-hidden flex flex-col h-[85vh] animate-scale-in shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-border/20 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-accent-purple" />
            <span className="font-bold text-text-primary text-base">{t('settings.ai')}</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-secondary/40 rounded-full text-text-secondary cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
          {/* Section 1: Provider Credentials & Storage Banner */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-accent-purple/5 border border-accent-purple/20 text-xs text-text-secondary">
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
              <label className="text-[12px] font-bold text-text-secondary pl-1 block">{t('ai.provider')}</label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1.5 px-1 scrollbar-none w-full">
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
                    className={`flex items-center justify-center gap-2 h-12 px-4 min-w-[96px] rounded-xl border transition-all cursor-pointer whitespace-nowrap flex-shrink-0 text-[12px] font-semibold ${
                      provider === prov.id
                        ? 'border border-accent-purple bg-accent-purple/10 text-text-primary font-bold shadow-sm'
                        : 'border-border/60 bg-bg-primary text-text-secondary hover:bg-bg-tertiary'
                    }`}
                  >
                    <span className="text-[20px] leading-none flex-shrink-0">{prov.icon}</span>
                    <span>{prov.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* API Key Input */}
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold text-text-secondary pl-1 block">{t('ai.apiKey')}</label>
              <div className="relative">
                <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  id="ai-api-key"
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={`Enter your ${provider.toUpperCase()} API Key`}
                  className="w-full h-12 bg-bg-primary/50 border border-border/60 rounded-xl pl-10 pr-10 text-sm text-text-primary focus:outline-none focus:border-accent-purple placeholder:text-text-muted font-mono"
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
          </div>

          <hr className="border-border/40" />

          {/* Section 2: Model Management */}
          <div className="flex flex-col gap-4">
            {/* Fetch Models Button */}
            <button
              type="button"
              onClick={handleFetchModels}
              disabled={fetchingModels || !apiKey}
              className="flex items-center justify-center gap-2 h-11 bg-bg-tertiary border border-border/40 hover:bg-border/60 rounded-xl w-full text-[12px] font-semibold text-text-primary transition disabled:opacity-50"
            >
              {fetchingModels ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              <span>Fetch Available Vision Models</span>
            </button>

            {/* Model Selection */}
            {displayModels.length > 0 ? (
              <div className="flex flex-col gap-2 animate-scale-in">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-bold text-text-secondary pl-1 block">
                    {t('ai.model')} / Available Models
                  </label>
                  {/* Arrow controllers */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handlePrevModel}
                      disabled={filteredModels.length <= 1}
                      className="p-1 hover:bg-secondary/40 border border-border/40 rounded text-text-secondary cursor-pointer disabled:opacity-30"
                      title="Previous Model"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextModel}
                      disabled={filteredModels.length <= 1}
                      className="p-1 hover:bg-secondary/40 border border-border/40 rounded text-text-secondary cursor-pointer disabled:opacity-30"
                      title="Next Model"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>

                {/* Free Filter & Helper */}
                <div className="flex items-center justify-between h-9 px-3 bg-bg-primary/30 rounded-xl border border-border/20 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="free-models-only"
                      checked={showFreeOnly}
                      onChange={(e) => setShowFreeOnly(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-border text-accent-purple focus:ring-accent-purple cursor-pointer"
                    />
                    <label htmlFor="free-models-only" className="text-[11px] font-semibold text-text-secondary cursor-pointer select-none">
                      Show Free Models Only
                    </label>
                  </div>
                  <span className="text-[9px] text-text-muted font-bold">
                    {filteredModels.length} models
                  </span>
                </div>

                {/* Models List Container */}
                <div className="w-full bg-bg-primary/50 border border-border/60 rounded-xl p-1.5 h-[180px] overflow-y-auto flex flex-col gap-1">
                  {filteredModels.length > 0 ? (
                    filteredModels.map((m) => (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setModel(m.id)}
                        className={`w-full text-left px-3 h-10 text-xs flex justify-between items-center transition-all cursor-pointer rounded-lg ${
                          model === m.id
                            ? 'bg-accent-purple/10 text-accent-purple font-bold border border-accent-purple/20'
                            : 'text-text-primary hover:bg-secondary/30'
                        }`}
                      >
                        <span className="truncate pr-2 font-semibold">{m.name}</span>
                        <span className="text-[9px] text-text-muted font-mono truncate max-w-[150px]">{m.id}</span>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8 text-xs text-text-muted">
                      No models match the filter.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-bg-secondary border-t border-border/20 flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testingConnection || !apiKey || !model}
            className="w-[40%] h-12 bg-bg-tertiary hover:bg-bg-tertiary/80 border border-border text-text-primary rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
          >
            {testingConnection && <RefreshCw size={12} className="animate-spin" />}
            <span>{t('ai.testConnection')}</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || !model}
            className="w-[60%] h-12 bg-accent-purple hover:bg-accent-purple-light text-white rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95"
          >
            {loading && <RefreshCw size={12} className="animate-spin" />}
            <span>{t('common.save')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
