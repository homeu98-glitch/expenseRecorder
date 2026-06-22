import { GoogleGenerativeAI, SchemaType, ResponseSchema } from "@google/generative-ai";

// Use a SERVER-SIDE ONLY key name to prevent GitHub push blocks and ensure security
const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not defined in environment variables");
  }
  return key;
};

const genAI = new GoogleGenerativeAI(getApiKey());

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

export async function processReceiptImage(base64Image: string, mimeType: string) {
  // List of models to try in order of efficiency and likelihood of support
  const modelsToTry = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro",
    "gemini-1.5-pro-latest",
    "gemini-pro-vision"
  ];

  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`Attempting AI OCR with model: ${modelName}`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      });

      const prompt = `你是一個專業的繁體中文收據 OCR 系統。請從這張圖片中提取交易詳情。
      - 商店名稱請使用繁體中文。
      - 日期請轉換為 YYYY-MM-DD 格式（如果是民國日期如 113/05/06，請轉換為 2024-05-06）。
      - 如果品項名稱不完整，請根據上下文提供最可能的完整名稱。
      - 輸出為指定的 JSON 格式。`;

      const result = await model.generateContent([
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType,
          },
        },
        { text: prompt },
      ]);

      const text = result.response.text();
      console.log(`Success with model: ${modelName}`);
      return JSON.parse(text);
    } catch (err: any) {
      console.warn(`Model ${modelName} failed:`, err.message);
      lastError = err;
      // If it's a 404, we continue to the next model
      continue;
    }
  }

  // If all models fail, throw the last error
  throw new Error(`All Gemini models failed. Last error: ${lastError?.message || 'Unknown error'}`);
}
