/**
 * LLM Isolation Test
 * Bypasses ALL of: embeddings, vector search, RAG context.
 * Tests ONLY whether the LLM provider can generate a response.
 */
import "dotenv/config";
import { Groq } from "groq-sdk";

async function testLLMIsolated() {
  console.log("[ISOLATION_TEST_START]");
  console.log("[GROQ_KEY_VALID]", !!process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes("***"));

  const prompt = "Reply with: LLM WORKING";

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  try {
    console.log("[LLM_CALL_START]");
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 20,
    });

    const content = response.choices[0]?.message?.content;
    console.log("[LLM_RAW_RESPONSE]", content);
    console.log("[RESULT]", content?.includes("LLM WORKING") ? "✅ LLM OK — problem is VECTOR RETRIEVAL" : "⚠️  LLM responded but unexpected output");
    console.log("[TOKENS_USED]", response.usage?.total_tokens);
  } catch (err: any) {
    console.error("[LLM_CALL_FAILED]", err.message);
    console.error("[STATUS]", err.status);
    console.error("[RESULT] ❌ LLM FAILED — problem is PROVIDER / API INTEGRATION");
  }
}

testLLMIsolated();
