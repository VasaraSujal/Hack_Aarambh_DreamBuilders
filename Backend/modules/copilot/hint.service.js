/**
 * Real-Time AI Sales Copilot — Hint Engine v2 (RAG + Talk Tracks)
 *
 * Analyzes the live transcript, searches the Knowledge Base for
 * relevant products/FAQs, and generates hints with exact Talk Tracks.
 *
 *   🔴 Objection detected   → counter-argument + talk track
 *   🔵 Question detected    → data-backed answer + talk track
 *   🟢 Buying signal        → closing move + talk track
 *   🟡 Coaching tip         → technique advice + talk track
 *
 * Uses Groq (llama-3.3-70b-versatile) for ultra-fast inference.
 */

import Groq from "groq-sdk";
import "dotenv/config.js";
import { searchKnowledgeBase } from "./knowledge.service.js";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  timeout: 15_000,
});

const MIN_NEW_WORDS = 8;

const GENERIC_HINT_PATTERNS = [
  /provide\s+details?/i,
  /share\s+details?/i,
  /give\s+more\s+info/i,
  /answer\s+the\s+question/i,
  /explain\s+the\s+product/i,
  /more\s+positive\s+info/i,
];

const isLikelyGenericHint = (hintText = "", detailText = "") => {
  const combined = `${hintText} ${detailText}`.trim();
  if (!combined) return true;
  return GENERIC_HINT_PATTERNS.some((pattern) => pattern.test(combined));
};

const buildProductSummary = (product) => {
  const coreFeatures = Array.isArray(product.keyFeatures)
    ? product.keyFeatures.slice(0, 3).join(", ")
    : "";

  return {
    name: product.name,
    variant: product.variant || "",
    price: product.priceFormatted || "",
    engine: product.engine || "",
    mileage: product.mileage || "",
    safety: product.safety || "",
    bestFor: product.bestFor || "",
    features: Array.isArray(product.keyFeatures) ? product.keyFeatures.slice(0, 5) : [],
    shortLine: [product.priceFormatted, product.engine, product.safety].filter(Boolean).join(" | "),
    featureLine: coreFeatures,
  };
};

const buildKnowledgeFallbackHint = (kbResults, callContext = {}) => {
  const products = kbResults?.products || [];
  if (!products.length) return null;

  const customerName = callContext.customerName || "there";
  const topProduct = products[0];
  const productLabels = products
    .map((p) => `${p.name}${p.priceFormatted ? ` at ${p.priceFormatted}` : ""}`)
    .join(", ");

  const topFeatures = Array.isArray(topProduct.keyFeatures)
    ? topProduct.keyFeatures.slice(0, 2).join(" and ")
    : "";

  const talkTrack =
    products.length === 1
      ? `Great question, ${customerName}! For ${topProduct.name}, the price is ${topProduct.priceFormatted || "available on request"}. ${topFeatures ? `Key highlights include ${topFeatures}. ` : ""}Would you like me to quickly compare this with one nearby alternative?`
      : `Great question, ${customerName}! Based on what you asked, top options are ${productLabels}. ${topFeatures ? `${topProduct.name} stands out with ${topFeatures}. ` : ""}Would you like a quick comparison of the best two options for your needs?`;

  return {
    type: "QUESTION",
    confidence: 0.92,
    trigger: "Customer asked for product details",
    hint: `Share exact model details now: ${products.map((p) => p.name).join(" / ")}`,
    detail: `Use these matched products with exact pricing and features so the customer gets a direct answer immediately.`,
    talkTrack,
  };
};

/**
 * Analyze the recent transcript, search the Knowledge Base,
 * and generate a real-time hint with a Talk Track.
 *
 * @param {Array<{text: string, timestamp: number}>} transcriptBuffer
 * @param {Object} callContext - { customerName, productName, callType }
 * @param {number} fromIndex - Start analyzing from this transcript index
 * @returns {Promise<Object|null>} - Hint object or null
 */
