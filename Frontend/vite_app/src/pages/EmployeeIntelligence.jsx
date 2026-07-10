import React, { createElement, useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";
import { employeeIntelligenceApi } from "../api/api";
import {
  ArrowLeft,
  AlertOctagon,
  TrendingDown,
  TrendingUp,
  Target,
  Smile,
  Meh,
  Frown,
  Activity,
  Users,
  Zap,
  Phone,
  Star,
  User,
  Shield,
  Briefcase
} from "lucide-react";

/* ── Custom tooltip ── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-[#1a1d35] px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-gray-700">{label || payload[0]?.payload?.text || payload[0]?.payload?._id}</p>
      <p className="mt-0.5 text-orange-600">{payload[0]?.value} occurrence{payload[0]?.value !== 1 ? "s" : ""}</p>
    </div>
  );
};

/* ── Badge ── */
const badgeClassMap = {
  positive: "border-emerald-500/30 bg-emerald-500/12 text-emerald-700",
  negative: "border-rose-500/30 bg-rose-500/12 text-rose-700",
  neutral: "border-amber-500/30 bg-amber-500/12 text-amber-700",
};
const Badge = ({ tone = "neutral", className = "", children }) => (
  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold ${badgeClassMap[tone] || badgeClassMap.neutral} ${className}`}>
    {children}
  </span>
);

/* ── Section card ── */
const Card = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-gray-200 bg-[#ffffff]/90 p-5 shadow-[0_16px_50px_rgba(0,0,0,0.25)] backdrop-blur-md transition hover:border-gray-300 ${className}`}>
    {children}
  </div>
);

/* ── Stat card ── */
const StatCard = ({ icon: StatIcon, label, value, gradient, sub }) => (
  <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-[#ffffff]/90 p-5 shadow-[0_16px_50px_rgba(0,0,0,0.25)] transition duration-200 hover:-translate-y-0.5 hover:border-white/20">
    <div
      className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl text-gray-900 shadow-lg"
      style={{ background: gradient }}
    >
      {createElement(StatIcon, { size: 20 })}
    </div>
    <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</p>
    <h3 className="mt-1 text-2xl font-extrabold text-gray-900">{value}</h3>
    {sub && <p className="mt-1.5 text-xs text-gray-500">{sub}</p>}
    <div
      className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-15 blur-2xl"
      style={{ background: gradient }}
    />
  </div>
);

/* ── Progress row ── */
const ProgressRow = ({ name, count, maxCount, gradient, badge }) => (
  <div className="flex items-center gap-3">
    <span className="w-40 shrink-0 truncate text-[0.82rem] text-gray-600">{name}</span>
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%`, background: gradient }}
      />
    </div>
    <Badge tone={badge}>{count}×</Badge>
  </div>
);

/* ── Detailed Insight Row ── */
const InsightRow = ({ text, count, maxCount, gradient, badge }) => (
  <div className="flex flex-col gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4 transition hover:bg-white/[0.05] hover:border-gray-200">
    <div className="flex items-start justify-between gap-4">
      <p className="text-[0.85rem] font-medium leading-relaxed text-gray-700">{text}</p>
      <Badge tone={badge} className="shrink-0">{count}×</Badge>
    </div>
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#ffffff]">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%`, background: gradient }}
      />
    </div>
  </div>
);

