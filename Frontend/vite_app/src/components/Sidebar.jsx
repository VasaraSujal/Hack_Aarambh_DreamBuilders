import React from "react";
import { NavLink } from "react-router-dom";
import {
	LayoutDashboard,
	Phone,
	Upload,
	BarChart3,
	TrendingUp,
	AlertTriangle,
	DoorClosed,
	DoorOpen,
	LogOut,
	Radio,
	User,
	Users,
	Zap,
	X,
	Package,
} from "lucide-react";


const Sidebar = ({ collapsed, onToggle, mobileOpen, onMobileClose, user, onLogout }) => {
	const sidebarWidthClass = collapsed ? "md:w-[68px]" : "md:w-[240px]";
	const mobileStateClass = mobileOpen ? "translate-x-0" : "-translate-x-full";

	const navItems = [
		{ icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
		{ icon: Upload, label: "Analyze Call", path: "/dashboard/analyze" },
		{ icon: Radio, label: "Live Copilot", path: "/dashboard/copilot" },
		{ icon: Phone, label: "All Calls", path: "/dashboard/calls" },
		{ icon: BarChart3, label: "Insights", path: "/dashboard/insights" },
		{ icon: TrendingUp, label: "Top Deals", path: "/dashboard/top-deals" },
		{ icon: AlertTriangle, label: "High Risk", path: "/dashboard/high-risk" },
		...(user?.role === "admin" ? [
			{ icon: Users, label: "Employees", path: "/dashboard/employees" },
			{ icon: Package, label: "Products", path: "/dashboard/products" }
		] : []),
		{ icon: User, label: "Profile", path: "/dashboard/profile" },
	];

	return (
		<aside
			className={`fixed inset-y-0 left-0 z-[300] flex w-[240px] flex-col border-r border-gray-200 bg-white transition-all duration-300 ${mobileStateClass} md:z-[100] md:translate-x-0 ${sidebarWidthClass}`}
		>
			<div className="flex min-h-[72px] items-center gap-3 border-b border-gray-200 px-4 py-5">
				<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#f97316,#ea580c)] text-white shadow-[0_8px_22px_rgba(249,115,22,0.35)]">
					<Zap size={20} />
				</div>

				{!collapsed && (
					<div className="min-w-0 md:block">
						<span className="block whitespace-nowrap text-[1.1rem] font-bold text-gray-900">SalesIQ</span>
						<span className="block whitespace-nowrap text-[0.7rem] text-gray-500">Revenue Intelligence</span>
					</div>
				)}

				<button
					className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition hover:bg-orange-50 hover:text-orange-600 md:hidden"
					onClick={onMobileClose}
					aria-label="Close menu"
					type="button"
				>
					<X size={18} />
				</button>
			</div>

			<button
				className="absolute right-[-14px] top-[22px] hidden h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:border-orange-500 hover:bg-orange-500 hover:text-white md:inline-flex shadow-sm"
				onClick={onToggle}
				aria-label={collapsed ? "Open sidebar" : "Close sidebar"}
				type="button"
			>
				{collapsed ? <DoorOpen size={15} /> : <DoorClosed size={15} />}
			</button>

			<nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-2 py-4">
				{navItems.map(({ icon: Icon, label, path }) => (
					<NavLink
						key={path}
						to={path}
						end={path === "/dashboard"}
						onClick={onMobileClose}
						title={collapsed ? label : undefined}
						className={({ isActive }) =>
							`sidebar-nav-link group relative flex items-center gap-3 rounded-xl px-3 py-[0.7rem] text-[0.875rem] font-medium transition ${
								isActive
									? "sidebar-nav-link--active border border-orange-200 bg-orange-50 text-orange-600"
									: "text-gray-500 hover:bg-orange-50/60 hover:text-gray-800"
							}`
						}
					>
						{({ isActive }) => (
							<>
								{isActive ? (
									<span className="absolute left-0 top-1/2 h-[70%] w-[3px] -translate-y-1/2 rounded-r bg-orange-500" />
								) : null}

								{React.createElement(Icon, { size: 20, className: "shrink-0" })}

								{!collapsed && <span className="truncate">{label}</span>}
							</>
						)}
					</NavLink>
				))}
			</nav>

			<div className="px-2 pb-3">
				<button
					type="button"
					onClick={() => {
						onLogout?.();
						onMobileClose?.();
					}}
					title={collapsed ? "Logout" : undefined}
					className="group relative flex w-full items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-[0.7rem] text-[0.875rem] font-medium text-rose-600 transition hover:bg-rose-100 hover:text-rose-700"
				>
					<LogOut size={19} className="shrink-0" />
					{!collapsed && <span className="truncate">Logout</span>}
				</button>
			</div>

			{!collapsed && (
				<div className="border-t border-gray-200 p-4">
					<div className="flex items-center gap-2 text-[0.8rem] font-semibold text-gray-700">
						<span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
						<span>System Status: Connected</span>
					</div>
					<p className="mt-1 text-[0.72rem] text-gray-400">Use global search to find calls and accounts faster.</p>
				</div>
			)}
		</aside>
	);
};

export default Sidebar;