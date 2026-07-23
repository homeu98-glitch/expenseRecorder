# 澳門會員通官網頁面（/homepage）

本頁面是為 `澳門會員通` 製作的公開官網，不需要登入即可瀏覽：

- URL：`/homepage`

## 部署方式

本 repo 部署到 Vercel 後，會自動提供：

```text
https://<your-domain>/homepage
```

## 素材檔案位置

官網使用的 app 截圖與 QR code 都放在 `public/homepage/`：

```text
public/homepage/screens/
  macau-ledger-favorites.png
  macau-ledger-all-shops.png
  macau-ledger-ordering-list.png
  macau-ledger-ordering-menu.png
  macau-ledger-shop-page.png
  macau-ledger-coupons.png

public/homepage/wechat-qr.svg
```

### 替換微信群 QR code

目前 `wechat-qr.svg` 是佔位圖。要替換成真實微信群 QR code：

1. 把你的 QR code 圖片（建議 `png`）放到：
   - `public/homepage/wechat-qr.png`
2. 把 `app/homepage/page.tsx` 裡 `src="/homepage/wechat-qr.svg"` 改成：
   - `src="/homepage/wechat-qr.png"`

## 公開訪問設定

因為系統原本需要登入才可用，我們做了兩個調整讓 `/homepage` 公開：

1. `components/AuthGuard.tsx` 允許 `/homepage` 在未登入狀態瀏覽
2. `components/NavigationWrapper.tsx` 在 `/homepage` 隱藏系統內部導航

