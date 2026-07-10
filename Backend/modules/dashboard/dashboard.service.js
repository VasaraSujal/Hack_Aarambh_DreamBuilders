import CallModel from "../audio/audio.model.js";
import PDFDocument from "pdfkit";

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const callTypeLabel = (callType) => {
  const map = {
    sales: "Sales",
    service: "Service",
    enquiry: "Enquiry",
    complaint: "Complaint",
    support: "Support",
    renewal: "Renewal",
    upsell: "Upsell",
    other: "Other",
  };
  return map[String(callType || "other").toLowerCase()] || "Other";
};

const listOrFallback = (arr) => (Array.isArray(arr) && arr.length > 0 ? arr : ["Not detected"]);

const toLines = (items, bullet = "- ") => listOrFallback(items).map((item) => `${bullet}${item}`);

const normalizeCallType = (value) => {
  const allowed = ["sales", "service", "enquiry", "complaint", "support", "renewal", "upsell", "other"];
  const normalized = String(value || "other").trim().toLowerCase();
  return allowed.includes(normalized) ? normalized : "other";
};

export const getAllCalls = async (companyId, employeeId = null) => {
  try {
    const query = employeeId ? { companyId, employeeId, status: "analyzed" } : { companyId, status: "analyzed" };
    const calls = await CallModel.findAll(query);
    
    // Map to include only relevant fields for dashboard list
    return calls.map((call) => ({
      callId: call.callId,
      employeeName: call.employeeName || "Unknown API User",
      product_name: call.product_name,
      status: call.status,
      call_duration: call.call_duration,
      callTitle: call.call_title || call.aiInsights?.callTitle || call.aiInsights?.productName || call.product_name || "Untitled Call",
      callType: call.call_type || call.aiInsights?.callType || "other",
      customerName: call.customer_name || call.aiInsights?.customer?.name || "Unknown",
      customerEmail: call.customer_email || call.aiInsights?.customer?.email || "",
      summary: call.aiInsights?.summary || "No summary",
      sentiment: call.aiInsights?.sentiment || "unknown",
      dealProbability: call.aiInsights?.dealProbability || 0,
      createdAt: call.createdAt,
      productName: call.aiInsights?.productName || call.product_name,
      salespersonRating: call.salesperson_rating || call.aiInsights?.salespersonPerformance?.rating || null,
      salespersonTone: call.salesperson_tone || call.aiInsights?.salespersonTone?.overall || null,
      customerEngagement: call.customer_engagement || call.aiInsights?.conversationAnalysis?.customerEngagementScore || null,
      urgencyLevel: call.urgency_level || call.aiInsights?.conversationAnalysis?.urgencyLevel || null,
      aiInsights: call.aiInsights || null,
    }));
  } catch (error) {
    console.error("Error fetching all calls:", error);
    throw error;
  }
};

export const getCallDetails = async (callId, companyId, employeeId = null) => {
  try {
    const query = employeeId ? { callId, companyId, employeeId } : { callId, companyId };
    const calls = await CallModel.findAll(query);
    return calls[0] || null;
  } catch (error) {
    console.error("Error fetching call details:", error);
    throw error;
  }
};

