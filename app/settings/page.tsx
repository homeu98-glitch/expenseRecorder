"use client";

import { Settings, Shield, Bell, Database, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center space-x-4">
        <Link href="/" className="text-gray-500 hover:text-blue-600 transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold">系統設定</h1>
      </div>

      <div className="space-y-4">
        {/* Profile / Account */}
        <section className="card space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase flex items-center">
            <Shield size={16} className="mr-2" /> 帳戶與安全
          </h2>
          <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 cursor-pointer">
            <div>
              <div className="font-medium">店主資料</div>
              <div className="text-xs text-gray-400">修改您的顯示名稱與密碼</div>
            </div>
            <span className="text-blue-600 text-sm font-medium">修改</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 cursor-pointer">
            <div>
              <div className="font-medium">多設備同步</div>
              <div className="text-xs text-gray-400">目前已連接 2 個設備</div>
            </div>
            <span className="text-gray-400 text-sm">管理</span>
          </div>
        </section>

        {/* System Settings */}
        <section className="card space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase flex items-center">
            <Settings size={16} className="mr-2" /> 應用程式設定
          </h2>
          <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <div>
              <div className="font-medium">預設幣種</div>
              <div className="text-xs text-gray-400">目前設定為 HKD ($)</div>
            </div>
            <select className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:border-blue-500">
              <option>HKD</option>
              <option>TWD</option>
              <option>USD</option>
            </select>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <div>
              <div className="font-medium">通知提醒</div>
              <div className="text-xs text-gray-400">當價格大幅上漲時提醒我</div>
            </div>
            <div className="w-10 h-6 bg-blue-600 rounded-full relative cursor-pointer shadow-inner">
               <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow"></div>
            </div>
          </div>
        </section>

        {/* Data Management */}
        <section className="card space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase flex items-center">
            <Database size={16} className="mr-2" /> 數據管理
          </h2>
          <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 cursor-pointer">
            <div>
              <div className="font-medium">匯出數據</div>
              <div className="text-xs text-gray-400">下載所有開支記錄為 CSV 檔案</div>
            </div>
            <span className="text-blue-600 text-sm font-medium">匯出</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <div>
              <div className="font-medium text-red-600 flex items-center">
                <Trash2 size={16} className="mr-2" /> 清除快取數據
              </div>
              <div className="text-xs text-gray-400">這不會刪除您的資料庫記錄</div>
            </div>
            <button className="text-gray-400 text-sm hover:text-red-500 transition-colors">清除</button>
          </div>
        </section>

        {/* Footer info */}
        <div className="text-center pt-8">
          <div className="text-xs text-gray-400">開支記錄助手 v1.0.0</div>
          <div className="text-[10px] text-gray-300 mt-1">© 2024 Expense Recorder Team</div>
        </div>
      </div>
    </div>
  );
}
