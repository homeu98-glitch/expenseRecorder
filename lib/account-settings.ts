import { supabase } from "@/lib/supabase";

export type ProductPreset = {
  name: string;
  product_type?: string;
  default_unit?: string;
};

export type SupplierPreset = {
  name: string;
  products: ProductPreset[];
};

export type ShopPresets = {
  suppliers: SupplierPreset[];
  customUnits: string[];
  hiddenSuppliers: string[];
};

export type AccountStatus = "active" | "suspended" | "deleted";

export type ShopAccountSettings = {
  customUnits: string[];
  accountStatus: AccountStatus;
};

const SETTINGS_MERCHANT_PREFIX = "__shop_settings__:";
const GLOBAL_SETTINGS_MERCHANT_NAME = "__global_settings__";
const PRESET_PREFIX = "__preset_json__:";
const SETTINGS_PREFIX = "__settings_json__:";
/**
 * ⚠️ 舊容器前綴：歷史上 `__global_settings__` 呢條保留列嘅 `address` 淨係裝 `{ units }`，
 * 所以前綴叫 `__global_units__:`。2026-09-25 加「支付方式主檔」之後**仍然要讀得返**呢個
 * 舊前綴，否則商家已經設好嘅單位清單會一夜之間跌返預設（無聲、無提示）。
 * 寫入一律用新前綴 `GLOBAL_SETTINGS_PREFIX`，等舊資料第一次儲存時自然遷移過去。
 */
const GLOBAL_UNITS_PREFIX = "__global_units__:";
/** 新容器前綴：`{ units?, paymentMethods? }`。 */
const GLOBAL_SETTINGS_PREFIX = "__global_settings__:";

/* ─────────────── 支付方式主檔（admin 統一設置，2026-09-25）─────────────── */

/**
 * 支付方式適用範圍。
 * - `purchase`：只喺**進貨／收據**（庫存模組）出現 —— 例如「月結」「銀行轉賬」「支票」；
 * - `checkout`：只喺**收銀結帳**出現 —— 例如「轉數快」「Mpay」；
 * - `both`：兩邊都出現 —— 例如「現金」「信用卡」。
 *
 * 🔴 兩邊**本來就係唔同嘅清單**：結帳係「客人點畀錢」，進貨係「點找供應商數」。
 * 以前兩邊各自 hardcode（POS 係 `PAYMENT_METHODS` 常數、呢邊係 `payment-labels.ts`），
 * 結果加一個「月結」要改兩個 repo 兩處 code。而家統一由 admin 主檔派發。
 */
export type PaymentMethodScope = "purchase" | "checkout" | "both";

export type PaymentMethodDef = {
  /** canonical key：會直接寫入 `receipts.raw_ocr_data.payment_method`，**唔可以隨意改**。 */
  code: string;
  /** 中文顯示名。 */
  label: string;
  /** `false` = admin 停用（兩邊都唔會出現），但唔刪除，保留既有單據嘅顯示。 */
  enabled: boolean;
  scope: PaymentMethodScope;
};

/**
 * 內建預設主檔。**只在 `paymentMethods` 完全未設定過時**使用。
 * 注意：一旦 admin 儲存過（即使存空清單），就一律以資料庫為準，
 * 唔會再偷偷補回預設（否則 admin 刪極都刪唔走）。
 */
export function getDefaultGlobalPaymentMethods(): PaymentMethodDef[] {
  return [
    { code: "cash", label: "現金", enabled: true, scope: "both" },
    { code: "card", label: "信用卡", enabled: true, scope: "both" },
    { code: "transfer", label: "轉帳", enabled: true, scope: "both" },
    { code: "on_delivery", label: "貨到付款", enabled: true, scope: "purchase" },
    { code: "monthly", label: "月結", enabled: true, scope: "purchase" },
    { code: "pay_later", label: "稍後付款", enabled: true, scope: "purchase" },
    { code: "bank_transfer", label: "銀行轉賬", enabled: true, scope: "purchase" },
    { code: "cheque", label: "支票", enabled: true, scope: "purchase" },
    { code: "fps", label: "轉數快", enabled: true, scope: "checkout" },
  ];
}

function normalizeScope(value: unknown): PaymentMethodScope {
  return value === "purchase" || value === "checkout" || value === "both" ? value : "both";
}

