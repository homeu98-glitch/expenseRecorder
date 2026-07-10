# SSO JWT Spec（macau-ledger → expenseRecorder）

本文件定義 `macau-ledger` 發給 `expenseRecorder` 的 JWT 格式（owner-only）。

## 1. Signing

- Algorithm：`HS256`
- Secret：由雙方部署環境變數共享（請勿寫入 GitHub）

## 2. Standard claims

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `iss` | string | yes | 建議：`macau-ledger` |
| `aud` | string | yes | 建議：`expense-recorder` |
| `sub` | string | yes | 例如 `owner:<ownerId>` |
| `jti` | string | yes | 每次登入必須是新的 UUID（防重放） |
| `iat` | number | yes | unix timestamp（seconds） |
| `nbf` | number | no | unix timestamp（seconds） |
| `exp` | number | yes | unix timestamp（seconds），建議 1~5 分鐘 |

## 3. Business claims

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `role` | string | yes | 固定 `owner` |
| `shop.shopId` | string | yes | `macau-ledger` 的 stable shop id（會寫入 `shop_users.external_shop_id`） |
| `shop.shopName` | string | no | 顯示用 |
| `owner.ownerId` | string | no | 若沒有，可用 `sub` |
| `owner.phone` | string | no | 8 位電話（可用作 login_id fallback） |
| `owner.displayName` | string | no | 顯示用 |
| `redirect.path` | string | no | 預設 `/`（可用 `/admin` 但目前建議 owner-only） |

## 4. Example payload

```json
{
  "iss": "macau-ledger",
  "aud": "expense-recorder",
  "sub": "owner:USER_12345",
  "jti": "8df2af75-f398-44fd-b3cf-e9f4d9a9a001",
  "iat": 1782867600,
  "nbf": 1782867540,
  "exp": 1782868500,
  "role": "owner",
  "shop": {
    "shopId": "SHOP_000123",
    "shopName": "表嫂美食"
  },
  "owner": {
    "ownerId": "USER_12345",
    "phone": "63936541",
    "displayName": "CHAN TAI MAN"
  },
  "redirect": {
    "path": "/"
  }
}
```

