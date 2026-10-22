# Ledger → expenseRecorder：**買貨（庫存）報表 API** 契約 v1

> 📄 **要交畀 Ledger 嘅係呢份孖生文檔**：
> `macauPosSystem/docs/integration/ledger-purchase-report-api.md`
> （乾淨版，已抽走內部討論／行號／POS 教訓，可直接轉貼）
> **本檔案係內部實作規格**（保留咗所有陷阱同出處，方便日後維護）。

狀態：**v1 定稿**（J 2026-10-11 拍板；`shopId` = `merchants.id` 雙方已確認）
對方（呼叫方）：Macau Ledger（會員通）**伺服器**
服務方（實作方）：`expenseRecorder` repo（Supabase 專案 `fjvfvpedklhdenavbcjg`）
契約風格：沿用 `macauPosSystem` 嘅 `pos-offline-report` v1（HMAC 簽名／區間參數／降級閥），
但**時間範圍改成無上限**（J 2026-10-11 拍板）⇒ 明細層改用「張數上限 + 分層」代替「日數 clamp」。

---

## 0. 為何呢條 route 放喺 expenseRecorder 而唔係 POS

買貨（庫存入貨）資料嘅唯一真源喺 expenseRecorder 嘅 Supabase：

| 資料 | 表 | 意義 |
| --- | --- | --- |
| 買貨單據 | `receipts`（+ `receipt_items`） | 邊間供應商、幾錢、幾多件、幾時 |
| 品項 | `receipt_items` | 逐件品名／數量／單位／單價 |

而 **庫存現況**（現存幾多、 reorder level、加權平均成本）喺另一個專案（macau-pos 嘅 `inv_products`），
**唔喺呢條 route 範圍** ⇒ 第二階段先做，見 §9。

expenseRecorder 已經有 Ledger SSO（`lib/sso.ts` ＋ `app/api/auth/sso-login`，
JWT HS256 ＋ `jti` 防重放），登入時會 upsert `shop_users` 並寫入
`external_shop_id = claims.shop.shopId`。**所以唔使猜 8 位 `account`、唔使維護對照表** ——
直接用 Ledger 嘅 `shopId` 就落到 `shop_users.id`。

---

## 1. Route

```
GET https://<expense-recorder 域名>/api/integration/ledger/purchase-report
    ?shopId=<Ledger shopId>&from=YYYY-MM-DD&to=YYYY-MM-DD
```

### 1.1 請求標頭

| 標頭 | 必填 | 說明 |
| --- | --- | --- |
| `X-Ledger-Timestamp` | ✅ | Unix 秒（**毫秒亦接受**，相容處理） |
| `X-Ledger-Signature` | ✅ | `HMAC-SHA256(secret, ts + "." + "GET" + "." + pathWithQuery)` 嘅小寫 hex |

`pathWithQuery` **必須係接收端收到嘅原字串**（pathname + `?` + query，順序原樣）。
簽名覆蓋 query ⇒ 換 `shopId`／改區間一定要重簽，唔可以快取。

### 1.2 參數

| 參數 | 必填 | 規則 |
| --- | --- | --- |
| `shopId` | ✅ | Ledger 嘅 `shopId`，對應 `shop_users.external_shop_id`（字串，唔限 uuid 格式） |
| `from` | ✅ | `YYYY-MM-DD`（inclusive） |
| `to` | ✅ | `YYYY-MM-DD`（inclusive） |

時間語意**同 offline report 一樣**：查「今日」＝ `from = to = 今日`（即時查，唔做日終快照）；
查「7 日」＝ `from = 今日-6`、`to = 今日`。
查「本月」＝ `from = 本月1日`、`to = 今日`；查「本年」＝ `from = 1月1日`、`to = 今日`。

### 1.3 🔴 時間範圍**無上限**（2026-10-11 J 拍板）

`from`／`to` **唔設 90 日（或任何）上限**。可以查全年、三年、全歷史。

