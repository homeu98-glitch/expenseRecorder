import { format, startOfDay, startOfMonth, startOfWeek, subMonths } from "date-fns";

type UnknownRecord = Record<string, unknown>;

export type DashboardFilter = "today" | "week" | "month" | "all";

export type ReportItemRow = {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  receipt_id: string;
  receipt_date: string;
  merchant_name: string;
  receipt_number: string | null;
  created_at: string | null;
  change_percent: number | null;
  direction: "up" | "down" | "same" | "new";
};

export type ReportReceipt = {
  id: string;
  merchant_name: string;
  receipt_date: string;
  created_at: string | null;
  total_amount: number;
  receipt_number: string | null;
  payment_method: string;
  payment_status: string;
  image_url: string | null;
  items: ReportItemRow[];
};

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
    const parsed = Number.parseFloat(value.replace(/,/g, "").replace(/[^\d.-]/g, "").trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function getReceiptNumber(raw: unknown): string | null {
  if (!isRecord(raw)) {
    return null;
  }

  const value = getFirstDefined(raw, [
    "receipt_number",
    "receipt_no",
    "invoice_number",
    "invoice_no",
    "document_number",
    "document_no",
    "serial_number",
  ]);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function getRawValue(raw: unknown, key: string): string | null {
  if (!isRecord(raw)) {
    return null;
  }
  const value = getFirstDefined(raw, [key]);
  if (typeof value !== "string") {
    return null;
  }
  return value.trim() || null;
}

function normalizeMerchantName(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return "未知供應商";
}

function normalizeDateString(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return format(new Date(), "yyyy-MM-dd");
}

export function getRangeStart(filter: DashboardFilter): Date | null {
  if (filter === "today") {
    return startOfDay(new Date());
  }
  if (filter === "week") {
    return startOfWeek(new Date());
  }
  if (filter === "month") {
    return startOfMonth(new Date());
  }
  return null;
}

function matchesFilter(receipt: ReportReceipt, filter: DashboardFilter): boolean {
  const start = getRangeStart(filter);
  if (!start) {
    return true;
  }

  const receiptDate = new Date(receipt.receipt_date);
  return !Number.isNaN(receiptDate.getTime()) && receiptDate >= start;
}

export function filterReceiptsByDate(receipts: ReportReceipt[], filter: DashboardFilter): ReportReceipt[] {
  return receipts.filter((receipt) => matchesFilter(receipt, filter));
}

export function normalizeReportReceipts(input: unknown): ReportReceipt[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const receipts = input
    .map((row): ReportReceipt | null => {
      if (!isRecord(row)) {
        return null;
      }

      const merchantRecord = isRecord(row.merchants) ? row.merchants : null;
      const merchantName = normalizeMerchantName(merchantRecord?.name);
      const receiptItems = Array.isArray(row.receipt_items) ? row.receipt_items : [];
      const receiptId = String(row.id ?? "");
      const receiptDate = normalizeDateString(row.receipt_date);
      const receiptNumber = getReceiptNumber(row.raw_ocr_data);
      const createdAt = typeof row.created_at === "string" ? row.created_at : null;
      const paymentMethod = getRawValue(row.raw_ocr_data, "payment_method") ?? "on_delivery";
      const paymentStatus = getRawValue(row.raw_ocr_data, "payment_status") ?? "unpaid";
      const imageUrl = typeof row.image_url === "string" ? row.image_url : null;

      const items = receiptItems
        .map((item): ReportItemRow | null => {
          if (!isRecord(item)) {
            return null;
          }

          const quantity = normalizeNumber(item.quantity, 1);
          const unitPrice = normalizeNumber(item.unit_price, 0);

          return {
            id: String(item.id ?? `${receiptId}-${item.name ?? "item"}`),
            name: normalizeMerchantName(item.name).replace(/^未知供應商$/, "未命名品項"),
            quantity,
            unit_price: unitPrice,
            total_price: normalizeNumber(item.total_price, quantity * unitPrice),
            receipt_id: receiptId,
            receipt_date: receiptDate,
            merchant_name: merchantName,
            receipt_number: receiptNumber,
            created_at: typeof item.created_at === "string" ? item.created_at : createdAt,
            change_percent: null,
            direction: "new",
          };
        })
        .filter((item): item is ReportItemRow => item !== null);

      return {
        id: receiptId,
        merchant_name: merchantName,
        receipt_date: receiptDate,
        created_at: createdAt,
        total_amount: normalizeNumber(row.total_amount, 0),
        receipt_number: receiptNumber,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        image_url: imageUrl,
        items,
      };
    })
    .filter((receipt): receipt is ReportReceipt => receipt !== null);

  return receipts.sort((a, b) => {
    const left = new Date(a.created_at ?? a.receipt_date).getTime();
    const right = new Date(b.created_at ?? b.receipt_date).getTime();
    return right - left;
  });
}

export function buildMonthlyExpenses(receipts: ReportReceipt[], months = 6) {
  const startMonth = startOfMonth(subMonths(new Date(), months - 1));
  const buckets = new Map<string, number>();

  for (let index = 0; index < months; index += 1) {
    const current = startOfMonth(subMonths(new Date(), months - 1 - index));
    buckets.set(format(current, "yyyy-MM"), 0);
  }

  receipts.forEach((receipt) => {
    const receiptDate = new Date(receipt.receipt_date);
    if (Number.isNaN(receiptDate.getTime()) || receiptDate < startMonth) {
      return;
    }

    const key = format(startOfMonth(receiptDate), "yyyy-MM");
    buckets.set(key, (buckets.get(key) ?? 0) + receipt.total_amount);
  });

  return Array.from(buckets.entries()).map(([key, amount]) => ({
    key,
    name: format(new Date(`${key}-01`), "M月"),
    amount: Math.round(amount * 100) / 100,
  }));
}

export function buildSupplierStats(receipts: ReportReceipt[]) {
  const totals = new Map<string, { name: string; count: number; total: number }>();

  receipts.forEach((receipt) => {
    const current = totals.get(receipt.merchant_name) ?? {
      name: receipt.merchant_name,
      count: 0,
      total: 0,
    };
    current.count += 1;
    current.total += receipt.total_amount;
    totals.set(receipt.merchant_name, current);
  });

  return Array.from(totals.values()).sort((a, b) => b.total - a.total);
}

export function buildItemRows(receipts: ReportReceipt[]) {
  const grouped = new Map<string, ReportItemRow[]>();

  receipts.forEach((receipt) => {
    receipt.items.forEach((item) => {
      const key = item.name.trim().toLowerCase();
      if (!key) {
        return;
      }
      const bucket = grouped.get(key) ?? [];
      bucket.push({ ...item });
      grouped.set(key, bucket);
    });
  });

  const rows: ReportItemRow[] = [];

  grouped.forEach((items) => {
    const sorted = [...items].sort((a, b) => {
      const left = new Date(a.receipt_date).getTime();
      const right = new Date(b.receipt_date).getTime();
      return right - left;
    });

    sorted.forEach((item, index) => {
      const previous = sorted[index + 1];
      if (!previous || previous.unit_price === 0) {
        rows.push({ ...item, change_percent: null, direction: "new" });
        return;
      }

      const changePercent = ((item.unit_price - previous.unit_price) / previous.unit_price) * 100;
      rows.push({
        ...item,
        change_percent: changePercent,
        direction:
          changePercent > 0
            ? "up"
            : changePercent < 0
              ? "down"
              : "same",
      });
    });
  });

  return rows.sort((a, b) => {
    const left = new Date(a.receipt_date).getTime();
    const right = new Date(b.receipt_date).getTime();
    return right - left;
  });
}

export function buildTrendSummary(receipts: ReportReceipt[]) {
  const latestComparableRows = buildItemRows(receipts).filter((row) => row.direction === "up" || row.direction === "down");
  const seenNames = new Set<string>();
  let up = 0;
  let down = 0;

  latestComparableRows.forEach((row) => {
    const key = row.name.trim().toLowerCase();
    if (seenNames.has(key)) {
      return;
    }
    seenNames.add(key);
    if (row.direction === "up") {
      up += 1;
    } else if (row.direction === "down") {
      down += 1;
    }
  });

  return { up, down };
}

export function buildTrendSeries(receipts: ReportReceipt[]) {
  const grouped = new Map<string, ReportItemRow[]>();

  buildItemRows(receipts).forEach((row) => {
    const bucket = grouped.get(row.name) ?? [];
    bucket.push(row);
    grouped.set(row.name, bucket);
  });

  const seriesNames = Array.from(grouped.entries())
    .filter(([, rows]) => rows.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 2)
    .map(([name]) => name);

  if (seriesNames.length === 0) {
    return { seriesNames: [], data: [] as Array<Record<string, string | number | null>> };
  }

  const uniqueDates = new Set<string>();
  const dataByDate = new Map<string, Record<string, string | number | null>>();

  seriesNames.forEach((name) => {
    const rows = [...(grouped.get(name) ?? [])].sort(
      (a, b) => new Date(a.receipt_date).getTime() - new Date(b.receipt_date).getTime()
    );

    rows.forEach((row) => {
      uniqueDates.add(row.receipt_date);
      const current = dataByDate.get(row.receipt_date) ?? { date: format(new Date(row.receipt_date), "MM-dd") };
      current[name] = row.unit_price;
      dataByDate.set(row.receipt_date, current);
    });
  });

  const data = Array.from(uniqueDates)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    .map((date) => dataByDate.get(date) ?? { date: format(new Date(date), "MM-dd") });

  return { seriesNames, data };
}
