import { GoogleGenerativeAI, SchemaType, ResponseSchema } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
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

  return JSON.parse(result.response.text());
}