⚠️ 咁樣 payload 會爆，所以要**分層**（見 §4）：**聚合層永不截斷，明細層亦都唔截斷**
（2026-10-22 J 拍板解除 500 張／1000 款上限；實查全庫 1,189 張、最大店 858 張，payload ~260KB 完全安全）。
詳細規則 → §4。

---

## 2. 驗證順序（服务端逐級，順序**唔可以**改）

1. `LEDGER_PURCHASE_REPORT_HMAC_SECRET` 未設定 ⇒ **500 `server_misconfigured`**（fail-closed，絕不放行）
2. 驗簽（5 分鐘時間窗）⇒ 失敗 **401 `unauthorized`**（回應不含細節）
3. 參數格式 ⇒ **400** `bad_shop_id` / `bad_range`
4. 限流（每 `shopId` 每分鐘 ≤ 600 次，純防撞牆上限）⇒ **429** `too_many_requests`（見 §2.1）
5. 解析 `shopId` → `shop_users.id` ⇒ 搵唔到 **404** `shop_not_found`
6. 查 DB ⇒ 失敗 **503** `upstream_unavailable`
7. 回傳值嚴格驗值 ⇒ 唔過 **503** `upstream_unavailable`

🔴 **唔可以渲染假零**：任何一步唔過都係 5xx，令 Ledger 顯示「暫時無法取得」降級一行，
**唔可以**送一張 0 元／0 件嘅卡（假數比冇數危險）。

### 2.1 🔴 呼叫方式約定：On-demand pull，**唔准 polling**

呢條 API 係**「一拉就即答」嘅查詢端點**，唔係推送、唔係訂閱、唔係定時餵數。

| ✅ 應該 | ❌ 唔應該 |
| --- | --- |
| 使用者撳「查詢」／切換日期區間 → 撳一次 | 頁面開著就每 30 秒自動拉 |
| 由 Ledger 伺服器喺**收到使用者動作**時觸發 | 背景 job 定時全店巡邏 |
| 同一組 `(shopId, from, to)` 結果喺 Ledger 端**快取幾分鐘**再重用 | 為咗「保持新鮮」而重複拉同一組參數 |

**點解要寫清**：呢條 route 每個請求都係一次真實 DB 查詢。定時 polling 會令
(a) DB 負累隨住門店數線性增長　(b) 回應時間拖慢　(c) 冇任何新資料時白做功。

**限流嘅真正目的**：`600 次/分` 係**防撞牆嘅保險**，唔係「建議你每分鐘可以拉幾多次」。
即係話「如果你寫錯咗（例如意外陷入一個每 3 秒拉一次嘅 loop），我會喺你害到 DB 之前
叫停你並回 429」—— 正常 on-demand 用法（一位店主一日撳幾十次）**永遠唔會**撞到。

- 正常用量：店主撳一次查詢 = 1 次請求
- 撞 429 嘅意思：**你嘅用法有 bug**（唔係「我哋限你用」，係「你中咗 loop」）

---

## 3. 回應格式

### 3.1 成功（200）

