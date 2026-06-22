"use client";

import { useState, useRef } from "react";
import { Camera, Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Upload to Supabase Storage (Placeholder)
      // 2. Call Gemini API (via server action or API route)

      // Simulation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Redirect to edit page with mock ID
      router.push("/edit/new");
    } catch (err) {
      setError("處理收據時出錯，請重試。");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">上傳收據</h1>
        <p className="text-gray-500">拍攝或選擇收據圖片，AI 將自動識別內容</p>
      </header>

      {!preview ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-2xl aspect-[3/4] flex flex-col items-center justify-center space-y-4 bg-white hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer"
        >
          <div className="bg-blue-100 p-4 rounded-full text-blue-600">
            <Camera size={40} />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-700">點擊拍照或上傳</p>
            <p className="text-xs text-gray-400">支援 JPG, PNG 格式</p>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
            capture="environment"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <img src={preview} alt="Preview" className="w-full h-auto" />
            <button
              onClick={() => { setPreview(null); setFile(null); }}
              className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full backdrop-blur-sm"
            >
              重新選擇
            </button>
          </div>

          <button
            onClick={handleUpload}
            disabled={loading}
            className="w-full btn-primary py-4 flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>AI 正在分析中...</span>
              </>
            ) : (
              <>
                <Upload size={20} />
                <span>確認並上傳</span>
              </>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
          <AlertCircle size={18} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="card bg-blue-50 border-blue-100">
        <h3 className="font-semibold text-blue-800 flex items-center mb-2">
          <CheckCircle2 size={16} className="mr-2" />
          小貼士
        </h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>請確保收據平整、光線充足</li>
          <li>儘量拍攝收據全貌，包括商店名稱和日期</li>
          <li>手寫收據也能識別，但請字跡清晰</li>
        </ul>
      </div>
    </div>
  );
}
