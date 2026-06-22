"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Calendar, Filter, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";

// Mock data
const monthlyExpenses = [
  { name: '1月', amount: 4000 },
  { name: '2月', amount: 3000 },
  { name: '3月', amount: 5000 },
  { name: '4月', amount: 4500 },
  { name: '5月', amount: 6000 },
  { name: '6月', amount: 7500 },
];

const priceHistory = [
  { date: '06-01', chicken: 80, pork: 120 },
  { date: '06-05', chicken: 82, pork: 118 },
  { date: '06-10', chicken: 85, pork: 125 },
  { date: '06-15', chicken: 83, pork: 130 },
  { date: '06-20', chicken: 88, pork: 128 },
];

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">支出分析報表</h1>
        <button className="p-2 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors text-gray-500">
          <Calendar size={20} />
        </button>
      </header>

      {/* Monthly Chart */}
      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">每月總支出</h2>
          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">2024年</span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyExpenses}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#999'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#999'}} />
              <Tooltip cursor={{fill: '#f8f9fa'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              <Bar dataKey="amount" fill="#1a73e8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Price Comparison */}
      <section className="card space-y-4">
        <h2 className="font-semibold text-gray-700">關鍵品項價格趨勢</h2>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={priceHistory}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#999'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#999'}} />
              <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              <Line type="monotone" dataKey="chicken" name="雞翅" stroke="#1a73e8" strokeWidth={2} dot={{r: 4, fill: '#1a73e8'}} />
              <Line type="monotone" dataKey="pork" name="豬五花" stroke="#ea4335" strokeWidth={2} dot={{r: 4, fill: '#ea4335'}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center space-x-6 text-xs font-medium text-gray-500">
          <div className="flex items-center"><span className="w-3 h-3 bg-blue-600 rounded-full mr-2"></span>雞翅</div>
          <div className="flex items-center"><span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>豬五花</div>
        </div>
      </section>

      {/* Detailed Table Placeholder */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">支出明細</h2>
          <button className="flex items-center text-sm text-gray-500 hover:text-blue-600 transition-colors">
            <Filter size={14} className="mr-1" /> 篩選
          </button>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors group">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                  <BarChart2 size={24} />
                </div>
                <div>
                  <div className="font-medium group-hover:text-blue-600">批發訂單 #{1024 + i}</div>
                  <div className="text-xs text-gray-400">2024-06-{20-i} • 5 個品項</div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="font-bold">$2,450</div>
                  <div className="text-[10px] text-green-600 flex items-center justify-end">
                    <TrendingDown size={10} className="mr-0.5" /> -3%
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

import { BarChart2 } from "lucide-react";