/**
 * 正規化主檔。
 *
 * 🔴 `raw` **唔係陣列**（＝從未設定過）→ 回內建預設；
 *    `raw` **係陣列**（即使係空陣列）→ 照用，唔補預設。
 * 呢個區分係刻意嘅：冇咗佢，admin 就永遠清唔空個清單。
 */
export function normalizePaymentMethods(raw: unknown): PaymentMethodDef[] {
  if (!Array.isArray(raw)) return getDefaultGlobalPaymentMethods();
  const seen = new Set<string>();
  const out: PaymentMethodDef[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const code = typeof row.code === "string" ? row.code.trim() : "";
    if (!code || seen.has(code)) continue;
    seen.add(code);
    const label = typeof row.label === "string" && row.label.trim() ? row.label.trim() : code;
    out.push({ code, label, enabled: row.enabled !== false, scope: normalizeScope(row.scope) });
  }
  return out;
}

/** 主檔之中，某個介面（進貨／結帳）應該顯示嘅啟用中方法（**保持主檔次序**）。 */
export function paymentMethodsForScope(
  list: PaymentMethodDef[],
  scope: "purchase" | "checkout",
): PaymentMethodDef[] {
  return list.filter((m) => m.enabled && (m.scope === scope || m.scope === "both"));
}

function encodePayload(prefix: string, payload: unknown) {
  return `${prefix}${JSON.stringify(payload)}`;
}

function decodePayload<T>(prefix: string, value: string | null | undefined): T | null {
  if (!value || !value.startsWith(prefix)) {
    return null;
  }

  try {
    return JSON.parse(value.slice(prefix.length)) as T;
  } catch {
    return null;
  }
}

function getSettingsMerchantName(userId: string) {
  return `${SETTINGS_MERCHANT_PREFIX}${userId}`;
}

function getDefaultAccountSettings(): ShopAccountSettings {
  return {
    customUnits: ["kg", "lb"],
    accountStatus: "active",
  };
}

function getDefaultGlobalUnits() {
  return ["kg", "lb", "斤", "箱", "包", "袋", "瓶", "罐", "支", "條", "隻", "片", "打"];
}

function normalizeAccountStatus(value: unknown): AccountStatus {
  return value === "suspended" || value === "deleted" ? value : "active";
}

/**
 * 判斷係咪「保留名」——即係唔可以當成供應商顯示嘅內部列。
 *
 * 🔴 2026-09-25 補 `__global_settings__`：以前只擋 `__shop_settings__:<userId>`，
 * 但全域設定列同樣係一個 merchant row。雖然佢掛喺 admin user 名下、
 * 正常商戶查唔到，但任何「唔加 user_id 篩選」嘅新查詢都會即刻漏佢出嚟
 * （POS 側嘅供應商下拉就係一個實例），所以喺呢度一次過擋清楚。
 */
export function isReservedMerchantName(name: string) {
  return name.startsWith(SETTINGS_MERCHANT_PREFIX) || name === GLOBAL_SETTINGS_MERCHANT_NAME;
}

export function normalizeUnitValue(unit: string | null | undefined) {
  const trimmed = typeof unit === "string" ? unit.trim() : "";
  return trimmed || "unit";
}

export function getUnitLabel(unit: string) {
  if (unit === "unit") return "個";
  if (unit === "kg") return "KG";
  if (unit === "lb") return "Pound";
  return unit;
}

async function ensureAdminUserId() {
  const { data: existingAdmin, error: existingError } = await supabase
    .from("shop_users")
    .select("id")
    .eq("login_id", "60000000")
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existingAdmin?.id) {
    return existingAdmin.id;
  }

  const { data: createdAdmin, error: createError } = await supabase
    .from("shop_users")
    .insert({ shop_name: "系統管理員", login_id: "60000000", login_pin: "0000" })
    .select("id")
    .single();

  if (createError) {
    throw createError;
  }

  return createdAdmin.id;
}

/** `__global_settings__` 保留列嘅 payload 形狀（舊資料只有 `units`）。 */
type GlobalSettingsPayload = {
  units?: unknown;
  paymentMethods?: unknown;
};

/**
 * 讀 `__global_settings__`（admin 名下）呢條保留列。
 * 新舊前綴都食（新優先），令 2026-09-25 之前建立嘅資料照樣讀得到。
 */