```jsonc
{
  "v": 1,
  "shopId": "shop_abc123",
  // ⚠️ 已無 clamped 欄（時間範圍無上限，冇嘢可截）。保留 from/to echo 方便 Ledger 快取 key。
  "range": { "from": "2024-01-01", "to": "2026-10-11" },
  "generatedAt": "2026-10-11T09:20:31.000Z",

  // ── KPI（區間內）──
  // 🔴 幣別會混用（§7）⇒ **唔做跨幣加總**，KPI 由 `byCurrency` 逐個幣別分開。
  "kpi": {
    "currencies": ["HKD", "MOP"],       // 區間內出現過嘅幣別（已排序）
    "byCurrency": [
      { "currency": "HKD", "receiptCount": 9,  "totalAmount": 24850.00, "avgPerReceipt": 2761.11 },
      { "currency": "MOP", "receiptCount": 3,  "totalAmount": 10000.00, "avgPerReceipt": 3333.33 }
    ],
    "receiptCount": 12,          // 單據張數（跨幣，可以加）
    "totalAmount": null,         // ⚠️ 恆 null：跨幣冇意義，唔會俾一個誤導嘅數字
    "itemLineCount": 47,         // 品項行數（唔等於件数，見 §7）
    "supplierCount": 5,
    "avgPerReceiptDay": 4978.57  // ⚠️ 跨幣無意義 ⇒ 恆 null（同 byCurrency 逐幣計）
  },

  // ── 逐日趨勢（由舊至新，按 receipt_date；每個 (日期, 幣別) 一條）──
  "daily": [
    { "date": "2026-10-05", "currency": "HKD", "receiptCount": 2, "totalAmount": 5120.00 },
    { "date": "2026-10-05", "currency": "MOP", "receiptCount": 1, "totalAmount":  880.50 },
    { "date": "2026-10-07", "currency": "HKD", "receiptCount": 1, "totalAmount": 1200.00 }
  ],

  // ── 逐張單據（新至舊）──
  "receipts": [
    {
      "receiptId": "b1f0…",
      "receiptNumber": "INV-2026-0042",   // 可能為 null（OCR 抽唔到）
      "receiptDate": "2026-10-11",        // ⚠️ date 型，無時刻
      "recordedAt": "2026-10-11T08:03:11Z",// ⚠️ 錄入時間，唔一定等於單據時間
      "receiptType": "stock_in",          // stock_in | expense | other
      "category": null,                   // expense 類單嘅分類（支出類）
      "supplierName": "澳門糧記",
      "supplierId": "c2a9…",              // 可能 null
      "currency": "HKD",
      "totalAmount": 1280.00,
      "paymentMethod": "bank_transfer",   // 已正規化，見 §7
      "paymentStatus": "paid",            // paid | unpaid
      "inputMethod": "photo",             // photo | manual | ocr
      "items": [
        {
          "lineId": "d3f1…",
          "name": "泰國香米",
          "quantity": 25,
          "unit": "KG",                   // 已正規化，缺失時為 null
          "unitPrice": 32.00,
          "totalPrice": 800.00,
          "productKey": "thai-jasmine-rice",
          "isStockItem": true
        }
      ]
    }
  ],
  "receiptsTotal": 12,      // 區間內單據總數（2026-10-22 起 receipts[] 唔再截斷，= receipts.length）

  // ── 品項聚合（合併鍵＝品名+單位+幣別，見 §7）──
  "items": [
    {
      "name": "泰國香米",
      "unit": "KG",
      "currency": "HKD",
      "totalQuantity": 25,
      "totalAmount": 800.00,
      "avgUnitPrice": 32.00,
      "lineCount": 1,
      "lastPurchaseDate": "2026-10-11",
      "changePercent": 4.2,        // 相對上一次買貴/便宜幾多 %；首次 = null
      "direction": "up"             // up | down | same | new
    }
  ],
  "itemsTotal": 31,

  // ── 供應商（每個 (供應商, 幣別) 一條）──
  "suppliers": [
    { "name": "澳門糧記", "supplierId": "c2a9…", "currency": "HKD", "receiptCount": 4, "totalAmount": 9800.00 }
  ],

  // ── 付款方式分布（每個 (付款方式, 幣別) 一條）──
  "paymentBreakdown": [
    { "method": "bank_transfer", "label": "銀行轉賬", "currency": "HKD", "receiptCount": 7, "totalAmount": 20100.00 }
  ],

  "flags": {
    "stockInOnly": true,      // 本版恆 true：只回買貨單（receipt_type='stock_in'），見 §8
    "multiCurrency": true,    // 本版恆 true：幣別會混用，聚合全部按幣別分開，見 §7
    "receiptsTruncated": false,  // 🔴 2026-10-22 起恆 false：明細層已解除截斷上限（§4.3）
    "itemsTruncated": false      // 🔴 2026-10-22 起恆 false（key 保留維持契約形狀）
  }
}
```