export const generateHint = async (transcriptBuffer, callContext = {}, fromIndex = 0) => {
  try {
    const recentTranscripts = transcriptBuffer.slice(fromIndex);
    if (recentTranscripts.length === 0) return null;

    const recentText = recentTranscripts.map((t) => t.text).join(" ");
    if (recentText.split(/\s+/).length < MIN_NEW_WORDS) return null;

    // Context window — last 10 entries
    const contextWindow = transcriptBuffer.slice(-10).map((t) => t.text).join(" ");

    // ── RAG: Search the Knowledge Base ──
    const kbResults = searchKnowledgeBase(recentText, callContext);
    const kbContext = kbResults.contextString || "";

    // ── Build the LLM prompt ──
    const systemPrompt = `You are a real-time AI sales copilot listening to a LIVE sales call. Your job is to instantly help the salesperson by detecting critical moments and providing a ready-to-speak Talk Track.

CALL CONTEXT:
- Customer: ${callContext.customerName || "Unknown"}
- Product/Company: ${callContext.productName || "General"}
- Call Type: ${callContext.callType || "sales"}
${kbContext ? `\n--- COMPANY KNOWLEDGE BASE (USE THIS DATA — DO NOT MAKE UP INFORMATION) ---${kbContext}--- END KNOWLEDGE BASE ---\n` : ""}
ANALYZE the latest spoken text and determine if there is ONE actionable hint to give the salesperson RIGHT NOW.

DETECT these situations:
1. OBJECTION — Customer raised a concern, price complaint, hesitation, competitive comparison, or pushback
2. QUESTION — Customer asked a technical, pricing, feature, availability, or product question
3. BUYING_SIGNAL — Customer showed interest, urgency, asked about next steps, mentioned budget, or asked for a proposal
4. COACHING — Salesperson could improve their approach (talking too much, missing cues, not asking questions)
5. NONE — Nothing actionable right now

Return ONLY valid JSON in this exact format:
{
  "type": "OBJECTION" | "QUESTION" | "BUYING_SIGNAL" | "COACHING" | "NONE",
  "confidence": 0.0 to 1.0,
  "trigger": "the exact words or phrase that triggered this hint",
  "hint": "15-25 word actionable label for the salesperson",
  "detail": "1-2 sentence expanded context",
  "talkTrack": "The EXACT sentence(s) the salesperson should say out loud. Must be natural, conversational, 2-3 sentences max. Use the customer's name. Include specific product data from the Knowledge Base if available. End with an open-ended question."
}

CRITICAL RULES:
- Be VERY selective. Only return a hint if confidence >= 0.7
- If nothing actionable, return {"type": "NONE", "confidence": 0}
- The talkTrack is the MOST IMPORTANT field — it must be a natural, ready-to-speak sentence
- For OBJECTION: acknowledge the concern, pivot to value using KB data, ask a question
- For QUESTION: give a direct, data-backed answer from the Knowledge Base, then ask a follow-up
- For BUYING_SIGNAL: confirm interest, suggest a concrete next step (test drive, proposal, trial)
- For COACHING: suggest the exact phrase the rep should say next
- ALWAYS use real product names, prices, and features from the Knowledge Base — NEVER make up information
- If the customer asks about a specific model, answer that model first. Do NOT redirect to a different model unless customer asks for alternatives/comparison.
- If no Knowledge Base data is available, give general sales coaching advice
- Do NOT repeat hints for the same topic
- Return ONLY valid JSON, no markdown, no comments`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `FULL CONTEXT (last ~30 seconds):\n"${contextWindow}"\n\nNEW TEXT TO ANALYZE:\n"${recentText}"`,
        },
      ],
      temperature: 0.3,
      max_tokens: 350, // Increased for talk tracks
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) return null;

    const hint = JSON.parse(responseText);

    // Filter non-actionable or low-confidence
    if (!hint || hint.type === "NONE" || (hint.confidence && hint.confidence < 0.7)) {
      return null;
    }

    if (!hint.type || !hint.hint) return null;

    const shouldUseKnowledgeFallback =
      hint.type === "QUESTION" &&
      kbResults.products.length > 0 &&
      (isLikelyGenericHint(hint.hint, hint.detail) || !hint.talkTrack?.trim());

    const effectiveHint = shouldUseKnowledgeFallback
      ? buildKnowledgeFallbackHint(kbResults, callContext)
      : {
          type: hint.type,
          confidence: hint.confidence || 0.8,
          trigger: hint.trigger || "",
          hint: hint.hint,
          detail: hint.detail || "",
          talkTrack: hint.talkTrack || "",
        };

    if (!effectiveHint) return null;

    const shouldAttachProductCards =
      effectiveHint.type === "QUESTION" ||
      (effectiveHint.type === "BUYING_SIGNAL" && kbResults.products.length > 0);

    return {
      ...effectiveHint,
      timestamp: Date.now(),
      // Include richer matched KB products for frontend rendering
      kbProducts: shouldAttachProductCards
        ? kbResults.products.map((p) => buildProductSummary(p))
        : [],
    };
  } catch (error) {
    if (error.status === 429) {
      console.warn("[Copilot Hints] Rate limited by Groq, skipping.");
      return null;
    }
    console.error("[Copilot Hints] Error:", error.message);
    return null;
  }
};