async function readGlobalSettings() {
  const adminUserId = await ensureAdminUserId();
  const { data, error } = await supabase
    .from("merchants")
    .select("address")
    .eq("user_id", adminUserId)
    .eq("name", GLOBAL_SETTINGS_MERCHANT_NAME)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const payload =
    decodePayload<GlobalSettingsPayload>(GLOBAL_SETTINGS_PREFIX, data?.address) ??
    decodePayload<GlobalSettingsPayload>(GLOBAL_UNITS_PREFIX, data?.address) ??
    null;

  return { adminUserId, payload };
}

/**
 * 🔴 一定要 **merge**，唔可以整份覆蓋。
 *
 * `__global_settings__` 係**一條列**同時裝住「全域單位清單」同「支付方式主檔」。
 * 舊寫法（`saveGlobalUnits` 直接 upsert `{ units }`）本身冇問題，但一旦加多一個 key，
 * 任何一邊儲存都會將另一邊**靜靜蓋走** —— 即係 admin 改完支付方式，單位清單就無聲 reset。
 * 所以全部寫入統一經呢個函式：先讀返現有 payload，再併入 patch。
 */
async function patchGlobalSettings(patch: Partial<GlobalSettingsPayload>) {
  const { adminUserId, payload } = await readGlobalSettings();
  const merged: GlobalSettingsPayload = { ...(payload ?? {}), ...patch };

  const { error } = await supabase
    .from("merchants")
    .upsert(
      {
        user_id: adminUserId,
        name: GLOBAL_SETTINGS_MERCHANT_NAME,
        address: encodePayload(GLOBAL_SETTINGS_PREFIX, merged),
      },
      { onConflict: "user_id,name" }
    );

  if (error) {
    throw error;
  }

  return merged;
}

function dedupeUnits(units: unknown): string[] {
  if (!Array.isArray(units)) return [];
  return Array.from(
    new Set(
      units
        .map((unit) => normalizeUnitValue(typeof unit === "string" ? unit : ""))
        .filter((unit) => unit !== "unit")
    )
  );
}

export async function loadGlobalUnits() {
  const { payload } = await readGlobalSettings();
  const stored = dedupeUnits(payload?.units);
  // 未設定過 → 用預設。**唔會順手寫入**（讀取唔應該有副作用）。
  return stored.length > 0 ? stored : getDefaultGlobalUnits();
}

export async function saveGlobalUnits(units: string[]) {
  await patchGlobalSettings({ units: dedupeUnits(units) });
}

export async function appendGlobalUnits(units: string[]) {
  const current = await loadGlobalUnits();
  await saveGlobalUnits([...current, ...units]);
}

/**
 * 讀「支付方式主檔」（admin 統一設置）。
 * 未設定過 ⇒ 回內建預設；已設定過（即使係空清單）⇒ 一律以資料庫為準。
 */
export async function loadGlobalPaymentMethods(): Promise<PaymentMethodDef[]> {
  const { payload } = await readGlobalSettings();
  return normalizePaymentMethods(payload?.paymentMethods);
}

/**
 * 存「支付方式主檔」。**只覆蓋 `paymentMethods` 一個 key**，全域單位清單不受影響。
 */
export async function saveGlobalPaymentMethods(list: PaymentMethodDef[]): Promise<PaymentMethodDef[]> {
  const normalized = normalizePaymentMethods(Array.isArray(list) ? list : []);
  await patchGlobalSettings({ paymentMethods: normalized });
  return normalized;
}

export async function loadShopAccountSettings(userId: string): Promise<ShopAccountSettings> {
  const { data: merchant, error } = await supabase
    .from("merchants")
    .select("address")
    .eq("user_id", userId)
    .eq("name", getSettingsMerchantName(userId))
    .maybeSingle();

  if (error) {
    throw error;
  }

  const defaults = getDefaultAccountSettings();
  const settingsPayload = decodePayload<{ customUnits?: string[]; accountStatus?: string }>(SETTINGS_PREFIX, merchant?.address);

  return {
    customUnits: Array.isArray(settingsPayload?.customUnits)
      ? Array.from(
          new Set(
            settingsPayload.customUnits.map((unit) => normalizeUnitValue(unit)).filter((unit) => unit !== "unit")
          )
        )
      : defaults.customUnits,
    accountStatus: normalizeAccountStatus(settingsPayload?.accountStatus),
  };
}

