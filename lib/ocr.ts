import { normalizeReceiptDraft, type ReceiptDraft } from "@/lib/receipt";
import { processReceiptWithGemini } from "@/lib/gemini";
import { processReceiptWithOpenRouter } from "@/lib/openrouter";

type OcrAttemptResult = {
  draft: ReceiptDraft;
  provider: string;
  model: string;
};

// qwen / Alibaba 已於 2026-10-25 全面停用（key 失效，全部改走 OpenRouter）。
type OcrProvider = "gemini" | "openrouter";

type OcrStrategyItem = {
  provider: OcrProvider;
  model: string;
};

const DEFAULT_STRATEGY = "openrouter-cheap,openrouter-strong";

function parseStrategy(raw: string): OcrStrategyItem[] {
  const dropped: string[] = [];

  const items = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item): OcrStrategyItem | null => {
      // 支援 "openrouter:<model-id>" 明確指定模型（model id 本身含 "/"）
      if (item.startsWith("openrouter:")) {
        return { provider: "openrouter", model: item.slice("openrouter:".length).trim() };
      }
      if (item.startsWith("openrouter-")) {
        return { provider: "openrouter", model: item.replace("openrouter-", "") };
      }
      // Gemini 原生為選用 fallback（需自行加入 OCR_FALLBACK_ORDER，見 .env.example）
      if (item.startsWith("gemini-")) {
        return { provider: "gemini", model: item.replace("gemini-", "") };
      }
      // qwen 及其他 provider 已停用；舊 env 殘留值會落到這裡被安靜丟棄
      dropped.push(item);
      return null;
    })
    .filter((item): item is OcrStrategyItem => item !== null && Boolean(item.model));

  if (dropped.length > 0) {
    console.warn(
      `[ocr] 已忽略不支援的 provider 條目：${dropped.join(", ")}（qwen 已停用，全面改用 OpenRouter；請更新 OCR_FALLBACK_ORDER）`
    );
  }

  return items;
}

/**
 * 決定 provider 嘗試順序。
 *
 * 自癒邏輯（重要）：部署平台的 `OCR_FALLBACK_ORDER` 環境變數會靜靜覆蓋 code 預設值。
 * 2026-10-22 與 2026-10-25 兩次事故都是同一個成因——線上 env 仍是舊值
 * `qwen-cheap,gemini-flash,qwen-strong,gemini-strong`，令 OpenRouter 完全不會被嘗試，
 * 而 qwen key 過期（401）、gemini 1.5 已下線（404），結果整個 OCR 全掛。
 *
 * 因此：只要 `OPENROUTER_API_KEY` 有設定，但解析出來的鏈沒有任何 openrouter 條目，
 * 就自動把 OpenRouter 補回最前面，並印出警告提醒去改 env。
 *
 * 註：qwen 已於 2026-10-25 停用，舊 env 殘留的 `qwen-*` 條目會在 parseStrategy 被丟棄，
 * 所以即使 Vercel env 沒改，也不會再出現 qwen 401。
 */
function getStrategy(): OcrStrategyItem[] {
  const raw = (process.env.OCR_FALLBACK_ORDER || "").trim();
  const parsed = raw ? parseStrategy(raw) : [];
  const base = parsed.length > 0 ? parsed : parseStrategy(DEFAULT_STRATEGY);

  const hasOpenRouterKey = Boolean(process.env.OPENROUTER_API_KEY);
  const hasOpenRouterEntry = base.some((item) => item.provider === "openrouter");

  if (hasOpenRouterKey && !hasOpenRouterEntry) {
    console.warn(
      "[ocr] OCR_FALLBACK_ORDER 沒有任何 openrouter 條目，但 OPENROUTER_API_KEY 已設定 → " +
        "自動補回 openrouter-cheap / openrouter-strong 於最前。請到 Vercel 修正該環境變數。"
    );
    return [...parseStrategy("openrouter-cheap,openrouter-strong"), ...base];
  }

  return base;
}

function isUsefulResult(draft: ReceiptDraft) {
  const hasMerchant = Boolean(draft.merchant_name && draft.merchant_name !== "未知供應商");
  const hasItems = draft.items.length > 0;
  const hasTotal = Number(draft.total_amount) > 0;
  return {
    ok: (hasItems && hasTotal) || (hasMerchant && hasTotal),
    score: [hasMerchant, hasItems, hasTotal].filter(Boolean).length,
  };
}

async function runAttempt(
  base64Image: string,
  mimeType: string,
  strategy: OcrStrategyItem
): Promise<OcrAttemptResult> {
  if (strategy.provider === "openrouter") {
    const draft = await processReceiptWithOpenRouter(base64Image, mimeType, strategy.model);
    return { draft: normalizeReceiptDraft(draft), provider: "openrouter", model: strategy.model };
  }

  const draft = await processReceiptWithGemini(base64Image, mimeType, strategy.model);
  return { draft: normalizeReceiptDraft(draft), provider: "gemini", model: strategy.model };
}

export async function processReceiptWithFallback(base64Image: string, mimeType: string) {
  const strategies = getStrategy();
  const errors: string[] = [];
  let bestResult: OcrAttemptResult | null = null;
  let bestScore = -1;

  for (const strategy of strategies) {
    try {
      const result = await runAttempt(base64Image, mimeType, strategy);
      const usefulness = isUsefulResult(result.draft);

      if (usefulness.score > bestScore) {
        bestResult = result;
        bestScore = usefulness.score;
      }

      if (usefulness.ok) {
        return {
          ...result.draft,
          _ocr_meta: {
            provider: result.provider,
            model: result.model,
            fallback_used: bestScore > 0,
          },
        };
      }
    } catch (error) {
      errors.push(`${strategy.provider}:${strategy.model}:${error instanceof Error ? error.message : "unknown"}`);
    }
  }

  if (bestResult) {
    return {
      ...bestResult.draft,
      _ocr_meta: {
        provider: bestResult.provider,
        model: bestResult.model,
        fallback_used: true,
        degraded: true,
      },
    };
  }

  throw new Error(`所有 OCR 模型都失敗：${errors.join(" | ")}`);
}
