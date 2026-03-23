"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    Warehouse, Plus, Search, Edit2, Trash2, Eye, MapPin, Layers,
    ChevronRight, Package, MoreHorizontal, Building2, Globe,
    CheckCircle, XCircle, RefreshCw, Grid3x3, List,
    TrendingUp, AlertTriangle, X, Save
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

function getToken() { return typeof window !== "undefined" ? localStorage.getItem("token") || "" : ""; }

async function apiFetch(path: string, options: RequestInit = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
            ...options.headers,
        },
    });
    return res.json();
}

// ============================================================
// MODAL COMPONENT
// ============================================================
function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-xl mx-4 glass-strong rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-slide-up">
                <div className="flex items-center justify-between p-6 border-b border-surface-700/50">
                    <h2 className="text-lg font-bold text-white">{title}</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-700/50 text-surface-400 hover:text-white transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 max-h-[75vh] overflow-y-auto">{children}</div>
            </div>
        </div>
    );
}

// ============================================================
// WAREHOUSE FORM
// ============================================================
function WarehouseForm({ initial, onSubmit, loading }: { initial?: any; onSubmit: (data: any) => void; loading: boolean }) {
    const [form, setForm] = useState({
        name: initial?.name || "",
        code: initial?.code || "",
        address: initial?.address || "",
        city: initial?.city || "",
        state: initial?.state || "",
        country: initial?.country || "",
        zip_code: initial?.zip_code || "",
        latitude: initial?.latitude || "",
        longitude: initial?.longitude || "",
        region: initial?.region || "",
        capacity: initial?.capacity || "",
    });

    const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Warehouse Name *</label>
                    <input value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="e.g. Mumbai Central Hub"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Code</label>
                    <input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="WH-MUM-01"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Region</label>
                    <input value={form.region} onChange={(e) => set("region", e.target.value)} placeholder="North India"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60 transition-colors" />
                </div>
                <div className="col-span-2">
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Address</label>
                    <input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Street address"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">City</label>
                    <input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Mumbai"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">State</label>
                    <input value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="Maharashtra"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Country</label>
                    <input value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="India"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Zip Code</label>
                    <input value={form.zip_code} onChange={(e) => set("zip_code", e.target.value)} placeholder="400001"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Latitude</label>
                    <input value={form.latitude} onChange={(e) => set("latitude", e.target.value)} placeholder="19.0760"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Longitude</label>
                    <input value={form.longitude} onChange={(e) => set("longitude", e.target.value)} placeholder="72.8777"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60 transition-colors" />
                </div>
                <div className="col-span-2">
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Capacity (units)</label>
                    <input type="number" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} placeholder="50000"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60 transition-colors" />
                </div>
            </div>
            <button type="submit" disabled={loading}
                className="w-full btn-primary flex items-center justify-center gap-2 py-3 mt-2">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {initial ? "Update Warehouse" : "Create Warehouse"}
            </button>
        </form>
    );
}

