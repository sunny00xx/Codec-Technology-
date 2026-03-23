"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
    Truck, Plus, Search, Edit2, Trash2, Eye, Star, MapPin, Phone,
    Mail, AlertTriangle, CheckCircle, X, Save, RefreshCw,
    Shield, ShieldOff, FileText, TrendingUp, Calendar, XCircle,
    BarChart3, Globe, Users, Clock
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
function getToken() { return typeof window !== "undefined" ? localStorage.getItem("token") || "" : ""; }
async function apiFetch(path: string, options: RequestInit = {}) {
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...options.headers } });
    return res.json();
}

function Modal({ open, title, onClose, children, wide }: any) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative z-10 w-full ${wide ? "max-w-2xl" : "max-w-xl"} mx-4 glass-strong rounded-2xl shadow-2xl overflow-hidden animate-slide-up`}>
                <div className="flex items-center justify-between p-6 border-b border-surface-700/50">
                    <h2 className="text-lg font-bold text-white">{title}</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-700/50 text-surface-400 hover:text-white transition-all"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
            </div>
        </div>
    );
}

// ============================================================
// SUPPLIER FORM
// ============================================================
function SupplierForm({ initial, onSubmit, loading }: any) {
    const [form, setForm] = useState({
        name: initial?.name || "",
        supplier_code: initial?.supplier_code || "",
        contact_person: initial?.contact_person || "",
        email: initial?.email || "",
        phone: initial?.phone || "",
        address: initial?.address || "",
        city: initial?.city || "",
        state: initial?.state || "",
        country: initial?.country || "",
        payment_terms: initial?.payment_terms || "NET30",
        lead_time_days: initial?.lead_time_days || "7",
        contract_start_date: initial?.contract_start_date?.slice(0, 10) || "",
        contract_end_date: initial?.contract_end_date?.slice(0, 10) || "",
        notes: initial?.notes || "",
    });
    const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));
    const terms = ["NET7", "NET15", "NET30", "NET45", "NET60", "COD", "ADVANCE"];

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Supplier Name *</label>
                    <input value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="e.g. Acme Electronics Ltd."
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Supplier Code</label>
                    <input value={form.supplier_code} onChange={(e) => set("supplier_code", e.target.value)} placeholder="SUP-0001"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Contact Person</label>
                    <input value={form.contact_person} onChange={(e) => set("contact_person", e.target.value)} placeholder="John Smith"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Email</label>
                    <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="supplier@company.com"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Phone</label>
                    <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98765 43210"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60" />
                </div>
                <div className="col-span-2">
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Address</label>
                    <input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Street address"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">City</label>
                    <input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Delhi"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Country</label>
                    <input value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="India"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Payment Terms</label>
                    <select value={form.payment_terms} onChange={(e) => set("payment_terms", e.target.value)}
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60">
                        {terms.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Lead Time (days)</label>
                    <input type="number" value={form.lead_time_days} onChange={(e) => set("lead_time_days", e.target.value)} placeholder="7"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Contract Start</label>
                    <input type="date" value={form.contract_start_date} onChange={(e) => set("contract_start_date", e.target.value)}
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Contract End</label>
                    <input type="date" value={form.contract_end_date} onChange={(e) => set("contract_end_date", e.target.value)}
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60" />
                </div>
                <div className="col-span-2">
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Notes</label>
                    <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Additional notes..."
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60 resize-none" />
                </div>
            </div>
            <button type="submit" disabled={loading} className="w-full btn-primary flex items-center justify-center gap-2 py-3">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {initial ? "Update Supplier" : "Add Supplier"}
            </button>
        </form>
    );
}

// ============================================================
// SCORE BADGE
// ============================================================
function ScoreBadge({ score }: { score: number }) {
    const color = score >= 80 ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
        : score >= 60 ? "text-amber-400 bg-amber-400/10 border-amber-400/20"
            : "text-rose-400 bg-rose-400/10 border-rose-400/20";
    return (
        <div className={`flex items-center gap-1.5 border px-3 py-1 rounded-full text-sm font-bold ${color}`}>
            <Star className="w-3.5 h-3.5" />
            {score}
        </div>
    );
}

// ============================================================
// SCORECARD RADAR (CSS-based hexagon chart)
// ============================================================
function ScorecardRadar({ data }: { data: any }) {
    if (!data) return null;
    const metrics = [
        { label: "Delivery", value: data.delivery_score || 0 },
        { label: "Fulfillment", value: data.fulfillment_score || 0 },
        { label: "Quality", value: data.quality_score || 0 },
    ];
    return (
        <div className="space-y-3">
            {metrics.map((m) => (
                <div key={m.label}>
                    <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-surface-400 font-medium">{m.label}</span>
                        <span className="text-white font-bold">{m.value}%</span>
                    </div>
                    <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${m.value >= 80 ? "bg-emerald-400" : m.value >= 60 ? "bg-amber-400" : "bg-rose-400"}`}
                            style={{ width: `${m.value}%` }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ============================================================
// SUPPLIER CARD
// ============================================================
function SupplierCard({ s, onEdit, onDelete, onView, onToggleBlacklist }: any) {
    const score = s.rating || 0;
    return (
        <div className={`glass-card p-5 group hover:border-primary-500/30 transition-all duration-300 ${s.is_blacklisted ? "border-rose-500/30 bg-rose-500/5" : ""}`}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.is_blacklisted ? "bg-rose-500/20" : "bg-gradient-to-br from-emerald-500 to-cyan-600"}`}>
                        <Truck className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-white text-sm truncate">{s.name}</h3>
                        <span className="text-[10px] font-mono text-surface-500">{s.supplier_code}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {s.is_blacklisted && (
                        <span className="text-[10px] font-bold text-rose-400 bg-rose-400/10 border border-rose-400/20 px-2 py-0.5 rounded-full">Blacklisted</span>
                    )}
                    {s.contract_expiring && !s.is_blacklisted && (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">Contract Expiring</span>
                    )}
                </div>
            </div>

            <div className="space-y-1.5 mb-4">
                {s.contact_person && (
                    <div className="flex items-center gap-2 text-xs text-surface-500">
                        <Users className="w-3 h-3 flex-shrink-0" />
                        <span>{s.contact_person}</span>
                    </div>
                )}
                {s.email && (
                    <div className="flex items-center gap-2 text-xs text-surface-500">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{s.email}</span>
                    </div>
                )}
                {s.city && (
                    <div className="flex items-center gap-2 text-xs text-surface-500">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span>{[s.city, s.country].filter(Boolean).join(", ")}</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-surface-800/40 rounded-lg p-2 text-center">
                    <p className="text-sm font-bold text-white">{s.total_orders || 0}</p>
                    <p className="text-[10px] text-surface-500">Orders</p>
                </div>
                <div className="bg-surface-800/40 rounded-lg p-2 text-center">
                    <p className="text-sm font-bold gradient-text">${((s.total_spend || 0) / 1000).toFixed(0)}K</p>
                    <p className="text-[10px] text-surface-500">Spend</p>
                </div>
                <div className="bg-surface-800/40 rounded-lg p-2 text-center">
                    <p className="text-sm font-bold text-white">{s.lead_time_days || 7}d</p>
                    <p className="text-[10px] text-surface-500">Lead Time</p>
                </div>
            </div>

            <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-surface-500">Terms: <span className="text-white font-medium">{s.payment_terms || "NET30"}</span></span>
                <ScoreBadge score={s.rating || 0} />
            </div>

            <div className="flex items-center gap-1 border-t border-surface-700/30 pt-3">
                <button onClick={onView} className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-all">
                    <Eye className="w-3.5 h-3.5" /> View
                </button>
                <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-surface-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-all">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={onToggleBlacklist} className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs rounded-lg transition-all ${s.is_blacklisted ? "text-surface-400 hover:text-emerald-400 hover:bg-emerald-400/10" : "text-surface-400 hover:text-rose-400 hover:bg-rose-500/10"}`}>
                    {s.is_blacklisted ? <><Shield className="w-3.5 h-3.5" /> Restore</> : <><ShieldOff className="w-3.5 h-3.5" /> Block</>}
                </button>
                <button onClick={onDelete} className="flex-1 flex items-center justify-center gap-1 py-2 text-xs text-surface-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
            </div>
        </div>
    );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [total, setTotal] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<any>(null);
    const [detailSupplier, setDetailSupplier] = useState<any>(null);
    const [blacklistModal, setBlacklistModal] = useState<any>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
    const [expiringContracts, setExpiringContracts] = useState<any[]>([]);

    const showToast = (msg: string, type: "success" | "error" = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchSuppliers = useCallback(async () => {
        setLoading(true);
        let url = `/suppliers?search=${search}&limit=60`;
        if (filter === "blacklisted") url += `&is_blacklisted=true`;
        if (filter === "active") url += `&is_active=true`;
        const [suppRes, expRes] = await Promise.all([
            apiFetch(url),
            apiFetch("/suppliers/utils/expiring-contracts"),
        ]);
        if (suppRes.success) { setSuppliers(suppRes.data || []); setTotal(suppRes.meta?.total || (suppRes.data || []).length); }
        if (expRes.success) setExpiringContracts(expRes.data || []);
        setLoading(false);
    }, [search, filter]);

    useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

    const handleCreate = async (formData: any) => {
        setSubmitting(true);
        const data = await apiFetch("/suppliers", { method: "POST", body: JSON.stringify(formData) });
        setSubmitting(false);
        if (data.success) { showToast("Supplier added!"); setModalOpen(false); fetchSuppliers(); }
        else showToast(data.error?.message || "Failed", "error");
    };

    const handleUpdate = async (formData: any) => {
        if (!editTarget?.id) return;
        setSubmitting(true);
        const data = await apiFetch(`/suppliers/${editTarget.id}`, { method: "PUT", body: JSON.stringify(formData) });
        setSubmitting(false);
        if (data.success) { showToast("Supplier updated!"); setEditTarget(null); fetchSuppliers(); }
        else showToast(data.error?.message || "Failed", "error");
    };

    const handleDelete = async (id: string) => {
        if (!id) return;
        const data = await apiFetch(`/suppliers/${id}`, { method: "DELETE" });
        if (data.success) { showToast("Supplier deleted!"); fetchSuppliers(); }
        else showToast(data.error?.message || "Cannot delete", "error");
        setDeleteConfirm(null);
    };

    const handleView = async (id: string) => {
        if (!id) return;
        const data = await apiFetch(`/suppliers/${id}`);
        if (data.success && data.data) setDetailSupplier(data.data);
    };

    const handleBlacklist = async (id: string, blacklist: boolean, reason?: string) => {
        if (!id) return;
        const data = await apiFetch(`/suppliers/${id}/blacklist`, { method: "POST", body: JSON.stringify({ blacklist, reason }) });
        if (data.success) { showToast(blacklist ? "Supplier blacklisted!" : "Supplier restored!"); fetchSuppliers(); }
        else showToast(data.error?.message || "Failed", "error");
        setBlacklistModal(null);
    };

    const safeSuppliers = (suppliers || []).filter(Boolean);
    const safeExpiring = (expiringContracts || []).filter(Boolean);
    const stats = [
        { label: "Total Suppliers", value: total, icon: Truck, color: "from-emerald-500 to-cyan-600" },
        { label: "Active", value: safeSuppliers.filter(s => s.is_active && !s.is_blacklisted).length, icon: CheckCircle, color: "from-emerald-400 to-emerald-600" },
        { label: "Blacklisted", value: safeSuppliers.filter(s => s.is_blacklisted).length, icon: ShieldOff, color: "from-rose-400 to-rose-600" },
        { label: "Contracts Expiring", value: safeExpiring.length, icon: Calendar, color: "from-amber-400 to-amber-600" },
    ];

    return (
        <div className="space-y-6">
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl animate-slide-up text-sm font-medium ${toast.type === "success" ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300" : "bg-red-500/20 border border-red-500/30 text-red-300"}`}>
                    {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center">
                            <Truck className="w-5 h-5 text-white" />
                        </div>
                        Suppliers
                    </h1>
                    <p className="text-surface-500 text-sm mt-1">{total} registered suppliers</p>
                </div>
                <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2 text-sm">
                    <Plus className="w-4 h-4" /> Add Supplier
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map((s) => (
                    <div key={s.label} className="glass-card p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center flex-shrink-0`}>
                            <s.icon className="w-5 h-5 text-white" />
                        </div>
                        <div><p className="text-xl font-black text-white">{s.value}</p><p className="text-xs text-surface-500">{s.label}</p></div>
                    </div>
                ))}
            </div>

            {/* Contract expiry alerts */}
            {safeExpiring.length > 0 && (
                <div className="glass-card p-4 border-l-4 border-amber-400/50">
                    <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-bold text-amber-400">{safeExpiring.length} supplier contract{safeExpiring.length > 1 ? "s" : ""} expiring within 60 days</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {safeExpiring.slice(0, 4).map((c) => (
                            <span key={c?.id || Math.random()} className="text-xs bg-amber-400/10 border border-amber-400/20 text-amber-300 px-3 py-1 rounded-full">
                                {c?.name} — {c?.days_remaining}d left
                            </span>
                        ))}
                        {safeExpiring.length > 4 && <span className="text-xs text-surface-500">+{safeExpiring.length - 4} more</span>}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[200px] flex items-center glass rounded-xl px-4 py-2.5 gap-3">
                    <Search className="w-4 h-4 text-surface-500 flex-shrink-0" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search suppliers, email, code..."
                        className="bg-transparent border-none outline-none text-sm text-white placeholder:text-surface-500 w-full" />
                    {search && <button onClick={() => setSearch("")}><X className="w-4 h-4 text-surface-500" /></button>}
                </div>
                <div className="flex glass rounded-xl p-1 gap-1">
                    {["all", "active", "blacklisted"].map((f) => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${filter === f ? "bg-primary-500/20 text-primary-400" : "text-surface-500 hover:text-white"}`}>
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Supplier Grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="glass-card h-56 animate-pulse" />)}
                </div>
            ) : safeSuppliers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center mb-6 opacity-40">
                        <Truck className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No suppliers yet</h3>
                    <p className="text-surface-500 text-sm mb-6">Add your first supplier to start managing your supply chain.</p>
                    <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2 text-sm">
                        <Plus className="w-4 h-4" /> Add Supplier
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {safeSuppliers.map((s) => (
                        <SupplierCard key={s?.id || Math.random()} s={s}
                            onEdit={() => s?.id && setEditTarget(s)}
                            onDelete={() => s?.id && setDeleteConfirm(s.id)}
                            onView={() => s?.id && handleView(s.id)}
                            onToggleBlacklist={() => s?.id && (s.is_blacklisted ? handleBlacklist(s.id, false) : setBlacklistModal(s))} />
                    ))}
                </div>
            )}

            {/* Create Modal */}
            <Modal open={modalOpen} title="Add New Supplier" onClose={() => setModalOpen(false)} wide>
                <SupplierForm onSubmit={handleCreate} loading={submitting} />
            </Modal>

            {/* Edit Modal */}
            <Modal open={!!editTarget} title="Edit Supplier" onClose={() => setEditTarget(null)} wide>
                {editTarget && <SupplierForm initial={editTarget} onSubmit={handleUpdate} loading={submitting} />}
            </Modal>

            {/* Detail Modal */}
            <Modal open={!!detailSupplier} title={detailSupplier?.name || "Supplier Details"} onClose={() => setDetailSupplier(null)} wide>
                {detailSupplier && (
                    <div className="space-y-5">
                        {/* Scorecard */}
                        <div className="glass p-4 rounded-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-sm font-bold text-white">Performance Scorecard</h4>
                                <ScoreBadge score={detailSupplier.scorecard?.overall_score || 0} />
                            </div>
                            <ScorecardRadar data={detailSupplier.scorecard} />
                            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                                <div className="bg-surface-700/30 rounded-lg p-2">
                                    <p className="text-lg font-bold text-white">{detailSupplier.scorecard?.total_orders || 0}</p>
                                    <p className="text-[10px] text-surface-500">Orders</p>
                                </div>
                                <div className="bg-surface-700/30 rounded-lg p-2">
                                    <p className="text-lg font-bold text-emerald-400">{detailSupplier.scorecard?.on_time_deliveries || 0}</p>
                                    <p className="text-[10px] text-surface-500">On Time</p>
                                </div>
                                <div className="bg-surface-700/30 rounded-lg p-2">
                                    <p className="text-lg font-bold text-primary-400">{detailSupplier.payment_terms || "NET30"}</p>
                                    <p className="text-[10px] text-surface-500">Terms</p>
                                </div>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                ["Code", detailSupplier.supplier_code || "—"],
                                ["Lead Time", `${detailSupplier.lead_time_days || 7} days`],
                                ["Contact", detailSupplier.contact_person || "—"],
                                ["Phone", detailSupplier.phone || "—"],
                                ["Contract Start", detailSupplier.contract_start_date ? new Date(detailSupplier.contract_start_date).toLocaleDateString() : "—"],
                                ["Contract End", detailSupplier.contract_end_date ? new Date(detailSupplier.contract_end_date).toLocaleDateString() : "—"],
                            ].map(([label, val]) => (
                                <div key={label} className="bg-surface-800/40 rounded-xl p-3">
                                    <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1">{label}</p>
                                    <p className="text-white font-medium text-sm">{val}</p>
                                </div>
                            ))}
                        </div>

                        {/* Recent Orders */}
                        {detailSupplier.recent_orders?.length > 0 && (
                            <div>
                                <h4 className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-3">Recent Orders</h4>
                                <div className="space-y-2">
                                    {detailSupplier.recent_orders.filter(Boolean).slice(0, 5).map((o: any) => (
                                        <div key={o?.id || Math.random()} className="flex items-center justify-between bg-surface-800/40 rounded-xl px-4 py-3">
                                            <div>
                                                <p className="text-sm font-mono text-white">{o.po_number}</p>
                                                <p className="text-xs text-surface-500">{new Date(o.order_date).toLocaleDateString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-emerald-400">${o.total_amount?.toFixed(0)}</p>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${o.status === "received" ? "bg-emerald-400/10 text-emerald-400" : o.status === "cancelled" ? "bg-red-400/10 text-red-400" : "bg-amber-400/10 text-amber-400"}`}>{o.status}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button onClick={() => setEditTarget(detailSupplier)} className="flex-1 btn-outline text-sm py-2.5"><Edit2 className="w-4 h-4 inline mr-1" /> Edit</button>
                            <button onClick={() => { setDetailSupplier(null); setBlacklistModal(detailSupplier); }}
                                className={`flex-1 py-2.5 text-sm rounded-xl font-semibold ${detailSupplier.is_blacklisted ? "bg-emerald-400/10 border border-emerald-400/20 text-emerald-400" : "bg-rose-500/10 border border-rose-500/20 text-rose-400"}`}>
                                {detailSupplier.is_blacklisted ? "Remove from Blacklist" : "Blacklist Supplier"}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Blacklist Modal */}
            <Modal open={!!blacklistModal} title={blacklistModal?.is_blacklisted ? "Remove from Blacklist" : "Blacklist Supplier"} onClose={() => setBlacklistModal(null)}>
                {blacklistModal && !blacklistModal.is_blacklisted ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                            <ShieldOff className="w-8 h-8 text-rose-400 flex-shrink-0" />
                            <div>
                                <p className="text-white font-bold">{blacklistModal.name}</p>
                                <p className="text-xs text-rose-400 mt-0.5">Will be blocked from all future purchase orders</p>
                            </div>
                        </div>
                        <BlacklistForm onConfirm={(reason: string) => handleBlacklist(blacklistModal.id, true, reason)} onCancel={() => setBlacklistModal(null)} />
                    </div>
                ) : blacklistModal && (
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-400/10 flex items-center justify-center mx-auto"><Shield className="w-8 h-8 text-emerald-400" /></div>
                        <div>
                            <h3 className="text-white font-bold">Remove {blacklistModal.name} from blacklist?</h3>
                            <p className="text-surface-400 text-sm mt-1">They will be able to receive new Purchase Orders.</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setBlacklistModal(null)} className="flex-1 btn-outline py-2.5 text-sm">Cancel</button>
                            <button onClick={() => handleBlacklist(blacklistModal.id, false)} className="flex-1 py-2.5 text-sm rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 font-semibold">Restore</button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Confirm */}
            <Modal open={!!deleteConfirm} title="Confirm Delete" onClose={() => setDeleteConfirm(null)}>
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto"><Trash2 className="w-8 h-8 text-red-400" /></div>
                    <div><h3 className="text-white font-bold text-lg">Delete Supplier?</h3><p className="text-surface-400 text-sm mt-1">Suppliers with existing POs cannot be deleted.</p></div>
                    <div className="flex gap-3">
                        <button onClick={() => setDeleteConfirm(null)} className="flex-1 btn-outline py-2.5 text-sm">Cancel</button>
                        <button onClick={() => handleDelete(deleteConfirm!)} className="flex-1 py-2.5 text-sm rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-semibold">Delete</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

function BlacklistForm({ onConfirm, onCancel }: { onConfirm: (reason: string) => void; onCancel: () => void }) {
    const [reason, setReason] = useState("");
    const presets = ["Repeated late deliveries", "Quality issues", "Payment disputes", "Fraudulent invoices", "Better alternatives found"];
    return (
        <div className="space-y-3">
            <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide">Reason for Blacklisting</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Explain why this supplier is being blacklisted..."
                className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500/60 resize-none" />
            <div className="flex flex-wrap gap-2">
                {presets.map((p) => (
                    <button key={p} type="button" onClick={() => setReason(p)}
                        className="text-xs bg-surface-700/50 hover:bg-surface-700 text-surface-400 hover:text-white px-3 py-1.5 rounded-lg transition-all">{p}</button>
                ))}
            </div>
            <div className="flex gap-3 pt-2">
                <button onClick={onCancel} className="flex-1 btn-outline py-2.5 text-sm">Cancel</button>
                <button onClick={() => onConfirm(reason)} className="flex-1 py-2.5 text-sm rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:bg-rose-500/30 font-semibold">Confirm Blacklist</button>
            </div>
        </div>
    );
}
