"use client";

import { useState, useRef } from "react";
import { Camera, Upload, Loader2, AlertCircle, Keyboard, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { normalizeReceiptDraft, persistReceiptDraft } from "@/lib/receipt";

export default function UploadPage() {
  const [mode, setMode] = useState<'selection' | 'preview' | 'manual'>('selection');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        setMode('preview');
      };
      reader.readAsDataURL(selectedFile);
      setError(null);
    }
  };

  const handleAIUpload = async () => {
    if (!file || !preview) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Prepare Base64 (Gemini requirement)
      const base64 = preview.split(',')[1];

      // 2. Call Real API Route
      const response = await fetch('/api/ai/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType: file.type })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || "AI 識別失敗，請檢查網路或 API Key");
      }

      const normalized = normalizeReceiptDraft(result);
      if (normalized.merchant_name === "未知供應商" && normalized.items.length === 0 && normalized.total_amount <= 0) {
        throw new Error("AI 未能辨識出有效的收據內容，請嘗試更清晰的圖片。");
      }

      // 3. Store result locally for the edit page
      persistReceiptDraft(normalized);
      window.location.href = "/edit/new?source=ai";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "處理收據時出錯，請重試。");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center space-x-4">
        <Link href="/" className="text-gray-500 hover:text-blue-600 transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">新增開支記錄</h1>
          <p className="text-gray-500 text-sm">選擇適合的輸入方式</p>
        </div>
      </header>

      {mode === 'selection' && (
        <div className="grid grid-cols-1 gap-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="card p-8 flex flex-col items-center justify-center space-y-4 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer group"
          >
            <div className="bg-blue-100 p-6 rounded-full text-blue-600 group-hover:scale-110 transition-transform">
              <Camera size={48} />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-lg text-gray-800">拍照或上傳圖片</h3>
              <p className="text-sm text-gray-500 font-medium">使用 Gemini AI 自動識別繁體中文收據</p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div
            onClick={() => setMode('manual')}
            className="card p-8 flex flex-col items-center justify-center space-y-4 hover:border-green-400 hover:bg-green-50 transition-all cursor-pointer group"
          >
            <div className="bg-green-100 p-6 rounded-full text-green-600 group-hover:scale-110 transition-transform">
              <Keyboard size={48} />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-lg text-gray-800">手動輸入資料</h3>
              <p className="text-sm text-gray-500 font-medium">手動填寫供應商、日期與品項</p>
            </div>
          </div>
        </div>
      )}

      {mode === 'preview' && preview && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-lg">
            <img src={preview} alt="Preview" className="w-full h-auto max-h-[60vh] object-contain bg-gray-900" />
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
               <button
                onClick={() => setMode('selection')}
                className="text-white flex items-center text-sm font-medium"
              >
                <ArrowLeft size={18} className="mr-1" /> 重選
              </button>
            </div>
          </div>

          <button
            onClick={handleAIUpload}
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-2xl py-5 flex items-center justify-center space-x-3 text-lg font-bold disabled:opacity-50 shadow-xl shadow-blue-100"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                <span>Gemini AI 正在分析收據...</span>
              </>
            ) : (
              <>
                <Upload size={24} />
                <span>確認並開始 AI 識別</span>
              </>
            )}
          </button>
        </div>
      )}

      {mode === 'manual' && (
        <div className="card p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
           <h3 className="font-black text-xl text-gray-800 border-b border-gray-100 pb-3">手動新增記錄</h3>
           <div className="space-y-5">
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">供應商名稱</label>
                <input id="manual_merchant" type="text" className="w-full bg-gray-50 border-b-2 border-gray-100 py-3 px-2 outline-none focus:border-blue-500 transition-all font-bold text-lg" placeholder="例如: 興發食材" />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">交易日期</label>
                <input id="manual_date" type="date" className="w-full bg-gray-50 border-b-2 border-gray-100 py-3 px-2 outline-none focus:border-blue-500 transition-all font-bold" defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
              <button
                onClick={() => {
                  const m = (document.getElementById('manual_merchant') as HTMLInputElement).value;
                  const d = (document.getElementById('manual_date') as HTMLInputElement).value;
                  if (!m) return alert("請輸入供應商名稱");
                  persistReceiptDraft({ merchant_name: m, date: d, items: [], total_amount: 0 });
                  window.location.href = "/edit/new?source=manual";
                }}
                className="w-full bg-blue-600 text-white rounded-2xl py-4 font-black text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
              >
                繼續填寫明細
              </button>
              <button
                onClick={() => setMode('selection')}
                className="w-full text-gray-400 text-sm font-bold py-2 hover:text-gray-600"
              >
                返回選擇
              </button>
           </div>
        </div>
      )}

      {error && (
        <div className="flex items-center space-x-3 text-red-600 bg-red-50 p-5 rounded-2xl border-2 border-red-100">
          <AlertCircle size={24} />
          <span className="font-bold">{error}</span>
        </div>
      )}
    </div>
  );
}
