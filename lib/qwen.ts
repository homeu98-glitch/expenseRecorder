import OpenAI from "openai";

const ALIBABA_API_KEY = "sk-ws-H.IXDYIY.AsyA.MEYCIQDkZTgllWaNkLyces_ArV7RlWeQnngAOKsj8VX2vyDUHgIhAKTVwFR61fOt16D9b8BZYVKSSrwTaLzWPIqZesmbS54l";
const ALIBABA_BASE_URL = "https://ws-vf1nz0yy8t6dp30m.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1";

const openai = new OpenAI({
  apiKey: ALIBABA_API_KEY,
  baseURL: ALIBABA_BASE_URL,
});

export async function processReceiptWithQwen(base64Image: string, mimeType: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "qwen-vl-plus", // High performance vision model
      messages: [
        {
          role: "system",
          content: "你是一個專業的繁體中文收據 OCR 系統。請從圖片中提取交易詳情，並以 JSON 格式輸出。包含商店名稱 (merchant_name), 日期 (date, YYYY-MM-DD), 總金額 (total_amount), 以及品項列表 (items, 每個品項包含 name, quantity, unit_price)。日期請將民國年份轉換為西元年份。"
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "請分析這張收據並輸出 JSON。"
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
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("AI 未返回內容");

    return JSON.parse(content);
  } catch (err: any) {
    console.error("Alibaba Qwen OCR Error:", err);
    throw err;
  }
}