export const getAnalytics = async (companyId, employeeId = null) => {
  try {
    const allQuery = employeeId ? { companyId, employeeId } : { companyId };
    const analyzedQuery = { ...allQuery, status: "analyzed" };
    
    const allCalls = await CallModel.findAll(allQuery);
    const analyzedCalls = await CallModel.findAll(analyzedQuery);

    const totalCalls = analyzedCalls.length;
    const positiveCalls = analyzedCalls.filter(
      (call) => call.aiInsights?.sentiment === "positive"
    ).length;
    const negativeCalls = analyzedCalls.filter(
      (call) => call.aiInsights?.sentiment === "negative"
    ).length;
    const neutralCalls = analyzedCalls.filter(
      (call) => call.aiInsights?.sentiment === "neutral"
    ).length;

    const avgDealProbability =
      analyzedCalls.length > 0
        ? Math.round(
            analyzedCalls.reduce(
              (sum, call) => sum + (Number(call.aiInsights?.dealProbability) || 0),
              0
            ) / analyzedCalls.length
          )
        : 0;

    const statusBreakdown = {
      uploaded: allCalls.filter((call) => call.status === "uploaded").length,
      transcribed: allCalls.filter((call) => call.status === "transcribed").length,
      analyzed: analyzedCalls.length,
    };

    // Average salesperson rating
    const ratedCalls = analyzedCalls.filter(
      (c) => c.salesperson_rating || c.aiInsights?.salespersonPerformance?.rating
    );
    const avgRepRating =
      ratedCalls.length > 0
        ? Math.round(
            (ratedCalls.reduce(
              (sum, c) =>
                sum + Number(c.salesperson_rating || c.aiInsights?.salespersonPerformance?.rating || 0),
              0
            ) /
              ratedCalls.length) *
              10
          ) / 10
        : 0;

    // Average customer engagement
    const engagedCalls = analyzedCalls.filter(
      (c) => c.customer_engagement || c.aiInsights?.conversationAnalysis?.customerEngagementScore
    );
    const avgCustomerEngagement =
      engagedCalls.length > 0
        ? Math.round(
            (engagedCalls.reduce(
              (sum, c) =>
                sum +
                Number(c.customer_engagement ||
                  c.aiInsights?.conversationAnalysis?.customerEngagementScore ||
                  0),
              0
            ) /
              engagedCalls.length) *
              10
          ) / 10
        : 0;

    return {
      totalCalls,
      positiveCalls,
      negativeCalls,
      neutralCalls,
      avgDealProbability,
      avgRepRating,
      avgCustomerEngagement,
      statusBreakdown,
    };
  } catch (error) {
    console.error("Error generating analytics:", error);
    throw error;
  }
};

export const filterCalls = async (companyId, product_name, sentiment, call_type, employeeId = null) => {
  try {
    const query = employeeId ? { companyId, employeeId, status: "analyzed" } : { companyId, status: "analyzed" };
    const allCalls = await CallModel.findAll(query);

    let filtered = allCalls;

    if (product_name) {
      filtered = filtered.filter(
        (call) =>
          call.product_name?.toLowerCase().includes(product_name.toLowerCase()) ||
          call.aiInsights?.productName
            ?.toLowerCase()
            .includes(product_name.toLowerCase())
      );
    }

    if (sentiment) {
      filtered = filtered.filter(
        (call) => call.aiInsights?.sentiment?.toLowerCase() === sentiment.toLowerCase()
      );
    }

    if (call_type) {
      filtered = filtered.filter(
        (call) =>
          (call.call_type || call.aiInsights?.callType || "other").toLowerCase() ===
          call_type.toLowerCase()
      );
    }

    return filtered.map((call) => ({
      callId: call.callId,
      product_name: call.product_name,
      callTitle: call.call_title || call.aiInsights?.callTitle || call.aiInsights?.productName || call.product_name || "Untitled Call",
      callType: call.call_type || call.aiInsights?.callType || "other",
      summary: call.aiInsights?.summary || "No summary",
      sentiment: call.aiInsights?.sentiment || "unknown",
      dealProbability: call.aiInsights?.dealProbability || 0,
      createdAt: call.createdAt,
    }));
  } catch (error) {
    console.error("Error filtering calls:", error);
    throw error;
  }
};

export const getCallsByProduct = async (companyId, product_name, employeeId = null) => {
  try {
    const query = employeeId ? { companyId, employeeId, status: "analyzed" } : { companyId, status: "analyzed" };
    const calls = await CallModel.findAll(query);
    
    return calls
      .filter(
        (call) =>
          call.product_name?.toLowerCase().includes(product_name.toLowerCase()) ||
          call.aiInsights?.productName
            ?.toLowerCase()
            .includes(product_name.toLowerCase())
      )
      .map((call) => ({
        callId: call.callId,
        product_name: call.product_name,
        summary: call.aiInsights?.summary,
        sentiment: call.aiInsights?.sentiment,
        dealProbability: call.aiInsights?.dealProbability,
      }));
  } catch (error) {
    console.error("Error fetching calls by product:", error);
    throw error;
  }
};

