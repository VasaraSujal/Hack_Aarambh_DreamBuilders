import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dashboardApi } from "../api/api";
import { AlertTriangle, ArrowUpRight, Shield } from "lucide-react";

const sentimentClass = (sentiment) => {
  const normalized = (sentiment || "").toLowerCase();
  if (normalized === "negative") {
    return "border-rose-500/35 bg-rose-500/15 text-rose-300";
  }
  if (normalized === "positive") {
    return "border-emerald-500/35 bg-emerald-500/15 text-emerald-300";
  }
  return "border-amber-400/35 bg-amber-400/12 text-amber-300";
};

const HighRisk = ({ token }) => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getCalls(token)
      .then((r) => {
        // Calls with dealProbability < 40 or negative sentiment
        const risky = (r.calls || []).filter((c) => {
          const prob = c.dealProbability ?? 100;
          const sentiment = c.sentiment || "";
          return prob < 40 || sentiment === "negative";
        });
        setCalls(risky);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="py-8 text-gray-700">
      <div className="mb-4">
        <div>
        <h1 className="text-[1.9rem] font-extrabold text-gray-900">At-Risk Opportunities</h1>
          <p className="mt-1.5 text-[0.95rem] text-gray-500">
        Calls flagged for low close probability or negative customer sentiment, requiring fast intervention.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl border border-gray-100 bg-[linear-gradient(110deg,rgba(255,255,255,0.03),rgba(255,255,255,0.08),rgba(255,255,255,0.03))] bg-size-[200%_100%]"
            />
          ))}
        </div>
      ) : calls.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-gray-300 px-4 py-16 text-center text-gray-500">
          <Shield size={48} className="mb-2 text-emerald-400" />
          <h3 className="text-lg font-semibold text-emerald-300">No high-risk deals!</h3>
          <p className="mt-1">All analyzed calls look healthy. 🎉</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {calls.map((call) => {
            const ins  = call.aiInsights || {};
            const prob = call.dealProbability ?? 0;
            const sentiment = call.sentiment || "";
            const riskColor = prob < 20 || sentiment === "negative"
              ? "#ef4444"
              : "#f97316";
            const riskLabel = prob < 20 || sentiment === "negative" ? "Critical" : "High";

            return (
              <div
                key={call.callId}
                className="rounded-2xl border bg-white/95 p-4"
                style={{ borderColor: `${riskColor}99` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-1.5 flex flex-wrap gap-1.5">
                      <span
                        className="inline-flex items-center rounded-full border px-2.5 py-1 text-[0.75rem] font-bold"
                        style={{ background: `${riskColor}22`, color: riskColor, borderColor: `${riskColor}44` }}
                      >
                        <AlertTriangle size={11} className="mr-1" />
                        {riskLabel} Risk
                      </span>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[0.75rem] font-semibold capitalize ${sentimentClass(sentiment)}`}>
                        {sentiment || "unknown"}
                      </span>
                    </div>

                    <Link
                      to={`/dashboard/calls/${call.callId}`}
                      className="inline-flex items-center gap-1.5 text-[0.95rem] font-bold text-gray-900 transition hover:text-orange-600"
                    >
                      {call.callTitle || call.productName || call.product_name || "Sales Call"} <ArrowUpRight size={13} />
                    </Link>

                    <p className="mt-0.5 text-[0.78rem] text-gray-400">
                      {call.summary?.substring(0, 70)}{call.summary?.length > 70 ? "..." : ""}
                    </p>

                    <p className="mt-1 text-[0.72rem] capitalize text-sky-400">
                      Type: {call.callType || "other"}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="text-[1.8rem] font-black leading-none" style={{ color: riskColor }}>
                      {prob}%
                    </div>
                    <div className="text-[0.72rem] text-gray-400">Probability</div>
                  </div>
                </div>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/12">
                  <div className="h-full rounded-full" style={{ width: `${prob}%`, background: riskColor }} />
                </div>

                {ins.objections?.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-1 text-[0.75rem] font-semibold text-gray-400">
                      Objections:
                    </p>
                    {ins.objections.slice(0, 2).map((o, i) => (
                      <span
                        key={i}
                        className="mr-1.5 mt-1 inline-flex items-center rounded-full border border-rose-500/35 bg-rose-500/15 px-2.5 py-1 text-[0.73rem] font-semibold text-rose-300"
                      >
                        ⚠️ {o.substring(0, 45)}{o.length > 45 ? "..." : ""}
                      </span>
                    ))}
                  </div>
                )}

                {(ins.followUpRecommendation || call.aiInsights?.followUpRecommendation) && (
                  <p className="mt-3 text-[0.8rem] italic text-sky-400">
                    💡 {ins.followUpRecommendation || call.aiInsights?.followUpRecommendation}
                  </p>
                )}

                <p className="mt-2 text-[0.75rem] text-gray-400">
                  {call.createdAt ? new Date(call.createdAt).toLocaleDateString() : "—"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HighRisk;
