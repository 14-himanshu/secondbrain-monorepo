import "dotenv/config";
import OpenAI from "openai";
import { Groq } from "groq-sdk";

async function testProviders() {
  console.log("[API_KEY_EXISTS] OPENAI:", !!process.env.OPENAI_API_KEY);
  console.log("[API_KEY_EXISTS] GROQ:", !!process.env.GROQ_API_KEY);
  console.log("[API_KEY_EXISTS] HF:", !!process.env.HF_TOKEN);

  const testQuery = "Hello world";

  // 1. Test Groq
  if (process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes("***")) {
    try {
      console.log("[TESTING_GROQ]");
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: testQuery }],
      });
      console.log("[GROQ_SUCCESS]", response.choices[0]?.message?.content);
    } catch (err: any) {
      console.error("[GROQ_FAILED]", err.message);
    }
  }

  // 2. Test OpenAI
  if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes("***")) {
    try {
      console.log("[TESTING_OPENAI]");
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: testQuery }],
      });
      console.log("[OPENAI_SUCCESS]", response.choices[0]?.message?.content);
    } catch (err: any) {
      console.error("[OPENAI_FAILED]", err.message);
    }
  }

  // 3. Test HF Embedding
  if (process.env.HF_TOKEN && !process.env.HF_TOKEN.includes("***")) {
    try {
      console.log("[TESTING_HF_EMBEDDING]");
      const model = "sentence-transformers/all-MiniLM-L6-v2";
      const response = await fetch(`https://router.huggingface.co/hf-inference/models/${model}/pipeline/feature-extraction`, {
        headers: { 
          "Authorization": `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify({ inputs: testQuery }),
      });
      console.log("[HF_STATUS]", response.status);
      const rawBody = await response.text();
      try {
        const data = JSON.parse(rawBody);
        console.log("[HF_SUCCESS]", Array.isArray(data) ? `Vector(${data.length})` : data);
      } catch (e) {
        console.error("[HF_RAW_ERROR]", rawBody.slice(0, 200));
      }
    } catch (err: any) {
      console.error("[HF_FAILED]", err.message);
    }
  }
}

testProviders();
