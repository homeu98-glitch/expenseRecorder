"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowUp, Loader2, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { getShopUser } from "@/lib/auth";
import {
  getDefaultGlobalPaymentMethods,
  loadGlobalPaymentMethods,
  paymentMethodsForScope,
  saveGlobalPaymentMethods,
  type PaymentMethodDef,
  type PaymentMethodScope,
} from "@/lib/account-settings";

/**
 * 支付方式主檔（admin 統一設置）。
 *
 * 背景（2026-09-25）：支付方式以前喺兩個 repo 各自 hardcode ——
 *   · POS 收銀台：`inventory-view.tsx` 嘅 `PAYMENT_METHODS` 常數；
 *   · expenseRecorder：`lib/payment-labels.ts`。
 * 加一個「月結」要改兩個地方，而且商家完全冇得自己控制。
 * 而家改成：admin 喺呢一頁維護一份**全系統主檔**，
 *   · 結帳顯示邊幾款 → 商家喺 POS 設置自己剔（`PosLocalSettings.paymentMethods`）；
 *   · 進貨（收據）顯示邊幾款 → 由主檔嘅 `scope` 決定。
 *
 * ⚠️ `code` 會直接寫入 `receipts.raw_ocr_data.payment_method`，
 *    改 `code` 唔會追溯舊單據，只會令舊單據顯示返原始英文 key。所以 UI 有明確警告。
 */
