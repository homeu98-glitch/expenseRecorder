"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, Trash2, Plus, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { getShopUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import ConfettiBurst from "@/components/ConfettiBurst";
import { playSuccessSound, playPaidSound } from "@/lib/feedback";
import { getUnitLabel, isReservedMerchantName, loadShopPresets, normalizeUnitValue } from "@/lib/account-settings";
import { getPaymentMethodLabel, getPaymentStatusLabel } from "@/lib/payment-labels";
import {
  normalizeReceiptDraft,
  readPersistedReceiptDraft,
  clearPersistedReceiptDraft,
  type ReceiptDraft,
  type ReceiptDraftItem,
} from "@/lib/receipt";

function createEmptyReceiptDraft(): ReceiptDraft {
  return {
    merchant_name: "",
    receipt_number: "",
    payment_method: "on_delivery",
    payment_status: "unpaid",
    date: new Date().toISOString().split("T")[0],
    total_amount: 0,
    items: [],
  };
}

export default function EditReceiptPage() {
  const router = useRouter();
  const params = useParams<{ id?: string | string[] }>();
  const routeId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReceiptDraft>(createEmptyReceiptDraft);
  const [supplierSuggestions, setSupplierSuggestions] = useState<string[]>([]);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [allItemSuggestions, setAllItemSuggestions] = useState<string[]>([]);
  const [activeItemDropdownId, setActiveItemDropdownId] = useState<number | null>(null);
  const [activeUnitDropdownId, setActiveUnitDropdownId] = useState<number | null>(null);
  const [supplierItemMap, setSupplierItemMap] = useState<Record<string, string[]>>({});
  const [productPresetMap, setProductPresetMap] = useState<Record<string, { product_type?: string; default_unit?: string }>>({});
  const [customUnits, setCustomUnits] = useState<string[]>(["kg", "lb"]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [signedImageUrl, setSignedImageUrl] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);

  const receiptImageSrc = useMemo(
    () => data.image_data_url || (data.image_url ? signedImageUrl : null),
    [data.image_data_url, data.image_url, signedImageUrl]
  );
  const filteredSupplierSuggestions = useMemo(() => {
    const query = data.merchant_name.trim().toLowerCase();
    const matches = supplierSuggestions.filter((supplier) =>
      !query ? true : supplier.toLowerCase().includes(query)
    );
    return matches.slice(0, 8);
  }, [data.merchant_name, supplierSuggestions]);
  const itemSuggestionsById = useMemo(() => {
    const merchantSuggestions = supplierItemMap[data.merchant_name.trim().toLowerCase()] || allItemSuggestions;
    return Object.fromEntries(
      data.items.map((item) => {
        const query = item.name.trim().toLowerCase();
        const matches = merchantSuggestions.filter((suggestion) =>
          !query ? true : suggestion.toLowerCase().includes(query)
        );
        return [item.id, matches.slice(0, 8)];
      })
    ) as Record<number, string[]>;
  }, [allItemSuggestions, data.items, data.merchant_name, supplierItemMap]);
  const unitSuggestionsById = useMemo(() => {
    return Object.fromEntries(
      data.items.map((item) => {
        const query = (item.quantity_unit || "").trim().toLowerCase();
        const matches = ["unit", ...customUnits].filter((unit) =>
          !query ? true : getUnitLabel(unit).toLowerCase().includes(query) || unit.toLowerCase().includes(query)
        );
        return [item.id, matches.slice(0, 8)];
      })
    ) as Record<number, string[]>;
  }, [customUnits, data.items]);

  useEffect(() => {
    if (data.image_data_url || !data.image_url) {
      return;
    }

    let active = true;
    void (async () => {
      const { data: signed } = await supabase.storage.from("receipts").createSignedUrl(data.image_url!, 60 * 60);
      if (!active) return;
      if (signed?.signedUrl) {
        setSignedImageUrl(signed.signedUrl);
        return;
      }
      setSignedImageUrl(supabase.storage.from("receipts").getPublicUrl(data.image_url!).data.publicUrl);
    })();

    return () => {
      active = false;
    };
  }, [data.image_data_url, data.image_url]);

  useEffect(() => {
    if (!routeId) {
      return;
    }

    if (routeId === "new") {
      try {
        const normalized = readPersistedReceiptDraft();
        if (!normalized) {
          return;
        }

        const timer = window.setTimeout(() => {
          setData(normalized);
        }, 0);

        return () => window.clearTimeout(timer);
      } catch (error: unknown) {
        console.error("Error parsing AI data:", error);
      }
      return;
    }

    const shopUser = getShopUser();
    if (!shopUser?.id) {
      return;
    }

    void (async () => {
      try {
        const { data: receipt, error } = await supabase
          .from("receipts")
          .select(`
            id,
            receipt_date,
            total_amount,
            image_url,
            raw_ocr_data,
            merchants(name),
            receipt_items(id, name, quantity, unit_price)
          `)
          .eq("id", routeId)
          .eq("user_id", shopUser.id)
          .single();

        if (error) throw error;
        const merchantRelation = receipt.merchants as { name?: string } | Array<{ name?: string }> | null;
        const merchantName = Array.isArray(merchantRelation)
          ? merchantRelation[0]?.name
          : merchantRelation?.name;

        const loadedPresets = await loadShopPresets(shopUser.id);
        const allowedUnits = new Set(["unit", ...loadedPresets.customUnits]);

        setData(normalizeReceiptDraft({
          merchant_name: merchantName,
          receipt_number: receipt.raw_ocr_data?.receipt_number,
          payment_method: receipt.raw_ocr_data?.payment_method,
          payment_status: receipt.raw_ocr_data?.payment_status,
          date: receipt.receipt_date,
          total_amount: receipt.total_amount,
          image_data_url: receipt.raw_ocr_data?.image_data_url,
          image_url: receipt.image_url,
          items: receipt.receipt_items.map((item: { id: string; name: string; quantity: number; unit_price: number }, index: number) => ({
            ...item,
            quantity_unit: allowedUnits.has(receipt.raw_ocr_data?.item_metadata?.[index]?.quantity_unit)
              ? receipt.raw_ocr_data?.item_metadata?.[index]?.quantity_unit
              : "unit",
            product_type: receipt.raw_ocr_data?.item_metadata?.[index]?.product_type,
          })),
        }));
      } catch (error: unknown) {
        console.error("Error loading receipt:", error);
      }
    })();
  }, [routeId]);

  useEffect(() => {
    const shopUser = getShopUser();
    if (!shopUser?.id) {
      return;
    }

    void (async () => {
      try {
        const [{ data: merchants }, { data: receipts }, presets] = await Promise.all([
          supabase.from("merchants").select("name").eq("user_id", shopUser.id).order("name"),
          supabase
            .from("receipts")
            .select(`
              merchants(name),
              receipt_items(name)
            `)
            .eq("user_id", shopUser.id),
          loadShopPresets(shopUser.id),
        ]);

        const merchantNames = Array.from(
          new Set(
            (merchants ?? [])
              .map((merchant) => merchant.name)
              .filter((name) => Boolean(name) && !isReservedMerchantName(name) && !presets.hiddenSuppliers.includes(name))
          )
        ) as string[];
        const allItems = new Set<string>();
        const itemMap = new Map<string, Set<string>>();
        const presetMap = new Map<string, { product_type?: string; default_unit?: string }>();
        setCustomUnits(presets.customUnits);

        presets.suppliers.forEach((supplier) => {
          if (supplier.name?.trim()) {
            merchantNames.push(supplier.name.trim());
          }

          const supplierKey = supplier.name.trim().toLowerCase();
          const supplierItems = itemMap.get(supplierKey) ?? new Set<string>();
          supplier.products.forEach((product) => {
            if (!product.name?.trim()) return;
            const productName = product.name.trim();
            allItems.add(productName);
            supplierItems.add(productName);
            presetMap.set(`${supplierKey}::${productName.toLowerCase()}`, {
              product_type: product.product_type,
              default_unit: product.default_unit,
            });
          });
          itemMap.set(supplierKey, supplierItems);
        });

        (receipts ?? []).forEach((receipt) => {
          const merchantRelation = receipt.merchants as { name?: string } | Array<{ name?: string }> | null;
          const merchantName = Array.isArray(merchantRelation)
            ? merchantRelation[0]?.name
            : merchantRelation?.name;
          const merchantKey = merchantName?.trim().toLowerCase();
          const itemSet = merchantKey ? itemMap.get(merchantKey) ?? new Set<string>() : null;

          (receipt.receipt_items ?? []).forEach((item: { name?: string }) => {
            if (!item.name?.trim()) return;
            allItems.add(item.name.trim());
            if (itemSet) {
              itemSet.add(item.name.trim());
            }
          });

          if (merchantKey && itemSet) {
            itemMap.set(merchantKey, itemSet);
          }
        });

        setSupplierSuggestions(Array.from(new Set(merchantNames)).sort());
        setAllItemSuggestions(Array.from(allItems).sort());
        setProductPresetMap(Object.fromEntries(presetMap.entries()));
        setSupplierItemMap(
          Object.fromEntries(
            Array.from(itemMap.entries()).map(([merchant, items]) => [merchant, Array.from(items).sort()])
          )
        );
      } catch (error: unknown) {
        console.error("Error loading shop history:", error);
      }
    })();
  }, []);

  const handleUpdateItem = (
    id: number,
    field: keyof Pick<ReceiptDraftItem, "name" | "quantity" | "unit_price" | "quantity_unit" | "product_type">,
    value: string | number
  ) => {
    const merchantKey = data.merchant_name.trim().toLowerCase();
    const newItems = data.items.map((item) => {
      if (item.id !== id) {
        return item;
      }

      const nextItem = { ...item, [field]: value };
      if (field === "name" && typeof value === "string") {
        const preset = productPresetMap[`${merchantKey}::${value.trim().toLowerCase()}`];
        if (preset?.default_unit) {
          nextItem.quantity_unit = normalizeUnitValue(preset.default_unit);
        }
        if (preset?.product_type && !nextItem.product_type) {
          nextItem.product_type = preset.product_type;
        }
      }
      return nextItem;
    });
    const newTotal = newItems.reduce((acc, item) => acc + (Number(item.unit_price) * Number(item.quantity || 1)), 0);
    setData({ ...data, items: newItems, total_amount: newTotal });
  };

  const handleAddItem = () => {
    const newItem = { id: Date.now(), name: "", quantity: 1, unit_price: 0, quantity_unit: "unit" };
    setData({ ...data, items: [...data.items, newItem] });
  };

  const handleRemoveItem = (id: number) => {
    const newItems = data.items.filter((it) => it.id !== id);
    const newTotal = newItems.reduce((acc, item) => acc + (Number(item.unit_price) * Number(item.quantity || 1)), 0);
    setData({ ...data, items: newItems, total_amount: newTotal });
  };

  const handleSave = async () => {
    const user = getShopUser();
    if (!user) return alert("請先登入");
    if (!data.merchant_name) return alert("請輸入供應商名稱");

    setLoading(true);
    try {
      const basePayload = {
        receiptId: routeId !== "new" ? routeId : undefined,
        userId: user.id,
        ...data,
      };

      const saveReceipt = async (payload: typeof basePayload) => {
        const response = await fetch('/api/db/save-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(result?.error || "儲存失敗");
        }
        return result;
      };

      try {
        await saveReceipt(basePayload);
      } catch (firstError) {
        const hasEmbeddedImage = Boolean(basePayload.image_data_url);
        if (!hasEmbeddedImage) {
          throw firstError;
        }

        await saveReceipt({
          ...basePayload,
          image_data_url: undefined,
        });
      }

      const paid = (data.payment_status || "unpaid") === "paid";
      if (paid) {
        playPaidSound();
      } else {
        playSuccessSound();
      }
      setShowConfetti(true);
      setFeedbackMessage(paid ? "已付款並成功儲存" : "收據已成功建立");
      clearPersistedReceiptDraft();
      window.setTimeout(() => {
        setShowConfetti(false);
        setFeedbackMessage(null);
        router.push("/");
      }, 1200);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const user = getShopUser();
    if (!user || !routeId || routeId === "new") return;
    if (!confirm("確定要刪除此收據嗎？此操作無法復原。")) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/db/receipt/${routeId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) throw new Error("刪除失敗");
      alert("收據已刪除");
      router.push("/");
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "刪除失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      <ConfettiBurst active={showConfetti} />
      {feedbackMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[95] bg-gray-900 text-white px-5 py-3 rounded-full shadow-2xl text-sm font-black animate-in fade-in zoom-in-95 duration-200">
          {feedbackMessage}
        </div>
      )}
      {showImageModal && receiptImageSrc && (
        <button
          type="button"
          onClick={() => setShowImageModal(false)}
          className="fixed inset-0 z-[110] bg-black/90 p-4 flex items-center justify-center"
        >
          <img src={receiptImageSrc} alt="放大收據" className="max-w-full max-h-full object-contain rounded-xl" />
        </button>
      )}
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-blue-600 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-black text-center flex-1">
          {routeId === "new" ? "檢查並儲存記錄" : "編輯開支記錄"}
        </h1>
        <div className="w-6" />
      </div>

      <div className="space-y-4">
        {/* Basic Info */}
        <section className="card space-y-4 border-l-4 border-l-blue-600">
          {receiptImageSrc && (
            <button
              type="button"
              onClick={() => setShowImageModal(true)}
              className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-900 block w-full text-left"
            >
              <img src={receiptImageSrc} alt="掃描收據" className="w-full max-h-[40vh] object-contain" />
            </button>
          )}
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">供應商名稱</label>
            <div className="relative">
              <input
                type="text"
                value={data.merchant_name}
                onFocus={() => setShowSupplierDropdown(true)}
                onBlur={() => window.setTimeout(() => setShowSupplierDropdown(false), 120)}
                onChange={(e) => {
                  setData({ ...data, merchant_name: e.target.value });
                  setShowSupplierDropdown(true);
                }}
                className="w-full text-lg font-black border-b border-gray-100 py-2 focus:border-blue-500 outline-none transition-all bg-transparent"
                placeholder="請輸入供應商名稱"
              />
              {showSupplierDropdown && filteredSupplierSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 overflow-hidden">
                  {filteredSupplierSuggestions.map((supplier) => (
                    <button
                      key={supplier}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setData({ ...data, merchant_name: supplier });
                        setShowSupplierDropdown(false);
                      }}
                      className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors border-b border-gray-50 last:border-b-0"
                    >
                      {supplier}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">收據編號</label>
            <input
              type="text"
              value={data.receipt_number || ""}
              onChange={(e) => setData({ ...data, receipt_number: e.target.value })}
              className="w-full font-bold border-b border-gray-100 py-2 focus:border-blue-500 outline-none transition-all"
              placeholder="如收據上有編號，請在此確認"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">付款方式</label>
              <select
                value={data.payment_method || "on_delivery"}
                onChange={(e) => setData({ ...data, payment_method: e.target.value })}
                className="w-full font-bold border-b border-gray-100 py-2 outline-none focus:border-blue-500 bg-transparent"
              >
                <option value="on_delivery">{getPaymentMethodLabel("on_delivery")}</option>
                <option value="monthly">{getPaymentMethodLabel("monthly")}</option>
                <option value="pay_later">{getPaymentMethodLabel("pay_later")}</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">付款狀態</label>
              <select
                value={data.payment_status || "unpaid"}
                onChange={(e) => setData({ ...data, payment_status: e.target.value })}
                className="w-full font-bold border-b border-gray-100 py-2 outline-none focus:border-blue-500 bg-transparent"
              >
                <option value="unpaid">{getPaymentStatusLabel("unpaid")}</option>
                <option value="paid">{getPaymentStatusLabel("paid")}</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <div className="flex-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">交易日期</label>
              <input
                type="date"
                value={data.date}
                onChange={(e) => setData({...data, date: e.target.value})}
                className="w-full border-b border-gray-100 py-2 focus:border-blue-500 outline-none font-bold"
              />
            </div>
            <div className="flex-1 text-right">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">總金額</label>
              <div className="relative mt-1">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-blue-600 font-black text-xl">$</span>
                <input
                  type="number"
                  value={data.total_amount}
                  onChange={(e) => setData({...data, total_amount: parseFloat(e.target.value) || 0})}
                  className="w-full text-2xl font-black text-blue-600 border-b border-transparent focus:border-blue-500 outline-none text-right bg-transparent"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Highlighted Total at top of list */}
        <div className="bg-blue-600 rounded-2xl p-4 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-lg shadow-blue-100">
           <div className="flex items-center space-x-3 min-w-0">
             <div className="p-2 bg-white/20 rounded-lg">
               <Save size={20} />
             </div>
             <div className="font-bold truncate">核對總額</div>
           </div>
           <div className="text-xl sm:text-2xl font-black break-all sm:text-right">${data.total_amount.toLocaleString()}</div>
        </div>

        {/* Items List */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
            <h2 className="text-lg font-black text-gray-700">品項明細</h2>
            <button
              onClick={handleAddItem}
              className="text-xs font-black text-blue-600 inline-flex items-center justify-center bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 self-start sm:self-auto"
            >
              <Plus size={14} className="mr-1" /> 新增品項
            </button>
          </div>

          <div className="space-y-3">
            {data.items.length === 0 && (
              <div className="card py-8 text-center text-gray-400 text-sm italic">
                尚未加入任何品項
              </div>
            )}
            {data.items.map((item) => (
              <div key={item.id} className="card p-4 space-y-4 relative group hover:border-blue-200 transition-all">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="品項名稱 (如: 雞翅)"
                        value={item.name}
                        onFocus={() => setActiveItemDropdownId(item.id)}
                        onBlur={() => window.setTimeout(() => setActiveItemDropdownId((current) => (current === item.id ? null : current)), 120)}
                        onChange={(e) => {
                          handleUpdateItem(item.id, 'name', e.target.value);
                          setActiveItemDropdownId(item.id);
                        }}
                        className="w-full min-w-0 font-black text-gray-800 border-b border-transparent focus:border-blue-200 outline-none py-1"
                      />
                      {activeItemDropdownId === item.id && (itemSuggestionsById[item.id]?.length || 0) > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 overflow-hidden">
                          {(itemSuggestionsById[item.id] || []).map((suggestion) => (
                            <button
                              key={`${item.id}-${suggestion}`}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                handleUpdateItem(item.id, "name", suggestion);
                                setActiveItemDropdownId(null);
                              }}
                              className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors border-b border-gray-50 last:border-b-0"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="text-gray-300 hover:text-red-500 shrink-0"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[auto_auto_1fr_auto] gap-3 items-center">
                  <div className="flex items-center bg-gray-50 rounded-xl px-3 py-2 min-w-0">
                    <span className="text-[10px] font-black text-gray-400 mr-2 uppercase">數量</span>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value))}
                      className="w-full sm:w-12 bg-transparent py-1 outline-none text-center font-bold"
                    />
                  </div>
                  <div className="flex items-center bg-gray-50 rounded-xl px-3 py-2 min-w-0 relative">
                    <span className="text-[10px] font-black text-gray-400 mr-2 uppercase">單位</span>
                    <input
                      type="text"
                      value={item.quantity_unit ? getUnitLabel(item.quantity_unit) : ""}
                      onFocus={() => setActiveUnitDropdownId(item.id)}
                      onBlur={() => window.setTimeout(() => setActiveUnitDropdownId((current) => (current === item.id ? null : current)), 120)}
                      onChange={(e) => {
                        handleUpdateItem(item.id, 'quantity_unit', e.target.value || "unit");
                        setActiveUnitDropdownId(item.id);
                      }}
                      placeholder="個"
                      className="w-full bg-transparent py-1 outline-none font-bold text-sm min-w-0"
                    />
                    {activeUnitDropdownId === item.id && (unitSuggestionsById[item.id]?.length || 0) > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 overflow-hidden">
                        {(unitSuggestionsById[item.id] || []).map((unit) => (
                          <button
                            key={`${item.id}-${unit}`}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              handleUpdateItem(item.id, "quantity_unit", unit);
                              setActiveUnitDropdownId(null);
                            }}
                            className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors border-b border-gray-50 last:border-b-0"
                          >
                            {getUnitLabel(unit)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center bg-gray-50 rounded-xl px-3 py-2 min-w-0">
                    <span className="text-[10px] font-black text-gray-400 mr-2 uppercase">單價</span>
                    <span className="text-gray-600 font-bold mr-1">$</span>
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => handleUpdateItem(item.id, 'unit_price', parseFloat(e.target.value))}
                      className="w-full min-w-0 bg-transparent py-1 outline-none font-bold"
                    />
                  </div>
                  <div className="text-left sm:text-right min-w-0">
                    <div className="text-[10px] font-black text-gray-400 uppercase">小計</div>
                    <div className="font-black text-gray-700 break-all">${(Number(item.unit_price) * Number(item.quantity || 1)).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="pt-8">
        {routeId !== "new" && (
          <button
            onClick={handleDelete}
            disabled={loading}
            className="w-full mb-3 border border-red-200 text-red-600 rounded-2xl py-4 flex items-center justify-center space-x-2 hover:bg-red-50 transition-all disabled:opacity-50"
          >
            <Trash2 size={20} />
            <span className="font-black">刪除此收據</span>
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-2xl py-4 sm:py-5 px-4 flex items-center justify-center space-x-3 shadow-2xl shadow-blue-200 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle2 size={24} />}
          <span className="font-black text-base sm:text-xl text-center">確認並儲存至資料庫</span>
        </button>
      </footer>
    </div>
  );
}
