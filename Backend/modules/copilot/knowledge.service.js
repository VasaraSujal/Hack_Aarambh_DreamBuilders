/**
 * Real-Time AI Sales Copilot — Knowledge Base Search (RAG Retrieval)
 *
 * Searches the product knowledge base using keywords from the transcript.
 * Returns the most relevant products, FAQs, and objection handlers
 * to inject into the LLM prompt as context.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the knowledge base once at startup
const KB_PATH = path.join(__dirname, "../../data/knowledge-base.json");
let knowledgeBase = null;
let kbMtimeMs = 0;

const loadKB = () => {
  try {
    const stats = fs.statSync(KB_PATH);
    const fileMtimeMs = stats.mtimeMs || 0;

    if (knowledgeBase && kbMtimeMs === fileMtimeMs) {
      return knowledgeBase;
    }

    const raw = fs.readFileSync(KB_PATH, "utf-8");
    knowledgeBase = JSON.parse(raw);
    kbMtimeMs = fileMtimeMs;
    console.log(
      `[Knowledge Base] ✅ Loaded: ${knowledgeBase.products.length} products, ${knowledgeBase.faqs.length} FAQs, ${knowledgeBase.objectionHandlers.length} objection handlers`
    );
    return knowledgeBase;
  } catch (err) {
    console.error("[Knowledge Base] ❌ Failed to load:", err.message);
    return null;
  }
};

/**
 * Extract keywords from transcript text.
 * Removes common stop words and returns meaningful terms.
 */
const extractKeywords = (text) => {
  const stopWords = new Set([
    "i", "me", "my", "we", "our", "you", "your", "the", "a", "an", "is", "are",
    "was", "were", "be", "been", "being", "have", "has", "had", "do", "does",
    "did", "will", "would", "could", "should", "may", "might", "can", "shall",
    "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into",
    "about", "that", "this", "it", "not", "but", "and", "or", "if", "so",
    "what", "which", "who", "how", "when", "where", "there", "here", "all",
    "very", "just", "also", "than", "then", "more", "much", "some", "any",
    "tell", "know", "want", "need", "like", "think", "come", "make", "take",
    "get", "give", "go", "say", "said", "look", "see", "let", "please",
  ]);

  return text
    .toLowerCase()
    .replace(/[₹,.\-!?'"()]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
};

/**
 * Try to detect a price range from the transcript.
 * Handles patterns like: "15 lakhs", "15-16 lakhs", "under 10 lakh", "below 12"
 */
const detectPriceRange = (text) => {
  const lower = text.toLowerCase();

  // Pattern: "X-Y lakhs" or "X to Y lakhs"
  const rangeMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:lakh|lac|l\b)/);
  if (rangeMatch) {
    return {
      min: parseFloat(rangeMatch[1]) * 100000,
      max: parseFloat(rangeMatch[2]) * 100000,
    };
  }

  // Pattern: "under/below X lakhs"
  const underMatch = lower.match(/(?:under|below|less than|within|upto|up to)\s*(\d+(?:\.\d+)?)\s*(?:lakh|lac|l\b)/);
  if (underMatch) {
    return { min: 0, max: parseFloat(underMatch[1]) * 100000 };
  }

  // Pattern: "above/over X lakhs"
  const overMatch = lower.match(/(?:above|over|more than|starting)\s*(\d+(?:\.\d+)?)\s*(?:lakh|lac|l\b)/);
  if (overMatch) {
    return { min: parseFloat(overMatch[1]) * 100000, max: Infinity };
  }

  // Pattern: "X lakhs" (exact-ish, ±2L range)
  const exactMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac|l\b)/);
  if (exactMatch) {
    const val = parseFloat(exactMatch[1]) * 100000;
    return { min: val - 200000, max: val + 200000 };
  }

  return null;
};

const normalize = (value = "") =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const formatLakhs = (price) => {
  if (!Number.isFinite(price)) return "";
  return `INR ${(price / 100000).toFixed(2)}L`;
};

