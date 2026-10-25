import { GoogleGenerativeAI, SchemaType, ResponseSchema } from "@google/generative-ai";
import { normalizeReceiptDraft } from "@/lib/receipt";

function getGenAI() {
  const key = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not defined in environment variables");
  }
  return new GoogleGenerativeAI(key);
}

const schema: ResponseSchema = {
  description: "Extract receipt details",
  type: SchemaType.OBJECT,
  properties: {
    merchant_name: {
      type: SchemaType.STRING,
      description: "Name of the merchant/store in Traditional Chinese",
    },
    date: {
      type: SchemaType.STRING,
      description: "Date of the receipt in YYYY-MM-DD format. Convert ROC years if necessary.",
    },
    total_amount: {
      type: SchemaType.NUMBER,
      description: "Total amount spent",
    },
    items: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: {
            type: SchemaType.STRING,
            description: "Item name in Traditional Chinese",
          },
          quantity: {
            type: SchemaType.NUMBER,
          },
          unit_price: {
            type: SchemaType.NUMBER,
          },
        },
        required: ["name", "unit_price"],
      },
    },
  },
  required: ["merchant_name", "total_amount", "date", "items"],
};

/**
 * 已被 Google 下線（v1beta 回 404）的模型 → 現役替代品。
 * 保留這層是因為部署平台的 GEMINI_CHEAP_MODEL / GEMINI_STRONG_MODEL 可能仍是舊值，
 * 而 404 會令整個 fallback 鏈白白浪費一格。
 */
const RETIRED_GEMINI_MODELS: Record<string, string> = {
  "gemini-1.0-pro": "gemini-2.5-pro",
  "gemini-1.0-pro-vision": "gemini-2.5-pro",
  "gemini-1.5-flash": "gemini-2.5-flash",
  "gemini-1.5-flash-8b": "gemini-2.5-flash",
  "gemini-1.5-flash-latest": "gemini-2.5-flash",
  "gemini-1.5-flash-002": "gemini-2.5-flash",
  "gemini-1.5-pro": "gemini-2.5-pro",
  "gemini-1.5-pro-latest": "gemini-2.5-pro",
  "gemini-1.5-pro-002": "gemini-2.5-pro",
};

function resolveGeminiModel(requested: string | undefined, fallback: string) {
  const cleaned = (requested || "").trim().replace(/^models\//, "") || fallback;
  const remapped = RETIRED_GEMINI_MODELS[cleaned.toLowerCase()];
  if (remapped) {
    console.warn(`[gemini] 模型 ${cleaned} 已被 Google 下線（v1beta 404），自動改用 ${remapped}`);
    return remapped;
  }
  return cleaned;
}

function getGeminiConfig(mode: string) {
  if (mode === "strong") {
    return {
      model: resolveGeminiModel(process.env.GEMINI_STRONG_MODEL, "gemini-2.5-pro"),
      prompt: `你是繁體中文收據 OCR。請完整提取 merchant_name、receipt_number、date、total_amount、items。必要時補全不完整品項名稱。只輸出 JSON。`,
    };
  }

  return {
    model: resolveGeminiModel(process.env.GEMINI_CHEAP_MODEL, "gemini-2.5-flash"),
    prompt: `你是繁體中文收據 OCR。請用精簡方式輸出 JSON，只保留 merchant_name、receipt_number、date、total_amount、items。不要額外說明。`,
  };
}

export async function processReceiptWithGemini(base64Image: string, mimeType: string, mode = "flash") {
  try {
    const genAI = getGenAI();
    const config = getGeminiConfig(mode);
    const model = genAI.getGenerativeModel({
      model: config.model,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0,
      },
    });

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType,
        },
      },
      { text: config.prompt },
    ]);

    const text = result.response.text();
    console.log(`Success with Gemini model: ${config.model}`);
    return normalizeReceiptDraft(JSON.parse(text));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn(`Gemini OCR failed:`, message);
    throw err instanceof Error ? err : new Error(message);
  }
}
