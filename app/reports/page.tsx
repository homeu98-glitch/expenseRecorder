"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import {
  Calendar, Filter, ChevronRight, TrendingUp, TrendingDown,
  ArrowLeft, Search, Download
} from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";

// Mock data
const monthlyExpenses = [
  { name: '1月', amount: 4000 },
  { name: '2月', amount: 3000 },
  { name: '3月', amount: 5000 },
  { name: '4月', amount: 4500 },
  { name: '5月', amount: 6000 },
  { name: '6月', amount: 7500 },
];

const sectorData = [
  { name: '肉類', value: 4500, color: '#1a73e8' },
  { name: '蔬菜', value: 1200, color: '#34a853' },
  { name: '海鮮', value: 2100, color: '#fbbc05' },
  { name: '雜貨', value: 800, color: '#ea4335' },
];

const priceHistory = [
  { date: '06-01', chicken: 80, pork: 120 },
  { date: '06-05', chicken: 82, pork: 118 },
  { date: '06-10', chicken: 85, pork: 125 },
  { date: '06-15', chicken: 83, pork: 130 },
  { date: '06-20', chicken: 88, pork: 128 },
];

const supplierData = [
  { name: '興發食材', count: 15, total: 12400 },
  { name: '金源肉食', count: 8, total: 8200 },
  { name: '萬里香', count: 12, total: 3100 },
];

export default function ReportsPage() {
  const [view, setView] = useState<'overview' | 'items' | 'suppliers'>('overview');

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/" className="text-gray-500 hover:text-blue-600 transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-2xl font-bold">支出分析報表</h1>
        </div>
        <div className="flex space-x-2">
          <button className="p-2 border border-gray-200 rounded-full hover:bg-gray-50 text-gray-500">
            <Download size={18} />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-xl">
        {(['overview', 'items', 'suppliers'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setView(t)}
            className={clsx(
              "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
              view === t ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
            )}
          >
            {t === 'overview' ? '總覽' : t === 'items' ? '品項' : '供應商'}
          </button>
        ))}
      </div>

      {view === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Monthly Chart */}
          <section className="card space-y-4">
            <h2 className="font-bold text-gray-700 flex items-center justify-between">
              每月支出趨勢
              <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded">2024年</span>
            </h2>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyExpenses}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#999'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#999'}} />
                  <Tooltip cursor={{fill: '#f8f9fa'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="amount" fill="#1a73e8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Sector Grouping */}
          <section className="card space-y-4">
            <h2 className="font-bold text-gray-700">支出類別佔比</h2>
            <div className="flex flex-col md:flex-row items-center justify-around">
              <div className="h-48 w-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sectorData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {sectorData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-4 md:mt-0">
                {sectorData.map((s) => (
                  <div key={s.name} className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }}></div>
                    <span className="text-sm text-gray-600 font-medium">{s.name}</span>
                    <span className="text-sm font-bold">${s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Price Trends */}
          <section className="card space-y-4">
            <h2 className="font-bold text-gray-700">核心品項價格波動</h2>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#999'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#999'}} />
                  <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Line type="monotone" dataKey="chicken" name="雞翅" stroke="#1a73e8" strokeWidth={3} dot={{r: 4, fill: '#1a73e8'}} />
                  <Line type="monotone" dataKey="pork" name="豬五花" stroke="#ea4335" strokeWidth={3} dot={{r: 4, fill: '#ea4335'}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}

      {view === 'items' && (
        <div className="space-y-4 animate-in fade-in duration-300">
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="搜尋採購品項歷史..." className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-blue-500 shadow-sm" />
           </div>
           <div className="space-y-3">
              {[
                { name: '雞翅 (10kg)', date: '2024-06-22', supplier: '興發食材', price: 450, change: '+5%', up: true },
                { name: '豬五花 (5kg)', date: '2024-06-22', supplier: '興發食材', price: 660, change: '-2%', up: false },
                { name: '排骨 (3kg)', date: '2024-06-21', supplier: '金源肉食', price: 210, change: '0%', up: false },
              ].map((item, i) => (
                <div key={i} className="card p-4 flex justify-between items-center">
                  <div>
                    <div className="font-bold">{item.name}</div>
                    <div className="text-xs text-gray-400">{item.date} • {item.supplier}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">${item.price}</div>
                    <div className={clsx("text-xs font-bold flex items-center justify-end", item.up ? "text-red-600" : item.change === '0%' ? "text-gray-400" : "text-green-600")}>
                      {item.up ? <TrendingUp size={10} className="mr-0.5" /> : <TrendingDown size={10} className="mr-0.5" />}
                      {item.change}
                    </div>
                  </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {view === 'suppliers' && (
        <div className="space-y-3 animate-in fade-in duration-300">
           {supplierData.map((s, i) => (
             <div key={i} className="card p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer group transition-colors">
               <div className="flex items-center space-x-4">
                 <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                   {s.name[0]}
                 </div>
                 <div>
                   <div className="font-bold">{s.name}</div>
                   <div className="text-xs text-gray-400">{s.count} 筆交易</div>
                 </div>
               </div>
               <div className="flex items-center space-x-4">
                 <div className="text-right">
                   <div className="font-bold text-lg">${s.total.toLocaleString()}</div>
                 </div>
                 <ChevronRight size={18} className="text-gray-300" />
               </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
}
