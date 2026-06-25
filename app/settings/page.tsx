"use client";

import { useEffect, useMemo, useState } from "react";
import { Shield, Database, Trash2, ArrowLeft, LogOut, Download, CheckCircle2, PlusCircle, Package, KeyRound } from "lucide-react";
import Link from "next/link";
import { getShopUser, logout } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  deleteSupplierPreset,
  getUnitLabel,
  loadShopPresets,
  saveSupplierPreset,
  type ShopPresets,
} from "@/lib/account-settings";
import { downloadCsv } from "@/lib/csv";

export default function SettingsPage() {
  const [user] = useState<{ id: string; shop_name: string; login_id: string; role?: string } | null>(() => getShopUser());
  const [status, setStatus] = useState<string | null>(null);
  const [loadingPresets, setLoadingPresets] = useState(() => Boolean(getShopUser()?.id && getShopUser()?.role !== "admin"));
  const [presets, setPresets] = useState<ShopPresets>({ suppliers: [], customUnits: ["kg", "lb"], hiddenSuppliers: [] });
  const [supplierName, setSupplierName] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [productName, setProductName] = useState("");
  const [defaultUnit, setDefaultUnit] = useState("kg");
  const [actualProductsBySupplier, setActualProductsBySupplier] = useState<Record<string, string[]>>({});
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  useEffect(() => {
    if (!user?.id || user.role === "admin") {
      return;
    }

    void (async () => {
      try {
        const loaded = await loadShopPresets(user.id);
        const { data: receipts } = await supabase
          .from("receipts")
          .select(`
            merchants(name),
            receipt_items(name)
          `)
          .eq("user_id", user.id);

        const nextActualProducts = new Map<string, Set<string>>();
        (receipts ?? []).forEach((receipt) => {
          const merchantRelation = receipt.merchants as { name?: string } | Array<{ name?: string }> | null;
          const merchantName = Array.isArray(merchantRelation)
            ? merchantRelation[0]?.name
            : merchantRelation?.name;

          if (!merchantName) return;
          const itemSet = nextActualProducts.get(merchantName) ?? new Set<string>();
          (receipt.receipt_items ?? []).forEach((item: { name?: string }) => {
            if (!item.name?.trim()) return;
            itemSet.add(item.name.trim());
          });
          nextActualProducts.set(merchantName, itemSet);
        });

        setPresets(loaded);
        setSelectedSupplier((current) => current || loaded.suppliers[0]?.name || "");
        setActualProductsBySupplier(
          Object.fromEntries(
            Array.from(nextActualProducts.entries()).map(([supplier, products]) => [supplier, Array.from(products).sort()])
          )
        );
      } catch (error) {
        console.error(error);
        setStatus("預設資料載入失敗");
      } finally {
        setLoadingPresets(false);
      }
    })();
  }, [user]);

  async function addSupplierPreset() {
    const name = supplierName.trim();
    if (!name || !user?.id || user.role === "admin") return;
    const nextSuppliers = presets.suppliers.some((supplier) => supplier.name.toLowerCase() === name.toLowerCase())
      ? presets.suppliers
      : [...presets.suppliers, { name, products: [] }];
    await saveSupplierPreset(user.id, { name, products: nextSuppliers.find((supplier) => supplier.name === name)?.products || [] });
    const nextPresets = { ...presets, suppliers: nextSuppliers };
    setPresets(nextPresets);
    setStatus("供應商預設已更新");
    setSupplierName("");
    setSelectedSupplier(name);
  }

  async function addProductPreset() {
    const supplier = selectedSupplier.trim();
    const name = productName.trim();
    if (!supplier || !name || !user?.id || user.role === "admin") return;

    const nextSuppliers = presets.suppliers.map((item) => {
      if (item.name !== supplier) return item;
      const existing = item.products.find((product) => product.name.toLowerCase() === name.toLowerCase());
      const nextProducts = existing
        ? item.products.map((product) =>
            product.name.toLowerCase() === name.toLowerCase()
              ? { ...product, default_unit: defaultUnit }
              : product
          )
        : [...item.products, { name, default_unit: defaultUnit }];
      return { ...item, products: nextProducts };
    });

    const updatedSupplier = nextSuppliers.find((item) => item.name === supplier);
    if (updatedSupplier) {
      await saveSupplierPreset(user.id, updatedSupplier);
    }
    const nextPresets = { ...presets, suppliers: nextSuppliers };
    setPresets(nextPresets);
    setStatus("產品預設已儲存");
    setProductName("");
  }

  async function removeProductPreset(supplierNameToRemove: string, productNameToRemove: string) {
    if (!user?.id || user.role === "admin") return;
    const nextPresets = {
      ...presets,
      suppliers: presets.suppliers.map((supplier) =>
        supplier.name !== supplierNameToRemove
          ? supplier
          : {
              ...supplier,
              products: supplier.products.filter((product) => product.name !== productNameToRemove),
            }
      ),
    };
    const updatedSupplier = nextPresets.suppliers.find((supplier) => supplier.name === supplierNameToRemove);
    if (updatedSupplier) {
      await saveSupplierPreset(user.id, updatedSupplier);
    }
    setPresets(nextPresets);
    setStatus("產品預設已刪除");
  }

  async function removeSupplierPreset(name: string) {
    if (!user?.id || user.role === "admin") return;
    await deleteSupplierPreset(user.id, name);
    const nextPresets = { ...presets, suppliers: presets.suppliers.filter((supplier) => supplier.name !== name) };
    setPresets(nextPresets);
    if (selectedSupplier === name) {
      setSelectedSupplier(nextPresets.suppliers[0]?.name || "");
    }
    setStatus("供應商預設已刪除");
  }

  async function handleChangePassword() {
    if (!user) return;
    if (newPin.length !== 4 || confirmPin.length !== 4) {
      setStatus("新密碼需為 4 位數字");
      return;
    }
    if (newPin !== confirmPin) {
      setStatus("兩次輸入的新密碼不一致");
      return;
    }

    if (user.role === "admin") {
      const { data: adminRow } = await supabase
        .from("shop_users")
        .select("login_pin")
        .eq("login_id", "60000000")
        .maybeSingle();

      const expectedCurrentPin = adminRow?.login_pin || "0000";
      if (currentPin !== expectedCurrentPin) {
        setStatus("目前密碼不正確");
        return;
      }

      const { error } = await supabase
        .from("shop_users")
        .upsert(
          { shop_name: "系統管理員", login_id: "60000000", login_pin: newPin },
          { onConflict: "login_id" }
        );

      if (error) {
        setStatus(`更改密碼失敗: ${error.message}`);
        return;
      }
    } else {
      const { data: currentUser, error: fetchError } = await supabase
        .from("shop_users")
        .select("login_pin")
        .eq("id", user.id)
        .single();

      if (fetchError || !currentUser || currentUser.login_pin !== currentPin) {
        setStatus("目前密碼不正確");
        return;
      }

      const { error } = await supabase
        .from("shop_users")
        .update({ login_pin: newPin })
        .eq("id", user.id);

      if (error) {
        setStatus(`更改密碼失敗: ${error.message}`);
        return;
      }
    }

    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setStatus("密碼已更新");
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

    const csvRows = (data ?? []).flatMap((receipt) => {
      const merchantRelation = receipt.merchants as { name?: string } | Array<{ name?: string }> | null;
      const merchantName = Array.isArray(merchantRelation) ? merchantRelation[0]?.name : merchantRelation?.name;
      const items = receipt.receipt_items ?? [];

      if (items.length === 0) {
        return [{
          日期: receipt.receipt_date,
          供應商: merchantName || "",
          品項: "",
          數量: "",
          單價: "",
          收據總額: receipt.total_amount,
        }];
      }

      return items.map((item: { name?: string; quantity?: number; unit_price?: number }) => ({
        日期: receipt.receipt_date,
        供應商: merchantName || "",
        品項: item.name || "",
        數量: item.quantity ?? "",
        單價: item.unit_price ?? "",
        收據總額: receipt.total_amount,
      }));
    });

    downloadCsv(`expense_report_${user.shop_name}.csv`, csvRows);
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

  const mergedSupplierProducts = useMemo(() => {
    return Object.fromEntries(
      presets.suppliers.map((supplier) => {
        const presetProducts = supplier.products.map((product) => ({
          name: product.name,
          default_unit: product.default_unit,
          source: "preset" as const,
        }));
        const presetNames = new Set(presetProducts.map((product) => product.name.toLowerCase()));
        const actualProducts = (actualProductsBySupplier[supplier.name] || [])
          .filter((productName) => !presetNames.has(productName.toLowerCase()))
          .map((productName) => ({
            name: productName,
            default_unit: undefined,
            source: "history" as const,
          }));

        return [supplier.name, [...presetProducts, ...actualProducts]];
      })
    ) as Record<string, Array<{ name: string; default_unit?: string; source: "preset" | "history" }>>;
  }, [actualProductsBySupplier, presets.suppliers]);

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
                <div className="font-bold text-gray-700 text-sm">匯出數據 (CSV)</div>
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

          {loadingPresets ? (
            <div className="text-sm text-gray-400">預設資料載入中...</div>
          ) : user.role === "admin" ? (
            <div className="text-sm text-gray-400">管理員賬戶不使用供應商預設。</div>
          ) : (
            <>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="產品名稱，例如 Fish"
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
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-black text-gray-800">{supplier.name}</div>
                        <button
                          onClick={() => void removeSupplierPreset(supplier.name)}
                          className="text-red-500 text-xs font-black"
                        >
                          移除預設
                        </button>
                      </div>
                      {supplier.products.length === 0 ? (
                        (actualProductsBySupplier[supplier.name] || []).length === 0 ? (
                          <div className="text-xs text-gray-400 mt-2">未設定產品，亦未有歷史記錄</div>
                        ) : null
                      ) : (
                        null
                      )}
                      {mergedSupplierProducts[supplier.name]?.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {mergedSupplierProducts[supplier.name].map((product) => (
                            <div key={`${supplier.name}-${product.name}`} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                              <div>
                                <div className="font-bold text-sm">{product.name}</div>
                                <div className="text-[10px] text-gray-400">
                                  {product.default_unit || "個"}
                                  {product.source === "history" ? " • 歷史記錄" : " • 預設"}
                                </div>
                              </div>
                              {product.source === "preset" ? (
                                <button
                                  onClick={() => void removeProductPreset(supplier.name, product.name)}
                                  className="text-red-500 text-xs font-black"
                                >
                                  刪除
                                </button>
                              ) : (
                                <div className="text-[10px] text-gray-400 font-black">唯讀</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </section>

        <section className="card space-y-5">
          <h2 className="text-sm font-bold text-gray-400 uppercase flex items-center">
            共用單位
          </h2>
          <div className="text-sm text-gray-400">
            單位現在由管理員在後台統一維護，所有店主共用同一套單位。
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
              <div className="font-bold text-sm">個</div>
              <div className="text-xs text-gray-400 font-black">系統預設</div>
            </div>
            {presets.customUnits.map((unit) => (
              <div key={unit} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                <div className="font-bold text-sm">{getUnitLabel(unit)}</div>
                <div className="text-[10px] text-gray-400 font-black">共用</div>
              </div>
            ))}
          </div>
        </section>

        <section className="card space-y-5">
          <h2 className="text-sm font-bold text-gray-400 uppercase flex items-center">
            <KeyRound size={16} className="mr-2" /> 更改密碼
          </h2>
          <div className="space-y-3">
            <input
              type="password"
              maxLength={4}
              inputMode="numeric"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
              placeholder="目前密碼"
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-bold tracking-widest"
            />
            <input
              type="password"
              maxLength={4}
              inputMode="numeric"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
              placeholder="新密碼（4 位數字）"
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-bold tracking-widest"
            />
            <input
              type="password"
              maxLength={4}
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              placeholder="再次輸入新密碼"
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-bold tracking-widest"
            />
            <button
              onClick={handleChangePassword}
              className="w-full rounded-xl bg-blue-600 text-white font-black px-4 py-3"
            >
              更新密碼
            </button>
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
