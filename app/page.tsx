"use client";

import { useState } from "react";
import {
  TrendingUp, TrendingDown, Receipt, ShoppingBag,
  PlusCircle as PlusCircleIcon, Calendar, Search, ChevronRight
} from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";

const timeFilters = [
  { id: 'today', label: '今日' },
  { id: 'week', label: '本週' },
  { id: 'month', label: '本月' },
  { id: 'custom', label: '自訂' },
];

export default function Home() {
  const [filter, setFilter] = useState('today');
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="space-y-6 pb-24">
      {/* Header & Filter */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">您好, 店主</h1>
            <p className="text-gray-500 text-sm">追蹤您的開支與價格變動</p>
          </div>
          <button className="p-2 bg-white border border-gray-200 rounded-full text-gray-400 hover:text-blue-600 transition-colors">
            <Search size={20} />
          </button>
        </div>

        {/* Time Range Selector */}
        <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar">
          {timeFilters.map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={clsx(
                "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                filter === t.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-100"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {/* Quick Stats (Interactive Cards) */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/reports" className="card flex flex-col items-center justify-center py-6 hover:border-blue-300 transition-all active:scale-95">
          <Receipt className="text-blue-600 mb-2" size={24} />
          <span className="text-xs text-gray-500">已記錄收據</span>
          <span className="text-xl font-bold">12 張</span>
        </Link>
        <Link href="/reports" className="card flex flex-col items-center justify-center py-6 hover:border-blue-300 transition-all active:scale-95">
          <ShoppingBag className="text-green-600 mb-2" size={24} />
          <span className="text-xs text-gray-500">總支出額</span>
          <span className="text-xl font-bold">$8,450</span>
        </Link>
        <Link href="/reports?trend=up" className="card flex flex-col items-center justify-center py-4 hover:border-red-200 transition-all active:scale-95">
          <div className="flex items-center space-x-2">
            <TrendingDown className="text-red-600" size={18} />
            <span className="text-lg font-bold text-red-600">3</span>
          </div>
          <span className="text-[10px] text-gray-500 mt-1">價格上漲項</span>
        </Link>
        <Link href="/reports?trend=down" className="card flex flex-col items-center justify-center py-4 hover:border-green-200 transition-all active:scale-95">
           <div className="flex items-center space-x-2">
            <TrendingUp className="text-green-600" size={18} />
            <span className="text-lg font-bold text-green-600">5</span>
          </div>
          <span className="text-[10px] text-gray-500 mt-1">價格下降項</span>
        </Link>
      </div>

      {/* Search Input for Quick Check */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="搜尋食材或品項 (如: 雞翅, 豬肉)..."
          className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-blue-500 shadow-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Main Dashboard Area */}
      <div className="grid grid-cols-1 gap-6">
        {/* Recent Activity */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">最近上傳記錄</h2>
            <Link href="/reports" className="text-sm text-blue-600 flex items-center">全部 <ChevronRight size={14} /></Link>
          </div>
          <div className="space-y-3">
            {[
              { id: '1', store: "興發食材批發", date: "今天 10:30", amount: 1250, status: 'processed' },
              { id: '2', store: "萬里香蔬菜", date: "昨天 16:45", amount: 840, status: 'processed' },
              { id: '3', store: "金源肉食", date: "2024-06-18", amount: 4200, status: 'processed' },
            ].map((item) => (
              <Link key={item.id} href={`/edit/${item.id}`} className="card flex items-center justify-between p-4 hover:bg-gray-50 transition-colors active:bg-gray-100">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl">
                    {item.store[0]}
                  </div>
                  <div>
                    <div className="font-bold text-gray-800">{item.store}</div>
                    <div className="text-xs text-gray-400">{item.date}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-700 text-lg">${item.amount}</div>
                  <div className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded inline-block">已完成</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Floating Action Button for Upload */}
      <div className="fixed bottom-20 right-6 md:bottom-10 md:right-10 flex flex-col items-end space-y-4 pointer-events-none">
        <Link
          href="/upload"
          className="pointer-events-auto bg-blue-600 text-white rounded-full p-4 flex items-center justify-center shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-90 transition-all group"
        >
          <PlusCircleIcon size={32} />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 font-bold whitespace-nowrap">上傳收據</span>
        </Link>
      </div>
    </div>
  );
}