/* ── Loading skeleton ── */
const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse rounded-xl border border-gray-100 bg-gray-50 ${className}`} />
);

const sentimentIcons = { positive: Smile, negative: Frown, neutral: Meh };
const sentimentGradients = {
  positive: "linear-gradient(135deg,#00D4AA,#06B6D4)",
  negative: "linear-gradient(135deg,#FB923C,#EF4444)",
  neutral: "linear-gradient(135deg,#F59E0B,#FCD34D)",
};

const EmployeeIntelligence = ({ employee, token, onBack }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!employee?._id) return;

    setLoading(true);
    setError(null);

    employeeIntelligenceApi
      .getEmployeeIntelligence(employee._id, token)
      .then((res) => {
        if (!res || !res.success) {
          setError("Could not load employee intelligence.");
          return;
        }
        setData(res);
      })
      .catch(() => setError("Failed to connect to intelligence API."))
      .finally(() => setLoading(false));
  }, [employee, token]);

  if (loading) {
    return (
      <div className="py-2 animate-in fade-in duration-300">
        <div className="mb-6">
          <div className="mb-2 h-9 w-52 rounded-xl bg-gray-50" />
          <div className="h-4 w-80 rounded-lg bg-gray-100" />
        </div>
        <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-80" />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-8 flex flex-col gap-4">
        <button onClick={onBack} className="inline-flex w-fit items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-white/10">
          <ArrowLeft size={16} /> Back to Employees
        </button>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-6 text-center text-rose-700">
          {error || "No intelligence data available."}
        </div>
      </div>
    );
  }

  /* ── Extract data from backend response ── */
  const { summary, insights, recentCalls } = data;
  const emp = data.employee || employee;

  const totalCalls = summary.totalCalls;
  const avgDealProb = summary.avgDealProbability;
  const avgRepRating = summary.avgRepRating;
  const latestSummary = summary.latestPerformanceSummary;
  const avgEngagement = summary.avgCustomerEngagement;
  const sent = summary.sentiment || {};
  const domSentiment = sent.dominant || "neutral";
  const DomSentIcon = sentimentIcons[domSentiment] || Meh;
  const domGradient = sentimentGradients[domSentiment] || sentimentGradients.neutral;

  const topStrengths = insights.strengths || [];
  const topWeaknesses = insights.weaknesses || [];
  const topMissed = insights.missedOpportunities || [];
  const callTypeDist = (summary.callTypeDistribution || []).slice().sort((a, b) => b.count - a.count);

  // Pie chart: sentiment
  const sentimentPieData = [
    { name: "Positive", value: sent.positive || 0, color: "#00D4AA" },
    { name: "Negative", value: sent.negative || 0, color: "#FF6B6B" },
    { name: "Neutral", value: sent.neutral || 0, color: "#FFB347" },
  ].filter(d => d.value > 0);

  const emptyState = (msg) => (
    <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
      {msg}
    </div>
  );

  return (
    <div className="py-2 text-gray-700 animate-in fade-in duration-300 flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="flex flex-col gap-4">
        <button
          onClick={onBack}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-white/10"
        >
          <ArrowLeft size={16} /> Back to Employees
        </button>
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-orange-500/25 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-600">
            <User size={11} /> Agent Intelligence
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">{emp.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex rounded-full border border-slate-500/20 bg-slate-500/10 px-2.5 py-0.5 text-[10px] uppercase font-bold text-gray-600">{emp.designation || "Sales Representative"}</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] uppercase font-bold text-emerald-700">
              <Shield size={10} /> {emp.role || 'employee'}
            </span>
            <span className="text-xs text-gray-500">{emp.email}</span>
          </div>
          <p className="mt-3 text-sm text-gray-500 md:text-base">
            Server-aggregated performance data from <strong className="text-gray-900">{totalCalls}</strong> calls handled.
          </p>

          {/* ── AI Short Summary ── */}
          {latestSummary && (
            <div className="relative mt-5 overflow-hidden rounded-xl border border-orange-500/20 bg-gradient-to-br from-orange-100/80 to-amber-50 p-4 pl-5">
              <div className="absolute left-0 top-0 h-full w-1 bg-orange-500/50" />
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 rounded-full bg-orange-500/20 p-1.5 text-orange-500">
                  <Star size={14} />
                </div>
                <div>
                  <h4 className="flex space-x-2 text-xs font-bold uppercase tracking-wider text-orange-600">
                    Overall Agent Performance Summary
                  </h4>
                  <p className="mt-1 text-sm leading-relaxed text-gray-700">
                    {latestSummary}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Summary stat cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard icon={Phone}       label="Calls Handled"    value={totalCalls}            gradient="linear-gradient(135deg,#6C63FF,#8B5CF6)" />
        <StatCard icon={Activity}    label="Avg Deal Hit Rate" value={`${avgDealProb}%`}     gradient="linear-gradient(135deg,#8B5CF6,#D946EF)" />
        <StatCard icon={DomSentIcon} label="Call Atmosphere"   value={domSentiment.charAt(0).toUpperCase() + domSentiment.slice(1)} gradient={domGradient} />
        <StatCard icon={Star}        label="Agent Rating"      value={`${avgRepRating}/10`}     gradient="linear-gradient(135deg,#10B981,#84CC16)" />
        <StatCard icon={Users}       label="Customer Engagement" value={`${avgEngagement}/10`} gradient="linear-gradient(135deg,#06B6D4,#3B82F6)" />
      </div>

      {/* ── Sentiment Pie + Call Type Distribution ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-sm font-bold text-gray-900">Call Sentiment History</h3>
          {sentimentPieData.length > 0 ? (
            <div className="flex items-center justify-center gap-6">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={sentimentPieData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                    {sentimentPieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#f8f9fa", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2">
                {sentimentPieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <div className="h-3 w-3 rounded-full" style={{ background: d.color }} />
                    <span className="text-gray-600">{d.name}</span>
                    <span className="font-bold text-gray-900">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : emptyState("No sentiment data for this agent.")}
        </Card>

        <Card>
          <h3 className="mb-4 text-sm font-bold text-gray-900">Call Type Handled</h3>
          {callTypeDist.length > 0 ? (
            <div className="flex flex-col gap-3">
              {callTypeDist.map((item, i) => (
                <ProgressRow
                  key={i}
                  name={item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                  count={item.count}
                  maxCount={callTypeDist[0].count}
                  gradient="linear-gradient(90deg,#6C63FF,#8B5CF6)"
                  badge="neutral"
                />
              ))}
            </div>
          ) : emptyState("No call type data recorded.")}
        </Card>
      </div>

      {/* ── Strengths and Weaknesses ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <div className="mb-5 flex items-start justify-between gap-3 border-b border-white/5 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <TrendingUp size={17} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Agent Strengths</h3>
                <p className="text-xs text-gray-400">What they do extremely well</p>
              </div>
            </div>
            <Badge tone="positive" className="ml-auto">{topStrengths.length} tracked</Badge>
          </div>
          {topStrengths.length > 0 ? (
            <div className="flex flex-col gap-3">
              {topStrengths.slice(0, 5).map((item, i) => (
                <InsightRow key={i} text={item.text} count={item.count} maxCount={topStrengths[0].count} gradient="linear-gradient(90deg,#00D4AA,#06B6D4)" badge="positive" />
              ))}
            </div>
          ) : emptyState("Not enough data to determine strengths.")}
        </Card>

        <Card>
          <div className="mb-5 flex items-start justify-between gap-3 border-b border-white/5 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                <TrendingDown size={17} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Areas For Improvement</h3>
                <p className="text-xs text-gray-400">Skills slowing deals down</p>
              </div>
            </div>
            <Badge tone="neutral" className="ml-auto">{topWeaknesses.length} tracked</Badge>
          </div>
          {topWeaknesses.length > 0 ? (
            <div className="flex flex-col gap-3">
              {topWeaknesses.slice(0, 5).map((item, i) => (
                <InsightRow key={i} text={item.text} count={item.count} maxCount={topWeaknesses[0].count} gradient="linear-gradient(90deg,#F59E0B,#FCD34D)" badge="neutral" />
              ))}
            </div>
          ) : emptyState("No flagged areas for improvement.")}
        </Card>
      </div>

      {/* ── Missed Opportunities ── */}
      {topMissed.length > 0 && (
        <Card>
          <div className="mb-5 flex items-start flex-wrap gap-4 justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400"><Target size={17} /></div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Missed Opportunities</h3>
                <p className="text-xs text-gray-400">Moments where the agent could have dug deeper or closed</p>
              </div>
            </div>
            <Badge tone="negative">{topMissed.length} found</Badge>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {topMissed.slice(0, 8).map((item, i) => (
              <InsightRow key={i} text={item.text} count={item.count} maxCount={topMissed[0].count} gradient="linear-gradient(90deg,#FB7185,#EF4444)" badge="negative" />
            ))}
          </div>
        </Card>
      )}

      {/* ── Recent Calls Handled ── */}
      {recentCalls && recentCalls.length > 0 && (
        <Card>
          <div className="mb-5 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400"><Phone size={17} /></div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Recent Conversational Output</h3>
              <p className="text-xs text-gray-400">Latest calls logged under this agent</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-400">
                  <th className="py-3 pr-4">Call Title</th>
                  <th className="py-3 pr-4">Product</th>
                  <th className="py-3 pr-4">Customer</th>
                  <th className="py-3 pr-4">Sentiment</th>
                  <th className="py-3 pr-4">Deal %</th>
                  <th className="py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentCalls.map((call) => {
                  const sKey = (call.sentiment || "neutral").toLowerCase();
                  const sClass = badgeClassMap[sKey] || badgeClassMap.neutral;
                  return (
                    <tr key={call.callId} className="border-b border-white/5 transition hover:bg-white/[0.02]">
                      <td className="py-3 pr-4 font-medium text-gray-700">{call.callTitle}</td>
                      <td className="py-3 pr-4 text-gray-500">{call.productName}</td>
                      <td className="py-3 pr-4 text-gray-500">{call.customerName}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold capitalize ${sClass}`}>{sKey}</span>
                      </td>
                      <td className="py-3 pr-4 font-bold text-gray-700">{call.dealProbability}%</td>
                      <td className="py-3 text-gray-400">{call.createdAt ? new Date(call.createdAt).toLocaleDateString() : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default EmployeeIntelligence;
