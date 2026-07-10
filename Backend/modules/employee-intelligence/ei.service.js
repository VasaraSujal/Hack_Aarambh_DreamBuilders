import CallModel from "../audio/audio.model.js";
import UserModel from "../auth/user.model.js";
import { ObjectId } from "mongodb";

/**
 * Employee Intelligence Service
 * Aggregates call-level AI insights into employee-level intelligence.
 */

// ── helpers ──
const countMap = (arr) => {
  const map = {};
  (arr || []).forEach((item) => {
    const key = String(item || "").trim();
    if (key) map[key] = (map[key] || 0) + 1;
  });
  return map;
};

const sortedEntries = (map, limit = 15) =>
  Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([text, count]) => ({ text, count }));

const mergeMap = (target, source) => {
  for (const [key, val] of Object.entries(source)) {
    target[key] = (target[key] || 0) + val;
  }
};

// ── Get overview of ALL employees for a company ──
export const getEmployeeOverview = async (companyId) => {
  const collection = UserModel.getCollection();
  const employees = await collection.find(
    { companyId: companyId, role: "employee" },
    { projection: { password: 0 } }
  ).toArray();

  const calls = await CallModel.findAll({ companyId, status: "analyzed" });

  const employeeCallMap = {};
  employees.forEach((e) => {
    employeeCallMap[e._id.toString()] = {
      employee: e,
      calls: [],
    };
  });

  calls.forEach((call) => {
    if (call.employeeId && employeeCallMap[call.employeeId]) {
      employeeCallMap[call.employeeId].calls.push(call);
    }
  });

  const overview = Object.values(employeeCallMap).map(({ employee, calls: eCalls }) => {
    const total = eCalls.length;
    let posCount = 0, negCount = 0, neuCount = 0, probSum = 0;
    let totalRepRating = 0;
    let repRatedCount = 0;

    eCalls.forEach((c) => {
      const ins = c.aiInsights || {};
      const s = (ins.sentiment || "neutral").toLowerCase();
      if (s === "positive") posCount++;
      else if (s === "negative") negCount++;
      else neuCount++;
      probSum += ins.dealProbability || 0;

      const rating = c.salesperson_rating || ins.salespersonPerformance?.rating;
      if (rating) {
        totalRepRating += Number(rating);
        repRatedCount++;
      }
    });

    let dominantSentiment = "neutral";
    if (posCount >= negCount && posCount >= neuCount) dominantSentiment = "positive";
    else if (negCount > posCount && negCount > neuCount) dominantSentiment = "negative";

    return {
      employeeId: employee._id.toString(),
      name: employee.name,
      email: employee.email,
      designation: employee.designation || "Sales Representative",
      totalCalls: total,
      sentiment: {
        positive: posCount,
        negative: negCount,
        neutral: neuCount,
        dominant: dominantSentiment,
      },
      avgDealProbability: total > 0 ? Math.round(probSum / total) : 0,
      avgRepRating: repRatedCount > 0 ? Math.round((totalRepRating / repRatedCount) * 10) / 10 : 0,
    };
  });

  return overview;
};

