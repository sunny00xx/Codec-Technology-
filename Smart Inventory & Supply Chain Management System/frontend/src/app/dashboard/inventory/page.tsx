"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
    Layers, AlertTriangle, TrendingDown, Clock, RefreshCw, Search, X,
    ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Sliders,
    Package, Warehouse, BarChart3, CheckCircle, Save, ShieldAlert,
    Calendar, Filter, ChevronDown, Activity, History, Bell
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
function getToken() { return typeof window !== "undefined" ? localStorage.getItem("token") || "" : ""; }
async function apiFetch(path: string, options: RequestInit = {}) {
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...options.headers } });
    return res.json();
}

function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-lg mx-4 glass-strong rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
                <div className="flex items-center justify-between p-6 border-b border-surface-700/50">
                    <h2 className="text-lg font-bold text-white">{title}</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-700/50 text-surface-400 hover:text-white transition-all"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 max-h-[75vh] overflow-y-auto">{children}</div>
            </div>
        </div>
    );
}

// ============================================================
// ADJUSTMENT FORM
// ============================================================
function AdjustmentForm({ warehouses, products, onSubmit, loading }: { warehouses: any[]; products: any[]; onSubmit: (data: any) => void; loading: boolean }) {
    const [form, setForm] = useState({
        type: "IN",
        product_id: "",
        warehouse_id: "",
        quantity: "",
        batch_no: "",
        lot_no: "",
        expiry_date: "",
        manufacturing_date: "",
        unit_cost: "",
        accounting_method: "FIFO",
        notes: "",
        to_warehouse_id: "",
    });

    const set = (f: string, v: string) => setForm((prev) => ({ ...prev, [f]: v }));
    const types = [
        { value: "IN", label: "Stock In", icon: ArrowDownCircle, color: "text-emerald-400" },
        { value: "OUT", label: "Stock Out", icon: ArrowUpCircle, color: "text-red-400" },
        { value: "TRANSFER", label: "Transfer", icon: ArrowLeftRight, color: "text-cyan-400" },
        { value: "ADJUSTMENT", label: "Adjust Count", icon: Sliders, color: "text-amber-400" },
    ];

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
            {/* Type selector */}
            <div>
                <label className="block text-xs font-semibold text-surface-400 mb-2 uppercase tracking-wide">Movement Type *</label>
                <div className="grid grid-cols-2 gap-2">
                    {types.map((t) => (
                        <button key={t.value} type="button" onClick={() => set("type", t.value)}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${form.type === t.value ? "border-primary-500/50 bg-primary-500/10 text-white" : "border-surface-700/50 bg-surface-800/40 text-surface-400 hover:border-surface-600 hover:text-white"}`}>
                            <t.icon className={`w-4 h-4 ${form.type === t.value ? t.color : ""}`} />
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Product *</label>
                <select value={form.product_id} onChange={(e) => set("product_id", e.target.value)} required
                    className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60">
                    <option value="">Select product…</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
            </div>

            <div className={`grid gap-4 ${form.type === "TRANSFER" ? "grid-cols-2" : "grid-cols-1"}`}>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">
                        {form.type === "TRANSFER" ? "From Warehouse *" : "Warehouse *"}
                    </label>
                    <select value={form.warehouse_id} onChange={(e) => set("warehouse_id", e.target.value)} required
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60">
                        <option value="">Select warehouse…</option>
                        {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </div>
                {form.type === "TRANSFER" && (
                    <div>
                        <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">To Warehouse *</label>
                        <select value={form.to_warehouse_id} onChange={(e) => set("to_warehouse_id", e.target.value)} required
                            className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60">
                            <option value="">Select destination…</option>
                            {warehouses.filter(w => w.id !== form.warehouse_id).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">
                        Quantity {form.type === "ADJUSTMENT" ? "(New Count)" : ""} *
                    </label>
                    <input type="number" min="1" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} required placeholder="0"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Unit Cost ($)</label>
                    <input type="number" step="0.01" value={form.unit_cost} onChange={(e) => set("unit_cost", e.target.value)} placeholder="0.00"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60" />
                </div>
            </div>

            {(form.type === "IN") && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Batch No.</label>
                        <input value={form.batch_no} onChange={(e) => set("batch_no", e.target.value)} placeholder="BATCH-001"
                            className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Lot No.</label>
                        <input value={form.lot_no} onChange={(e) => set("lot_no", e.target.value)} placeholder="LOT-2026-01"
                            className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Expiry Date</label>
                        <input type="date" value={form.expiry_date} onChange={(e) => set("expiry_date", e.target.value)}
                            className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Mfg. Date</label>
                        <input type="date" value={form.manufacturing_date} onChange={(e) => set("manufacturing_date", e.target.value)}
                            className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60" />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Accounting Method</label>
                        <select value={form.accounting_method} onChange={(e) => set("accounting_method", e.target.value)}
                            className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60">
                            <option value="FIFO">FIFO (First In, First Out)</option>
                            <option value="LIFO">LIFO (Last In, First Out)</option>
                            <option value="FEFO">FEFO (First Expired, First Out)</option>
                        </select>
                    </div>
                </div>
            )}

            <div>
                <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Notes</label>
                <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Optional reason or reference..."
                    className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60 resize-none" />
            </div>

            <button type="submit" disabled={loading}
                className="w-full btn-primary flex items-center justify-center gap-2 py-3">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Record Movement
            </button>
        </form>
    );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function InventoryPage() {
    const [activeTab, setActiveTab] = useState<"overview" | "movements" | "alerts" | "batches">("overview");
    const [inventory, setInventory] = useState<any[]>([]);
    const [movements, setMovements] = useState<any[]>([]);
    const [alerts, setAlerts] = useState<any>({ low_stock: [], expiring_soon: [], dead_stock: [], summary: {} });
    const [batches, setBatches] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>({});
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [warehouseFilter, setWarehouseFilter] = useState("");
    const [adjustModalOpen, setAdjustModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

    const showToast = (msg: string, type: "success" | "error" = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [invRes, sumRes, movRes, alertRes, batchRes, whRes, prodRes] = await Promise.all([
            apiFetch(`/inventory?search=${search}&warehouse_id=${warehouseFilter}&limit=100`),
            apiFetch("/inventory/summary"),
            apiFetch("/inventory/movements?limit=50"),
            apiFetch("/inventory/alerts"),
            apiFetch("/inventory/batches"),
            apiFetch("/warehouses?limit=100"),
            apiFetch("/products?limit=200"),
        ]);
        if (invRes.success) setInventory(invRes.data);
        if (sumRes.success) setSummary(sumRes.data);
        if (movRes.success) setMovements(movRes.data);
        if (alertRes.success) setAlerts(alertRes.data);
        if (batchRes.success) setBatches(batchRes.data);
        if (whRes.success) setWarehouses(whRes.data);
        if (prodRes.success) setProducts(prodRes.data);
        setLoading(false);
    }, [search, warehouseFilter]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleAdjust = async (formData: any) => {
        setSubmitting(true);
        const data = await apiFetch("/inventory/adjust", {
            method: "POST",
            body: JSON.stringify({ ...formData, quantity: parseInt(formData.quantity) }),
        });
        setSubmitting(false);
        if (data.success) {
            showToast("Stock movement recorded successfully!");
            setAdjustModalOpen(false);
            fetchAll();
        } else {
            showToast(data.error?.message || "Failed to record movement", "error");
        }
    };

    const mvTypeConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
        IN: { label: "Stock In", icon: ArrowDownCircle, color: "text-emerald-400", bg: "bg-emerald-400/10" },
        OUT: { label: "Stock Out", icon: ArrowUpCircle, color: "text-red-400", bg: "bg-red-400/10" },
        TRANSFER: { label: "Transfer", icon: ArrowLeftRight, color: "text-cyan-400", bg: "bg-cyan-400/10" },
        ADJUSTMENT: { label: "Adjustment", icon: Sliders, color: "text-amber-400", bg: "bg-amber-400/10" },
    };

    const tabs = [
        { id: "overview", label: "Stock Levels", icon: Layers },
        { id: "movements", label: "Movements", icon: History, badge: movements.length },
        { id: "alerts", label: "Alerts", icon: Bell, badge: (alerts.summary?.low_stock_count || 0) + (alerts.summary?.expiring_soon_count || 0) },
        { id: "batches", label: "Batch Tracking", icon: Package },
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
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-primary-600 flex items-center justify-center">
                            <Layers className="w-5 h-5 text-white" />
                        </div>
                        Inventory
                    </h1>
                    <p className="text-surface-500 text-sm mt-1">Real-time stock intelligence engine</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchAll} className="btn-outline flex items-center gap-2 text-sm py-2">
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
                    </button>
                    <button onClick={() => setAdjustModalOpen(true)} className="btn-primary flex items-center gap-2 text-sm">
                        <Activity className="w-4 h-4" /> Record Movement
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                    { label: "Products", value: summary.total_products || 0, icon: Package, c: "from-primary-500 to-violet-500" },
                    { label: "Stock Value", value: `$${((summary.total_stock_value || 0) / 1000).toFixed(0)}K`, icon: BarChart3, c: "from-emerald-400 to-emerald-600" },
                    { label: "Low Stock", value: summary.low_stock_alerts || 0, icon: TrendingDown, c: "from-amber-400 to-amber-600" },
                    { label: "Expiring Soon", value: summary.expiring_soon || 0, icon: Clock, c: "from-rose-400 to-rose-600" },
                    { label: "Out of Stock", value: summary.out_of_stock || 0, icon: AlertTriangle, c: "from-red-500 to-red-700" },
                    { label: "Today's Moves", value: summary.movements_today || 0, icon: Activity, c: "from-cyan-400 to-cyan-600" },
                ].map((s) => (
                    <div key={s.label} className="glass-card p-4 text-center">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${s.c} flex items-center justify-center mx-auto mb-2`}>
                            <s.icon className="w-4 h-4 text-white" />
                        </div>
                        <p className="text-xl font-black text-white">{s.value}</p>
                        <p className="text-[10px] text-surface-500 mt-0.5">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Stock by Warehouse */}
            {summary.by_warehouse?.length > 0 && (
                <div className="glass-card p-5">
                    <h3 className="text-sm font-bold text-surface-300 mb-4 flex items-center gap-2">
                        <Warehouse className="w-4 h-4 text-primary-400" /> Stock Distribution by Warehouse
                    </h3>
                    <div className="space-y-3">
                        {summary.by_warehouse.map((w: any) => {
                            const maxQty = Math.max(...(summary.by_warehouse || [{ total_qty: 1 }]).map((x: any) => x.total_qty));
                            const pct = maxQty > 0 ? (w.total_qty / maxQty) * 100 : 0;
                            return (
                                <div key={w.id} className="flex items-center gap-3">
                                    <div className="w-32 text-xs text-surface-400 truncate">{w.name}</div>
                                    <div className="flex-1 h-2 bg-surface-700/50 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-primary-500 to-violet-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                                    </div>
                                    <div className="w-20 text-right">
                                        <span className="text-xs font-semibold text-white">{w.total_qty?.toLocaleString()}</span>
                                        <span className="text-xs text-surface-500 ml-1">units</span>
                                    </div>
                                    <div className="w-16 text-right">
                                        <span className="text-xs text-surface-500">{w.products} SKUs</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-1 glass rounded-xl p-1 w-fit">
                {tabs.map((t) => (
                    <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t.id ? "bg-primary-500/20 text-primary-400" : "text-surface-500 hover:text-surface-300"}`}>
                        <t.icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{t.label}</span>
                        {t.badge ? <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-rose-500/20 text-rose-400">{t.badge}</span> : null}
                    </button>
                ))}
            </div>

            {/* ====== TAB: STOCK LEVELS ====== */}
            {activeTab === "overview" && (
                <div className="space-y-4">
                    <div className="flex gap-3">
                        <div className="flex-1 flex items-center glass rounded-xl px-4 py-2.5 gap-3">
                            <Search className="w-4 h-4 text-surface-500 flex-shrink-0" />
                            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by product, SKU, warehouse..."
                                className="bg-transparent border-none outline-none text-sm text-white placeholder:text-surface-500 w-full" />
                        </div>
                        <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}
                            className="glass border border-surface-700/30 rounded-xl px-4 py-2.5 text-sm text-surface-300 focus:outline-none">
                            <option value="">All Warehouses</option>
                            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>

                    {loading ? (
                        <div className="space-y-2">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="glass-card h-16 animate-pulse" />)}
                        </div>
                    ) : inventory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-primary-600 flex items-center justify-center mb-4 opacity-40">
                                <Layers className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">No inventory records</h3>
                            <p className="text-surface-500 text-sm mb-5">Record your first stock movement to start tracking inventory.</p>
                            <button onClick={() => setAdjustModalOpen(true)} className="btn-primary text-sm flex items-center gap-2">
                                <Activity className="w-4 h-4" /> Record Movement
                            </button>
                        </div>
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-surface-700/50">
                                        {["Product", "SKU", "Warehouse", "Batch", "In Stock", "Reserved", "Reorder Pt.", "Expiry", "Value", "Status"].map((h) => (
                                            <th key={h} className={`px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider ${["Batch", "Reserved", "Expiry"].includes(h) ? "hidden lg:table-cell" : ""} ${["Reorder Pt.", "Value"].includes(h) ? "hidden md:table-cell" : ""}`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-700/30">
                                    {inventory.map((item) => {
                                        const isLow = item.quantity <= item.reorder_point && item.reorder_point > 0;
                                        const isOut = item.quantity === 0;
                                        const isExpiring = item.expiry_date && new Date(item.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                                        return (
                                            <tr key={item.id} className={`hover:bg-surface-800/30 transition-colors ${isOut ? "bg-red-500/5" : isLow ? "bg-amber-400/5" : ""}`}>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-primary-600 flex items-center justify-center flex-shrink-0">
                                                            <Package className="w-3.5 h-3.5 text-white" />
                                                        </div>
                                                        <p className="text-sm font-semibold text-white truncate max-w-[120px]">{item.product_name}</p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3"><span className="text-xs font-mono text-surface-500">{item.sku}</span></td>
                                                <td className="px-4 py-3"><span className="text-xs text-surface-400">{item.warehouse_name}</span></td>
                                                <td className="px-4 py-3 hidden lg:table-cell"><span className="text-xs font-mono text-surface-500">{item.batch_no || "—"}</span></td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-sm font-bold ${isOut ? "text-red-400" : isLow ? "text-amber-400" : "text-white"}`}>
                                                        {item.quantity?.toLocaleString()} {item.unit}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 hidden lg:table-cell"><span className="text-sm text-surface-500">{item.reserved_quantity || 0}</span></td>
                                                <td className="px-4 py-3 hidden md:table-cell"><span className="text-sm text-surface-500">{item.reorder_point || 0}</span></td>
                                                <td className="px-4 py-3 hidden lg:table-cell">
                                                    {item.expiry_date ? (
                                                        <span className={`text-xs ${isExpiring ? "text-rose-400 font-semibold" : "text-surface-500"}`}>
                                                            {new Date(item.expiry_date).toLocaleDateString()}
                                                        </span>
                                                    ) : <span className="text-xs text-surface-600">—</span>}
                                                </td>
                                                <td className="px-4 py-3 hidden md:table-cell">
                                                    <span className="text-xs font-semibold text-emerald-400">${item.stock_value?.toFixed(0) || 0}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isOut ? "bg-red-400/10 text-red-400" : isLow ? "bg-amber-400/10 text-amber-400" : isExpiring ? "bg-rose-400/10 text-rose-400" : "bg-emerald-400/10 text-emerald-400"}`}>
                                                        {isOut ? "Out" : isLow ? "Low" : isExpiring ? "Expiring" : "OK"}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ====== TAB: MOVEMENTS ====== */}
            {activeTab === "movements" && (
                <div className="space-y-3">
                    {movements.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <History className="w-12 h-12 text-surface-600 mb-3" />
                            <p className="text-surface-400 text-sm">No movement history yet</p>
                        </div>
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-surface-700/50">
                                        {["Type", "Product", "Warehouse", "Qty", "By", "Date", "Notes"].map((h) => (
                                            <th key={h} className={`px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider ${["By", "Notes"].includes(h) ? "hidden md:table-cell" : ""}`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-700/30">
                                    {movements.map((m) => {
                                        const cfg = mvTypeConfig[m.type] || { label: m.type, icon: Activity, color: "text-surface-400", bg: "bg-surface-700/20" };
                                        const Icon = cfg.icon;
                                        return (
                                            <tr key={m.id} className="hover:bg-surface-800/30 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className={`flex items-center gap-1.5 ${cfg.bg} rounded-lg px-2.5 py-1.5 w-fit`}>
                                                        <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                                                        <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="text-sm font-semibold text-white">{m.product_name}</p>
                                                    <p className="text-xs font-mono text-surface-500">{m.sku}</p>
                                                </td>
                                                <td className="px-4 py-3"><span className="text-xs text-surface-400">{m.warehouse_name}</span></td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-sm font-bold ${m.quantity < 0 ? "text-red-400" : "text-emerald-400"}`}>
                                                        {m.quantity > 0 ? "+" : ""}{m.quantity?.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 hidden md:table-cell"><span className="text-xs text-surface-500">{m.performed_by_name || "System"}</span></td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs text-surface-500">{new Date(m.created_at).toLocaleDateString()}</span>
                                                    <span className="text-xs text-surface-600 ml-1">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                                </td>
                                                <td className="px-4 py-3 hidden md:table-cell">
                                                    <span className="text-xs text-surface-500 truncate max-w-[120px] block">{m.notes || "—"}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ====== TAB: ALERTS ====== */}
            {activeTab === "alerts" && (
                <div className="space-y-6">
                    {/* Low Stock */}
                    <div>
                        <h3 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
                            <TrendingDown className="w-4 h-4" /> Low Stock Alerts ({alerts.summary?.low_stock_count || 0})
                        </h3>
                        {alerts.low_stock?.length === 0 ? (
                            <div className="glass-card p-6 text-center text-surface-500 text-sm">
                                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                                All stock levels are healthy!
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {alerts.low_stock.map((item: any) => (
                                    <div key={item.id} className="glass-card p-4 border-l-4 border-amber-400/50 flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-bold text-white">{item.name}</p>
                                            <p className="text-xs font-mono text-surface-500">{item.sku} · {item.warehouse_name}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-amber-400 font-bold text-sm">{item.current_stock} units</p>
                                            <p className="text-[10px] text-surface-500">ROP: {item.reorder_point}</p>
                                        </div>
                                        <div className="bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0">
                                            Reorder Now
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Expiring Soon */}
                    <div>
                        <h3 className="text-sm font-bold text-rose-400 mb-3 flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Expiring in 30 Days ({alerts.summary?.expiring_soon_count || 0})
                        </h3>
                        {alerts.expiring_soon?.length === 0 ? (
                            <div className="glass-card p-6 text-center text-surface-500 text-sm">
                                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                                No items expiring in the next 30 days!
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {alerts.expiring_soon.map((item: any) => (
                                    <div key={item.id} className="glass-card p-4 border-l-4 border-rose-400/50 flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-bold text-white">{item.product_name}</p>
                                            <p className="text-xs font-mono text-surface-500">{item.sku} · Batch: {item.batch_no || "N/A"}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-white font-semibold text-sm">{item.quantity} units</p>
                                            <p className="text-xs text-rose-400 font-semibold">
                                                {item.days_to_expiry <= 0 ? "EXPIRED" : `${item.days_to_expiry} days left`}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Dead Stock */}
                    <div>
                        <h3 className="text-sm font-bold text-surface-400 mb-3 flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4" /> Dead Stock (90+ days no movement) ({alerts.summary?.dead_stock_count || 0})
                        </h3>
                        {alerts.dead_stock?.length === 0 ? (
                            <div className="glass-card p-6 text-center text-surface-500 text-sm">
                                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                                No dead stock detected!
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {alerts.dead_stock.map((item: any) => (
                                    <div key={item.id} className="glass-card p-4 border-l-4 border-surface-600/50 flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-bold text-white">{item.product_name}</p>
                                            <p className="text-xs font-mono text-surface-500">{item.sku} · {item.warehouse_name}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-white font-semibold text-sm">{item.quantity} units</p>
                                            <p className="text-xs text-surface-500">${item.stock_value?.toFixed(0)} value</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ====== TAB: BATCHES ====== */}
            {activeTab === "batches" && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}
                            className="glass border border-surface-700/30 rounded-xl px-4 py-2.5 text-sm text-surface-300 focus:outline-none">
                            <option value="">All Warehouses</option>
                            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                    {batches.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <Package className="w-12 h-12 text-surface-600 mb-3" />
                            <p className="text-surface-400 text-sm">No batch records found</p>
                            <p className="text-surface-600 text-xs mt-1">Batch numbers are assigned when recording stock IN movements</p>
                        </div>
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-surface-700/50">
                                        {["Product", "Batch / Lot", "Warehouse", "Qty", "Mfg. Date", "Expiry", "Method", "Status"].map((h) => (
                                            <th key={h} className={`px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider ${["Mfg. Date", "Method"].includes(h) ? "hidden lg:table-cell" : ""}`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-700/30">
                                    {batches.map((b) => {
                                        const expired = b.expiry_date && new Date(b.expiry_date) < new Date();
                                        const expiringSoon = !expired && b.expiry_date && new Date(b.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                                        return (
                                            <tr key={b.id} className="hover:bg-surface-800/30 transition-colors">
                                                <td className="px-4 py-3">
                                                    <p className="text-sm font-semibold text-white">{b.product_name}</p>
                                                    <p className="text-xs font-mono text-surface-500">{b.sku}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="text-xs font-mono text-primary-400">{b.batch_no}</p>
                                                    {b.lot_no && <p className="text-xs font-mono text-surface-500">{b.lot_no}</p>}
                                                </td>
                                                <td className="px-4 py-3"><span className="text-xs text-surface-400">{b.warehouse_name}</span></td>
                                                <td className="px-4 py-3"><span className="text-sm font-bold text-white">{b.quantity?.toLocaleString()}</span></td>
                                                <td className="px-4 py-3 hidden lg:table-cell">
                                                    <span className="text-xs text-surface-500">{b.manufacturing_date ? new Date(b.manufacturing_date).toLocaleDateString() : "—"}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {b.expiry_date ? (
                                                        <span className={`text-xs font-semibold ${expired ? "text-red-400" : expiringSoon ? "text-amber-400" : "text-surface-400"}`}>
                                                            {new Date(b.expiry_date).toLocaleDateString()}
                                                        </span>
                                                    ) : <span className="text-xs text-surface-600">No expiry</span>}
                                                </td>
                                                <td className="px-4 py-3 hidden lg:table-cell">
                                                    <span className="text-xs bg-surface-700/50 rounded px-2 py-0.5 text-surface-400 font-mono">{b.accounting_method || "FIFO"}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${expired ? "bg-red-400/10 text-red-400" : expiringSoon ? "bg-amber-400/10 text-amber-400" : "bg-emerald-400/10 text-emerald-400"}`}>
                                                        {expired ? "Expired" : expiringSoon ? "Expiring" : "Active"}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Adjustment Modal */}
            <Modal open={adjustModalOpen} title="Record Stock Movement" onClose={() => setAdjustModalOpen(false)}>
                <AdjustmentForm warehouses={warehouses} products={products} onSubmit={handleAdjust} loading={submitting} />
            </Modal>
        </div>
    );
}