export const getCompetitorAnalysis = async (companyId, employeeId = null) => {
  try {
    const query = employeeId ? { companyId, employeeId, status: "analyzed" } : { companyId, status: "analyzed" };
    const calls = await CallModel.findAll(query);
    
    const competitorMap = {};
    const advantageMap = {};

    calls.forEach((call) => {
      const competitors = call.aiInsights?.competitors || [];
      const advantages = call.aiInsights?.competitorAdvantages || [];

      competitors.forEach((competitor) => {
        competitorMap[competitor] = (competitorMap[competitor] || 0) + 1;
      });

      advantages.forEach((advantage) => {
        advantageMap[advantage] = (advantageMap[advantage] || 0) + 1;
      });
    });

    return {
      competitorsFrequency: Object.entries(competitorMap)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count })),
      topAdvantages: Object.entries(advantageMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([advantage, count]) => ({ advantage, count })),
    };
  } catch (error) {
    console.error("Error generating competitor analysis:", error);
    throw error;
  }
};

export const getRiskRadar = async (companyId, employeeId = null) => {
  try {
    const query = employeeId ? { companyId, employeeId, status: "analyzed" } : { companyId, status: "analyzed" };
    const calls = await CallModel.findAll(query);

    return calls
      .filter((call) => {
        const prob = call.aiInsights?.dealProbability || 0;
        const sentiment = call.aiInsights?.sentiment;
        const riskLevel = call.aiInsights?.riskLevel;
        return prob < 50 || sentiment === "negative" || riskLevel === "critical" || riskLevel === "high";
      })
      .map((call) => ({
        callId: call.callId,
        callTitle: call.call_title || call.aiInsights?.callTitle || call.aiInsights?.productName || "Untitled Call",
        riskLevel: call.aiInsights?.riskLevel || "medium",
        dealProbability: call.aiInsights?.dealProbability || 0,
        sentiment: call.aiInsights?.sentiment || "neutral",
        topAction: call.aiInsights?.actionCenter?.[0] || null,
        riskSummary: call.aiInsights?.riskSummary || "",
        productName: call.aiInsights?.productName || call.product_name || "Unknown",
        createdAt: call.createdAt,
      }))
      .sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        return (order[a.riskLevel] || 2) - (order[b.riskLevel] || 2);
      });
  } catch (error) {
    console.error("Error generating risk radar:", error);
    throw error;
  }
};

export const updateCallMetadata = async (callId, metadata = {}) => {
  const existing = await CallModel.findAll({ callId });
  const existingCall = existing[0] || null;
  if (!existingCall) {
    throw new Error("Call not found");
  }

  const callTitle = String(metadata.callTitle || existingCall.call_title || existingCall.aiInsights?.callTitle || "Untitled Call").trim();
  const callType = normalizeCallType(metadata.callType || existingCall.call_type || existingCall.aiInsights?.callType);
  const customerName = String(metadata.customerName || existingCall.customer_name || existingCall.aiInsights?.customer?.name || "Unknown").trim();
  const customerEmail = String(metadata.customerEmail || existingCall.customer_email || existingCall.aiInsights?.customer?.email || "").trim();
  const customerPhone = String(metadata.customerPhone || existingCall.customer_phone || existingCall.aiInsights?.customer?.phone || "").trim();
  const productName = String(metadata.productName || existingCall.product_name || existingCall.aiInsights?.productName || "Unknown").trim();

  await CallModel.updateOne(callId, {
    call_title: callTitle,
    call_type: callType,
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone,
    product_name: productName,
    "aiInsights.callTitle": callTitle,
    "aiInsights.callType": callType,
    "aiInsights.productName": productName,
    "aiInsights.customer.name": customerName,
    "aiInsights.customer.email": customerEmail,
    "aiInsights.customer.phone": customerPhone,
  });

  const updated = await CallModel.findAll({ callId });
  return updated[0] || null;
};

