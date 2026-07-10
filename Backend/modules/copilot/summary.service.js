/**
 * Real-Time AI Sales Copilot — Post-Session Summary (Phase 4)
 *
 * After a copilot session ends, generates:
 *   - Executive summary of the conversation
 *   - Key action items
 *   - Overall sentiment & deal probability
 *   - Coaching verdict
 */

import Groq from "groq-sdk";
import "dotenv/config.js";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  timeout: 30_000,
});

/**
 * Generate a comprehensive post-session summary.
 *
 * @param {string} fullTranscript - The full conversation transcript
 * @param {Array} hints - All hints generated during the session
 * @param {Object} callContext - { customerName, productName, callType }
 * @param {number} durationSeconds - Total session duration
 * @returns {Promise<Object|null>} - Summary object
 */
export const generateSessionSummary = async (
  fullTranscript,
  hints = [],
  callContext = {},
  durationSeconds = 0
) => {
  if (!fullTranscript || fullTranscript.trim().length < 20) return null;

  try {
    const hintsSummary = hints.length > 0
      ? hints.map((h) => `[${h.type}] ${h.hint}`).join("\n")
      : "No hints were generated.";

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a sales intelligence analyst. Analyze this completed sales call and generate a concise post-call summary.

CALL CONTEXT:
- Customer: ${callContext.customerName || "Unknown"}
- Product: ${callContext.productName || "General"}
- Call Type: ${callContext.callType || "sales"}
- Duration: ${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s

AI HINTS GENERATED DURING THE CALL:
${hintsSummary}

Return ONLY valid JSON in this exact format:
{
  "executiveSummary": "3-4 sentence overview of what happened in this call",
  "sentiment": "positive|neutral|negative",
  "dealProbability": 0-100,
  "keyTopics": ["topic1", "topic2", "topic3"],
  "actionItems": [
    {"action": "specific action", "priority": "high|medium|low", "deadline": "timeframe"}
  ],
  "objectionsRaised": ["objection1", "objection2"],
  "buyingSignalsDetected": ["signal1", "signal2"],
  "repPerformance": {
    "score": 1-10,
    "verdict": "one-line assessment",
    "topStrength": "best thing the rep did",
    "topImprovement": "most important area to improve"
  },
  "nextBestAction": "the single most important thing to do after this call",
  "followUpEmail": {
    "subject": "email subject line",
    "body": "brief professional follow-up email body (3-5 sentences)"
  }
}

Rules:
- Be concise — this is a quick review, not a deep analysis
- actionItems should have 2-4 items max
- dealProbability should reflect actual buying signals vs objections
- followUpEmail should reference specific details from the conversation
- Return ONLY valid JSON, no markdown`,
        },
        {
          role: "user",
          content: `FULL CALL TRANSCRIPT:\n\n${fullTranscript}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) return null;

    const summary = JSON.parse(responseText);
    return summary;
  } catch (error) {
    console.error("[Copilot Summary] Error:", error.message);
    return null;
  }
};
