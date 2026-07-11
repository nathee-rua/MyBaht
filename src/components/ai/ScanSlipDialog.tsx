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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md bg-bg-primary rounded-t-3xl border-t border-border flex flex-col h-[85vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border/20">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent-purple" />
            <span className="font-bold text-text-primary">{t('ai.scanSlip')}</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-secondary/40 rounded-full text-text-secondary">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
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
            <div className="flex flex-col gap-3 py-8">
              <button
                type="button"
                onClick={triggerCamera}
                className="flex items-center justify-center gap-3 bg-accent-purple/10 border border-accent-purple/30 hover:bg-accent-purple/20 rounded-2xl p-5 text-sm font-bold text-accent-purple-light transition"
              >
                <Camera size={24} />
                <span>Take Photo of Receipt</span>
              </button>
              <button
                type="button"
                onClick={triggerUpload}
                className="flex items-center justify-center gap-3 bg-secondary/30 border border-border/40 hover:bg-border/30 rounded-2xl p-5 text-sm font-bold text-text-primary transition"
              >
                <Upload size={24} />
                <span>Upload Receipt Photo</span>
              </button>
              <button
                type="button"
                onClick={triggerUpload}
                className="flex items-center justify-center gap-3 bg-secondary/30 border border-border/40 hover:bg-border/30 rounded-2xl p-5 text-sm font-bold text-text-primary transition"
              >
                <FileText size={24} />
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
                  className="p-5 flex flex-col gap-4 animate-scale-in"
                  style={{
                    background: '#1A1530',
                    border: '1px solid #3D3660',
                    borderRadius: '20px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                  }}
                >
                  <h3 
                    className="text-sm font-bold flex items-center gap-1.5 border-b pb-2.5 mb-1 text-accent-purple-light"
                    style={{ borderColor: 'rgba(61, 54, 96, 0.4)' }}
                  >
                    <Check size={16} />
                    <span>Parsed Transaction Details</span>
                  </h3>

                  {/* Amount */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-text-secondary font-extrabold uppercase tracking-wider">{t('transaction.amount')}</label>
                    <input
                      id="scan-amount"
                      type="number"
                      value={result.amount}
                      onChange={(e) => setResult({ ...result, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full text-base font-bold focus:ring-2 focus:ring-accent-purple/50 transition-all outline-none"
                      style={{
                        background: '#2D2648',
                        border: '1px solid #3D3660',
                        color: '#FFFFFF',
                        padding: '10px 14px',
                        borderRadius: '12px',
                      }}
                    />
                  </div>

                  {/* Category */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-text-secondary font-extrabold uppercase tracking-wider">{t('transaction.category')}</label>
                    <select
                      id="scan-category"
                      value={result.category}
                      onChange={(e) => setResult({ ...result, category: e.target.value as Category })}
                      className="w-full text-sm font-semibold focus:ring-2 focus:ring-accent-purple/50 transition-all outline-none"
                      style={{
                        background: '#2D2648',
                        border: '1px solid #3D3660',
                        color: '#FFFFFF',
                        padding: '10px 14px',
                        borderRadius: '12px',
                      }}
                    >
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id} className="bg-[#1A1530] text-white">
                          {t(`category.${cat.id}`)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-text-secondary font-extrabold uppercase tracking-wider">{t('transaction.date')}</label>
                    <input
                      id="scan-date"
                      type="date"
                      value={result.date}
                      onChange={(e) => setResult({ ...result, date: e.target.value })}
                      className="w-full text-sm font-semibold focus:ring-2 focus:ring-accent-purple/50 transition-all outline-none"
                      style={{
                        background: '#2D2648',
                        border: '1px solid #3D3660',
                        color: '#FFFFFF',
                        padding: '10px 14px',
                        borderRadius: '12px',
                      }}
                    />
                  </div>

                  {/* Asset / Payment Method */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-text-secondary font-extrabold uppercase tracking-wider">{t('transaction.asset')}</label>
                    <select
                      id="scan-asset"
                      value={result.payment_method}
                      onChange={(e) => setResult({ ...result, payment_method: e.target.value as PaymentMethod })}
                      className="w-full text-sm font-semibold focus:ring-2 focus:ring-accent-purple/50 transition-all outline-none"
                      style={{
                        background: '#2D2648',
                        border: '1px solid #3D3660',
                        color: '#FFFFFF',
                        padding: '10px 14px',
                        borderRadius: '12px',
                      }}
                    >
                      {PAYMENT_METHODS.map((pm) => (
                        <option key={pm.id} value={pm.id} className="bg-[#1A1530] text-white">
                          {t(`payment.${pm.id}`)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Merchant */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-text-secondary font-extrabold uppercase tracking-wider">{t('transaction.merchant')}</label>
                    <input
                      id="scan-merchant"
                      type="text"
                      value={result.merchant}
                      onChange={(e) => setResult({ ...result, merchant: e.target.value })}
                      placeholder="Shop name"
                      className="w-full text-sm font-semibold focus:ring-2 focus:ring-accent-purple/50 transition-all outline-none"
                      style={{
                        background: '#2D2648',
                        border: '1px solid #3D3660',
                        color: '#FFFFFF',
                        padding: '10px 14px',
                        borderRadius: '12px',
                      }}
                    />
                  </div>

                  {/* Notes */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-text-secondary font-extrabold uppercase tracking-wider">{t('transaction.note')}</label>
                    <input
                      id="scan-note"
                      type="text"
                      value={result.note}
                      onChange={(e) => setResult({ ...result, note: e.target.value })}
                      placeholder="Notes"
                      className="w-full text-sm font-semibold focus:ring-2 focus:ring-accent-purple/50 transition-all outline-none"
                      style={{
                        background: '#2D2648',
                        border: '1px solid #3D3660',
                        color: '#FFFFFF',
                        padding: '10px 14px',
                        borderRadius: '12px',
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="w-full text-sm font-bold transition-all flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
                    style={{
                      background: '#22C55E',
                      color: '#FFFFFF',
                      padding: '14px',
                      borderRadius: '14px',
                      boxShadow: '0 4px 12px rgba(34, 197, 94, 0.25)',
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
