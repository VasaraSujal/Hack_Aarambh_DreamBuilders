import { useState } from "react";
import {
	AlertTriangle,
	Building2,
	Check,
	KeyRound,
	Loader2,
	Mail,
	Save,
	Trash2,
	User,
} from "lucide-react";
import { updateUserProfile, deleteUserAccount, persistAuth, getStoredAuth } from "../lib/auth";
import { TimedUndoAction } from "../components/ui/time-undo-action";

const inputCls =
	"w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-orange-500/60 focus:bg-gray-100 focus:ring-2 focus:ring-orange-500/15";
const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500";

const SectionCard = ({ children, className = "" }) => (
	<div
		className={`rounded-2xl border border-gray-200 bg-[#ffffff]/90 p-6 shadow-[0_16px_50px_rgba(0,0,0,0.25)] backdrop-blur-md ${className}`}
	>
		{children}
	</div>
);

const Alert = ({ type, children }) => {
	const colors =
		type === "success"
			? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
			: "border-rose-500/30 bg-rose-500/10 text-rose-300";
	const Icon = type === "success" ? Check : AlertTriangle;
	return (
		<div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${colors}`}>
			<Icon size={16} className="mt-0.5 shrink-0" />
			<span>{children}</span>
		</div>
	);
};

export default function Profile({ user, token, onUserUpdate, onLogout }) {
	/* ---- Profile form ---- */
	const [name, setName] = useState(user?.name || "");
	const [email, setEmail] = useState(user?.email || "");
	const [companyName, setCompanyName] = useState(user?.company_name || "");
	const [profileSaving, setProfileSaving] = useState(false);
	const [profileMsg, setProfileMsg] = useState(null);

	/* ---- Password form ---- */
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [pwdSaving, setPwdSaving] = useState(false);
	const [pwdMsg, setPwdMsg] = useState(null);

	/* ---- Delete account ---- */
	const [deleting, setDeleting] = useState(false);
	const [deleteMsg, setDeleteMsg] = useState(null);

	const handleProfileSave = async (e) => {
		e.preventDefault();
		setProfileSaving(true);
		setProfileMsg(null);
		try {
			const res = await updateUserProfile(token, { name, email, company_name: companyName });
			const updatedUser = res.data;
			// Update stored auth with new user data
			const stored = getStoredAuth();
			if (stored) {
				persistAuth({ ...stored, user: { ...stored.user, ...updatedUser } }, stored.remember);
			}
			onUserUpdate?.({ ...user, ...updatedUser });
			setProfileMsg({ type: "success", text: "Profile updated successfully." });
		} catch (err) {
			setProfileMsg({ type: "error", text: err.message || "Failed to update profile." });
		} finally {
			setProfileSaving(false);
		}
	};

	const handlePasswordSave = async (e) => {
		e.preventDefault();
		if (newPassword !== confirmPassword) {
			setPwdMsg({ type: "error", text: "New passwords do not match." });
			return;
		}
		if (newPassword.length < 8) {
			setPwdMsg({ type: "error", text: "Password must be at least 8 characters." });
			return;
		}
		setPwdSaving(true);
		setPwdMsg(null);
		try {
			await updateUserProfile(token, { currentPassword, newPassword });
			setPwdMsg({ type: "success", text: "Password changed successfully." });
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
		} catch (err) {
			setPwdMsg({ type: "error", text: err.message || "Failed to change password." });
		} finally {
			setPwdSaving(false);
		}
	};

	const handleDeleteAccount = async () => {
		if (deleting) return;
		setDeleting(true);
		setDeleteMsg(null);
		try {
			await deleteUserAccount(token);
			onLogout?.();
		} catch (err) {
			setDeleteMsg({ type: "error", text: err.message || "Failed to delete account." });
			setDeleting(false);
		}
	};

	const getInitials = (n) => {
		if (!n) return "U";
		return n
			.split(" ")
			.map((w) => w[0])
			.slice(0, 2)
			.join("")
			.toUpperCase();
	};

	return (
		<div className="py-8 text-gray-700 animate-in fade-in duration-300">
			{/* Header */}
			<div className="mb-8">
				<h1 className="text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
					Account & Profile
				</h1>
				<p className="mt-2 text-sm text-gray-500 md:text-base">
					Manage your personal information, security settings, and account preferences.
				</p>
			</div>

			{/* Avatar + Summary */}
			<SectionCard className="mb-6">
				<div className="flex flex-col items-center gap-6 sm:flex-row">
					<div className="relative">
						<div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f97316] to-[#ea580c] text-2xl font-extrabold text-white shadow-[0_12px_32px_rgba(249,115,22,0.35)]">
							{getInitials(user?.name)}
						</div>
						<div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[#ffffff] bg-emerald-400" />
					</div>
					<div>
						<h2 className="text-xl font-bold text-gray-900">{user?.name || "Unknown"}</h2>
						<p className="text-sm text-gray-500">{user?.email}</p>
						{user?.company_name && (
							<span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-600">
								<Building2 size={11} />
								{user.company_name}
							</span>
						)}
					</div>
				</div>
			</SectionCard>

			<div className="grid gap-6 lg:grid-cols-2">
				{/* Personal Info */}
				<SectionCard>
					<div className="mb-5 flex items-center gap-2.5">
						<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15 text-orange-500">
							<User size={18} />
						</div>
						<h3 className="text-base font-bold text-gray-900">Personal Information</h3>
					</div>

					<form onSubmit={handleProfileSave} className="flex flex-col gap-4">
						<div>
							<label className={labelCls}>Full Name</label>
							<div className="relative">
								<User
									size={15}
									className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
								/>
								<input
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="Your full name"
									className={`${inputCls} pl-9`}
									required
								/>
							</div>
						</div>
						<div>
							<label className={labelCls}>Email Address</label>
							<div className="relative">
								<Mail
									size={15}
									className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
								/>
								<input
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="your@email.com"
									className={`${inputCls} pl-9`}
									required
								/>
							</div>
						</div>
						<div>
							<label className={labelCls}>Company Name</label>
							<div className="relative">
								<Building2
									size={15}
									className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
								/>
								<input
									type="text"
									value={companyName}
									onChange={(e) => setCompanyName(e.target.value)}
									placeholder="Your company"
									className={`${inputCls} pl-9`}
								/>
							</div>
						</div>

						{profileMsg && <Alert type={profileMsg.type}>{profileMsg.text}</Alert>}

						<button
							type="submit"
							disabled={profileSaving}
							className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(249,115,22,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(249,115,22,0.45)] disabled:cursor-not-allowed disabled:opacity-60"
						>
							{profileSaving ? (
								<Loader2 size={16} className="animate-spin" />
							) : (
								<Save size={16} />
							)}
							Save Changes
						</button>
					</form>
				</SectionCard>

				{/* Change Password */}
				<SectionCard>
					<div className="mb-5 flex items-center gap-2.5">
						<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
							<KeyRound size={18} />
						</div>
						<h3 className="text-base font-bold text-gray-900">Change Password</h3>
					</div>

					<form onSubmit={handlePasswordSave} className="flex flex-col gap-4">
						<div>
							<label className={labelCls}>Current Password</label>
							<input
								type="password"
								value={currentPassword}
								onChange={(e) => setCurrentPassword(e.target.value)}
								placeholder="Your current password"
								className={inputCls}
								required
							/>
						</div>
						<div>
							<label className={labelCls}>New Password</label>
							<input
								type="password"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								placeholder="Min. 8 characters"
								minLength={8}
								className={inputCls}
								required
							/>
						</div>
						<div>
							<label className={labelCls}>Confirm New Password</label>
							<input
								type="password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								placeholder="Repeat new password"
								className={inputCls}
								required
							/>
						</div>

						{pwdMsg && <Alert type={pwdMsg.type}>{pwdMsg.text}</Alert>}

						<button
							type="submit"
							disabled={pwdSaving}
							className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,212,170,0.25)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{pwdSaving ? (
								<Loader2 size={16} className="animate-spin" />
							) : (
								<KeyRound size={16} />
							)}
							Update Password
						</button>
					</form>
				</SectionCard>
			</div>

			{/* Danger Zone */}
			<SectionCard className="mt-6 border-rose-500/20 bg-rose-500/5">
				<div className="mb-4 flex items-center gap-2.5">
					<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400">
						<Trash2 size={18} />
					</div>
					<div>
						<h3 className="text-base font-bold text-gray-900">Danger Zone</h3>
						<p className="text-xs text-gray-500">Irreversible actions — proceed with caution</p>
					</div>
				</div>

				<div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<p className="font-semibold text-rose-300">Delete My Account</p>
							<p className="mt-0.5 text-xs text-gray-500">
								Permanently deletes your account and all associated call data. This cannot be undone.
							</p>
						</div>
						<div className="shrink-0">
							<TimedUndoAction
								initialSeconds={10}
								deleteLabel={deleting ? "Deleting..." : "Delete Account"}
								undoLabel="Cancel Deletion"
								onExpire={handleDeleteAccount}
								disabled={deleting}
							/>
						</div>
					</div>

					{deleteMsg && (
						<div className="mt-3">
							<Alert type={deleteMsg.type}>{deleteMsg.text}</Alert>
						</div>
					)}
				</div>
			</SectionCard>
		</div>
	);
}
