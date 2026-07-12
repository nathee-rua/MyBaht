'use client';

import React, { useState, useRef } from 'react';
import { X, Camera, Upload, FileText, Sparkles, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { Category, PaymentMethod } from '@/types';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '@/types';
import { convertPdfToImages } from '@/lib/pdf-to-images';
import { toast } from 'sonner';

interface ScanSlipDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (result: {
    amount: number;
    category: Category;
    merchant?: string;
    note?: string;
    date: string;
    payment_method?: PaymentMethod;
  }) => void;
}

export default function ScanSlipDialog({ open, onClose, onSuccess }: ScanSlipDialogProps) {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    amount: number;
    category: Category;
    merchant: string;
    note: string;
    date: string;
    payment_method: PaymentMethod;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setResult(null);

    if (selectedFile.type === 'application/pdf') {
      setPreviewUrl(null); // PDF won't have direct image preview without conversion
    } else {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerUpload = () => fileInputRef.current?.click();
  const triggerCamera = () => cameraInputRef.current?.click();

  const handleAnalyze = async () => {
    if (!file) return;

    setAnalyzing(true);
    try {
      let imagesBase64: string[] = [];

      if (file.type === 'application/pdf') {
        toast.info('Converting PDF pages to images...');
        imagesBase64 = await convertPdfToImages(file);
      } else {
        // Convert single image file to Base64
        const base64 = await fileToBase64(file);
        imagesBase64 = [base64];
      }

      toast.info('Analyzing slip with AI vision...');
      
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: imagesBase64 }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to analyze receipt');
      }

      const parsed = await response.json();
      setResult({
        amount: parsed.amount || 0,
        category: parsed.category || 'food',
        merchant: parsed.merchant || '',
        note: parsed.note || '',
        date: parsed.date || new Date().toISOString().split('T')[0],
        payment_method: parsed.payment_method || 'cash',
      });
      toast.success('AI slip scanning complete!');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Analysis failed: ${errorMsg}. Make sure you have configured AI settings.`);
    } finally {
      setAnalyzing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // strip prefix like "data:image/jpeg;base64,"
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleConfirm = () => {
    if (result) {
      onSuccess(result);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md bg-bg-primary rounded-t-[24px] border-t border-x border-border flex flex-col h-[85vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-border/20 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent-purple" />
            <span className="font-bold text-text-primary">{t('ai.scanSlip')}</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-secondary/40 rounded-full text-text-secondary">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 pb-8 flex flex-col gap-4">
          <input
            id="slip-upload-file"
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,application/pdf"
            className="hidden"
          />
          <input
            id="slip-camera-file"
            type="file"
            ref={cameraInputRef}
            onChange={handleFileChange}
            accept="image/*"
            capture="environment"
            className="hidden"
          />

          {!file ? (
            /* Upload options */
            <div className="flex flex-col gap-2.5">
              {/* Premium Center Illustration (h-44 = 176px) */}
              <div className="h-44 w-full rounded-xl bg-bg-tertiary/40 border border-border/40 flex flex-col items-center justify-center text-center p-4 mb-1">
                <div className="w-14 h-14 rounded-full bg-accent-purple/10 flex items-center justify-center text-accent-purple mb-2 flex-shrink-0">
                  <Camera size={26} />
                </div>
                <span className="text-[14px] font-bold text-text-primary block">AI Receipt Scanner</span>
                <span className="text-[13px] text-text-secondary mt-0.5 leading-relaxed max-w-[28ch]">
                  Supports JPG, PNG, PDF up to 10MB
                </span>
              </div>

              {/* Primary Option: Take Photo (h-13 = 52px) */}
              <button
                type="button"
                onClick={triggerCamera}
                className="flex items-center justify-center gap-3 bg-accent-purple text-white hover:bg-accent-purple-light rounded-xl h-13 text-[14px] font-semibold transition cursor-pointer"
              >
                <Camera size={20} />
                <span>Take Photo of Receipt</span>
              </button>

              {/* Secondary Option: Upload Photo (h-12 = 48px) */}
              <button
                type="button"
                onClick={triggerUpload}
                className="flex items-center justify-center gap-3 bg-bg-secondary border border-border/60 hover:bg-bg-tertiary rounded-xl h-12 text-[14px] font-semibold text-text-primary transition cursor-pointer"
              >
                <Upload size={18} className="text-text-secondary" />
                <span>Upload Receipt Photo</span>
              </button>

              {/* Secondary Option: Upload PDF (h-12 = 48px) */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-3 bg-bg-secondary border border-border/60 hover:bg-bg-tertiary rounded-xl h-12 text-[14px] font-semibold text-text-primary transition cursor-pointer"
              >
                <FileText size={18} className="text-text-secondary" />
                <span>Upload PDF E-Slip</span>
              </button>
            </div>
          ) : (
            /* Preview / Result section */
            <div className="flex flex-col gap-4">
              {/* Preview Box */}
              <div className="relative rounded-2xl border border-border bg-bg-secondary overflow-hidden aspect-video flex items-center justify-center">
                {previewUrl ? (
                  <img src={previewUrl} alt="Receipt preview" className="object-contain w-full h-full" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-text-muted">
                    <FileText size={40} />
                    <span className="text-xs font-semibold">{file.name}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreviewUrl(null);
                    setResult(null);
                  }}
                  className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-black/80 rounded-full text-white transition"
                >
                  <X size={16} />
                </button>
              </div>

              {!result && (
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="w-full bg-accent-purple hover:bg-accent-purple-light text-white rounded-2xl py-3.5 text-sm font-bold transition flex items-center justify-center gap-2"
                >
                  {analyzing ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>{t('ai.analyzing')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Analyze Receipt Now</span>
                    </>
                  )}
                </button>
              )}

              {/* Parsed Result Form */}
              {result && (
                <div 
                  className="p-3.5 flex flex-col gap-4 animate-scale-in"
                  style={{
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '18px',
                    boxShadow: '0 6px 20px rgba(17, 24, 39, 0.06)',
                  }}
                >
                  <h3 
                    className="text-sm font-bold flex items-center gap-1.5 border-b pb-2.5 mb-1 text-accent-purple"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <Check size={16} />
                    <span>Parsed Transaction Details</span>
                  </h3>

                  {/* Amount */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">{t('transaction.amount')}</label>
                    <input
                      id="scan-amount"
                      type="number"
                      value={result.amount}
                      onChange={(e) => setResult({ ...result, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full text-base font-bold focus:ring-2 focus:ring-accent-purple/50 transition-all outline-none"
                      style={{
                        background: 'var(--color-bg-tertiary)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)',
                        padding: '10px 14px',
                        borderRadius: '12px',
                      }}
                    />
                  </div>

                  {/* Category */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">{t('transaction.category')}</label>
                    <select
                      id="scan-category"
                      value={result.category}
                      onChange={(e) => setResult({ ...result, category: e.target.value as Category })}
                      className="w-full text-sm font-semibold focus:ring-2 focus:ring-accent-purple/50 transition-all outline-none"
                      style={{
                        background: 'var(--color-bg-tertiary)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)',
                        padding: '10px 14px',
                        borderRadius: '12px',
                      }}
                    >
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id} className="bg-bg-secondary text-text-primary">
                          {t(`category.${cat.id}`)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">{t('transaction.date')}</label>
                    <input
                      id="scan-date"
                      type="date"
                      value={result.date}
                      onChange={(e) => setResult({ ...result, date: e.target.value })}
                      className="w-full text-sm font-semibold focus:ring-2 focus:ring-accent-purple/50 transition-all outline-none"
                      style={{
                        background: 'var(--color-bg-tertiary)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)',
                        padding: '10px 14px',
                        borderRadius: '12px',
                      }}
                    />
                  </div>

                  {/* Asset / Payment Method */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">{t('transaction.asset')}</label>
                    <select
                      id="scan-asset"
                      value={result.payment_method}
                      onChange={(e) => setResult({ ...result, payment_method: e.target.value as PaymentMethod })}
                      className="w-full text-sm font-semibold focus:ring-2 focus:ring-accent-purple/50 transition-all outline-none"
                      style={{
                        background: 'var(--color-bg-tertiary)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)',
                        padding: '10px 14px',
                        borderRadius: '12px',
                      }}
                    >
                      {PAYMENT_METHODS.map((pm) => (
                        <option key={pm.id} value={pm.id} className="bg-bg-secondary text-text-primary">
                          {t(`payment.${pm.id}`)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Merchant */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">{t('transaction.merchant')}</label>
                    <input
                      id="scan-merchant"
                      type="text"
                      value={result.merchant}
                      onChange={(e) => setResult({ ...result, merchant: e.target.value })}
                      placeholder="Shop name"
                      className="w-full text-sm font-semibold focus:ring-2 focus:ring-accent-purple/50 transition-all outline-none"
                      style={{
                        background: 'var(--color-bg-tertiary)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)',
                        padding: '10px 14px',
                        borderRadius: '12px',
                      }}
                    />
                  </div>

                  {/* Notes */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">{t('transaction.note')}</label>
                    <input
                      id="scan-note"
                      type="text"
                      value={result.note}
                      onChange={(e) => setResult({ ...result, note: e.target.value })}
                      placeholder="Notes"
                      className="w-full text-sm font-semibold focus:ring-2 focus:ring-accent-purple/50 transition-all outline-none"
                      style={{
                        background: 'var(--color-bg-tertiary)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)',
                        padding: '10px 14px',
                        borderRadius: '12px',
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="w-full h-12 text-sm font-bold transition-all flex items-center justify-center gap-1.5 mt-2 cursor-pointer text-white"
                    style={{
                      background: '#22C55E',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)',
                    }}
                  >
                    <Check size={16} />
                    <span>Apply Parsed Values</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