⚠️ **聚合 vs 明細嘅分別**：
`kpi` / `daily` / `suppliers` / `paymentBreakdown` / `items` **永遠覆蓋完整查詢區間，永遠唔截斷** ——
所以「今年買咗幾多錢、邊間供應商最貴、邊款料最貴」呢啲問題，**查三年都係準嘅**。
`receipts[]`（逐張單據明細）**2026-10-22 起同樣唔截斷**（舊版 500 張上限已解除）⇒ 見 §4。

### 3.2 失敗

```jsonc
{ "error": "unauthorized" }   // 401
{ "error": "bad_range" }      // 400
{ "error": "shop_not_found" } // 404
{ "error": "too_many_requests" } // 429
{ "error": "upstream_unavailable" } // 503
{ "error": "server_misconfigured" }  // 500
```

### 3.3 標頭

| 標頭 | 值 |
| --- | --- |
| `cache-control` | `no-store` |
| `x-expense-purchase-report-v` | `1` |
| `x-expense-purchase-report-path` | `/api/integration/ledger/purchase-report` |
| `x-expense-purchase-report-caps` | 逗號分隔能力清單，見 §3.4 |

### 3.4 降級閥 `caps`（必守）

`v` **維持 1**（加欄位係 additive，唔可以因為加 key 就升 `v` —— 否則 Ledger 既有可能嘅
`v === 1` 檢查會整包丟棄）。能力探測用 `caps` 標頭。

**四組 key 要麼全有、要麼全無**：

| 組 | keys |
| --- | --- |
| 基本 | `kpi` / `daily` |
| 明細 | `receipts` / `receiptsTotal` |
| 品項 | `items` / `itemsTotal` |
| 供應商＋付款 | `suppliers` / `paymentBreakdown` |

· 全缺 ＝ DB 側未就緒 ⇒ 優雅降級（唔出該組 key、caps 亦唔宣告）⇒ Ledger 舊卡零影響
· **部分缺 ＝ SQL 有 bug ⇒ 照樣 503**（失敗得響）

⚠️ **唔可以出空陣列**代替缺席 —— 空陣列 = 假零。

---

## 4. 範圍與截斷：分層策略（時間無上限）

### 4.1 時間範圍
`from`／`to` **無任何上限**（唔設 90 日）。查全歷史係合法嘅。

### 4.2 兩層：聚合層 vs 明細層

| 層 | keys | 覆蓋範圍 | 會否截斷 |
| --- | --- | --- | --- |
| **聚合層** | `kpi` / `daily` / `suppliers` / `paymentBreakdown` / `items` | **完整 `from`→`to`，100% 準** | **永不截斷** |
| **明細層** | `receipts[]`（含每張 `items[]`） | **完整 `from`→`to`** | **永不截斷**（2026-10-22 起） |

⇒ 「查三年買咗幾多錢／邊間供應商最貴／邊款料最貴／逐張單據」**永遠準確**。

### 4.3 明細層上限（🔴 2026-10-22 已解除）

| 項目 | 舊上限（已廢） | 而家行為 |
| --- | --- | --- |
| `receipts[]` | ~~500 張~~ | **唔截斷**，回傳區間內全部；`flags.receiptsTruncated` 恆 `false` |
| 單張 `items[]` | 一向唔設上限 | 不變 |
| `items[]`（品項聚合） | ~~1000 款~~ | **唔截斷**，回傳區間內全部；`flags.itemsTruncated` 恆 `false` |

解除前實查（2026-10-22）：全庫 1,189 張、最大店 858 張 ⇒ 舊上限下查全歷史必定截斷。
解除後 payload ~260KB，安全。SQL：`supabase_purchase_report_uncap_v1.sql`。