async function saveShopAccountSettings(userId: string, settings: ShopAccountSettings) {
  const { error } = await supabase
    .from("merchants")
    .upsert(
      {
        user_id: userId,
        name: getSettingsMerchantName(userId),
        address: encodePayload(SETTINGS_PREFIX, {
          customUnits: settings.customUnits,
          accountStatus: settings.accountStatus,
        }),
      },
      { onConflict: "user_id,name" }
    );

  if (error) {
    throw error;
  }
}

export async function loadShopPresets(userId: string): Promise<ShopPresets> {
  const { data: merchants, error } = await supabase
    .from("merchants")
    .select("name, address")
    .eq("user_id", userId)
    .order("name");

  if (error) {
    throw error;
  }

  const settings = getDefaultAccountSettings();
  const globalUnits = await loadGlobalUnits();
  const suppliers: SupplierPreset[] = [];
  const hiddenSuppliers: string[] = [];

  (merchants ?? []).forEach((merchant) => {
    if (merchant.name === getSettingsMerchantName(userId)) {
      const settingsPayload = decodePayload<{ customUnits?: string[]; accountStatus?: string }>(SETTINGS_PREFIX, merchant.address);
      if (Array.isArray(settingsPayload?.customUnits)) {
        settings.customUnits = settingsPayload.customUnits
          .map((unit) => normalizeUnitValue(unit))
          .filter((unit) => unit !== "unit");
      }
      return;
    }

    if (isReservedMerchantName(merchant.name)) {
      return;
    }

    const presetPayload = decodePayload<{ products?: ProductPreset[]; hidden?: boolean }>(PRESET_PREFIX, merchant.address);
    if (presetPayload?.hidden) {
      hiddenSuppliers.push(merchant.name);
      return;
    }
    suppliers.push({
      name: merchant.name,
      products: Array.isArray(presetPayload?.products) ? presetPayload!.products : [],
    });
  });

  return {
    suppliers,
    customUnits: Array.from(new Set(globalUnits)).filter(Boolean),
    hiddenSuppliers,
  };
}

export async function saveShopCustomUnits(userId: string, customUnits: string[]) {
  await saveGlobalUnits(customUnits);
}

export async function saveShopAccountStatus(userId: string, accountStatus: AccountStatus) {
  const current = await loadShopAccountSettings(userId);
  await saveShopAccountSettings(userId, { ...current, accountStatus });
}

export async function loadAllAccountStatuses(userIds: string[]) {
  if (userIds.length === 0) {
    return {};
  }

  const settingsNames = userIds.map((userId) => getSettingsMerchantName(userId));
  const { data, error } = await supabase
    .from("merchants")
    .select("name, address")
    .in("name", settingsNames);

  if (error) {
    throw error;
  }

  const statuses: Record<string, AccountStatus> = {};
  userIds.forEach((id) => {
    statuses[id] = "active";
  });

  (data ?? []).forEach((merchant) => {
    const userId = merchant.name.replace(SETTINGS_MERCHANT_PREFIX, "");
    const payload = decodePayload<{ accountStatus?: string }>(SETTINGS_PREFIX, merchant.address);
    statuses[userId] = normalizeAccountStatus(payload?.accountStatus);
  });

  return statuses;
}

export async function saveSupplierPreset(userId: string, supplier: SupplierPreset) {
  const { error } = await supabase
    .from("merchants")
    .upsert(
      {
        user_id: userId,
        name: supplier.name.trim(),
        address: encodePayload(PRESET_PREFIX, { products: supplier.products }),
      },
      { onConflict: "user_id,name" }
    );

  if (error) {
    throw error;
  }
}

export async function deleteSupplierPreset(userId: string, supplierName: string) {
  const { error } = await supabase
    .from("merchants")
    .update({ address: encodePayload(PRESET_PREFIX, { products: [], hidden: true }) })
    .eq("user_id", userId)
    .eq("name", supplierName);

  if (error) {
    throw error;
  }
}

export async function removeGlobalUnit(unitToDelete: string) {
  const nextUnits = (await loadGlobalUnits()).filter((unit) => unit !== unitToDelete);
  await saveGlobalUnits(nextUnits);
}
