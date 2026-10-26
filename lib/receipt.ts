type UnknownRecord = Record<string, unknown>;

export type ReceiptDraftItem = {
  id: number;
  name: string;
  quantity: number;
  unit_price: number;
  quantity_unit?: string;
  product_type?: string;
};

export type ReceiptDraft = {
  merchant_name: string;
  receipt_number?: string;
  payment_method?: string;
  payment_status?: string;
  input_method?: string;
  /**
   * 整張單嘅品類（2026-09-25 由 macau-pos 引入，兩邊一致）。
   * 存喺 `raw_ocr_data.category`，新增收據時必填。
   * 舊收據（macau-pos 上線前）可能冇值 ⇒ `undefined`。
   */
  category?: string;
  /**
   * 幣值（2026-10-11 由 macau-pos 引入，兩邊一致）。
   * 同時寫頂層 `receipts.currency` 同 `raw_ocr_data.currency`。
   * 未提供 ⇒ 落 `'MOP'`（同 macau-pos `normalizeReceiptCurrency`）。
   */
  currency?: string;
  date: string;
  total_amount: number;
  items: ReceiptDraftItem[];
  image_data_url?: string;
  image_url?: string;
};

export const TEMP_RECEIPT_STORAGE_KEY = "temp_receipt";

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getFirstDefined(record: UnknownRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) {
      return record[key];
    }
  }
  return undefined;
}

function normalizeNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").replace(/[^\d.-]/g, "").trim();
    const parsed = Number.parseFloat(cleaned);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function normalizeDate(value: unknown): string {
  const today = new Date();
  const fallback = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  if (typeof value !== "string") {
    return fallback;
  }

  const raw = value.trim();
  if (!raw) {
    return fallback;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const normalized = raw.replace(/[.]/g, "/").replace(/-/g, "/");
  const parts = normalized.split("/").map((part) => part.trim()).filter(Boolean);

  if (parts.length === 3) {
    const [first, month, day] = parts.map((part) => Number.parseInt(part, 10));
    let a = first;

    if ([a, month, day].every((part) => Number.isFinite(part))) {
      if (a < 1911) {
        a += 1911;
      }

      if (a > 999) {
        return `${a}-${pad(month)}-${pad(day)}`;
      }

      const year = day < 100 ? 2000 + day : day;
      return `${year}-${pad(month)}-${pad(a)}`;
    }
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
  }

  return fallback;
}

function unwrapReceiptPayload(input: unknown): UnknownRecord {
  if (!isRecord(input)) {
    return {};
  }

  const nested = getFirstDefined(input, ["data", "result", "receipt", "receipt_data", "extracted"]);
  if (isRecord(nested)) {
    return nested;
  }

  return input;
}

function extractItems(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (isRecord(value)) {
    const nested = getFirstDefined(value, ["items", "line_items", "products", "details", "entries"]);
    if (Array.isArray(nested)) {
      return nested;
    }

    return Object.values(value);
  }

  return [];
}

export function normalizeReceiptDraft(input: unknown): ReceiptDraft {
  const payload = unwrapReceiptPayload(input);

  const rawItems = extractItems(
    getFirstDefined(payload, ["items", "line_items", "products", "details", "entries"])
  );

  const items = rawItems
    .map((item, index): ReceiptDraftItem | null => {
      if (!isRecord(item)) {
        return null;
      }

      const name = String(
        getFirstDefined(item, ["name", "item_name", "description", "product_name", "title"]) ?? ""
      ).trim();

      const quantity = normalizeNumber(
        getFirstDefined(item, ["quantity", "qty", "count", "amount"]),
        1
      );
      const unitPrice = normalizeNumber(
        getFirstDefined(item, ["unit_price", "price", "amount", "subtotal", "total_price"]),
        0
      );
      const quantityUnit = String(
        getFirstDefined(item, ["quantity_unit", "unit", "measurement_unit"]) ?? ""
      ).trim() || "unit";
      const productType = String(
        getFirstDefined(item, ["product_type", "category", "item_type"]) ?? ""
      ).trim() || undefined;

      if (!name && unitPrice <= 0) {
        return null;
      }

      return {
        id: index + 1,
        name: name || "未命名品項",
        quantity: quantity > 0 ? quantity : 1,
        unit_price: unitPrice,
        quantity_unit: quantityUnit,
        product_type: productType,
      };
    })
    .filter((item): item is ReceiptDraftItem => item !== null);

  const totalAmount = normalizeNumber(
    getFirstDefined(payload, ["total_amount", "total", "amount", "grand_total", "subtotal"]),
    0
  );

  const calculatedTotal = items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unit_price),
    0
  );

  return {
    merchant_name: String(
      getFirstDefined(payload, ["merchant_name", "store_name", "merchant", "vendor", "shop_name"]) ??
        ""
    ).trim(),
    receipt_number: String(
      getFirstDefined(payload, [
        "receipt_number",
        "receipt_no",
        "invoice_number",
        "invoice_no",
        "document_number",
        "document_no",
        "serial_number",
      ]) ?? ""
    ).trim() || undefined,
    payment_method: String(
      getFirstDefined(payload, ["payment_method"]) ?? ""
    ).trim() || "on_delivery",
    payment_status: String(
      getFirstDefined(payload, ["payment_status"]) ?? ""
    ).trim() || "unpaid",
    input_method: String(
      getFirstDefined(payload, ["input_method"]) ?? ""
    ).trim() || undefined,
    category: String(
      getFirstDefined(payload, ["category", "item_category"]) ?? ""
    ).trim() || undefined,
    currency: (() => {
      const top = String(getFirstDefined(payload, ["currency"]) ?? "").trim().toUpperCase();
      if (top) return top;
      const nested = isRecord(payload.raw_ocr_data)
        ? String((payload.raw_ocr_data as UnknownRecord).currency ?? "").trim().toUpperCase()
        : "";
      return nested || "MOP";
    })(),
    date: normalizeDate(getFirstDefined(payload, ["date", "receipt_date", "transaction_date"])),
    total_amount: totalAmount > 0 ? totalAmount : calculatedTotal,
    items,
    image_data_url:
      typeof getFirstDefined(payload, ["image_data_url", "imageDataUrl"]) === "string"
        ? String(getFirstDefined(payload, ["image_data_url", "imageDataUrl"]))
        : undefined,
    image_url:
      typeof getFirstDefined(payload, ["image_url", "imageUrl"]) === "string"
        ? String(getFirstDefined(payload, ["image_url", "imageUrl"]))
        : undefined,
  };
}

export function persistReceiptDraft(draft: ReceiptDraft) {
  if (typeof window === "undefined") {
    return;
  }

  const serialized = JSON.stringify(draft);
  window.sessionStorage.setItem(TEMP_RECEIPT_STORAGE_KEY, serialized);
  window.localStorage.setItem(TEMP_RECEIPT_STORAGE_KEY, serialized);
}

export function readPersistedReceiptDraft(): ReceiptDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored =
    window.sessionStorage.getItem(TEMP_RECEIPT_STORAGE_KEY) ??
    window.localStorage.getItem(TEMP_RECEIPT_STORAGE_KEY);

  if (!stored) {
    return null;
  }

  return normalizeReceiptDraft(JSON.parse(stored) as unknown);
}

export function clearPersistedReceiptDraft() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(TEMP_RECEIPT_STORAGE_KEY);
  window.localStorage.removeItem(TEMP_RECEIPT_STORAGE_KEY);
}