const normalizeProducts = (kbProducts = []) => {
  const normalized = [];

  for (const product of kbProducts) {
    const baseTags = Array.isArray(product.tags) ? product.tags : [];
    const baseCategory = product.category || "";
    const baseSafety = product.safety || "";
    const baseEngine = Array.isArray(product.engineOptions) ? product.engineOptions[0] : (product.engine || "");

    if (Array.isArray(product.variants) && product.variants.length > 0) {
      for (const variant of product.variants) {
        const variantPrice = Number(variant.price);
        const variantName = variant.name || product.name || "Unknown Variant";
        normalized.push({
          id: `${product.id || normalize(product.name)}-${normalize(variantName).replace(/\s+/g, "-")}`,
          modelId: product.id || "",
          modelName: product.name || "",
          name: variantName,
          category: baseCategory,
          variant: variant.type || variant.name || "",
          price: Number.isFinite(variantPrice)
            ? variantPrice
            : Number.isFinite(product?.priceRange?.min)
              ? Number(product.priceRange.min)
              : 0,
          priceFormatted: Number.isFinite(variantPrice)
            ? formatLakhs(variantPrice)
            : (product?.priceRange?.formatted || ""),
          engine: variant.engine || baseEngine,
          power: variant.power || "",
          mileage: variant.mileage || "",
          fuelType: variant.fuel || "",
          safety: baseSafety,
          keyFeatures: Array.isArray(variant.uniqueFeatures)
            ? variant.uniqueFeatures
            : Array.isArray(product.highlights)
              ? product.highlights.slice(0, 4)
              : [],
          bestFor: variant.bestFor || "",
          tags: [
            ...baseTags,
            ...extractKeywords(`${variantName} ${variant.type || ""} ${variant.fuel || ""} ${variant.engine || ""}`),
          ],
        });
      }
      continue;
    }

    normalized.push({
      id: product.id || normalize(product.name).replace(/\s+/g, "-"),
      modelId: product.id || "",
      modelName: product.name || "",
      name: product.name || "Unknown Product",
      category: baseCategory,
      variant: product.variant || "",
      price: Number(product.price) || Number(product?.priceRange?.min) || 0,
      priceFormatted: product.priceFormatted || product?.priceRange?.formatted || formatLakhs(Number(product.price)),
      engine: product.engine || baseEngine,
      power: product.power || "",
      mileage: product.mileage || "",
      fuelType: product.fuelType || "",
      safety: baseSafety,
      keyFeatures: Array.isArray(product.keyFeatures)
        ? product.keyFeatures
        : Array.isArray(product.highlights)
          ? product.highlights.slice(0, 4)
          : [],
      bestFor: product.bestFor || "",
      tags: baseTags,
    });
  }

  return normalized;
};

const extractMentionedProducts = (transcriptText, products = []) => {
  const normalizedTranscript = normalize(transcriptText);
  if (!normalizedTranscript) return [];

  const genericNameTokens = new Set(["tata", "motors", "car", "cars", "variant", "variants"]);

  return products
    .filter((product) => {
      const normalizedName = normalize(product.name);
      if (!normalizedName) return false;

      if (normalizedTranscript.includes(normalizedName)) return true;

      const meaningfulTokens = normalizedName
        .split(" ")
        .filter((token) => token.length > 2 && !genericNameTokens.has(token));

      if (meaningfulTokens.length === 0) return false;
      return meaningfulTokens.some((token) => normalizedTranscript.includes(token));
    })
    .map((product) => product.id);
};

/**
 * Score how well a KB entry matches the transcript keywords.
 */
const scoreMatch = (tags, keywords) => {
  let score = 0;
  for (const keyword of keywords) {
    for (const tag of tags) {
      if (tag.includes(keyword) || keyword.includes(tag)) {
        score += 1;
      }
    }
  }
  return score;
};

const PRODUCT_NAME_STOP_TOKENS = new Set([
  "tata", "motors", "car", "cars", "suv", "vehicle", "model", "variant", "variants", "segment",
]);

const scoreProductNameMatch = (product, keywords) => {
  const nameTokens = `${product.name || ""} ${product.modelName || ""}`
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 2 && !PRODUCT_NAME_STOP_TOKENS.has(token));

  let score = 0;
  for (const keyword of keywords) {
    if (nameTokens.some((token) => token.includes(keyword) || keyword.includes(token))) {
      score += 1;
    }
  }
  return score;
};

/**
 * Search the knowledge base for relevant context.
 *
 * @param {string} transcriptText - The latest transcript line(s)
 * @param {Object} callContext - { customerName, productName, callType }
 * @returns {Object} - { products: [], faqs: [], objections: [], contextString: "" }
 */
