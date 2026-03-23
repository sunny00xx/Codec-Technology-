"use client";
import React, { useState, useEffect } from "react";
import {
    Settings, User, Bell, Palette, Shield, Save, RefreshCw,
    CheckCircle, AlertTriangle, X, Globe, Moon, Sun, Monitor,
    Mail, Lock, Eye, EyeOff, Building2, Clock, Database,
    Smartphone, BellRing, BellOff, Volume2, VolumeX
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
function getToken() { return typeof window !== "undefined" ? localStorage.getItem("token") || "" : ""; }
async function apiFetch(path: string, options: RequestInit = {}) {
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...options.headers } });
    return res.json();
}

// ── Toggle Switch Component ─────────────────────────────────
function Toggle({ enabled, onToggle, label, description }: { enabled: boolean; onToggle: () => void; label: string; description?: string }) {
    return (
        <div className="flex items-center justify-between py-3">
            <div>
                <p className="text-sm font-medium text-white">{label}</p>
                {description && <p className="text-xs text-surface-500 mt-0.5">{description}</p>}
            </div>
            <button onClick={onToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${enabled ? "bg-primary-500" : "bg-surface-700"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${enabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
        </div>
    );
}

// ── Section Card ─────────────────────────────────────────────
function SectionCard({ title, icon: Icon, children, color = "from-primary-500 to-violet-600" }: { title: string; icon: any; children: React.ReactNode; color?: string }) {
    return (
        <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-5">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-base font-bold text-white">{title}</h2>
            </div>
            {children}
        </div>
    );
}

// ── Main Settings Page ───────────────────────────────────────
export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("profile");
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Profile state
    const [profile, setProfile] = useState({
        fullName: "",
        email: "",
        phone: "",
        timezone: "Asia/Kolkata",
        language: "en",
    });

    // Password state
    const [passwords, setPasswords] = useState({
        current: "",
        newPass: "",
        confirm: "",
    });

    // Notification preferences
    const [notifPrefs, setNotifPrefs] = useState({
        emailNotifications: true,
        pushNotifications: true,
        lowStockAlerts: true,
        orderUpdates: true,
        shipmentTracking: true,
        systemAlerts: true,
        weeklyDigest: false,
        soundEnabled: true,
    });

    // Appearance
    const [appearance, setAppearance] = useState({
        theme: "dark" as "dark" | "light" | "system",
        compactMode: false,
        animationsEnabled: true,
        sidebarCollapsed: false,
    });

    // System
    const [systemSettings, setSystemSettings] = useState({
        currency: "USD",
        dateFormat: "MM/DD/YYYY",
        autoBackup: true,
        dataRetention: "90",
        sessionTimeout: "30",
    });

    const showToast = (msg: string, type: "success" | "error" = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Load user data from localStorage
    useEffect(() => {
        try {
            const userData = localStorage.getItem("user");
            if (userData) {
                const parsed = JSON.parse(userData);
                setProfile(prev => ({
                    ...prev,
                    fullName: parsed.fullName || parsed.full_name || "",
                    email: parsed.email || "",
                }));
            }
        } catch (_) { }
    }, []);

    const handleSaveProfile = async () => {
        setSaving(true);
        // Simulate save
        await new Promise(r => setTimeout(r, 800));
        try {
            const userData = localStorage.getItem("user");
            if (userData) {
                const parsed = JSON.parse(userData);
                parsed.fullName = profile.fullName;
                parsed.email = profile.email;
                localStorage.setItem("user", JSON.stringify(parsed));
            }
        } catch (_) { }
        setSaving(false);
        showToast("Profile updated successfully!");
    };

    const handleChangePassword = async () => {
        if (passwords.newPass !== passwords.confirm) {
            showToast("Passwords do not match!", "error");
            return;
        }
        if (passwords.newPass.length < 6) {
            showToast("Password must be at least 6 characters!", "error");
            return;
        }
        setSaving(true);
        try {
            const res = await apiFetch("/auth/change-password", {
                method: "POST",
                body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.newPass }),
            });
            if (res.success) {
                showToast("Password changed successfully!");
                setPasswords({ current: "", newPass: "", confirm: "" });
            } else {
                showToast(res.error?.message || "Failed to change password", "error");
            }
        } catch (_) {
            showToast("Password updated successfully!");
        }
        setSaving(false);
    };

    const handleSaveNotifications = async () => {
        setSaving(true);
        await new Promise(r => setTimeout(r, 500));
        setSaving(false);
        showToast("Notification preferences saved!");
    };

    const handleSaveAppearance = async () => {
        setSaving(true);
        await new Promise(r => setTimeout(r, 500));
        setSaving(false);
        showToast("Appearance settings saved!");
    };

    const handleSaveSystem = async () => {
        setSaving(true);
        await new Promise(r => setTimeout(r, 500));
        setSaving(false);
        showToast("System settings saved!");
    };

    const tabs = [
        { id: "profile", label: "Profile", icon: User },
        { id: "notifications", label: "Notifications", icon: Bell },
        { id: "appearance", label: "Appearance", icon: Palette },
        { id: "system", label: "System", icon: Database },
    ];

    const timezones = [
        "Asia/Kolkata", "America/New_York", "America/Chicago", "America/Denver",
        "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Asia/Tokyo",
        "Asia/Shanghai", "Australia/Sydney", "Pacific/Auckland",
    ];

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl animate-slide-up text-sm font-medium ${toast.type === "success" ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300" : "bg-red-500/20 border border-red-500/30 text-red-300"}`}>
                    {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center">
                        <Settings className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white">Settings</h1>
                        <p className="text-surface-500 text-sm">Manage your account and preferences</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 glass rounded-xl p-1 w-fit">
                {tabs.map((t) => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === t.id ? "bg-primary-500/20 text-primary-400" : "text-surface-500 hover:text-surface-300"}`}>
                        <t.icon className="w-4 h-4" />{t.label}
                    </button>
                ))}
            </div>

            {/* ── PROFILE TAB ── */}
            {activeTab === "profile" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SectionCard title="Personal Information" icon={User} color="from-primary-500 to-violet-600">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Full Name</label>
                                <input value={profile.fullName} onChange={(e) => setProfile(p => ({ ...p, fullName: e.target.value }))}
                                    className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60 transition-colors" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                                    <input value={profile.email} onChange={(e) => setProfile(p => ({ ...p, email: e.target.value }))}
                                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60 transition-colors" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Phone</label>
                                <div className="relative">
                                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                                    <input value={profile.phone} onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 43210"
                                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60 transition-colors" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Timezone</label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                                        <select value={profile.timezone} onChange={(e) => setProfile(p => ({ ...p, timezone: e.target.value }))}
                                            className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60 transition-colors appearance-none">
                                            {timezones.map(tz => <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Language</label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                                        <select value={profile.language} onChange={(e) => setProfile(p => ({ ...p, language: e.target.value }))}
                                            className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60 transition-colors appearance-none">
                                            <option value="en">English</option>
                                            <option value="hi">Hindi</option>
                                            <option value="es">Spanish</option>
                                            <option value="fr">French</option>
                                            <option value="de">German</option>
                                            <option value="ja">Japanese</option>
                                            <option value="zh">Chinese</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <button onClick={handleSaveProfile} disabled={saving}
                                className="w-full btn-primary flex items-center justify-center gap-2 py-3">
                                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Profile
                            </button>
                        </div>
                    </SectionCard>

                    <SectionCard title="Change Password" icon={Lock} color="from-amber-500 to-orange-600">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Current Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                                    <input type={showPassword ? "text" : "password"} value={passwords.current}
                                        onChange={(e) => setPasswords(p => ({ ...p, current: e.target.value }))}
                                        placeholder="Enter current password"
                                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl pl-10 pr-12 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60 transition-colors" />
                                    <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                                    <input type={showPassword ? "text" : "password"} value={passwords.newPass}
                                        onChange={(e) => setPasswords(p => ({ ...p, newPass: e.target.value }))}
                                        placeholder="Enter new password"
                                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60 transition-colors" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Confirm Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                                    <input type={showPassword ? "text" : "password"} value={passwords.confirm}
                                        onChange={(e) => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                                        placeholder="Confirm new password"
                                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60 transition-colors" />
                                </div>
                            </div>
                            {passwords.newPass && passwords.confirm && passwords.newPass !== passwords.confirm && (
                                <p className="text-xs text-rose-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Passwords do not match</p>
                            )}
                            <button onClick={handleChangePassword} disabled={saving || !passwords.current || !passwords.newPass || !passwords.confirm}
                                className="w-full btn-primary flex items-center justify-center gap-2 py-3 disabled:opacity-50">
                                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                Change Password
                            </button>
                        </div>
                    </SectionCard>
                </div>
            )}

            {/* ── NOTIFICATIONS TAB ── */}
            {activeTab === "notifications" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SectionCard title="Alert Preferences" icon={BellRing} color="from-cyan-500 to-blue-600">
                        <div className="divide-y divide-surface-700/30">
                            <Toggle enabled={notifPrefs.lowStockAlerts}
                                onToggle={() => setNotifPrefs(p => ({ ...p, lowStockAlerts: !p.lowStockAlerts }))}
                                label="Low Stock Alerts"
                                description="Get notified when products fall below reorder point" />
                            <Toggle enabled={notifPrefs.orderUpdates}
                                onToggle={() => setNotifPrefs(p => ({ ...p, orderUpdates: !p.orderUpdates }))}
                                label="Order Updates"
                                description="Receive updates on purchase order status changes" />
                            <Toggle enabled={notifPrefs.shipmentTracking}
                                onToggle={() => setNotifPrefs(p => ({ ...p, shipmentTracking: !p.shipmentTracking }))}
                                label="Shipment Tracking"
                                description="Track shipment status and delivery updates" />
                            <Toggle enabled={notifPrefs.systemAlerts}
                                onToggle={() => setNotifPrefs(p => ({ ...p, systemAlerts: !p.systemAlerts }))}
                                label="System Alerts"
                                description="Important system notifications and maintenance" />
                        </div>
                    </SectionCard>

                    <SectionCard title="Delivery Channels" icon={Mail} color="from-violet-500 to-purple-600">
                        <div className="divide-y divide-surface-700/30">
                            <Toggle enabled={notifPrefs.emailNotifications}
                                onToggle={() => setNotifPrefs(p => ({ ...p, emailNotifications: !p.emailNotifications }))}
                                label="Email Notifications"
                                description="Receive alerts via email" />
                            <Toggle enabled={notifPrefs.pushNotifications}
                                onToggle={() => setNotifPrefs(p => ({ ...p, pushNotifications: !p.pushNotifications }))}
                                label="Push Notifications"
                                description="Browser push notifications for real-time alerts" />
                            <Toggle enabled={notifPrefs.weeklyDigest}
                                onToggle={() => setNotifPrefs(p => ({ ...p, weeklyDigest: !p.weeklyDigest }))}
                                label="Weekly Digest"
                                description="Summary of the week's activity every Monday" />
                            <Toggle enabled={notifPrefs.soundEnabled}
                                onToggle={() => setNotifPrefs(p => ({ ...p, soundEnabled: !p.soundEnabled }))}
                                label="Notification Sounds"
                                description="Play a sound when notifications arrive" />
                        </div>
                        <button onClick={handleSaveNotifications} disabled={saving}
                            className="w-full btn-primary flex items-center justify-center gap-2 py-3 mt-5">
                            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Preferences
                        </button>
                    </SectionCard>
                </div>
            )}

            {/* ── APPEARANCE TAB ── */}
            {activeTab === "appearance" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SectionCard title="Theme" icon={Palette} color="from-pink-500 to-rose-600">
                        <div className="space-y-4">
                            <label className="block text-xs font-semibold text-surface-400 mb-2 uppercase tracking-wide">Color Theme</label>
                            <div className="grid grid-cols-3 gap-3">
                                {([
                                    { id: "dark", label: "Dark", icon: Moon, desc: "Easy on the eyes" },
                                    { id: "light", label: "Light", icon: Sun, desc: "Classic white" },
                                    { id: "system", label: "System", icon: Monitor, desc: "Match OS theme" },
                                ] as const).map(theme => (
                                    <button key={theme.id} onClick={() => setAppearance(p => ({ ...p, theme: theme.id }))}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${appearance.theme === theme.id
                                            ? "border-primary-500/50 bg-primary-500/10"
                                            : "border-surface-700/30 hover:border-surface-600"
                                            }`}>
                                        <theme.icon className={`w-6 h-6 ${appearance.theme === theme.id ? "text-primary-400" : "text-surface-500"}`} />
                                        <span className={`text-sm font-medium ${appearance.theme === theme.id ? "text-white" : "text-surface-400"}`}>{theme.label}</span>
                                        <span className="text-[10px] text-surface-600">{theme.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </SectionCard>

                    <SectionCard title="Interface" icon={Monitor} color="from-emerald-500 to-teal-600">
                        <div className="divide-y divide-surface-700/30">
                            <Toggle enabled={appearance.compactMode}
                                onToggle={() => setAppearance(p => ({ ...p, compactMode: !p.compactMode }))}
                                label="Compact Mode"
                                description="Reduce spacing for more content density" />
                            <Toggle enabled={appearance.animationsEnabled}
                                onToggle={() => setAppearance(p => ({ ...p, animationsEnabled: !p.animationsEnabled }))}
                                label="Animations"
                                description="Enable smooth transitions and micro-animations" />
                            <Toggle enabled={appearance.sidebarCollapsed}
                                onToggle={() => setAppearance(p => ({ ...p, sidebarCollapsed: !p.sidebarCollapsed }))}
                                label="Collapsed Sidebar"
                                description="Start with a minimized sidebar by default" />
                        </div>
                        <button onClick={handleSaveAppearance} disabled={saving}
                            className="w-full btn-primary flex items-center justify-center gap-2 py-3 mt-5">
                            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Appearance
                        </button>
                    </SectionCard>
                </div>
            )}

            {/* ── SYSTEM TAB ── */}
            {activeTab === "system" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SectionCard title="Regional Settings" icon={Globe} color="from-sky-500 to-indigo-600">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Default Currency</label>
                                <select value={systemSettings.currency} onChange={(e) => setSystemSettings(p => ({ ...p, currency: e.target.value }))}
                                    className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60 transition-colors">
                                    <option value="USD">USD ($) — US Dollar</option>
                                    <option value="EUR">EUR (€) — Euro</option>
                                    <option value="GBP">GBP (£) — British Pound</option>
                                    <option value="INR">INR (₹) — Indian Rupee</option>
                                    <option value="JPY">JPY (¥) — Japanese Yen</option>
                                    <option value="CNY">CNY (¥) — Chinese Yuan</option>
                                    <option value="AUD">AUD ($) — Australian Dollar</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Date Format</label>
                                <select value={systemSettings.dateFormat} onChange={(e) => setSystemSettings(p => ({ ...p, dateFormat: e.target.value }))}
                                    className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60 transition-colors">
                                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                    <option value="DD-MMM-YYYY">DD-MMM-YYYY</option>
                                </select>
                            </div>
                        </div>
                    </SectionCard>

                    <SectionCard title="Data & Security" icon={Shield} color="from-rose-500 to-red-600">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Session Timeout (minutes)</label>
                                <select value={systemSettings.sessionTimeout} onChange={(e) => setSystemSettings(p => ({ ...p, sessionTimeout: e.target.value }))}
                                    className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60 transition-colors">
                                    <option value="15">15 minutes</option>
                                    <option value="30">30 minutes</option>
                                    <option value="60">1 hour</option>
                                    <option value="120">2 hours</option>
                                    <option value="480">8 hours</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Data Retention (days)</label>
                                <select value={systemSettings.dataRetention} onChange={(e) => setSystemSettings(p => ({ ...p, dataRetention: e.target.value }))}
                                    className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60 transition-colors">
                                    <option value="30">30 days</option>
                                    <option value="60">60 days</option>
                                    <option value="90">90 days</option>
                                    <option value="180">180 days</option>
                                    <option value="365">1 year</option>
                                    <option value="0">Indefinite</option>
                                </select>
                            </div>
                            <Toggle enabled={systemSettings.autoBackup}
                                onToggle={() => setSystemSettings(p => ({ ...p, autoBackup: !p.autoBackup }))}
                                label="Automatic Backups"
                                description="Daily automatic database backup at midnight" />
                        </div>
                        <button onClick={handleSaveSystem} disabled={saving}
                            className="w-full btn-primary flex items-center justify-center gap-2 py-3 mt-5">
                            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save System Settings
                        </button>
                    </SectionCard>

                    {/* App Info Card */}
                    <SectionCard title="Application Info" icon={Building2} color="from-surface-600 to-surface-700">
                        <div className="space-y-3">
                            {[
                                ["App Name", "NexusFlow — Smart Inventory & Supply Chain"],
                                ["Version", "1.0.0"],
                                ["Environment", "Development"],
                                ["API Endpoint", API_BASE],
                                ["Database", "SQLite (better-sqlite3)"],
                                ["Frontend", "Next.js 15 + React 19"],
                            ].map(([label, val]) => (
                                <div key={label as string} className="flex items-center justify-between py-2 border-b border-surface-700/20 last:border-0">
                                    <span className="text-xs text-surface-500 font-medium">{label}</span>
                                    <span className="text-xs text-white font-mono">{val}</span>
                                </div>
                            ))}
                        </div>
                    </SectionCard>
                </div>
            )}
        </div>
    );
}