// ── Get deep intelligence for ONE employee ──
export const getEmployeeIntelligence = async (companyId, employeeId) => {
  const collection = UserModel.getCollection();
  const employee = await collection.findOne({ _id: new ObjectId(employeeId) });

  if (!employee) throw new Error("Employee not found");
  if (employee.companyId !== companyId) throw new Error("Access denied");

  const allCalls = await CallModel.findAll({ companyId, employeeId, status: "analyzed" });

  // 4. Aggregate intelligence
  const strengths = {}; // What the employee does well
  const weaknesses = {}; // Where they need to improve
  const missedOpportunities = {}; // Opportunities missed by rep
  const callTypes = {};

  let sentimentPos = 0, sentimentNeg = 0, sentimentNeu = 0;
  let totalProb = 0;
  let totalRepRating = 0;
  let repRatedCount = 0;
  let totalEngagement = 0;
  let engagedCount = 0;

  const recentCalls = [];

  allCalls.forEach((call) => {
    const ins = call.aiInsights || {};

    // Areas where employee shines
    // We can extract from positive points or specific rep notes if stored there. 
    // We'll reuse positive points for overall positivity of their calls, or map salesperson performance directly.
    if (ins.salespersonPerformance?.strengths) {
        mergeMap(strengths, countMap(ins.salespersonPerformance.strengths));
    }
    
    if (ins.salespersonPerformance?.weaknesses) {
        mergeMap(weaknesses, countMap(ins.salespersonPerformance.weaknesses));
    }

    if (ins.salespersonPerformance?.missedOpportunities) {
        mergeMap(missedOpportunities, countMap(ins.salespersonPerformance.missedOpportunities));
    }

    // Call types
    const ct = (call.call_type || ins.callType || "other").toLowerCase();
    callTypes[ct] = (callTypes[ct] || 0) + 1;

    // Sentiment
    const sentiment = (ins.sentiment || "neutral").toLowerCase();
    if (sentiment === "positive") sentimentPos++;
    else if (sentiment === "negative") sentimentNeg++;
    else sentimentNeu++;

    // Probability
    totalProb += ins.dealProbability || 0;

    // Rating (Rep performance)
    const rating =
      call.salesperson_rating || ins.salespersonPerformance?.rating;
    if (rating) {
      totalRepRating += Number(rating);
      repRatedCount++;
    }

    // Engagement
    const eng =
      call.customer_engagement ||
      ins.conversationAnalysis?.customerEngagementScore;
    if (eng) {
      totalEngagement += Number(eng);
      engagedCount++;
    }

    // Recent calls
    recentCalls.push({
      callId: call.callId,
      callTitle:
        call.call_title || ins.callTitle || ins.productName || "Untitled Call",
      sentiment: ins.sentiment || "neutral",
      dealProbability: ins.dealProbability || 0,
      customerName:
        call.customer_name || ins.customer?.name || "Unknown",
      productName: call.product_name || ins.productName || "General",
      callType: call.call_type || ins.callType || "other",
      createdAt: call.createdAt,
      managerSummary: ins.coachingActions?.managerSummary || ins.salespersonPerformance?.verdict || null,
    });
  });

  // Sort recent calls by date
  recentCalls.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  const totalCalls = allCalls.length;

  let dominantSentiment = "neutral";
  if (sentimentPos >= sentimentNeg && sentimentPos >= sentimentNeu)
    dominantSentiment = "positive";
  else if (sentimentNeg > sentimentPos && sentimentNeg > sentimentNeu)
    dominantSentiment = "negative";

  const topStrengthsArr = sortedEntries(strengths);
  const topWeaknessesArr = sortedEntries(weaknesses);
  const topMissedArr = sortedEntries(missedOpportunities);

  const cleanStr = (str) => {
    if (!str) return "";
    let s = str.replace(/^the salesperson/i, "they").trim();
    if (!s.endsWith(".")) s += ".";
    return s.charAt(0).toLowerCase() + s.slice(1);
  };

  const topStr = topStrengthsArr.length > 0 ? cleanStr(topStrengthsArr[0].text) : "managing basic communication.";
  const topWeak = topWeaknessesArr.length > 0 ? cleanStr(topWeaknessesArr[0].text) : "no major weaknesses are currently flagged.";
  const topMiss = topMissedArr.length > 0 ? cleanStr(topMissedArr[0].text) : "no significant missed opportunities were noted.";

  const avgRatingScore = repRatedCount > 0 ? Math.round((totalRepRating / repRatedCount) * 10) / 10 : 0;

  const generatedSummary = totalCalls > 0 
    ? `${employee.name} has handled ${totalCalls} calls with an average performance rating of ${avgRatingScore}/10. On the positive side, ${topStr} However, their primary negative trait is that ${topWeak} As a key improvement to elevate their deal hit rate, they should specifically focus on avoiding missed opportunities like when ${topMiss}`
    : "Not enough data to generate a comprehensive employee summary.";

  return {
    employee: {
      employeeId: employee._id.toString(),
      name: employee.name,
      email: employee.email,
      designation: employee.designation || "Sales Representative",
    },
    summary: {
      totalCalls,
      latestPerformanceSummary: generatedSummary,
      avgDealProbability:
        totalCalls > 0 ? Math.round(totalProb / totalCalls) : 0,
      avgRepRating:
        repRatedCount > 0
          ? Math.round((totalRepRating / repRatedCount) * 10) / 10
          : 0,
      avgCustomerEngagement:
        engagedCount > 0
          ? Math.round((totalEngagement / engagedCount) * 10) / 10
          : 0,
      sentiment: {
        positive: sentimentPos,
        negative: sentimentNeg,
        neutral: sentimentNeu,
        dominant: dominantSentiment,
      },
      callTypeDistribution: Object.entries(callTypes)
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => ({ type, count })),
    },
    insights: {
      strengths: topStrengthsArr,
      weaknesses: topWeaknessesArr,
      missedOpportunities: topMissedArr,
    },
    recentCalls: recentCalls.slice(0, 10),
  };
};
