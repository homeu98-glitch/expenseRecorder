"use client";

export function getShopUser() {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem("shop_user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem("shop_user");
  window.location.href = "/login";
}
