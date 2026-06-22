"use client";

import { useState, useRef } from "react";
import { Camera, Upload, Loader2, CheckCircle2, AlertCircle, FileText, Keyboard, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";

export default function UploadPage() {
  const [mode, setMode] = useState<'selection' | 'preview' | 'manual'>('selection');
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
        setMode('preview');
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
      // Simulate AI Processing
      await new Promise(resolve => setTimeout(resolve, 2500));
      router.push("/edit/new");
    } catch (err) {
      setError("處理收據時出錯，請重試。");
      console.error(err);
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
              <p className="text-sm text-gray-500">AI 將自動識別 Traditional Chinese 收據</p>
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
              <p className="text-sm text-gray-500">直接填寫品項、數量及金額</p>
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
            onClick={handleUpload}
            disabled={loading}
            className="w-full btn-primary py-5 flex items-center justify-center space-x-3 text-lg disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                <span>AI 正在分析Traditional Chinese內容...</span>
              </>
            ) : (
              <>
                <Upload size={24} />
                <span>開始 AI 自動識別</span>
              </>
            )}
          </button>
        </div>
      )}

      {mode === 'manual' && (
        <div className="card p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
           <h3 className="font-bold text-lg border-b pb-2">手動新增記錄</h3>
           <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">供應商名稱</label>
                <input type="text" className="w-full border-b border-gray-200 py-2 outline-none focus:border-blue-500" placeholder="如: 興發食材" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">交易日期</label>
                <input type="date" className="w-full border-b border-gray-200 py-2 outline-none focus:border-blue-500" defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
              <button
                onClick={() => router.push("/edit/manual")}
                className="w-full bg-green-600 text-white rounded-xl py-4 font-bold hover:bg-green-700 transition-colors"
              >
                繼續填寫品項明細
              </button>
              <button
                onClick={() => setMode('selection')}
                className="w-full text-gray-400 text-sm py-2"
              >
                返回選擇上傳方式
              </button>
           </div>
        </div>
      )}

      {error && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
          <AlertCircle size={20} />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="card bg-blue-50 border-blue-100">
        <h3 className="font-bold text-blue-800 flex items-center mb-3">
          <FileText size={18} className="mr-2" />
          使用說明
        </h3>
        <ul className="text-sm text-blue-700 space-y-2">
          <li className="flex items-start">
            <span className="bg-blue-200 text-blue-800 text-[10px] w-4 h-4 flex items-center justify-center rounded-full mr-2 mt-0.5">1</span>
            <span>AI 自動識別支援手機拍攝收據、電腦上傳圖片。</span>
          </li>
          <li className="flex items-start">
            <span className="bg-blue-200 text-blue-800 text-[10px] w-4 h-4 flex items-center justify-center rounded-full mr-2 mt-0.5">2</span>
            <span>如果收據字跡模糊，建議使用「手動輸入」。</span>
          </li>
          <li className="flex items-start">
            <span className="bg-blue-200 text-blue-800 text-[10px] w-4 h-4 flex items-center justify-center rounded-full mr-2 mt-0.5">3</span>
            <span>所有上傳圖片將於 60 天後自動刪除。</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
