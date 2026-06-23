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
};

function getStorageKey(userId: string) {
  return `shop_presets_${userId}`;
}

export function readShopPresets(userId: string): ShopPresets {
  if (typeof window === "undefined") {
    return { suppliers: [] };
  }

  try {
    const stored = window.localStorage.getItem(getStorageKey(userId));
    if (!stored) {
      return { suppliers: [] };
    }
    const parsed = JSON.parse(stored) as ShopPresets;
    return {
      suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : [],
    };
  } catch {
    return { suppliers: [] };
  }
}

export function saveShopPresets(userId: string, presets: ShopPresets) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(presets));
}
