import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testJarvis() {
  try {
    console.log("Contacting Gemini servers...");
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Hello Jarvis, report system status.',
    });
    console.log("\n[Jarvis Response]:");
    console.log(response.text);
  } catch (error) {
    console.error("Connection notice:", error.message);
  } finally {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

testJarvis();