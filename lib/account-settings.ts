"use client";

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
const PRESET_PREFIX = "__preset_json__:";
const SETTINGS_PREFIX = "__settings_json__:";

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

function normalizeAccountStatus(value: unknown): AccountStatus {
  return value === "suspended" || value === "deleted" ? value : "active";
}

export function isReservedMerchantName(name: string) {
  return name.startsWith(SETTINGS_MERCHANT_PREFIX);
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
    customUnits: Array.from(new Set(settings.customUnits)).filter(Boolean),
    hiddenSuppliers,
  };
}

export async function saveShopCustomUnits(userId: string, customUnits: string[]) {
  const current = await loadShopAccountSettings(userId);
  const normalized = Array.from(
    new Set(customUnits.map((unit) => normalizeUnitValue(unit)).filter((unit) => unit !== "unit"))
  );
  await saveShopAccountSettings(userId, { ...current, customUnits: normalized });
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
