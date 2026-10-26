import Link from "next/link";
import { MERCHANT_LOGIN_URL, PLATFORM_URL } from "@/lib/site-config";
import { MERCHANT_TOTAL } from "@/lib/ledger-merchants";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="s-footer">
      <div className="s-wrap">
        <div className="s-foot-top">
          <div className="s-foot-brand">
            <Link className="s-brand" href="/homepage">
              <span className="s-brand-mark">澳</span>
              <span>
                <span className="s-brand-t">澳門會員通</span>
                <span className="s-brand-s">MACAU MEMBERSHIP</span>
              </span>
            </Link>
            <p className="s-foot-desc">
              澳門本地商戶數碼化平台。收銀系統負責前線收銀與後廚出餐，
              澳門會員通線上負責會員儲值、優惠券與線上訂單。免佣金、不抽成。
            </p>
          </div>

          <div className="s-foot-col">
            <h4>產品</h4>
            <Link href="/homepage/pos">收銀系統</Link>
            <Link href="/homepage/ledger">澳門會員通線上</Link>
            <Link href="/homepage/merchants">合作商戶</Link>
          </div>

          <div className="s-foot-col">
            <h4>了解</h4>
            <Link href="/homepage/pricing">收費</Link>
            <Link href="/homepage/pricing#faq">常見問題</Link>
            <Link href="/homepage/contact">預約示範</Link>
          </div>

          <div className="s-foot-col">
            <h4>開始使用</h4>
            <a href={MERCHANT_LOGIN_URL}>商家免費入駐</a>
            <a href={PLATFORM_URL}>會員通 App</a>
            <a href={PLATFORM_URL}>線上點餐</a>
          </div>
        </div>

        <div className="s-foot-bottom">
          <span>© {year} 澳門會員通 · Macau Membership. All rights reserved.</span>
          <span>
            已連接 {MERCHANT_TOTAL} 家澳門商戶 · 本平台不經手現金，只提供訂單、會員與對帳記錄
          </span>
        </div>
      </div>
    </footer>
  );
}