export default function AdminPaymentMethodsPage() {
  const [user] = useState<{ role?: string } | null>(() => getShopUser());
  const [loading, setLoading] = useState(() => Boolean(getShopUser()?.role === "admin"));
  const [saving, setSaving] = useState(false);
  const [methods, setMethods] = useState<PaymentMethodDef[]>([]);
  /** 上次成功儲存／載入嘅快照，用嚟判斷「有未儲存嘅改動」。 */
  const [savedSnapshot, setSavedSnapshot] = useState<string>("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const serialized = useMemo(() => JSON.stringify(methods), [methods]);
  const dirty = !loading && serialized !== savedSnapshot;

  useEffect(() => {
    if (user?.role !== "admin") {
      return;
    }

    void (async () => {
      setLoading(true);
      try {
        const list = await loadGlobalPaymentMethods();
        setMethods(list);
        setSavedSnapshot(JSON.stringify(list));
      } catch (error) {
        setMsg({ ok: false, text: error instanceof Error ? error.message : "載入支付方式失敗" });
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const patch = useCallback((index: number, next: Partial<PaymentMethodDef>) => {
    setMethods((current) => current.map((m, i) => (i === index ? { ...m, ...next } : m)));
  }, []);

  const move = useCallback((index: number, delta: number) => {
    setMethods((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const [row] = next.splice(index, 1);
      next.splice(target, 0, row);
      return next;
    });
  }, []);

  const remove = useCallback((index: number) => {
    setMethods((current) => current.filter((_, i) => i !== index));
  }, []);

  const add = useCallback(() => {
    setMethods((current) => {
      // 產生一個未用過嘅代碼，避免 admin 一按就撞 key。
      let n = current.length + 1;
      while (current.some((m) => m.code === `custom_${n}`)) n += 1;
      return [...current, { code: `custom_${n}`, label: "新支付方式", enabled: true, scope: "both" }];
    });
  }, []);

  const validate = (list: PaymentMethodDef[]): string | null => {
    if (list.length === 0) return "主檔至少要保留一款支付方式，否則 POS 結帳頁會無嘢可揀。";
    const seen = new Set<string>();
    for (const [i, m] of list.entries()) {
      const rowNo = i + 1;
      if (!m.label.trim()) return `第 ${rowNo} 行未填顯示名。`;
      if (!m.code.trim()) return `第 ${rowNo} 行未填代碼。`;
      if (!/^[a-z0-9_]+$/.test(m.code.trim()))
        return `第 ${rowNo} 行代碼「${m.code}」只可以用小寫英文字母、數字同底線。`;
      if (seen.has(m.code.trim())) return `代碼「${m.code}」重複，每款支付方式嘅代碼必須唯一。`;
      seen.add(m.code.trim());
    }
    return null;
  };

  async function save() {
    const cleaned = methods.map((m) => ({ ...m, code: m.code.trim(), label: m.label.trim() }));
    const problem = validate(cleaned);
    if (problem) {
      setMsg({ ok: false, text: problem });
      return;
    }

    setSaving(true);
    setMsg(null);
    try {
      const stored = await saveGlobalPaymentMethods(cleaned);
      setMethods(stored);
      setSavedSnapshot(JSON.stringify(stored));
      setMsg({ ok: true, text: "已儲存。所有門店嘅 POS 下一次讀取即生效。" });
    } catch (error) {
      setMsg({ ok: false, text: error instanceof Error ? error.message : "儲存失敗" });
    } finally {
      setSaving(false);
    }
  }

  function resetToDefault() {
    const defaults = getDefaultGlobalPaymentMethods();
    setMethods(defaults);
    setMsg({ ok: true, text: "已還原為系統預設（未儲存，請撳「儲存主檔」生效）。" });
  }

  const purchasePreview = useMemo(() => paymentMethodsForScope(methods, "purchase"), [methods]);
  const checkoutPreview = useMemo(() => paymentMethodsForScope(methods, "checkout"), [methods]);

  if (user?.role !== "admin") {
    return null;
  }

  const fieldCls =
    "w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 text-sm font-bold";

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center space-x-4">
        <Link href="/admin" className="text-gray-500 hover:text-blue-600 transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">支付方式主檔</h1>
          <p className="text-sm text-gray-500">
            全系統統一設置：商家由呢份清單中挑選，自己控制結帳顯示邊幾款
          </p>
        </div>
      </header>

      <div className="card bg-blue-50 border-blue-100 p-4 space-y-2">
        <p className="text-sm font-black text-blue-700">點運作</p>
        <ul className="text-xs text-blue-700/90 space-y-1 list-disc pl-5 font-medium">
          <li>
            <b>範圍 = 進貨</b>：只喺 POS「庫存 → 新增收據」出現（例如月結、銀行轉賬、支票）。
          </li>
          <li>
            <b>範圍 = 結帳</b>：只喺收銀台結帳出現（例如轉數快）。
          </li>
          <li>
            <b>範圍 = 兩者</b>：兩邊都出現（例如現金、信用卡）。
          </li>
          <li>
            <b>停用</b>：兩邊都唔會再出現，但保留喺主檔，唔會影響已有單據嘅顯示。
          </li>
          <li>
            <b>次序</b>：用 ↑ ↓ 調整，就係 POS 上顯示嘅次序。
          </li>
        </ul>
      </div>

      {loading ? (
        <div className="card py-12 flex flex-col items-center justify-center text-gray-400">
          <Loader2 className="animate-spin mb-2" size={28} />
          <p className="text-sm font-medium">支付方式載入中...</p>
        </div>
      ) : (
        <>
          <section className="space-y-3">
            {methods.map((method, index) => (
              <div key={`${method.code}-${index}`} className="card p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-gray-400">#{index + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      className="p-2 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30 hover:border-blue-200"
                      aria-label="上移"
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === methods.length - 1}
                      className="p-2 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30 hover:border-blue-200"
                      aria-label="下移"
                    >
                      <ArrowDown size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-2 rounded-lg border border-red-100 bg-red-50 text-red-600 hover:bg-red-100"
                      aria-label="刪除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="space-y-1">
                    <span className="text-xs font-black text-gray-500">顯示名</span>
                    <input
                      className={fieldCls}
                      value={method.label}
                      onChange={(e) => patch(index, { label: e.target.value })}
                      placeholder="例如：月結"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-black text-gray-500">
                      代碼 <span className="text-amber-600">（改動會影響舊單據顯示）</span>
                    </span>
                    <input
                      className={fieldCls}
                      value={method.code}
                      onChange={(e) => patch(index, { code: e.target.value })}
                      placeholder="例如：monthly"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-black text-gray-500">範圍</span>
                    <select
                      className={fieldCls}
                      value={method.scope}
                      onChange={(e) => patch(index, { scope: e.target.value as PaymentMethodScope })}
                    >
                      <option value="both">兩者（結帳 + 進貨）</option>
                      <option value="checkout">只限結帳</option>
                      <option value="purchase">只限進貨</option>
                    </select>
                  </label>
                </div>

                <label className="flex items-center gap-2 text-sm font-bold text-gray-600">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={method.enabled}
                    onChange={(e) => patch(index, { enabled: e.target.checked })}
                  />
                  啟用（取消 = 兩邊都唔顯示，但保留主檔記錄）
                </label>
              </div>
            ))}

            {methods.length === 0 && (
              <div className="card py-10 text-center text-sm text-gray-400">
                主檔目前係空。撳「新增支付方式」或「還原預設」。
              </div>
            )}
          </section>

          <section className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={add}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-600 hover:border-blue-200"
            >
              <Plus size={16} /> 新增支付方式
            </button>
            <button
              type="button"
              onClick={resetToDefault}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-600 hover:border-blue-200"
            >
              <RotateCcw size={16} /> 還原系統預設
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "儲存中…" : "儲存主檔"}
            </button>
            {dirty && !saving && (
              <span className="inline-flex items-center text-xs font-black text-amber-600">
                有未儲存嘅改動
              </span>
            )}
          </section>

          {msg && (
            <div
              className={`card p-4 text-sm font-bold ${
                msg.ok ? "bg-green-50 border-green-100 text-green-700" : "bg-red-50 border-red-100 text-red-700"
              }`}
            >
              {msg.text}
            </div>
          )}

          {/* 預覽：等 admin 一眼睇到改動對 POS 兩個介面嘅實際影響 */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[
              { title: "POS 進貨（新增收據）會見到", items: purchasePreview, tone: "bg-gray-50 border-gray-200" },
              { title: "POS 收銀台結帳會見到", items: checkoutPreview, tone: "bg-gray-50 border-gray-200" },
            ].map((panel) => (
              <div key={panel.title} className="card space-y-3">
                <h2 className="font-black text-gray-700">{panel.title}</h2>
                {panel.items.length === 0 ? (
                  <p className="text-xs font-bold text-red-600">
                    冇任何支付方式 ⇒ 該介面會無嘢可揀，請檢查範圍／啟用狀態。
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {panel.items.map((m) => (
                      <span
                        key={m.code}
                        className={`px-3 py-1.5 rounded-full text-xs font-black border ${panel.tone}`}
                      >
                        {m.label}
                        <span className="ml-1 text-gray-400 font-medium">{m.code}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
