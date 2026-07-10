import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { readExpenseRecorderSessionCookie } from "@/lib/sso";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookieMatch = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("expense_session="));

  const rawCookieValue = cookieMatch ? decodeURIComponent(cookieMatch.split("=").slice(1).join("=")) : null;
  const session = readExpenseRecorderSessionCookie(rawCookieValue);
  const userId = session?.userId ? String(session.userId) : "";

  if (!userId) {
    return NextResponse.json({ user: null });
  }

  const { data, error } = await supabase.from("shop_users").select("*").eq("id", userId).maybeSingle();
  if (error || !data) {
    return NextResponse.json({ user: null });
  }

  const role = session?.role ? String(session.role) : "user";
  return NextResponse.json({ user: { ...data, role } });
}
