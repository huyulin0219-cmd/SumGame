import { GoogleGenAI } from "@google/genai";

export async function generateCoverImage() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
  return null;
}
