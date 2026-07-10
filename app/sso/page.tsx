import { Suspense } from "react";
import SsoClient from "./SsoClient";

export const dynamic = "force-dynamic";

export default function SsoPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center text-gray-400">載入中...</div>}>
      <SsoClient />
    </Suspense>
  );
}
