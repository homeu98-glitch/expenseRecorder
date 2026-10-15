# 買貨報表 API — 一鍵測試方法

**Base URL**：`https://expense-recorder-sigma.vercel.app`（只有 production，冇 UAT）
**Path**：`/api/integration/ledger/purchase-report`
**Method**：`GET`（POST 會 405）
**Auth**：HMAC-SHA256，兩個 header（見下）

---

## 一、快速手動測試（Node.js，唔使裝任何嘢）

```bash
node _verify_deploy.cjs
# 或指定參數：
node _verify_deploy.cjs <shopId> <from> <to>
# 例：node _verify_deploy.cjs 8291f843-9def-4956-9d0b-1cfef2598306 2026-10-01 2026-10-14
```

輸出會顯示 HTTP status、payload 結構、receipts/items 數量，同埋**欄位外洩檢查**
（確認 `raw_ocr_data` / `image_url` 無意外回傳）。

---

## 二、完整簽名規格（實作呢個就對）

### Headers
```
Accept: application/json
X-Ledger-Timestamp: <Unix 秒 或 毫秒>
X-Ledger-Signature: <hex 小寫 HMAC-SHA256>
```

### 簽名計算（必須完全一致）
```
payload_to_sign = f"{timestamp}.GET.{pathWithQuery}"
signature       = HMAC_SHA256(secret, payload_to_sign).hexdigest()   # 小寫 hex
```

**`pathWithQuery` = 完整路徑 + query string，一個字都唔可以差。**

例：
```
路徑（不含 host）：
/api/integration/ledger/purchase-report?shopId=8291f843-9def-4956-9d0b-1cfef2598306&from=2026-10-01&to=2026-10-14

組出來：
"1789xxxxxx.GET./api/integration/ledger/purchase-report?shopId=8291f843-9def-4956-9d0b-1cfef2598306&from=2026-10-01&to=2026-10-14"
```

### 參數
| 參數 | 必填 | 格式 | 說明 |
|---|---|---|---|
| `shopId` | ✅ | 字串，≤200 字 | Ledger `merchants.id`；必須已綁定到 `shop_users.external_shop_id` |
| `from` | ❌ | `YYYY-MM-DD` | 預設 = `to` |
| `to` | ❌ | `YYYY-MM-DD` | 預設 = 今日（Asia/Macau） |

⚠️ `from`/`to` 兩個都要傳，或者兩個都唔傳（唔可以只傳一個，會 `bad_range`）。

### 時間窗
簽名有效期 **5 分鐘**。每次請求都要用當前 `Date.now()` 重簽
（唔可以重用舊 timestamp，會 401）。

---

## 三、常見錯誤碼對照

| HTTP | `error` | 成因 | 點解 |
|---|---|---|---|
| 200 | — | 成功 | payload 有 `kpi/daily/receipts/items/suppliers/paymentBreakdown` |
| 401 | `unauthorized` | 簽名問題 | ts 過期 / pathWithQuery 覆蓋錯 / secret 唔啱 |
| 400 | `bad_shop_id` | shopId 空或 >200 字 | |
| 400 | `bad_range` | from/to 格式錯或 from>to | |
| 404 | `shop_not_found` | shopId 未綁定 | 跑 `deploy_steps.sql` ② |
| 405 | — | 用咗 POST | 只支援 GET |
| 429 | `too_many_requests` | 超 per-shop 600/min | |
| 500 | `server_misconfigured` | 伺服器未設 secret | 部署端問題 |
| 503 | `rpc_not_deployed` | DB function 未部署 | 跑 SQL ① |
| 503 | `upstream_unavailable` | DB 執行錯誤 | 睇 Supabase SQL Editor error log |

---

## 四、對方易錯位（重點）

1. **`pathWithQuery` 漏 query** — 只簽 pathname 會 401。query string 必須一齊簽。
2. **重用舊 timestamp** — 超過 5 分鐘就 401。
3. **`secret` 用錯** — env 名係 `LEDGER_PURCHASE_REPORT_HMAC_SECRET`（唔係 `EXPENSE_RECORDER_...`）。
4. **POST 打 GET endpoint** — 405。
5. **shopId 當作已綁** — 未綁 = 404 `shop_not_found`，唔係「零單空資料」。
6. **Percent-encoding 分歧** — query 值如果 URI-encode 嘅話，簽名要用**實際送出嘅字串**
   （encode 定 decode 都得，但簽名同請求必須一致）。

---

## 五、curl 手動測試（先產生簽名變數）

```bash
SECRET="<LEDGER_PURCHASE_REPORT_HMAC_SECRET>"
SHOP="8291f843-9def-4956-9d0b-1cfef2598306"
FROM="2026-10-01"; TO="2026-10-14"
PATHQ="/api/integration/ledger/purchase-report?shopId=${SHOP}&from=${FROM}&to=${TO}"
TS=$(node -e "process.stdout.write(String(Math.floor(Date.now()/1000)))")
SIG=$(node -e "process.stdout.write(require('crypto').createHmac('sha256',process.argv[1]).update(process.argv[2]+'.GET.'+process.argv[3]).digest('hex'))" "$SECRET" "$TS" "$PATHQ")

curl -i "https://expense-recorder-sigma.vercel.app${PATHQ}" \
  -H "Accept: application/json" \
  -H "X-Ledger-Timestamp: ${TS}" \
  -H "X-Ledger-Signature: ${SIG}"
```