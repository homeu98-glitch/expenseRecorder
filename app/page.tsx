import { BarChart2, TrendingUp, TrendingDown, Receipt, ShoppingBag, PlusCircle as PlusCircleIcon } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";

export default function Home() {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <section>
        <h1 className="text-2xl font-bold text-gray-800">您好, 店主</h1>
        <p className="text-gray-500">這裡是您最近的開支概覽</p>
      </section>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card flex flex-col items-center justify-center py-6">
          <Receipt className="text-blue-600 mb-2" size={24} />
          <span className="text-sm text-gray-500">本月收據</span>
          <span className="text-xl font-bold">24 張</span>
        </div>
        <div className="card flex flex-col items-center justify-center py-6">
          <ShoppingBag className="text-green-600 mb-2" size={24} />
          <span className="text-sm text-gray-500">本月總額</span>
          <span className="text-xl font-bold">$12,450</span>
        </div>
        <div className="card flex flex-col items-center justify-center py-6">
          <TrendingDown className="text-red-600 mb-2" size={24} />
          <span className="text-sm text-gray-500">價格上升項目</span>
          <span className="text-xl font-bold text-red-600">3</span>
        </div>
        <div className="card flex flex-col items-center justify-center py-6">
          <TrendingUp className="text-green-600 mb-2" size={24} />
          <span className="text-sm text-gray-500">價格下降項目</span>
          <span className="text-xl font-bold text-green-600">5</span>
        </div>
      </div>

      {/* Main Dashboard Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">最近上傳</h2>
            <Link href="/reports" className="text-sm text-blue-600 hover:underline">查看全部</Link>
          </div>
          <div className="space-y-3">
            {[
              { store: "家樂福", date: "2024-06-21", amount: 1250 },
              { store: "大潤發", date: "2024-06-20", amount: 840 },
              { store: "批發市場", date: "2024-06-18", amount: 4200 },
            ].map((item, i) => (
              <div key={i} className="card flex items-center justify-between p-3">
                <div>
                  <div className="font-medium">{item.store}</div>
                  <div className="text-xs text-gray-400">{item.date}</div>
                </div>
                <div className="font-semibold text-gray-700">${item.amount}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Price Alerts */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">價格變動追蹤</h2>
          <div className="space-y-3">
            {[
              { item: "豬五花", change: "+5%", trend: "up", last: 120, current: 126 },
              { item: "雞翅", change: "-2%", trend: "down", last: 85, current: 83 },
              { item: "排骨", change: "+10%", trend: "up", last: 200, current: 220 },
            ].map((item, i) => (
              <div key={i} className="card flex items-center justify-between p-3">
                <div className="flex items-center space-x-3">
                  <div className={clsx(
                    "p-2 rounded-full",
                    item.trend === 'up' ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                  )}>
                    {item.trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  </div>
                  <div>
                    <div className="font-medium">{item.item}</div>
                    <div className="text-xs text-gray-400">上次: ${item.last}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={clsx(
                    "font-bold",
                    item.trend === 'up' ? "text-red-600" : "text-green-600"
                  )}>${item.current}</div>
                  <div className="text-xs">{item.change}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* CTA Section */}
      <section className="pt-8">
        <Link
          href="/upload"
          className="w-full bg-blue-600 text-white rounded-xl py-4 flex items-center justify-center space-x-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
        >
          <PlusCircleIcon size={20} />
          <span className="font-semibold text-lg">立即上傳新收據</span>
        </Link>
      </section>
    </div>
  );
}
"// redeploy"  
