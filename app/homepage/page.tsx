import { HomeView } from "@/components/homepage/HomeView";
import { getMerchantFeed } from "@/lib/merchants-live";

// 商戶名單每 10 分鐘重新抓一次，ledger 有新商戶就會自動更新
export const revalidate = 600;

export default async function Homepage() {
  const { merchants, total, live } = await getMerchantFeed();
  return <HomeView merchants={merchants} total={total} live={live} />;
}
