import OpenAI from "openai";
import { normalizeReceiptDraft } from "@/lib/receipt";

const ALIBABA_API_KEY = "sk-ws-H.IXDYIY.AsyA.MEYCIQDkZTgllWaNkLyces_ArV7RlWeQnngAOKsj8VX2vyDUHgIhAKTVwFR61fOt16D9b8BZYVKSSrwTaLzWPIqZesmbS54l";
const ALIBABA_BASE_URL = "https://ws-vf1nz0yy8t6dp30m.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1";

const openai = new OpenAI({
  apiKey: ALIBABA_API_KEY,
  baseURL: ALIBABA_BASE_URL,
});

export async function processReceiptWithQwen(base64Image: string, mimeType: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "qwen-vl-plus",
      messages: [
        {
          role: "system",
          content: `你是一個專業的繁體中文收據 OCR 系統。
          請仔細分析收據圖片，特別是針對复杂的對賬單或月結單：
          1. 提取商店名稱 (merchant_name)。
          2. 提取收據日期 (date)，格式為 YYYY-MM-DD。如果是 26/05/26 這種格式，請理解為 DD/MM/YY 並轉換為西元 2026-05-26。
          3. 提取總金額 (total_amount)。請找尋「合計金額」或「實付總額」。
          4. 提取品項列表 (items)。
             - 對於有「彙總」或「統計」區域的收據，請優先提取該區域的彙總品項。
             - 每個品項必須包含：名稱 (name)、數量 (quantity) 和單價 (unit_price)。
          5. 必須僅輸出純 JSON 格式，不要包含任何 Markdown 標籤或額外文字。`
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
      response_format: { type: "json_object" }
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
