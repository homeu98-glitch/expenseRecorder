"use client";

const SHOP_USER_STORAGE_KEY = "shop_user";
const SHOP_USER_COOKIE_KEY = "shop_user_session";

function parseSession(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name: string) {
  const cookie = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.split("=").slice(1).join("=")) : null;
}

export function getShopUser() {
  if (typeof window === "undefined") return null;

  const localUser = parseSession(localStorage.getItem(SHOP_USER_STORAGE_KEY));
  if (localUser) {
    return localUser;
  }

  const cookieUser = parseSession(getCookie(SHOP_USER_COOKIE_KEY));
  if (cookieUser) {
    localStorage.setItem(SHOP_USER_STORAGE_KEY, JSON.stringify(cookieUser));
    return cookieUser;
  }

  return null;
}

export function setShopUserSession(user: unknown) {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(user);
  localStorage.setItem(SHOP_USER_STORAGE_KEY, serialized);
  setCookie(SHOP_USER_COOKIE_KEY, serialized, 30);
}

export function logout() {
  localStorage.removeItem(SHOP_USER_STORAGE_KEY);
  document.cookie = `${SHOP_USER_COOKIE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  window.location.href = "/login";
}
