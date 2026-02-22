import { GoogleGenAI } from "@google/genai";

// 高质量古风女子占位图（当 API 不可用时使用）
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1578496479914-7ef3b0193be3?q=80&w=1000&auto=format&fit=crop";

export async function generateCoverImage() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not found. Using fallback image.");
    return FALLBACK_IMAGE;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: 'A beautiful ancient Chinese woman sitting elegantly on a traditional wooden chair, wearing exquisite colorful Hanfu with intricate embroidery, soft cinematic lighting, classical Chinese background, high quality, vibrant colors, artistic style.',
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "3:4",
        },
      },
    });
    
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Image generation failed:", error);
  }
  
  return FALLBACK_IMAGE;
}