// ============================================================
// WAREHOUSE CARD
// ============================================================
function WarehouseCard({ w, onEdit, onDelete, onView }: { w: any; onEdit: () => void; onDelete: () => void; onView: () => void }) {
    const utilisationPct = w.capacity > 0 ? Math.min(100, ((w.total_stock || 0) / w.capacity) * 100) : 0;
    const utilColor = utilisationPct > 80 ? "bg-rose-500" : utilisationPct > 60 ? "bg-amber-400" : "bg-emerald-400";

    return (
        <div className="glass-card p-5 group hover:border-primary-500/30 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm">{w.name}</h3>
                        <span className="text-xs text-surface-500 font-mono">{w.code}</span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {w.is_active ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" /> Active
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-xs font-medium text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" /> Inactive
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-surface-500 mb-4">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span>{[w.city, w.state, w.country].filter(Boolean).join(", ") || "No location set"}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-surface-800/40 rounded-lg p-2.5 text-center">
                    <p className="text-lg font-bold text-white">{w.zone_count || 0}</p>
                    <p className="text-[10px] text-surface-500 mt-0.5">Zones</p>
                </div>
                <div className="bg-surface-800/40 rounded-lg p-2.5 text-center">
                    <p className="text-lg font-bold text-white">{w.capacity?.toLocaleString() || 0}</p>
                    <p className="text-[10px] text-surface-500 mt-0.5">Capacity</p>
                </div>
                <div className="bg-surface-800/40 rounded-lg p-2.5 text-center">
                    <p className="text-lg font-bold gradient-text">${(w.stock_value || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-surface-500 mt-0.5">Value</p>
                </div>
            </div>

            {w.capacity > 0 && (
                <div className="mb-4">
                    <div className="flex justify-between text-xs text-surface-500 mb-1.5">
                        <span>Utilization</span><span>{utilisationPct.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${utilColor} transition-all duration-700`} style={{ width: `${utilisationPct}%` }} />
                    </div>
                </div>
            )}

            <div className="flex items-center gap-2 border-t border-surface-700/30 pt-3 mt-1">
                <button onClick={onView} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-all">
                    <Eye className="w-3.5 h-3.5" /> View
                </button>
                <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-surface-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-all">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={onDelete} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-surface-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
            </div>
        </div>
    );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function WarehousesPage() {
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [view, setView] = useState<"grid" | "list">("grid");
    const [total, setTotal] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);
    const [detailWh, setDetailWh] = useState<any>(null);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const showToast = (msg: string, type: "success" | "error" = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchWarehouses = useCallback(async () => {
        setLoading(true);
        const data = await apiFetch(`/warehouses?search=${search}&limit=50`);
        if (data.success) {
            setWarehouses(data.data);
            setTotal(data.meta?.total || data.data.length);
        }
        setLoading(false);
    }, [search]);

    useEffect(() => { fetchWarehouses(); }, [fetchWarehouses]);

    const handleCreate = async (formData: any) => {
        setSubmitting(true);
        const data = await apiFetch("/warehouses", { method: "POST", body: JSON.stringify(formData) });
        setSubmitting(false);
        if (data.success) { showToast("Warehouse created successfully!"); setModalOpen(false); fetchWarehouses(); }
        else showToast(data.error?.message || "Failed to create", "error");
    };

    const handleUpdate = async (formData: any) => {
        if (!editTarget?.id) return;
        setSubmitting(true);
        const data = await apiFetch(`/warehouses/${editTarget.id}`, { method: "PUT", body: JSON.stringify(formData) });
        setSubmitting(false);
        if (data.success) { showToast("Warehouse updated!"); setEditTarget(null); fetchWarehouses(); }
        else showToast(data.error?.message || "Failed to update", "error");
    };

    const handleDelete = async (id: string) => {
        const data = await apiFetch(`/warehouses/${id}`, { method: "DELETE" });
        if (data.success) { showToast("Warehouse deleted!"); fetchWarehouses(); }
        else showToast(data.error?.message || "Failed to delete", "error");
        setDeleteConfirm(null);
    };

    const handleView = async (id: string) => {
        const data = await apiFetch(`/warehouses/${id}`);
        if (data.success) setDetailWh(data.data);
    };

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
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
                            <Warehouse className="w-5 h-5 text-white" />
                        </div>
                        Warehouses
                    </h1>
                    <p className="text-surface-500 text-sm mt-1">{total} warehouse{total !== 1 ? "s" : ""} across your organization</p>
                </div>
                <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2 text-sm">
                    <Plus className="w-4 h-4" /> Add Warehouse
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total Warehouses", value: total, icon: Building2, color: "from-primary-500 to-violet-500" },
                    { label: "Active", value: warehouses.filter(w => w?.is_active).length, icon: CheckCircle, color: "from-emerald-400 to-emerald-600" },
                    { label: "Total Zones", value: warehouses.reduce((s, w) => s + (w?.zone_count || 0), 0), icon: Layers, color: "from-cyan-400 to-cyan-600" },
                    { label: "Total Stock Value", value: `$${warehouses.reduce((s, w) => s + (w?.stock_value || 0), 0).toLocaleString()}`, icon: TrendingUp, color: "from-amber-400 to-amber-600" },
                ].map((stat) => (
                    <div key={stat.label} className="glass-card p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center flex-shrink-0`}>
                            <stat.icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xl font-black text-white">{stat.value}</p>
                            <p className="text-xs text-surface-500">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search & View Toggle */}
            <div className="flex gap-3">
                <div className="flex-1 flex items-center glass rounded-xl px-4 py-2.5 gap-3">
                    <Search className="w-4 h-4 text-surface-500 flex-shrink-0" />
                    <input
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search warehouses by name, code, or city..."
                        className="bg-transparent border-none outline-none text-sm text-white placeholder:text-surface-500 w-full" />
                    {search && <button onClick={() => setSearch("")}><X className="w-4 h-4 text-surface-500 hover:text-white" /></button>}
                </div>
                <div className="flex items-center glass rounded-xl p-1 gap-1">
                    <button onClick={() => setView("grid")} className={`p-2 rounded-lg transition-all ${view === "grid" ? "bg-primary-500/20 text-primary-400" : "text-surface-500 hover:text-white"}`}>
                        <Grid3x3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setView("list")} className={`p-2 rounded-lg transition-all ${view === "list" ? "bg-primary-500/20 text-primary-400" : "text-surface-500 hover:text-white"}`}>
                        <List className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="glass-card p-5 animate-pulse space-y-3">
                            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-surface-700/50" /><div className="space-y-2"><div className="h-4 w-32 bg-surface-700/50 rounded" /><div className="h-3 w-20 bg-surface-700/50 rounded" /></div></div>
                            <div className="grid grid-cols-3 gap-2">{[1, 2, 3].map(j => <div key={j} className="h-14 bg-surface-700/50 rounded-lg" />)}</div>
                        </div>
                    ))}
                </div>
            ) : warehouses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mb-6 opacity-40">
                        <Warehouse className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No warehouses yet</h3>
                    <p className="text-surface-500 text-sm mb-6 max-w-xs">Add your first warehouse to start tracking inventory across locations.</p>
                    <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Create First Warehouse
                    </button>
                </div>
            ) : view === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {warehouses.filter(Boolean).map((w) => (
                        <WarehouseCard key={w?.id || Math.random()} w={w}
                            onEdit={() => setEditTarget(w)}
                            onDelete={() => setDeleteConfirm(w?.id)}
                            onView={() => handleView(w?.id)} />
                    ))}
                </div>
            ) : (
                <div className="glass-card overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-surface-700/50">
                                <th className="px-5 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Warehouse</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider hidden sm:table-cell">Location</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider hidden md:table-cell">Zones</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider hidden md:table-cell">Capacity</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Status</th>
                                <th className="px-5 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-700/30">
                            {warehouses.filter(Boolean).map((w) => (
                                <tr key={w?.id || Math.random()} className="hover:bg-surface-800/30 transition-colors">
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                                                <Building2 className="w-4 h-4 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-white">{w.name}</p>
                                                <p className="text-xs text-surface-500 font-mono">{w.code}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 hidden sm:table-cell">
                                        <span className="text-sm text-surface-400">{[w.city, w.country].filter(Boolean).join(", ") || "—"}</span>
                                    </td>
                                    <td className="px-5 py-3.5 hidden md:table-cell">
                                        <span className="text-sm text-white font-semibold">{w.zone_count || 0}</span>
                                    </td>
                                    <td className="px-5 py-3.5 hidden md:table-cell">
                                        <span className="text-sm text-white">{(w.capacity || 0).toLocaleString()}</span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${w.is_active ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400"}`}>
                                            {w.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                            {w.is_active ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => handleView(w?.id)} className="p-1.5 rounded-lg hover:bg-surface-700/50 text-surface-500 hover:text-primary-400 transition-all">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setEditTarget(w)} className="p-1.5 rounded-lg hover:bg-surface-700/50 text-surface-500 hover:text-amber-400 transition-all">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setDeleteConfirm(w?.id)} className="p-1.5 rounded-lg hover:bg-surface-700/50 text-surface-500 hover:text-red-400 transition-all">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Modal */}
            <Modal open={modalOpen} title="Create New Warehouse" onClose={() => setModalOpen(false)}>
                <WarehouseForm onSubmit={handleCreate} loading={submitting} />
            </Modal>

            {/* Edit Modal */}
            <Modal open={!!editTarget} title="Edit Warehouse" onClose={() => setEditTarget(null)}>
                {editTarget && <WarehouseForm initial={editTarget} onSubmit={handleUpdate} loading={submitting} />}
            </Modal>

            {/* Detail Modal */}
            <Modal open={!!detailWh} title={detailWh?.name || "Warehouse Detail"} onClose={() => setDetailWh(null)}>
                {detailWh && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            {[
                                ["Code", detailWh.code],
                                ["Region", detailWh.region || "—"],
                                ["City", detailWh.city || "—"],
                                ["Country", detailWh.country || "—"],
                                ["Capacity", (detailWh.capacity || 0).toLocaleString() + " units"],
                                ["Zones", detailWh.zones?.length || 0],
                                ["Coordinates", detailWh.latitude ? `${detailWh.latitude}, ${detailWh.longitude}` : "Not set"],
                                ["Manager", detailWh.manager_name || "Not assigned"],
                            ].map(([label, value]) => (
                                <div key={label} className="bg-surface-800/40 rounded-xl p-3">
                                    <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1">{label}</p>
                                    <p className="text-white font-medium text-sm">{value}</p>
                                </div>
                            ))}
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-3">Zones</h4>
                            <div className="space-y-2">
                                {detailWh?.zones?.filter(Boolean).length > 0 ? detailWh.zones.filter(Boolean).map((z: any) => (
                                    <div key={z?.id || Math.random()} className="flex items-center justify-between bg-surface-800/40 rounded-xl px-4 py-3">
                                        <div>
                                            <p className="text-sm font-semibold text-white">{z?.name || "Unnamed Zone"}</p>
                                            <p className="text-xs text-surface-500 capitalize">{z?.type || "Standard"} zone</p>
                                        </div>
                                        <span className="text-xs text-surface-400">{z?.shelf_count || 0} shelves</span>
                                    </div>
                                )) : <p className="text-sm text-surface-500 py-3 text-center">No zones defined yet</p>}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setEditTarget(detailWh)} className="flex-1 btn-outline text-sm py-2.5">
                                <Edit2 className="w-4 h-4 inline mr-1" /> Edit
                            </button>
                            <Link href={`/dashboard/warehouses/${detailWh?.id}`} className="flex-1 btn-primary text-sm py-2.5 text-center">
                                <ChevronRight className="w-4 h-4 inline mr-1" /> Full Details
                            </Link>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Confirm Modal */}
            <Modal open={!!deleteConfirm} title="Confirm Delete" onClose={() => setDeleteConfirm(null)}>
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                        <Trash2 className="w-8 h-8 text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg">Delete Warehouse?</h3>
                        <p className="text-surface-400 text-sm mt-1">This action cannot be undone. Warehouses with active stock cannot be deleted.</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setDeleteConfirm(null)} className="flex-1 btn-outline py-2.5 text-sm">Cancel</button>
                        <button onClick={() => handleDelete(deleteConfirm!)} className="flex-1 py-2.5 text-sm rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 font-semibold transition-all">
                            Delete
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
