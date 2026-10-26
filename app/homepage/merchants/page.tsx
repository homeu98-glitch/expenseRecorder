import { MerchantsView } from "@/components/homepage/MerchantsView";
import { getMerchantFeed } from "@/lib/merchants-live";

// 名單每 10 分鐘同步一次
export const revalidate = 600;

export default async function MerchantsPage() {
  const { merchants, total } = await getMerchantFeed();
  return <MerchantsView merchants={merchants} total={total} />;
}
