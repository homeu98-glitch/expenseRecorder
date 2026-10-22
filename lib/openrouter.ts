import { normalizeReceiptDraft, type ReceiptDraft } from "@/lib/receipt";

const getOpenRouterConfig = () => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseURL = (process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/+$/, "");

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY 未設定");
  }

  return { apiKey, baseURL };
};

const CHEAP_PROMPT = `你是繁體中文收據 OCR。請用最精簡方式輸出 JSON，只包含 merchant_name、date、total_amount、items、receipt_number。items 每項只保留 name、quantity、unit_price。不要 markdown，不要解釋。`;

const STRONG_PROMPT = `你是繁體中文收據 OCR。只輸出 JSON。
1. 提取 merchant_name、receipt_number、date、total_amount、items。
2. 日期輸出 YYYY-MM-DD，必要時把民國年轉西元。
3. items 只保留真正交易品項；每項包含 name、quantity、unit_price。
4. 若有彙總區，優先使用彙總區。
5. 不要輸出 markdown，不要額外說明。`;

/**
 * mode 可以是 "cheap" / "strong"，或直接傳入 OpenRouter 模型 ID
 * （例如 "google/gemini-2.5-pro"），方便 OCR_FALLBACK_ORDER 用
 * "openrouter:<model-id>" 明確指定。
 */
function getModeConfig(mode: string) {
  const trimmed = (mode || "").trim();
  const isExplicitModel = trimmed.length > 0 && trimmed !== "cheap" && trimmed !== "strong";

  if (isExplicitModel) {
    return {
      model: trimmed,
      prompt: CHEAP_PROMPT,
      maxCompletionTokens: Number(process.env.OPENROUTER_CHEAP_MAX_TOKENS || "600"),
    };
  }

  if (trimmed === "strong") {
    return {
      model: process.env.OPENROUTER_STRONG_MODEL || "google/gemini-2.5-pro",
      prompt: STRONG_PROMPT,
      maxCompletionTokens: Number(process.env.OPENROUTER_STRONG_MAX_TOKENS || "1200"),
    };
  }

  return {
    model: process.env.OPENROUTER_CHEAP_MODEL || "google/gemini-2.5-flash",
    prompt: CHEAP_PROMPT,
    maxCompletionTokens: Number(process.env.OPENROUTER_CHEAP_MAX_TOKENS || "600"),
  };
}

type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type ChatMessage = {
  role: "system" | "user";
  content: string | ChatContentPart[];
};

async function requestOpenRouterChat({
  model,
  maxTokens,
  temperature = 0,
  messages,
  jsonMode = true,
}: {
  model: string;
  maxTokens: number;
  temperature?: number;
  messages: ChatMessage[];
  jsonMode?: boolean;
}) {
  const { apiKey, baseURL } = getOpenRouterConfig();

  const body: Record<string, unknown> = {
    model,
    temperature,
    max_tokens: maxTokens,
    messages,
  };

  // 並非所有 OpenRouter 模型都支援 response_format，先試 JSON mode，
  // 若供應商回 4xx（模型不支援），改以純文字模式重試一次。
  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const send = async (payload: Record<string, unknown>) =>
    fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

  let response = await send(body);

  if (!response.ok && body.response_format) {
    const errorText = await response.text();
    // 401 = key 問題，重試無意義；其他 4xx/5xx 才降級重試
    if (response.status !== 401) {
      const retryBody = { ...body };
      delete retryBody.response_format;
      response = await send(retryBody);
      if (!response.ok) {
        const retryError = await response.text();
        throw new Error(
          `OpenRouter AI 識別失敗：${response.status} ${retryError}${buildErrorHint(response.status)}（首次錯誤：${errorText.slice(0, 200)}）`
        );
      }
    } else {
      throw new Error(`OpenRouter AI 識別失敗：401 ${errorText}${buildErrorHint(401)}`);
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter AI 識別失敗：${response.status} ${errorText}${buildErrorHint(response.status)}`);
  }

  const data = await response.json();
  return extractMessageText(data?.choices?.[0]?.message?.content);
}

function buildErrorHint(status: number): string {
  if (status === 401) {
    return (
      "（API key 被 OpenRouter 拒絕：OpenRouter 的 401 即使 key 無效也會報 'Missing Authentication header'。" +
      "請確認 OPENROUTER_API_KEY 是有效 key——OpenRouter key 必須以 sk-or- 開頭；" +
      "若填的是 Google/Gemini key（AIza…）請改用 OpenRouter key）"
    );
  }
  if (status === 404) {
    return (
      "（模型不存在於 OpenRouter：請確認 OPENROUTER_CHEAP_MODEL / OPENROUTER_STRONG_MODEL 是該平台提供的模型 ID，" +
      "例如 google/gemini-2.5-flash 或 google/gemini-2.5-pro）"
    );
  }
  if (status === 402) {
    return "（OpenRouter 額度不足：請到 openrouter.ai/credits 充值或改用免費模型）";
  }
  if (status === 429) {
    return "（OpenRouter 限流：免費模型有嚴格 rate limit，建議改用付費模型或稍後重試）";
  }
  return "";
}

function extractMessageText(content: unknown): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .join("\n");
  }
  return String(content);
}

function normalizeOpenRouterText(content: string): string {
  return String(content)
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseJsonLoose(text: string): unknown {
  const cleaned = normalizeOpenRouterText(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("AI 未返回有效 JSON");
    }
    return JSON.parse(match[0]);
  }
}

export async function processReceiptWithOpenRouter(
  base64Image: string,
  mimeType: string,
  mode = "cheap"
): Promise<ReceiptDraft> {
  try {
    const config = getModeConfig(mode);
    const text = await requestOpenRouterChat({
      model: config.model,
      maxTokens: config.maxCompletionTokens,
      messages: [
        { role: "system", content: config.prompt },
        {
          role: "user",
          content: [
            { type: "text", text: "請分析這張收據並以 JSON 格式輸出內容。" },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } },
          ],
        },
      ],
    });

    if (!text) throw new Error("AI 未返回內容");
    console.log(`Success with OpenRouter model: ${config.model}`);
    return normalizeReceiptDraft(parseJsonLoose(text));
  } catch (err: unknown) {
    console.error("OpenRouter OCR Error:", err);
    throw err instanceof Error ? err : new Error("OpenRouter AI 識別失敗");
  }
}