⚠️ 若日後單店超過 ~5,000 張／區間，要先做分頁（§4.4）再放量，**唔好靜雞雞加返截斷**。

🔴 **（歷史教訓，仍然有效）截斷嘅唯一權威只可以喺 DB 端**。route **只可以照抄** `flags.*Truncated`，
**唔可以自己再截一次**（2026-09-25 POS 側曾經犯過：route 先截 → DB 收到嘅已經喺範圍內 → `clamped` 對唔上 → 全部 503）。

### 4.4 分頁（v1 **唔提供**）

2026-10-11 原本拍板「500 張夠，唔夠就分頁」；**2026-10-22 J 改為直接解除上限**（體量實查過，見 §4.3）
⇒ **v1 仍然唔加 `offset`／`cursor`**（少一樣就少一個錯嘅機會）。

如果將來真係要（觸發條件：單店／單區間 > ~5,000 張）：

- 會加**游標分頁**（`cursor` = 最後一張嘅 `(receipt_date, receipt_id)`），**唔會**用 `offset`
  （offset 喺新單插入時會漏單／重單）
- 🔴 分頁**只影響 `receipts[]` 明細層**。`kpi` / `daily` / `suppliers` / `paymentBreakdown` / `items`
  **每次都係完整區間**（唔會因為分頁而變成「只得一頁嘅統計」）
- `receiptsTotal` **每頁都係真實總數**（唔係「截至呢頁」）

### 4.5 Ledger 拿到 `truncated` flag 點做

2026-10-22 起兩個 flag **恆 false**（key 保留係為咗契約形狀穩定）。Ledger 照舊讀：

1. `flags.receiptsTruncated === false` ⇒ `receipts.length === receiptsTotal`，可以放心顯示「共 X 張」
2. **唔可以**顯示「總數」當成「已列出嘅張數」——兩個數唔一樣（`receiptsTotal` vs `receipts.length`）
3. 分析功能（KPI／圖表／排行）**照用聚合層**

---

## 5. 身份：點解用 `shopId`

| | POS 銷售單 | 買貨單 |
| --- | --- | --- |
| 參數 | `storeId`（uuid） | `shopId`（字串） |
| 落到 | `pos_orders.store_id` | `shop_users.external_shop_id` → `shop_users.id` → `receipts.user_id` |
| 點樣建立 | 開店時產生 | **Ledger SSO 首次登入自動 upsert** |

若該 `shopId` 未曾經登入過（`shop_users` 冇 `external_shop_id` = 該值）⇒ **404 `shop_not_found`**，
**唔可以**回空資料。

---

## 6. 🔴 三個已知死穴（照抄 POS 側教訓）

### 6.1 `receipt_date` 冇時刻
`receipts.receipt_date` 係 **DATE** 型。單据「發生喺幾點」**問唔到**。
`created_at`（timestamptz）係**錄入時間**，補登舊單可以差幾日。
⇒ 契約裏面 `receiptDate` 同 `recordedAt` **分開兩個欄**，Ledger **唔准**用 `recordedAt` 做日界分組。

### 6.2 `payment_method` / `payment_status` 藏喺 `raw_ocr_data`
兩個欄位唔喺 `receipts` 表上，要由 `raw_ocr_data` JSONB 抽。舊資料可能存中文（「月結」、「銀行轉賬」）。
⇒ 服務端一律經正規化函數（已存在於 `lib/payment-labels.ts`），**對外只回正規化 key**：

| 正規化 key | 顯示 |
| --- | --- |
| `cash` | 現金 |
| `bank_transfer` | 銀行轉賬 |
| `fps` | 轉數快 |
| `cheque` | 支票 |
| `monthly` | 月結 |
| `pay_later` | 稍後付款 |
| `on_delivery` | 交貨付款 |
| `unknown` | 未知 |

`label` 一併回，Ledger 可以直接顯示（但**唔准**用 label 做邏輯判斷）。
`paymentStatus`：`paid` / `unpaid`。

