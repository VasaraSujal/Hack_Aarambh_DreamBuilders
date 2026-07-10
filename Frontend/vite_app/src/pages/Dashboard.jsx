import { createElement, useEffect, useState } from "react";
import { Link, useNavigate, useOutlet } from "react-router-dom";
import {
	Activity,
	AlertTriangle,
	ArrowUpRight,
	BarChart2,
	CheckCircle,
	Frown,
	Meh,
	Phone,
	Smile,
	TrendingUp,
	Users,
	Zap,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import { dashboardApi } from "../api/api";

const defaultAnalytics = {
	totalCalls: 0,
	avgDealProbability: 0,
	positiveCalls: 0,
	neutralCalls: 0,
	negativeCalls: 0,
	avgRepRating: 0,
	avgCustomerEngagement: 0,
	statusBreakdown: {
		analyzed: 0,
		transcribed: 0,
		uploaded: 0,
	},
};

const defaultCompetitors = {
	competitorsFrequency: [],
	topAdvantages: [],
};

const defaultCalls = [];

const sentimentMap = {
	positive: {
		label: "Positive",
		icon: Smile,
		className: "border-emerald-200 bg-emerald-50 text-emerald-700",
	},
	negative: {
		label: "Negative",
		icon: Frown,
		className: "border-rose-200 bg-rose-50 text-rose-600",
	},
	neutral: {
		label: "Neutral",
		icon: Meh,
		className: "border-amber-200 bg-amber-50 text-amber-700",
	},
};

const cardClassName =
	"rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]";

const StatCard = ({ icon: Icon, label, value, sub, gradient }) => (
	<div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-[0_8px_30px_rgba(249,115,22,0.12)]">
		<div
			className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg"
			style={{ background: gradient }}
		>
			{createElement(Icon, { size: 22 })}
		</div>
		<p className="text-sm font-medium text-gray-500">{label}</p>
		<h2 className="mt-1 text-3xl font-extrabold text-gray-900">{value}</h2>
		{sub ? <p className="mt-1 text-xs text-gray-400">{sub}</p> : null}
		<div
			className="pointer-events-none absolute -right-6 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full opacity-10 blur-2xl"
			style={{ background: gradient }}
		/>
	</div>
);

const SentimentBadge = ({ sentiment }) => {
	const key = sentiment?.toLowerCase() || "neutral";
	const config = sentimentMap[key] || sentimentMap.neutral;
	const Icon = config.icon;

	return (
		<span
			className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${config.className}`}
		>
			<Icon size={12} />
			{config.label}
		</span>
	);
};

const ProgressRow = ({ label, count, maxCount, gradient }) => (
	<div className="flex items-center gap-3">
		<span className="w-28 shrink-0 truncate text-sm text-gray-600 sm:w-36">{label}</span>
		<div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
			<div
				className="h-full rounded-full transition-all duration-700"
				style={{ width: `${(count / maxCount) * 100}%`, background: gradient }}
			/>
		</div>
		<span className="w-6 text-right text-sm font-bold text-gray-700">{count}</span>
	</div>
);

const Dashboard = ({ user: initialUser, token, onLogout }) => {
	const [user, setUser] = useState(initialUser);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);
	const [analytics, setAnalytics] = useState(defaultAnalytics);
	const [calls, setCalls] = useState(defaultCalls);
	const [competitors, setCompetitors] = useState(defaultCompetitors);
	const [riskCalls, setRiskCalls] = useState([]);
	const [dashboardLoading, setDashboardLoading] = useState(true);
	const [dashboardError, setDashboardError] = useState("");
	const navigate = useNavigate();
	const outlet = useOutlet();

	useEffect(() => {
		setUser(initialUser);
	}, [initialUser]);

	useEffect(() => {
		const fetchDashboardData = async () => {
			setDashboardLoading(true);
			setDashboardError("");

			try {
				const [analyticsRes, callsRes, competitorsRes, riskRes] = await Promise.all([
					dashboardApi.getAnalytics(token),
					dashboardApi.getCalls(token),
					dashboardApi.getCompetitors(token),
					dashboardApi.getRiskRadar(token),
				]);

				if (analyticsRes?.analytics) {
					setAnalytics(analyticsRes.analytics);
				}

				if (Array.isArray(callsRes?.calls)) {
					setCalls(callsRes.calls);
				}

				if (competitorsRes?.competitorInsights) {
					setCompetitors(competitorsRes.competitorInsights);
				}

				if (Array.isArray(riskRes?.riskCalls)) {
					setRiskCalls(riskRes.riskCalls);
				}
			} catch {
				setDashboardError("Could not connect to backend dashboard data.");
			} finally {
				setDashboardLoading(false);
			}
		};

		fetchDashboardData();
	}, [token]);

	const sentimentData = [
		{ name: "Positive", value: analytics.positiveCalls, color: "#10b981" },
		{ name: "Negative", value: analytics.negativeCalls, color: "#f43f5e" },
		{ name: "Neutral", value: analytics.neutralCalls, color: "#f59e0b" },
	].filter((item) => item.value > 0);

	const sentimentTotal = sentimentData.reduce((sum, item) => sum + item.value, 0);
	const recentCalls = calls.slice(0, 6);
	const sentimentGradient = (() => {
		if (!sentimentTotal) {
			return "conic-gradient(#e5e7eb 0deg 360deg)";
		}

		let start = 0;
		const parts = sentimentData.map((item) => {
			const angle = (item.value / sentimentTotal) * 360;
			const part = `${item.color} ${start}deg ${start + angle}deg`;
			start += angle;
			return part;
		});

		return `conic-gradient(${parts.join(", ")})`;
	})();

	const handleLogout = () => {
		if (onLogout) {
			onLogout();
		}

		navigate("/login", { replace: true });
	};

	const mainOffsetClass = sidebarCollapsed ? "md:ml-[68px]" : "md:ml-[240px]";

	return (
		<div
			className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-orange-50/60 via-white to-amber-50/40 text-gray-800"
		>
			<Sidebar
				collapsed={sidebarCollapsed}
				onToggle={() => setSidebarCollapsed((prev) => !prev)}
				mobileOpen={mobileOpen}
				onMobileClose={() => setMobileOpen(false)}
				user={user}
				onLogout={handleLogout}
			/>
			<Topbar
				sidebarCollapsed={sidebarCollapsed}
				onMobileMenu={() => setMobileOpen(true)}
				user={user}
				onLogout={handleLogout}
			/>

			{mobileOpen ? (
				<div
					className="fixed inset-0 z-299 bg-black/30 backdrop-blur-[2px] md:hidden"
					onClick={() => setMobileOpen(false)}
				/>
			) : null}

			<div className="pointer-events-none absolute left-[8%] top-[12%] h-96 w-96 rounded-full bg-orange-300/10 blur-[120px]" />
			<div className="pointer-events-none absolute right-[8%] top-0 h-80 w-80 rounded-full bg-amber-300/10 blur-[120px]" />

			<div className={`relative z-10 pt-16 transition-[margin] duration-300 ${mainOffsetClass}`}>
				<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-12 lg:py-10">
				{outlet ? (
					outlet
				) : (
					<>
				{dashboardLoading ? (
					<>
						<div className="mb-8 flex items-start justify-between gap-4">
							<div>
								<h1 className="text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
									Revenue Performance Command Center
								</h1>
							</div>
						</div>

						<div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
							{[...Array(6)].map((_, i) => (
								<div
									key={i}
									className="h-27 animate-pulse rounded-2xl border border-gray-200 bg-gray-100"
								/>
							))}
						</div>

						<div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
							<div className="h-72 animate-pulse rounded-2xl border border-gray-200 bg-gray-100" />
							<div className="h-72 animate-pulse rounded-2xl border border-gray-200 bg-gray-100" />
						</div>
					</>
				) : (
					<>
				{dashboardError ? (
					<div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
						{dashboardError}
					</div>
				) : null}
				<div className="mb-8 flex flex-wrap items-start justify-between gap-4">
					<div>
						<h1 className="text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
							Revenue Performance Command Center
						</h1>
						<p className="mt-2 max-w-2xl text-sm text-gray-500 md:text-base">
							Monitor pipeline health, call quality, and opportunity momentum from one real-time workspace.
						</p>
						{user ? (
							<p className="mt-3 text-sm text-gray-600">
								Signed in as <span className="font-semibold text-gray-900">{user.name}</span>
								{(user.company_name || user.companyName) ? ` · ${user.company_name || user.companyName}` : ""}
							</p>
						) : null}
					</div>

					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={handleLogout}
							className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 shadow-sm"
						>
							Logout
						</button>
					</div>
				</div>

				<div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					<StatCard
						icon={Phone}
						label="Analyzed Calls"
						value={analytics.totalCalls}
						sub="Successfully processed"
						gradient="linear-gradient(135deg,#f97316,#ea580c)"
					/>
					<StatCard
						icon={TrendingUp}
						label="Avg. Deal Probability"
						value={`${analytics.avgDealProbability}%`}
						sub="Across all analyzed calls"
						gradient="linear-gradient(135deg,#f59e0b,#d97706)"
					/>
					<StatCard
						icon={Smile}
						label="Positive Calls"
						value={analytics.positiveCalls}
						sub={`${analytics.neutralCalls} neutral · ${analytics.negativeCalls} negative`}
						gradient="linear-gradient(135deg,#10b981,#059669)"
					/>
					<StatCard
						icon={Users}
						label="Avg. Rep Rating"
						value={`${analytics.avgRepRating}/10`}
						sub="Salesperson performance score"
						gradient="linear-gradient(135deg,#fb923c,#f97316)"
					/>
					<StatCard
						icon={Activity}
						label="Avg. Engagement"
						value={`${analytics.avgCustomerEngagement}/10`}
						sub="Customer engagement level"
						gradient="linear-gradient(135deg,#f43f5e,#e11d48)"
					/>
					<StatCard
						icon={BarChart2}
						label="Pipeline Status"
						value={`${analytics.statusBreakdown.analyzed} done`}
						sub={`${analytics.statusBreakdown.transcribed} transcribed · ${analytics.statusBreakdown.uploaded} uploaded`}
						gradient="linear-gradient(135deg,#8b5cf6,#7c3aed)"
					/>
				</div>

				<div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
					<section className={cardClassName}>
						<div className="mb-6 flex items-center justify-between gap-3">
							<h3 className="text-lg font-bold text-gray-900">Customer Sentiment Distribution</h3>
							<Activity size={18} className="text-orange-500" />
						</div>

						{sentimentTotal ? (
							<div className="flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:justify-between">
								<div className="relative h-56 w-56 shrink-0 rounded-full" style={{ background: sentimentGradient }}>
									<div className="absolute inset-8 rounded-full bg-white ring-1 ring-gray-100" />
									<div className="absolute inset-0 grid place-items-center text-center">
										<div>
											<p className="text-3xl font-extrabold text-gray-900">{sentimentTotal}</p>
											<p className="text-xs uppercase tracking-[0.18em] text-gray-400">Total Calls</p>
										</div>
									</div>
								</div>

								<div className="grid flex-1 gap-3">
									{sentimentData.map((item) => (
										<div key={item.name} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
											<div className="flex items-center gap-3">
												<span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
												<span className="text-sm font-medium text-gray-700">{item.name}</span>
											</div>
											<div className="text-right">
												<p className="text-base font-bold text-gray-900">{item.value}</p>
												<p className="text-xs text-gray-400">
													{Math.round((item.value / sentimentTotal) * 100)}%
												</p>
											</div>
										</div>
									))}
								</div>
							</div>
						) : (
							<div className="grid h-56 place-items-center rounded-xl border border-dashed border-gray-200 text-sm text-gray-400">
								No data yet.
							</div>
						)}
					</section>

					<section className={cardClassName}>
						<div className="mb-6 flex items-center justify-between gap-3">
							<h3 className="text-lg font-bold text-gray-900">Top Competitor Mentions</h3>
							<Users size={18} className="text-amber-500" />
						</div>

						<div className="grid gap-4">
							{competitors.competitorsFrequency.map((item) => (
								<ProgressRow
									key={item.name}
									label={item.name}
									count={item.count}
									maxCount={competitors.competitorsFrequency[0].count}
									gradient="linear-gradient(90deg,#f97316,#ea580c)"
								/>
							))}
						</div>
					</section>
				</div>

				<section className={`${cardClassName} mt-6`}>
					<div className="mb-6 flex items-center justify-between gap-3">
						<div>
							<h3 className="text-lg font-bold text-gray-900">Why Customers Prefer Competitors</h3>
							<p className="mt-1 text-sm text-gray-500">Most common patterns pulled from recent conversations.</p>
						</div>
						<AlertTriangle size={18} className="text-rose-500" />
					</div>

					<div className="grid gap-4">
						{competitors.topAdvantages.map((item) => (
							<ProgressRow
								key={item.advantage}
								label={item.advantage}
								count={item.count}
								maxCount={competitors.topAdvantages[0].count}
								gradient="linear-gradient(90deg,#f43f5e,#e11d48)"
							/>
						))}
					</div>
				</section>

			{riskCalls.length ? (
				<section className={`${cardClassName} mt-6`}>
					<div className="mb-6 flex items-center justify-between gap-3">
						<div>
							<h3 className="text-lg font-bold text-gray-900">⚡ Risk Radar — Deals Needing Attention</h3>
							<p className="mt-1 text-sm text-gray-500">{riskCalls.length} deal{riskCalls.length > 1 ? 's' : ''} at risk based on AI analysis.</p>
						</div>
						<AlertTriangle size={18} className="text-rose-500" />
					</div>
					<div className="flex flex-col gap-3">
						{riskCalls.slice(0, 5).map((rc) => {
							const rColor = rc.riskLevel === 'critical' ? '#e11d48' : rc.riskLevel === 'high' ? '#d97706' : '#0ea5e9';
							const rBg = rc.riskLevel === 'critical' ? 'border-rose-200 bg-rose-50' : rc.riskLevel === 'high' ? 'border-amber-200 bg-amber-50' : 'border-sky-200 bg-sky-50';
							return (
								<Link key={rc.callId} to={`/dashboard/calls/${rc.callId}`} className={`rounded-xl border ${rBg} p-4 transition hover:shadow-sm`}>
									<div className="flex flex-wrap items-center justify-between gap-2">
										<div className="flex items-center gap-2">
											<span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: rColor }} />
											<span className="text-sm font-bold text-gray-900">{rc.callTitle}</span>
											<span className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase" style={{ borderColor: `${rColor}55`, color: rColor }}>{rc.riskLevel}</span>
										</div>
										<span className="text-xs font-bold" style={{ color: rColor }}>{rc.dealProbability}%</span>
									</div>
									{rc.riskSummary ? <p className="mt-1.5 text-sm text-gray-500">{rc.riskSummary.length > 120 ? `${rc.riskSummary.slice(0, 120)}...` : rc.riskSummary}</p> : null}
									{rc.topAction ? <p className="mt-1.5 text-xs text-gray-600">→ <span className="font-semibold">{rc.topAction.action}</span></p> : null}
								</Link>
							);
						})}
					</div>
				</section>
			) : null}

			<section className={`${cardClassName} mt-6`}>
					<div className="mb-6 flex flex-wrap items-center justify-between gap-3">
						<div>
							<h3 className="text-lg font-bold text-gray-900">Recent Analyzed Calls</h3>
							<p className="mt-1 text-sm text-gray-500">Latest summaries, sentiment, and deal confidence in one view.</p>
						</div>
						<Link
							to="/"
							className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 shadow-sm"
						>
							Back to Landing <ArrowUpRight size={14} />
						</Link>
					</div>

					<div className="overflow-x-auto">
						<div className="min-w-180">
							<div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b border-gray-200 pb-3 text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
								<span>Product / Summary</span>
								<span>Sentiment</span>
								<span>Deal Probability</span>
								<span>Date</span>
							</div>

							<div className="divide-y divide-gray-100">
								{recentCalls.map((call) => {
									const probability = call.dealProbability;
									const probabilityColor =
										probability >= 70 ? "#10b981" : probability >= 40 ? "#f59e0b" : "#f43f5e";

									return (
										<div
											key={call.callId}
											className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 py-4 text-sm text-gray-600 transition hover:bg-gray-50"
										>
											<div>
												<p className="font-semibold text-gray-900">{call.productName}</p>
												<p className="mt-1 text-xs leading-5 text-gray-400">
													{call.summary.length > 90 ? `${call.summary.slice(0, 90)}...` : call.summary}
												</p>
											</div>

											<div className="self-center">
												<SentimentBadge sentiment={call.sentiment} />
											</div>

											<div className="self-center">
												<div className="flex items-center gap-2">
													<div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
														<div
															className="h-full rounded-full"
															style={{ width: `${probability}%`, backgroundColor: probabilityColor }}
														/>
													</div>
													<span className="text-xs font-bold" style={{ color: probabilityColor }}>
														{probability}%
													</span>
												</div>
											</div>

											<div className="self-center text-xs text-gray-400">
												{new Date(call.createdAt).toLocaleDateString()}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					</div>
				</section>
				</>
				)}
				</>
				)}
				</div>
			</div>
		</div>
	);
};

export default Dashboard;