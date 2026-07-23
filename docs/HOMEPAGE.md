# 澳門會員通官網頁面（/homepage）

本頁面是為 `澳門會員通` 製作的公開官網，不需要登入即可瀏覽：

- URL：`/homepage`
- 商家主入口：`https://macau-ledger.vercel.app/merchant/login`

## 當前頁面內容

首頁目前包含：

- 更完整的品牌 Hero 區塊
- 3 條主 slogan
- app 截圖 slider
- Apple 風格功能展示區
- 教學影片嵌入區（YouTube iframe）
- 微信群 QR code 聯絡區
- footer 與使用教學連結

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
  macau-ledger-merchant-home.png
  macau-ledger-all-shops.png
  macau-ledger-ordering-list.png
  macau-ledger-ordering-menu.png
  macau-ledger-shop-page.png
  macau-ledger-coupons.png

public/homepage/wechat-qr.jpg
public/homepage/wechat-qr.svg（舊佔位圖，可保留或刪除）
```

### 替換微信群 QR code

目前網站會使用 `wechat-qr.jpg`。要替換成你最新的微信群 QR code：

1. 直接替換檔案：
   - `public/homepage/wechat-qr.jpg`
2. 如你想改用 `png`，把檔案放到：
   - `public/homepage/wechat-qr.png`
   然後把 `app/homepage/page.tsx` 的圖片路徑改為：
   - `src="/homepage/wechat-qr.png"`

## 公開訪問設定

因為系統原本需要登入才可用，我們做了兩個調整讓 `/homepage` 公開：

1. `components/AuthGuard.tsx` 允許 `/homepage` 在未登入狀態瀏覽
2. `components/NavigationWrapper.tsx` 在 `/homepage` 隱藏系統內部導航

## 教學影片來源

目前嵌入的是以下幾條影片：

- `https://www.youtube.com/watch?v=U5vdjXtkJjQ`
- `https://www.youtube.com/watch?v=pQkeOyK08Xk`
- `https://www.youtube.com/watch?v=Ca4iU4qFHmE`
- `https://www.youtube.com/watch?v=lScWRkgfWII`

如需增減片段，只需修改 `app/homepage/page.tsx` 內的 `videos` 陣列。

## 手機畫面顯示

首頁的手機 mockup 已改成較貼近真機的比例，截圖會以完整顯示為主，不再裁切。

如你之後想微調尺寸，主要可改：

- `PhoneFrame` 的外層寬度
- `aspect-[9/19.5]`
- `Image` 的 `object-contain` / padding