🔴 `raw_ocr_data` **絕對唔可以原樣回**（含店員手打文字、相片路徑、其他私隱）。只白名單抽上表幾個 key。

### 6.3 `receipt_items.quantity_unit` 可能唔存在
該欄係事後人手 `ALTER TABLE` 加嘅，舊環境會回 Postgres `42703`（column does not exist）。
⇒ 服務端偵測到就**降級重試**（唔 SELECT 該欄，`unit` 回 `null`），並喺 caps 標頭宣告
`no-unit`。**唔可以**因為一間舊店就 500。

---

## 7. 數字口徑（Ledger 顯示時要對齊）

| 名 | 口徑 |
| --- | --- |
| `totalAmount` | `receipts.total_amount` 原值，**唔好重新加總 `items[].totalPrice`**（OCR 誤差會對唔上；單据金額係權威） |
| `totalAmount` 分組 | 用 `receipt_date`（單据日期）做 key，**唔用 `created_at`** |
| `items[].totalQuantity` | 同一 `name + unit + currency` 合併後嘅**數量總和**；單位唔同（KG vs 包）**唔合併** |
| `avgUnitPrice` | `totalAmount / totalQuantity`，分母為 0 ⇒ `null` |
| `changePercent` / `direction` | 同 `lib/reporting.ts` `buildItemRows()`：同品名**上一個有單嘅日期**比較；無前值 ⇒ `direction="new"`、`changePercent=null` |

### 7.1 🔴 幣別會混用（2026-10-11 J 拍板：拆開兩張卡）

`receipts.currency` 預設 `HKD`，但**同一間店可能同一區間內有 HKD 亦有 MOP**。

#### 7.1.0 🔴 幣別來源修正（2026-10-14，必讀）

**病徵**：Ledger 打表嫂美食（`8291f843-…`，2026-07-16～10-14）回 **97/97 全部 `currency: "HKD"`**，
而 macau-pos 同一批單畫面顯示 **MOP**。兩邊都冇改幣值 —— 係**讀咗唔同欄位**。

**根因**：`receipts.currency`（頂層欄）從來冇任何寫入端寫過：

| 寫入端 | 舊行為 |
| --- | --- |
| macau-pos `POST/PATCH /api/inventory/receipts` | 只寫 `raw_ocr_data.currency` |
| expenseRecorder `POST /api/db/save-receipt` | 完全冇寫 `currency` |

⇒ 每行都落 schema `DEFAULT 'HKD'`。而報表原先 `group by r.currency` 讀嘅正正係頂層欄
⇒ **真值 MOP／RMB 被假值 HKD 覆蓋**（MOP→HKD 差約 3%，屬帳目正確性問題，唔止顯示問題）。
實查：表嫂美食區間內 97 張，raw 真值 = MOP 31／RMB 1／空 65；全庫 1000 行只有 19 行有 raw 幣值。

**修正（三處同時落）**：

1. **讀取**：報表幣別一律經 `public.receipt_currency(raw_ocr_data, currency)`
   ＝ `raw` 真值 → 頂層欄 → `'MOP'` 降級（見 `supabase_purchase_report_currency_fix_v1.sql`）。
   ⚠️ 呢個函式係**報表唯一幣別來源**，唔准再直接讀 `receipts.currency`。
2. **寫入**：兩個寫入端一律**同時**寫 `raw_ocr_data.currency` 同頂層 `receipts.currency`，
   共用同一條規則（macau-pos `normalizeReceiptCurrency()`；expenseRecorder save-receipt 內聯同規則）：
   有值 → `trim().toUpperCase()`；空／未提供 → `'MOP'`。
   PATCH 三態：`undefined` 兩邊都唔動、有值兩邊都寫、空字串＝raw 清走（null）
   但頂層欄落 `'MOP'` 降級（頂層欄不變式：**恆有值且等於 UI 顯示嘅幣別**）。
