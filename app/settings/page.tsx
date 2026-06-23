"use client";

import { useState } from "react";
import { Shield, Database, Trash2, ArrowLeft, LogOut, Download, CheckCircle2, PlusCircle, Package } from "lucide-react";
import Link from "next/link";
import { getShopUser, logout } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { readShopPresets, saveShopPresets, type ShopPresets } from "@/lib/presets";

export default function SettingsPage() {
  const [user] = useState<{ id: string; shop_name: string; login_id: string } | null>(() => getShopUser());
  const [status, setStatus] = useState<string | null>(null);
  const [presets, setPresets] = useState<ShopPresets>(() => {
    const currentUser = getShopUser();
    return currentUser?.id ? readShopPresets(currentUser.id) : { suppliers: [] };
  });
  const [supplierName, setSupplierName] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState(() => {
    const currentUser = getShopUser();
    const savedPresets = currentUser?.id ? readShopPresets(currentUser.id) : { suppliers: [] };
    return savedPresets.suppliers[0]?.name || "";
  });
  const [productName, setProductName] = useState("");
  const [productType, setProductType] = useState("");
  const [defaultUnit, setDefaultUnit] = useState("kg");

  function persistNextPresets(nextPresets: ShopPresets, nextStatus: string) {
    if (!user?.id) return;
    saveShopPresets(user.id, nextPresets);
    setPresets(nextPresets);
    setStatus(nextStatus);
  }

  function addSupplierPreset() {
    const name = supplierName.trim();
    if (!name || !user?.id) return;
    const nextSuppliers = presets.suppliers.some((supplier) => supplier.name.toLowerCase() === name.toLowerCase())
      ? presets.suppliers
      : [...presets.suppliers, { name, products: [] }];
    const nextPresets = { suppliers: nextSuppliers };
    persistNextPresets(nextPresets, "供應商預設已更新");
    setSupplierName("");
    setSelectedSupplier(name);
  }

  function addProductPreset() {
    const supplier = selectedSupplier.trim();
    const name = productName.trim();
    if (!supplier || !name || !user?.id) return;

    const nextSuppliers = presets.suppliers.map((item) => {
      if (item.name !== supplier) return item;
      const existing = item.products.find((product) => product.name.toLowerCase() === name.toLowerCase());
      const nextProducts = existing
        ? item.products.map((product) =>
            product.name.toLowerCase() === name.toLowerCase()
              ? { ...product, product_type: productType.trim() || undefined, default_unit: defaultUnit }
              : product
          )
        : [...item.products, { name, product_type: productType.trim() || undefined, default_unit: defaultUnit }];
      return { ...item, products: nextProducts };
    });

    const nextPresets = { suppliers: nextSuppliers };
    persistNextPresets(nextPresets, "產品預設已儲存");
    setProductName("");
    setProductType("");
  }

  function removeProductPreset(supplierNameToRemove: string, productNameToRemove: string) {
    const nextPresets = {
      suppliers: presets.suppliers.map((supplier) =>
        supplier.name !== supplierNameToRemove
          ? supplier
          : {
              ...supplier,
              products: supplier.products.filter((product) => product.name !== productNameToRemove),
            }
      ),
    };
    persistNextPresets(nextPresets, "產品預設已刪除");
  }

  const handleExport = async () => {
    if (!user) return;
    setStatus("正在準備匯出數據...");

    const { data, error } = await supabase
      .from('receipts')
      .select(`
        receipt_date,
        total_amount,
        merchants(name),
        receipt_items(name, quantity, unit_price)
      `)
      .eq('user_id', user.id);

    if (error) {
      alert("匯出失敗: " + error.message);
      return;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense_report_${user.shop_name}.json`;
    a.click();
    setStatus("匯出完成！");
  };

  const handleCleanup = async () => {
    if (!user) return;
    if (!confirm("確定要清除所有記錄嗎？此操作無法復原。")) return;
    setStatus("正在清理數據...");

    const { error } = await supabase
      .from('receipts')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      alert("清理失敗: " + error.message);
    } else {
      setStatus("數據已清空。");
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      <div className="flex items-center space-x-4">
        <Link href="/" className="text-gray-500 hover:text-blue-600 transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold">系統設定</h1>
      </div>

      <div className="space-y-4">
        {/* User Info */}
        <section className="card space-y-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase flex items-center">
            <Shield size={16} className="mr-2" /> 賬戶資料
          </h2>
          <div className="flex items-center space-x-4 py-2">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-black text-xl">
              {user.shop_name[0]}
            </div>
            <div>
              <div className="font-bold text-gray-800">{user.shop_name}</div>
              <div className="text-xs text-gray-400 font-mono">ID: {user.login_id}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 py-3 border border-red-100 text-red-600 rounded-xl hover:bg-red-50 transition-colors font-bold"
          >
            <LogOut size={18} />
            <span>登出系統</span>
          </button>
        </section>

        {/* Data Management */}
        <section className="card space-y-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase flex items-center">
            <Database size={16} className="mr-2" /> 數據管理
          </h2>
          <button
            onClick={handleExport}
            className="w-full flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
          >
            <div className="flex items-center space-x-3 text-left">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Download size={20} /></div>
              <div>
                <div className="font-bold text-gray-700 text-sm">匯出數據 (JSON)</div>
                <div className="text-[10px] text-gray-400 font-medium">備份您的所有開支記錄</div>
              </div>
            </div>
            <span className="text-blue-600 text-xs font-bold">匯出</span>
          </button>

          <button
            onClick={handleCleanup}
            className="w-full flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
          >
            <div className="flex items-center space-x-3 text-left">
              <div className="p-2 bg-red-50 text-red-600 rounded-lg"><Trash2 size={20} /></div>
              <div>
                <div className="font-bold text-gray-700 text-sm">刪除所有數據</div>
                <div className="text-[10px] text-gray-400 font-medium">清空此商店的所有記錄</div>
              </div>
            </div>
            <span className="text-red-600 text-xs font-bold">清空</span>
          </button>
        </section>

        <section className="card space-y-5">
          <h2 className="text-sm font-bold text-gray-400 uppercase flex items-center">
            <Package size={16} className="mr-2" /> 供應商與產品預設
          </h2>

          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="新增供應商，例如 JOHN"
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-bold"
              />
              <button
                onClick={addSupplierPreset}
                className="rounded-xl bg-blue-600 text-white font-black px-4 py-3 inline-flex items-center justify-center"
              >
                <PlusCircle size={18} className="mr-2" /> 新增供應商
              </button>
            </div>

            <div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">選擇供應商</label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full mt-2 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-bold"
              >
                <option value="">請選擇供應商</option>
                {presets.suppliers.map((supplier) => (
                  <option key={supplier.name} value={supplier.name}>{supplier.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="產品名稱，例如 Fish"
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-bold"
              />
              <input
                type="text"
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                placeholder="產品分類，例如 海鮮"
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-bold"
              />
              <select
                value={defaultUnit}
                onChange={(e) => setDefaultUnit(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-bold"
              >
                <option value="kg">KG</option>
                <option value="lb">Pound</option>
                <option value="unit">個</option>
              </select>
            </div>
            <button
              onClick={addProductPreset}
              disabled={!selectedSupplier}
              className="w-full rounded-xl border border-blue-200 text-blue-600 font-black px-4 py-3 disabled:opacity-50"
            >
              為目前供應商加入產品預設
            </button>
          </div>

          <div className="space-y-4">
            {presets.suppliers.length === 0 ? (
              <div className="text-sm text-gray-400">尚未設定任何供應商或產品預設。</div>
            ) : (
              presets.suppliers.map((supplier) => (
                <div key={supplier.name} className="border border-gray-100 rounded-2xl p-4">
                  <div className="font-black text-gray-800">{supplier.name}</div>
                  {supplier.products.length === 0 ? (
                    <div className="text-xs text-gray-400 mt-2">未設定產品預設</div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {supplier.products.map((product) => (
                        <div key={`${supplier.name}-${product.name}`} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                          <div>
                            <div className="font-bold text-sm">{product.name}</div>
                            <div className="text-[10px] text-gray-400">
                              {product.product_type || "未分類"} • {product.default_unit || "個"}
                            </div>
                          </div>
                          <button
                            onClick={() => removeProductPreset(supplier.name, product.name)}
                            className="text-red-500 text-xs font-black"
                          >
                            刪除
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {status && (
          <div className="bg-blue-50 text-blue-700 p-4 rounded-xl flex items-center space-x-2 border border-blue-100 animate-pulse">
            <CheckCircle2 size={18} />
            <span className="text-sm font-bold">{status}</span>
          </div>
        )}

        <div className="text-center pt-8">
          <div className="text-xs text-gray-400 font-bold">開支記錄助手 v1.0.0</div>
          <div className="text-[10px] text-gray-300 mt-1 uppercase tracking-widest font-black">Powered by Gemini AI</div>
        </div>
      </div>
    </div>
  );
}
