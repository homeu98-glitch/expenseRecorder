import OpenAI from "openai";
import { normalizeReceiptDraft } from "@/lib/receipt";

const getQwenClient = () => {
  const apiKey = process.env.ALIBABA_API_KEY || process.env.QWEN_API_KEY;
  const baseURL =
    process.env.ALIBABA_BASE_URL ||
    process.env.QWEN_BASE_URL ||
    "https://ws-vf1nz0yy8t6dp30m.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1";

  if (!apiKey) {
    throw new Error("Qwen API key 未設定");
  }

  return new OpenAI({
    apiKey,
    baseURL,
  });
};

function getQwenConfig(mode: string) {
  if (mode === "strong") {
    return {
      model: process.env.QWEN_STRONG_MODEL || "qwen-vl-plus",
      prompt: `你是繁體中文收據 OCR。只輸出 JSON。
1. 提取 merchant_name、receipt_number、date、total_amount、items。
2. 日期輸出 YYYY-MM-DD，必要時把民國年轉西元。
3. items 只保留真正交易品項；每項包含 name、quantity、unit_price。
4. 若有彙總區，優先使用彙總區。
5. 不要輸出 markdown，不要額外說明。`,
      maxCompletionTokens: Number(process.env.QWEN_STRONG_MAX_TOKENS || "1200"),
    };
  }

  return {
    model: process.env.QWEN_CHEAP_MODEL || "qwen-vl-plus",
    prompt: `你是繁體中文收據 OCR。請用最精簡方式輸出 JSON，只包含 merchant_name、date、total_amount、items、receipt_number。items 每項只保留 name、quantity、unit_price。不要 markdown，不要解釋。`,
    maxCompletionTokens: Number(process.env.QWEN_CHEAP_MAX_TOKENS || "600"),
  };
}

export async function processReceiptWithQwen(base64Image: string, mimeType: string, mode = "cheap") {
  try {
    const openai = getQwenClient();
    const config = getQwenConfig(mode);
    const response = await openai.chat.completions.create({
      model: config.model,
      messages: [
        {
          role: "system",
          content: config.prompt
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "請分析這張收據並以 JSON 格式輸出內容。"
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: config.maxCompletionTokens,
      temperature: 0,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("AI 未返回內容");

    // Cleanup: sometimes AI returns JSON wrapped in markdown even with response_format
    const cleanJson = content.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanJson) as unknown;
    return normalizeReceiptDraft(parsed);
  } catch (err: unknown) {
    console.error("Alibaba Qwen OCR Error:", err);
    throw err instanceof Error ? err : new Error("AI 識別失敗");
  }
}