export const searchKnowledgeBase = (transcriptText, callContext = {}) => {
  const kb = loadKB();
  if (!kb) return { products: [], faqs: [], objections: [], contextString: "" };

  const normalizedProducts = normalizeProducts(kb.products || []);

  const keywords = extractKeywords(transcriptText);
  const mentionedProductIds = extractMentionedProducts(transcriptText, normalizedProducts);

  if (keywords.length === 0) {
    return { products: [], faqs: [], objections: [], contextString: "" };
  }

  console.log(`[Knowledge Base] 🔍 Searching for: [${keywords.slice(0, 10).join(", ")}]`);

  // --- Search Products ---
  const priceRange = detectPriceRange(transcriptText);
  const isComparisonIntent = /\b(compare|comparison|vs|versus|between)\b/i.test(transcriptText);
  const isMultiOptionIntent =
    !!priceRange || /\b(under|below|within|budget|range|variant|variants|models|options|best)\b/i.test(transcriptText);

  let matchedProducts = normalizedProducts
    .map((p) => ({
      ...p,
      tagScore: scoreMatch(p.tags || [], keywords),
      nameScore: scoreProductNameMatch(p, keywords),
      score:
        scoreMatch(p.tags || [], keywords) +
        scoreProductNameMatch(p, keywords) +
        (mentionedProductIds.includes(p.id) ? 100 : 0),
    }))
    .filter((p) => {
      if (mentionedProductIds.includes(p.id)) return true;
      if (p.nameScore > 0) return true;
      if (priceRange && p.price >= priceRange.min && p.price <= priceRange.max) return true;
      return false;
    });

  // Apply price filter if detected
  if (priceRange) {
    const priceFiltered = matchedProducts.filter(
      (p) => p.price >= priceRange.min && p.price <= priceRange.max
    );
    // If price filter returns results, use them; otherwise fall back to all matches
    if (priceFiltered.length > 0) {
      matchedProducts = priceFiltered;
    }
    // Also include products in price range even without keyword match
    const priceOnly = normalizedProducts
      .filter((p) => p.price >= priceRange.min && p.price <= priceRange.max && !matchedProducts.find((m) => m.id === p.id))
      .map((p) => ({ ...p, score: 0.5 }));
    matchedProducts.push(...priceOnly);
  }

  matchedProducts.sort((a, b) => b.score - a.score);
  let productLimit = 1;
  if (isComparisonIntent) productLimit = 2;
  else if (isMultiOptionIntent) productLimit = 3;

  const topProducts = matchedProducts.slice(0, productLimit);

  // --- Search FAQs ---
  const matchedFaqs = kb.faqs
    .map((f) => ({
      ...f,
      score: scoreMatch(f.tags, keywords),
    }))
    .filter((f) => f.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  // --- Search Objection Handlers ---
  const matchedObjections = kb.objectionHandlers
    .map((o) => ({
      ...o,
      score: scoreMatch(o.tags, keywords),
    }))
    .filter((o) => o.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  // --- Build the context string for LLM injection ---
  let contextString = "";

  if (topProducts.length > 0) {
    contextString += "\n=== MATCHING PRODUCTS FROM DATABASE ===\n";
    topProducts.forEach((p, i) => {
      contextString += `${i + 1}. ${p.name} (${p.variant}) — ${p.priceFormatted}\n`;
      contextString += `   Engine: ${p.engine} | Power: ${p.power} | Mileage: ${p.mileage}\n`;
      contextString += `   Safety: ${p.safety} | Fuel: ${p.fuelType}\n`;
      contextString += `   Key Features: ${Array.isArray(p.keyFeatures) ? p.keyFeatures.join(", ") : "N/A"}\n`;
      contextString += `   Best For: ${p.bestFor}\n\n`;
    });
  }

  if (matchedFaqs.length > 0) {
    contextString += "=== MATCHING FAQs ===\n";
    matchedFaqs.forEach((f) => {
      contextString += `Q: ${f.question}\nA: ${f.answer}\n\n`;
    });
  }

  if (matchedObjections.length > 0) {
    contextString += "=== OBJECTION HANDLING SCRIPTS ===\n";
    matchedObjections.forEach((o) => {
      contextString += `Objection: "${o.objection}"\nRecommended Response: ${o.response}\n\n`;
    });
  }

  if (contextString) {
    console.log(
      `[Knowledge Base] ✅ Found: ${topProducts.length} products, ${matchedFaqs.length} FAQs, ${matchedObjections.length} objection handlers`
    );
  }

  return {
    products: topProducts,
    faqs: matchedFaqs,
    objections: matchedObjections,
    contextString,
    meta: {
      productLimit,
      isComparisonIntent,
      isMultiOptionIntent,
      mentionedProducts: normalizedProducts
        .filter((p) => mentionedProductIds.includes(p.id))
        .map((p) => p.name),
    },
  };
};