export const buildCallReport = async (callId, companyId, employeeId = null) => {
  const query = employeeId ? { callId, companyId, employeeId } : { callId, companyId };
  const calls = await CallModel.findAll(query);
  const call = calls[0] || null;
  if (!call) throw new Error("Call not found");

  const insights = call.aiInsights || {};
  const reportTitle = call.call_title || insights.callTitle || insights.productName || "Call Analysis Report";
  const safeFileName = `${reportTitle.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}_${call.callId}.pdf`;

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 44, bottom: 0, left: 44, right: 44 }, // Set bottom margin to 0 to COMPLETELY kill pdfkit auto page breaking
    bufferPages: true,
  });
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));

  // ── Constants ────────────────────────────────────────────────────────────
  const PW = 595.28;
  const PH = 841.89;
  const L  = 44;
  const W  = 507;
  const R  = L + W;
  const FOOTER_H = 22;
  const SAFE_BOTTOM = PH - 50; // Extra safe distance from bottom
  const C  = {
    dark: "#0F172A", brand: "#6366F1", slate: "#1E293B", mid: "#334155",
    muted: "#64748B", line: "#CBD5E1", bg: "#F8FAFC", pos: "#059669",
    neg: "#DC2626", warn: "#D97706", white: "#FFFFFF",
    lblue: "#EFF6FF", lgreen: "#F0FDF4", lred: "#FEF2F2", lyellow: "#FFFBEB",
  };

  const sentiment   = (insights.sentiment || "unknown").toLowerCase();
  const prob        = insights.dealProbability ?? 0;
  const callTypeStr = callTypeLabel(call.call_type || insights.callType || "other");
  const sentColor   = sentiment === "positive" ? C.pos : sentiment === "negative" ? C.neg : C.warn;
  const probColor   = prob >= 70 ? C.pos : prob >= 40 ? C.warn : C.neg;

  const clip = (value, max = 140) => {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (!text) return "—";
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
  };

  // Horizontal divider + accent bar + label — returns y where content starts
  const section = (label, y) => {
    const ly = y + 8;
    doc.strokeColor(C.line).lineWidth(0.5).moveTo(L, ly).lineTo(R, ly).stroke();
    const ty = ly + 5;
    doc.rect(L, ty, 3, 11).fill(C.brand);
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.brand)
      .text(label.toUpperCase(), L + 9, ty + 1.5, { characterSpacing: 0.7, lineBreak: false });
    return ty + 16;
  };

  // Small "LABEL\nValue" pair at explicit (x, y) — returns Y after value
  const kv = (label, value, x, y, w) => {
    doc.font("Helvetica").fontSize(7).fillColor(C.muted)
      .text(label + ":", x, y, { width: w, lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(C.slate)
      .text(clip(value, 58), x, y + 10, { width: w, lineBreak: false });
    return doc.y + 2;
  };

  // Bullet list at explicit (x, y) with overflow guard — returns Y after last item
  const bullets = (items, x, y, w, dotColor = C.brand, maxY = SAFE_BOTTOM) => {
    const safe = Array.isArray(items) && items.length > 0 ? items.slice(0, 5) : ["Not detected"];
    let cy = y;
    safe.forEach((item) => {
      if (cy + 12 > maxY) return;
      doc.circle(x + 3.5, cy + 5.5, 2.5).fill(dotColor);
      doc.font("Helvetica").fontSize(8.5).fillColor(C.mid)
        .text(clip(item, 95), x + 10, cy, { width: w - 10, lineBreak: false });
      cy += 13;
    });
    return cy;
  };

  const writeBoundedText = (text, x, y, width, height, options = {}) => {
    doc.text(String(text || ""), x, y, {
      width,
      height,
      ellipsis: true,
      ...options,
    });
    return y + height;
  };

  // Pill badge — returns x after badge
  const chip = (text, bg, fg, x, y, w = 80) => {
    doc.roundedRect(x, y, w, 17, 4).fill(bg);
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(fg)
      .text(text, x + 6, y + 4.5, { width: w - 12, lineBreak: false });
    return x + w + 5;
  };

  // ═══════════════════════════════ PAGE 1 ═══════════════════════════════
  // Header bar
  doc.rect(0, 0, PW, 52).fill(C.dark);
  doc.circle(30, 26, 13).fill(C.brand);
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(C.white).text("SIQ", 22.5, 20.5, { lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(14).fillColor(C.white).text("SalesIQ", 52, 11, { lineBreak: false });
  doc.font("Helvetica").fontSize(7.5).fillColor("#94A3B8").text("AI Sales Intelligence Platform", 52, 28, { lineBreak: false });
  const genDate = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  doc.font("Helvetica").fontSize(7).fillColor("#64748B")
    .text(`Generated: ${genDate}`, L, 17, { width: W, align: "right", lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(7).fillColor("#F59E0B")
    .text("CONFIDENTIAL", L, 29, { width: W, align: "right", lineBreak: false });

  // Call title + status chips
  let y = 64;
  doc.font("Helvetica-Bold").fontSize(16).fillColor(C.dark)
    .text(clip(reportTitle, 95), L, y, { width: W, lineBreak: false });
  y = doc.y + 5;
  let cx = L;
  cx = chip(callTypeStr + " Call", C.lblue, "#3B82F6", cx, y, 76);
  const sentBg = sentiment === "positive" ? C.lgreen : sentiment === "negative" ? C.lred : C.lyellow;
  cx = chip(sentiment.charAt(0).toUpperCase() + sentiment.slice(1) + " Sentiment", sentBg, sentColor, cx, y, 100);
  chip(`Deal Probability: ${prob}%`, prob >= 70 ? C.lgreen : prob >= 40 ? C.lyellow : C.lred, probColor, cx, y, 114);
  y += 27;

  // Call Profile — two-column
  y = section("Call Profile", y);
  const colW  = W / 2 - 12;
  const col2x = L + W / 2 + 8;
  let ly = y, ry = y;
  ly = kv("PRODUCT / SERVICE", call.product_name || insights.productName,        L,     ly, colW); ly += 4;
  ly = kv("CUSTOMER NAME",     call.customer_name || insights.customer?.name,    L,     ly, colW); ly += 4;
  ly = kv("CUSTOMER EMAIL",    call.customer_email || insights.customer?.email,  L,     ly, colW); ly += 4;
  ly = kv("CUSTOMER PHONE",    call.customer_phone || insights.customer?.phone,  L,     ly, colW);
  ry = kv("DATE & TIME",  call.createdAt ? new Date(call.createdAt).toLocaleString() : "—", col2x, ry, colW); ry += 4;
  ry = kv("CALL ID",      call.callId,                                                       col2x, ry, colW); ry += 4;
  ry = kv("CALL TYPE",    callTypeStr,                                                        col2x, ry, colW); ry += 4;
  ry = kv("DURATION",     call.call_duration || "—",                                          col2x, ry, colW);
  y = Math.max(ly, ry) + 4;

  // Executive Summary
  y = section("Executive Summary", y);
  doc.font("Helvetica").fontSize(9).fillColor(C.slate);
  y = writeBoundedText(insights.summary || "No summary available.", L, y, W, 58, { lineGap: 1.5 }) + 4;

  // Buying Signals & Objections — two-column
  y = section("Buying Signals & Objections", y);
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.pos).text("\u25b2  BUYING SIGNALS", L,     y, { lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.neg).text("\u25bc  OBJECTIONS",     col2x, y, { lineBreak: false });
  y += 13;
  const s1 = bullets(insights.buyingSignals,  L,     y, colW, C.pos, y + 70);
  const s2 = bullets(insights.objections,     col2x, y, colW, C.neg, y + 70);
  y = Math.max(s1, s2) + 4;

  // Competitor Intelligence — two-column (only when data present)
  const hasComp = insights.competitors?.length || insights.competitorAdvantages?.length;
  if (hasComp) {
    y = section("Competitor Intelligence", y);
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.muted).text("COMPETITORS MENTIONED", L,     y, { lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.muted).text("COMPETITOR ADVANTAGES",  col2x, y, { lineBreak: false });
    y += 13;
    const c1 = bullets(insights.competitors,          L,     y, colW, C.warn, y + 60);
    const c2 = bullets(insights.competitorAdvantages, col2x, y, colW, C.warn, y + 60);
    y = Math.max(c1, c2) + 4;
  }

  // Areas for Improvement
  if (insights.improvementsNeeded?.length) {
    y = section("Areas for Improvement", y);
    y = bullets(insights.improvementsNeeded.slice(0, 4), L, y, W, C.neg, y + 50) + 4;
  }

  // Salesperson Performance & Tone
  const spPerf = insights.salespersonPerformance || {};
  const spTone = insights.salespersonTone || {};
  y = section("Salesperson Performance & Tone", y);
  const spRating = spPerf.rating ?? 5;
  const spToneLabel = (spTone.overall || "neutral").charAt(0).toUpperCase() + (spTone.overall || "neutral").slice(1);
  const ratingColor = spRating >= 7 ? C.pos : spRating >= 5 ? C.warn : C.neg;
  const ratingBg = spRating >= 7 ? C.lgreen : spRating >= 5 ? C.lyellow : C.lred;
  let spx = L;
  spx = chip(`Rating: ${spRating}/10`, ratingBg, ratingColor, spx, y, 90);
  const toneBg = spTone.overall === "confident" || spTone.overall === "professional" || spTone.overall === "friendly" || spTone.overall === "empathetic" ? C.lgreen : C.lyellow;
  const toneFg = spTone.overall === "confident" || spTone.overall === "professional" || spTone.overall === "friendly" || spTone.overall === "empathetic" ? C.pos : C.warn;
  spx = chip(`Tone: ${spToneLabel}`, toneBg, toneFg, spx, y, 100);
  y += 24;
  if (spPerf.verdict) {
    doc.font("Helvetica").fontSize(8.5).fillColor(C.slate).text(clip(spPerf.verdict, 120), L, y, { width: W, lineBreak: false });
    y += 14;
  }
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.pos).text("\u25b2  STRENGTHS", L,     y, { lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.neg).text("\u25bc  WEAKNESSES",     col2x, y, { lineBreak: false });
  y += 13;
  const sp1 = bullets(spPerf.strengths,  L,     y, colW, C.pos, y + 55);
  const sp2 = bullets(spPerf.weaknesses, col2x, y, colW, C.neg, y + 55);
  y = Math.max(sp1, sp2) + 4;

  // Recommended Follow-Up
  y = section("Recommended Follow-Up", y);
  doc.font("Helvetica").fontSize(9).fillColor(C.slate)
    .text(
      clip(insights.followUpRecommendation || "Follow up with the customer to discuss next steps.", 180),
      L,
      y,
      { width: W, lineBreak: false }
    );
  y += 14;
  if (insights.emailDraft?.subject) {
    doc.font("Helvetica").fontSize(7).fillColor(C.muted).text("SUGGESTED EMAIL SUBJECT:", L, y, { lineBreak: false });
    y += 10;
    doc.roundedRect(L, y, W, 20, 4).fill(C.bg);
    doc.font("Helvetica-Bold").fontSize(9).fillColor(C.brand)
      .text(clip(insights.emailDraft.subject, 88), L + 8, y + 5.5, { width: W - 16, lineBreak: false });
    y += 28;
  }

  // ═══════════════════════════════ PAGE 2 ═══════════════════════════════
  // Conversation Deep Dive & Key Moments
  const convo = insights.conversationAnalysis || {};
  const kMoments = insights.keyMoments || [];
  const hasMissed = (spPerf.missedOpportunities || []).length > 0;
  const hasConvo = convo.keyTopics?.length || convo.painPoints?.length || convo.actionItems?.length;

  let pageCount = 1;

  if (hasConvo || kMoments.length || hasMissed) {
    doc.addPage();
    pageCount++;
    y = 44;
    doc.font("Helvetica-Bold").fontSize(13).fillColor(C.dark).text("Conversation Deep Dive", L, y);
    y = doc.y + 10;

    // Talk Ratio
    const spPct = convo.talkRatioSalesperson || 50;
    const cuPct = convo.talkRatioCustomer || 50;
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.muted).text("TALK RATIO", L, y, { lineBreak: false });
    y += 12;
    const barW = W - 80;
    const spW = Math.round(barW * spPct / 100);
    doc.rect(L, y, spW, 14).fill(C.brand);
    doc.rect(L + spW, y, barW - spW, 14).fill("#94A3B8");
    doc.font("Helvetica-Bold").fontSize(7).fillColor(C.white)
      .text(`Rep ${spPct}%`, L + 4, y + 3.5, { lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(7).fillColor(C.white)
      .text(`Customer ${cuPct}%`, L + spW + 4, y + 3.5, { lineBreak: false });
    y += 22;

    // Quick stats row
    const qW = W / 4 - 6;
    kv("QUESTIONS BY REP", convo.questionsAskedBySalesperson ?? 0, L, y, qW);
    kv("QUESTIONS BY CUSTOMER", convo.questionsAskedByCustomer ?? 0, L + qW + 8, y, qW);
    kv("URGENCY", (convo.urgencyLevel || "medium").toUpperCase(), L + (qW + 8) * 2, y, qW);
    kv("ENGAGEMENT", `${convo.customerEngagementScore ?? 5}/10`, L + (qW + 8) * 3, y, qW);
    y += 28;

    // Key Topics & Pain Points
    if (convo.keyTopics?.length || convo.painPoints?.length) {
      y = section("Key Topics & Pain Points", y);
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.brand).text("KEY TOPICS", L, y, { lineBreak: false });
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.neg).text("PAIN POINTS", col2x, y, { lineBreak: false });
      y += 13;
      const t1 = bullets(convo.keyTopics, L, y, colW, C.brand, y + 65);
      const t2 = bullets(convo.painPoints, col2x, y, colW, C.neg, y + 65);
      y = Math.max(t1, t2) + 4;
    }

    // Action Items & Next Steps
    if (convo.actionItems?.length || convo.nextSteps?.length) {
      y = section("Action Items & Next Steps", y);
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.pos).text("ACTION ITEMS", L, y, { lineBreak: false });
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.brand).text("NEXT STEPS", col2x, y, { lineBreak: false });
      y += 13;
      const a1 = bullets(convo.actionItems, L, y, colW, C.pos, y + 65);
      const a2 = bullets(convo.nextSteps, col2x, y, colW, C.brand, y + 65);
      y = Math.max(a1, a2) + 4;
    }

    // Pricing Discussion
    if (convo.pricingDiscussed && convo.pricingDetails) {
      y = section("Pricing Discussion", y);
      doc.font("Helvetica").fontSize(9).fillColor(C.slate);
      y = writeBoundedText(convo.pricingDetails, L, y, W, 40, { lineGap: 1.5 }) + 4;
    }

    // Decision Makers
    if (convo.decisionMakers?.length) {
      y = section("Decision Makers Identified", y);
      y = bullets(convo.decisionMakers, L, y, W, C.warn, y + 40) + 4;
    }

    // Key Moments
    if (kMoments.length) {
      y = section("Key Moments", y);
      kMoments.slice(0, 5).forEach((m) => {
        if (y + 26 > SAFE_BOTTOM) return;
        const mColor = m.impact === "positive" ? C.pos : m.impact === "negative" ? C.neg : C.warn;
        doc.circle(L + 3.5, y + 5.5, 3).fill(mColor);
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor(C.slate)
          .text(clip(m.moment, 50), L + 12, y, { continued: true, lineBreak: false })
          .font("Helvetica").fillColor(C.mid)
          .text(` — ${clip(m.description, 80)}`, { lineBreak: false });
        y += 15;
      });
      y += 4;
    }

    // Missed Opportunities
    if (hasMissed) {
      y = section("Missed Opportunities", y);
      y = bullets(spPerf.missedOpportunities, L, y, W, C.neg, y + 60) + 4;
    }

    // Objection Responses
    if (convo.objectionResponses?.length) {
      y = section("Objection Handling Breakdown", y);
      convo.objectionResponses.slice(0, 4).forEach((or) => {
        if (y + 30 > SAFE_BOTTOM) return;
        const effColor = or.effectiveness === "strong" ? C.pos : or.effectiveness === "weak" ? C.neg : C.warn;
        doc.font("Helvetica-Bold").fontSize(8).fillColor(C.slate)
          .text(`"${clip(or.objection, 60)}"`, L, y, { lineBreak: false });
        y += 12;
        doc.font("Helvetica").fontSize(8).fillColor(C.mid)
          .text(`→ ${clip(or.response, 70)}`, L + 10, y, { continued: true, lineBreak: false });
        chip(or.effectiveness.toUpperCase(), or.effectiveness === "strong" ? C.lgreen : or.effectiveness === "weak" ? C.lred : C.lyellow, effColor, L + W - 70, y - 2, 60);
        y += 16;
      });
      y += 4;
    }
  }

  // ═══════════════════════════════ PAGE 3 (Or Fit on Page 2) ═══════════════════════════════
  const emailBody  = insights.emailDraft?.body;
  const transcript = call.transcript;
  if (emailBody || transcript) {
    if (pageCount < 2) {
      doc.addPage();
      pageCount++;
      y = 44;
    } else {
      y += 10;
    }

    if (emailBody && y < SAFE_BOTTOM - 60) {
      doc.font("Helvetica-Bold").fontSize(13).fillColor(C.dark).text("Follow-Up Email Draft", L, y);
      y = doc.y + 10;
      doc.roundedRect(L, y, W, 20, 4).fill(C.brand);
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(C.white)
        .text("TO: ", L + 8, y + 5.5, { continued: true })
        .font("Helvetica").fillColor(C.white)
        .text(call.customer_email || insights.customer?.email || "recipient@company.com", { lineBreak: false });
      y += 28;
      if (insights.emailDraft?.subject && y < SAFE_BOTTOM - 20) {
        doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.muted).text("SUBJECT:", L, y, { lineBreak: false });
        y += 11;
        doc.font("Helvetica-Bold").fontSize(9).fillColor(C.slate)
          .text(clip(insights.emailDraft.subject, 95), L, y, { width: W, lineBreak: false });
        y += 16;
      }
      if (y < SAFE_BOTTOM - 20) {
        doc.strokeColor(C.line).lineWidth(0.5).moveTo(L, y).lineTo(R, y).stroke();
        y += 10;
        doc.font("Helvetica").fontSize(9).fillColor(C.mid);
        const emailBlockH = Math.max(10, Math.min(180, SAFE_BOTTOM - y - 10));
        y = writeBoundedText(emailBody, L, y, W, emailBlockH, { lineGap: 2 }) + 12;
      }
    }

    if (transcript && y < SAFE_BOTTOM - 40) {
      doc.strokeColor(C.line).lineWidth(0.5).moveTo(L, y).lineTo(R, y).stroke();
      y += 8;
      doc.font("Helvetica-Bold").fontSize(13).fillColor(C.dark).text("Call Transcript", L, y);
      y = doc.y + 8;
      const MAX_CHARS  = 1200;
      const truncated  = transcript.length > MAX_CHARS;
      const displayText = truncated
        ? transcript.slice(0, MAX_CHARS) + "\n\nTranscript truncated. Full version is available in the app."
        : transcript;
      doc.font("Helvetica").fontSize(8.5).fillColor(C.mid);
      
      // Crucial: ensure height NEVER overflows current page, or PDFkit creates extra pages
      const transcriptH = Math.max(10, Math.min(300, SAFE_BOTTOM - y - 10));
      writeBoundedText(displayText, L, y, W, transcriptH, { lineGap: 1 });
    }
  }

  // To absolutely prevent PDFKit from auto-generating any pages beyond Page 2
  // We can just end the page range loop safely without buffer hacks now that layout doesn't overflow.
  const pageRange = doc.bufferedPageRange();
  const pagesToRender = Math.min(pageRange.count, 2);
  
  for (let i = 0; i < pagesToRender; i++) {
    doc.switchToPage(i);
    doc.rect(0, PH - 22, PW, 22).fill("#F1F5F9");
    doc.font("Helvetica").fontSize(7).fillColor(C.muted)
      .text("SalesIQ AI Sales Intelligence  •  CONFIDENTIAL  •  For internal use only", L, PH - 16, { width: W, lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(7).fillColor(C.muted)
      .text(`Page ${i + 1} / ${pagesToRender}`, L, PH - 16, { width: W, align: "right", lineBreak: false });
  }

  doc.end();

  const pdfBuffer = await new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  return { fileName: safeFileName, contentType: "application/pdf", buffer: pdfBuffer };
};
