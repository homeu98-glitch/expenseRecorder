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

export async function loadShopPresets(userId: string): Promise<ShopPresets> {
  const { data: merchants, error } = await supabase
    .from("merchants")
    .select("name, address")
    .eq("user_id", userId)
    .order("name");

  if (error) {
    throw error;
  }

  let customUnits = ["kg", "lb"];
  const suppliers: SupplierPreset[] = [];

  (merchants ?? []).forEach((merchant) => {
    if (merchant.name === getSettingsMerchantName(userId)) {
      const settingsPayload = decodePayload<{ customUnits?: string[] }>(SETTINGS_PREFIX, merchant.address);
      if (Array.isArray(settingsPayload?.customUnits)) {
        customUnits = settingsPayload.customUnits
          .map((unit) => normalizeUnitValue(unit))
          .filter((unit) => unit !== "unit");
      }
      return;
    }

    if (isReservedMerchantName(merchant.name)) {
      return;
    }

    const presetPayload = decodePayload<{ products?: ProductPreset[] }>(PRESET_PREFIX, merchant.address);
    suppliers.push({
      name: merchant.name,
      products: Array.isArray(presetPayload?.products) ? presetPayload!.products : [],
    });
  });

  return {
    suppliers,
    customUnits: Array.from(new Set(customUnits)).filter(Boolean),
  };
}

export async function saveShopCustomUnits(userId: string, customUnits: string[]) {
  const normalized = Array.from(
    new Set(customUnits.map((unit) => normalizeUnitValue(unit)).filter((unit) => unit !== "unit"))
  );

  const { error } = await supabase
    .from("merchants")
    .upsert(
      {
        user_id: userId,
        name: getSettingsMerchantName(userId),
        address: encodePayload(SETTINGS_PREFIX, { customUnits: normalized }),
      },
      { onConflict: "user_id,name" }
    );

  if (error) {
    throw error;
  }
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
    .update({ address: null })
    .eq("user_id", userId)
    .eq("name", supplierName);

  if (error) {
    throw error;
  }
}