3. **歷史**：A 段回填（有 raw 真值搬上頂層）可直接跑；B 段（無真值按店舖預設補）
   **需人手確認幣別**，見 SQL 檔內註解。

⚠️ 換幣別之後環比（`changePercent`）必須**同幣別比較**：MOP 均價 vs HKD 均價嘅漲跌係無意義嘅。
SQL 內已用 `receipt_currency(...) = receipt_currency(...)` 守住。

⭐ 對 Ledger 嘅提醒：**唔好**改成「只顯示 MOP」。同一店同區間已經有 MOP ＋ RMB，
硬寫死一個幣別會令 RMB 單被當 MOP。正確做法係照 `kpi.currencies` 開對應數量嘅卡（見下）。


🔴 **服務端絕對唔會做匯率換算**（冇可靠匯率來源、換算會令加總失真）。
⇒ 全部聚合 **一律按 `currency` 分開**，並遵守三條：

1. **`kpi.totalAmount` 恆 `null`**、`kpi.avgPerReceiptDay` 恆 `null` ——
   跨幣加總係無意義嘅數字，送一個出嚟只會誤導。
   ⇒ **唔准**喺 Ledger 端用 `byCurrency` 自己加總（誤差會累積）。
2. **所有聚合維度都帶 `currency` 欄位**：
   · `daily[]` = 一個 `(日期, 幣別)` 一條（同一日可以兩條）
   · `items[]` = 合併鍵係 **`品名 + 單位 + 幣別`**
   · `suppliers[]` = 一個 `(供應商, 幣別)` 一條
   · `paymentBreakdown[]` = 一個 `(付款方式, 幣別)` 一條
3. `receipts[]` 逐張單據本身已有 `currency` 欄，**逐張顯示唔需要理會幣別分組**。

**Ledger 顯示建議**：`kpi.currencies` 有幾個幣別就開幾張卡（例如「買貨總額 HKD」＋「買貨總額 MOP」），
卡與卡**唔加總**。`flags.multiCurrency` 恆 `true` 方便 Ledger 直接判斷要開幾張。

⚠️ `daily[]` 因為按 `(日期, 幣別)` 拆，**同一日會有多條** ⇒ Ledger 畫圖時要先按 `date` 分組再畫，
唔可以直接假設一日期一條。

---

## 8. 本版範圍界定（`flags.stockInOnly`）

`receipts.receipt_type` 有三值：`stock_in`（入貨）/ `expense`（租金水電薪資等支出）/ `other`。

**v1 只回 `receipt_type = 'stock_in'`**（J 拍板：今次淨係要買貨）。
`flags.stockInOnly` 恆 `true`。

🔴 **v1 唔接受 `type` 查詢參數**：傳咗會被忽略（唔會 400）。
由 **v2** 開始會加機讀 `type` 參數（`type=stock_in|expense`，可重複／逗號分隔），
以便同一條 route 都覆蓋支出分析。v2 上線時 **v1 預設值（淨係 `stock_in`）唔會變** ——
保證已對數嘅卡零影響。

⚠️ 唔可以靜默放寬 filter（POS 側 2026-10-07 就係咁出事：舊欄數值一變，已對數嘅卡即刻跳數）。

---

## 9. 第二階段（唔喺 v1）

庫存現況：`inv_products`（現存 `current_qty` / `reorder_level` / 加權平均成本 `unit_cost`）
＋ `inv_stock_movements`（異動流水）喺 **macau-pos 專案**，會喺 `macauPosSystem` repo 開
第二條 route，口徑同樣 HMAC。⚠️ `inv_products` 嘅平均成本同 POS 側 `baseline_unit_cost`
（一旦鎖定永不覆寫）口徑唔同 ⇒ 屆時會喺契約明文寫清楚邊個係邊個。

---

## 10. 部署次序

