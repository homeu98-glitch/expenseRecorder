"use client";

import { useState, useRef } from "react";
import { Camera, Upload, Loader2, AlertCircle, Keyboard, ArrowLeft, Images } from "lucide-react";
import Link from "next/link";
import { normalizeReceiptDraft, persistReceiptDraft } from "@/lib/receipt";

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("無法讀取圖片"));
    reader.readAsDataURL(file);
  });
}

async function compressImage(file: File): Promise<{ previewUrl: string; mimeType: string }> {
  const originalDataUrl = await fileToDataUrl(file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("無法載入圖片"));
    img.src = originalDataUrl;
  });

  const maxDimension = 1600;
  const ratio = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const targetWidth = Math.max(1, Math.round(image.width * ratio));
  const targetHeight = Math.max(1, Math.round(image.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("無法處理圖片");
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);
  const previewUrl = canvas.toDataURL("image/jpeg", 0.78);
  return { previewUrl, mimeType: "image/jpeg" };
}

export default function UploadPage() {
  const [mode, setMode] = useState<'selection' | 'preview'>('selection');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewMimeType, setPreviewMimeType] = useState<string>("image/jpeg");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    void (async () => {
      try {
        const compressed = await compressImage(selectedFile);
        setFile(selectedFile);
        setPreview(compressed.previewUrl);
        setPreviewMimeType(compressed.mimeType);
        setMode('preview');
        setError(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "圖片處理失敗");
      } finally {
        e.target.value = "";
      }
    })();
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
        body: JSON.stringify({ image: base64, mimeType: previewMimeType || file.type })
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
      persistReceiptDraft({ ...normalized, image_data_url: preview });
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
            onClick={() => cameraInputRef.current?.click()}
            className="card p-8 flex flex-col items-center justify-center space-y-4 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer group"
          >
            <div className="bg-blue-100 p-6 rounded-full text-blue-600 group-hover:scale-110 transition-transform">
              <Camera size={48} />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-lg text-gray-800">打開相機掃描</h3>
              <p className="text-sm text-gray-500 font-medium">優先啟動相機拍攝收據，圖片會先壓縮再辨識</p>
            </div>
            <input
              type="file"
              ref={cameraInputRef}
              onChange={handleFileChange}
              accept="image/*"
              capture="environment"
              className="hidden"
            />
          </div>

          <div
            onClick={() => galleryInputRef.current?.click()}
            className="card p-8 flex flex-col items-center justify-center space-y-4 hover:border-indigo-400 hover:bg-indigo-50 transition-all cursor-pointer group"
          >
            <div className="bg-indigo-100 p-6 rounded-full text-indigo-600 group-hover:scale-110 transition-transform">
              <Images size={48} />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-lg text-gray-800">從相簿選擇</h3>
              <p className="text-sm text-gray-500 font-medium">如果已經拍好照片，可直接從手機相簿或電腦選取</p>
            </div>
            <input
              type="file"
              ref={galleryInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div
            onClick={() => {
              persistReceiptDraft({
                merchant_name: "",
                date: new Date().toISOString().split('T')[0],
                items: [],
                total_amount: 0,
                receipt_number: "",
                payment_method: "on_delivery",
                payment_status: "unpaid",
              });
              window.location.href = "/edit/new?source=manual";
            }}
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

      {error && (
        <div className="flex items-center space-x-3 text-red-600 bg-red-50 p-5 rounded-2xl border-2 border-red-100">
          <AlertCircle size={24} />
          <span className="font-bold">{error}</span>
        </div>
      )}
    </div>
  );
}
