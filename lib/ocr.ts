import { normalizeReceiptDraft, type ReceiptDraft } from "@/lib/receipt";
import { processReceiptWithGemini } from "@/lib/gemini";
import { processReceiptWithQwen } from "@/lib/qwen";

type OcrAttemptResult = {
  draft: ReceiptDraft;
  provider: string;
  model: string;
};

type OcrStrategyItem = {
  provider: "qwen" | "gemini";
  model: string;
};

const DEFAULT_STRATEGY = "qwen-cheap,gemini-flash,qwen-strong,gemini-strong";

function getStrategy(): OcrStrategyItem[] {
  const raw = process.env.OCR_FALLBACK_ORDER || DEFAULT_STRATEGY;
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      if (item.startsWith("gemini-")) {
        return { provider: "gemini" as const, model: item.replace("gemini-", "") };
      }
      if (item.startsWith("qwen-")) {
        return { provider: "qwen" as const, model: item.replace("qwen-", "") };
      }
      return null;
    })
    .filter((item): item is OcrStrategyItem => item !== null);
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
  if (strategy.provider === "qwen") {
    const draft = await processReceiptWithQwen(base64Image, mimeType, strategy.model);
    return { draft: normalizeReceiptDraft(draft), provider: "qwen", model: strategy.model };
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