1. Ledger 同 expenseRecorder 各自產生一把**專用** secret
   ⚠️ **唔可以**重用 `LEDGER_OFFLINE_REPORT_HMAC_SECRET`、`LEDGER_WEBHOOK_SECRET`、
   `MACAU_LEDGER_SSO_SECRET`（唔同方向／唔同用途；共用一把 = 一邊爆就兩邊爆）
2. 環境變數：`LEDGER_PURCHASE_REPORT_HMAC_SECRET`（expenseRecorder 專案）
3. 部署 expenseRecorder（push 即部署）
4. Ledger 側開通 + 用 staging secret 試一次（見 §11 curl）
5. 交換正式 secret

降級行為：secret 未設 ⇒ 500 fail-closed（唔會誤放行）；DB 未就緒 ⇒ 503。
兩種情況 Ledger 都應該顯示降級一行而**唔係**空白卡。

---

## 11. 試請求（curl）

```bash
# ⚠️ pathWithQuery 要同下面一字不差（含參數順序）
TS=$(date +%s)
PATH_Q='/api/integration/ledger/purchase-report?shopId=shop_abc123&from=2026-10-05&to=2026-10-11'
SIG=$(printf '%s' "${TS}.GET.${PATH_Q}" \
      | openssl dgst -sha256 -hmac "$LEDGER_PURCHASE_REPORT_HMAC_SECRET" -hex \
      | sed 's/^.*= //')

curl -i "https://<expense-recorder 域名>${PATH_Q}" \
  -H "X-Ledger-Timestamp: ${TS}" \
  -H "X-Ledger-Signature: ${SIG}"
```

---

## 12. 「查得到但零張單」嘅準確語意（⚠️ Ledger 必讀）

呢個係最易搞錯嘅一點，會直接影響你哋 UI 點表達。

| 情況 | HTTP | 訊息 | 你哋應該顯示 |
| --- | --- | --- | --- |
| 查得到，區間內**真係冇單** | **200** | `receipts: []`、`kpi` 零、`receiptsTotal: 0` | 「該期間沒有買貨紀錄」——**正常狀態** |
| 店舖未綁定 / 從未登入過 SSO | 404 | `shop_not_found` | 「店舖未連接」 |
| 服務未部署 / DB 故障 | 503 | `upstream_unavailable` | 「暫時無法取得」 |
| 冇權限 / 簽名錯 | 401 | `unauthorized` | 「暫時無法取得」 |

🔴 **`receipts: []` 係有效答案，唔係錯誤。** 只可以當 200 正常處理，
**唔可以**因為陣列係空就彈錯誤／紅字。同一個道理：`daily` 冇任何 entry
（區間內一單都冇，自然冇單據可以排入任何一日）。

⚠️ 對照：**缺席（key 唔存在）＝ 未部署；空陣列 ＝ 真實嘅零。** 兩者唔可以混淆。

---

## 13. 待回問題

**✅ 全部 closed（2026-10-11）**：`shopId` 雙方確認統一用 **`merchants.id`**
（簽 SSO token 同發 API query 都用呢個值）。

⇒ **本契約可以落 code。**

---

## 14. 已拍板事項（J 2026-10-11，記錄用）

| # | 決定 |
| --- | --- |
| ② 幣別 | **混用會出現** ⇒ 拆開：聚合全部按 `currency` 分開、`kpi.totalAmount` 恆 `null`、唔做匯率換算（§7.1） |
| ③ 明細上限 | **500 張夠**，v1 **唔做**分頁；將來要就加 cursor 分頁（§4.4） |
| ④ `expense` 支出 | v1 淨係 `stock_in`；**方案 B** — v2 加 `type` 參數，v1 預設值不變（§8） |
| ⑤ 品項合併鍵 | **合併** ⇒ 鍵＝`品名 + 單位 + 幣別`（§7） |
| ⑥ 呼叫方式 | **On-demand pull，唔准 polling**；600/分 純係防撞牆上限（§2.1） |
| ⑦ 零張單 | 200 + 空陣列係**正常答案**，已喺 §12 寫清 |
