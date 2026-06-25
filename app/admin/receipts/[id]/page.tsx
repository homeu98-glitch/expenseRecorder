"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";
import { getShopUser } from "@/lib/auth";
import { AdminReceiptInspector } from "@/components/AdminReceiptInspector";

export default function AdminReceiptDetailPage() {
  const params = useParams<{ id?: string | string[] }>();
  const routeId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [user] = useState<{ role?: string } | null>(() => getShopUser());

  if (user?.role !== "admin") {
    return null;
  }

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center space-x-4">
        <Link href="/admin" className="text-gray-500 hover:text-blue-600 transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">收據明細</h1>
          <p className="text-sm text-gray-500">管理員唯讀檢視</p>
        </div>
      </header>

      {routeId && <AdminReceiptInspector receiptId={routeId} />}
    </div>
  );
}
