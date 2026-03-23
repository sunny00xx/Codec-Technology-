"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    Package, Plus, Search, Edit2, Trash2, Eye, Tag, BarChart3,
    RefreshCw, Grid3x3, List, X, Save, AlertTriangle, CheckCircle,
    Download, Upload, Filter, ChevronDown, Boxes, DollarSign,
    TrendingDown, Star, ScanLine
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
function getToken() { return typeof window !== "undefined" ? localStorage.getItem("token") || "" : ""; }
async function apiFetch(path: string, options: RequestInit = {}) {
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...options.headers } });
    return res.json();
}

function Modal({ open, title, onClose, children, wide }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative z-10 w-full ${wide ? "max-w-2xl" : "max-w-xl"} mx-4 glass-strong rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-slide-up`}>
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
// PRODUCT FORM
// ============================================================
function ProductForm({ initial, categories, onSubmit, loading }: { initial?: any; categories: any[]; onSubmit: (data: any) => void; loading: boolean }) {
    const [form, setForm] = useState({
        name: initial?.name || "",
        category_id: initial?.category_id || "",
        description: initial?.description || "",
        unit: initial?.unit || "pcs",
        base_price: initial?.base_price || "",
        cost_price: initial?.cost_price || "",
        weight: initial?.weight || "",
        min_stock: initial?.min_stock || "",
        max_stock: initial?.max_stock || "",
        reorder_point: initial?.reorder_point || "",
        safety_stock: initial?.safety_stock || "",
        lead_time_days: initial?.lead_time_days || "7",
    });

    const set = (f: string, v: string) => setForm((prev) => ({ ...prev, [f]: v }));
    const units = ["pcs", "kg", "g", "ltr", "ml", "m", "cm", "box", "carton", "dozen", "pair"];

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Product Name *</label>
                    <input value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="e.g. Laptop Model X"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Category</label>
                    <select value={form.category_id} onChange={(e) => set("category_id", e.target.value)}
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60 transition-colors">
                        <option value="">Uncategorized</option>
                        {categories.filter(Boolean).map((c) => <option key={c?.id} value={c?.id}>{c?.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Unit</label>
                    <select value={form.unit} onChange={(e) => set("unit", e.target.value)}
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60 transition-colors">
                        {units.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                </div>
                <div className="col-span-2">
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Description</label>
                    <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} placeholder="Product description..."
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60 transition-colors resize-none" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Base Price ($)</label>
                    <input type="number" step="0.01" value={form.base_price} onChange={(e) => set("base_price", e.target.value)} placeholder="99.99"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Cost Price ($)</label>
                    <input type="number" step="0.01" value={form.cost_price} onChange={(e) => set("cost_price", e.target.value)} placeholder="65.00"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Weight (kg)</label>
                    <input type="number" step="0.01" value={form.weight} onChange={(e) => set("weight", e.target.value)} placeholder="1.2"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Lead Time (days)</label>
                    <input type="number" value={form.lead_time_days} onChange={(e) => set("lead_time_days", e.target.value)} placeholder="7"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Reorder Point</label>
                    <input type="number" value={form.reorder_point} onChange={(e) => set("reorder_point", e.target.value)} placeholder="50"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60 transition-colors" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Safety Stock</label>
                    <input type="number" value={form.safety_stock} onChange={(e) => set("safety_stock", e.target.value)} placeholder="20"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500/60 transition-colors" />
                </div>
            </div>
            <button type="submit" disabled={loading}
                className="w-full btn-primary flex items-center justify-center gap-2 py-3">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {initial ? "Update Product" : "Create Product"}
            </button>
        </form>
    );
}

// ============================================================
// PRODUCT CARD
// ============================================================
function ProductCard({ p, onEdit, onDelete, onView }: { p: any; onEdit: () => void; onDelete: () => void; onView: () => void }) {
    const margin = p.base_price > 0 ? ((p.base_price - p.cost_price) / p.base_price * 100).toFixed(1) : 0;
    const stockStatus = p.total_stock === 0 ? "out" : p.total_stock <= p.reorder_point && p.reorder_point > 0 ? "low" : "ok";

    return (
        <div className="glass-card p-5 group hover:border-primary-500/30 transition-all duration-300">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-primary-600 flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-white text-sm truncate">{p.name}</h3>
                        <span className="text-xs text-surface-500 font-mono">{p.sku}</span>
                    </div>
                </div>
                <div>
                    {stockStatus === "out" ? (
                        <span className="text-xs font-medium text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">Out of Stock</span>
                    ) : stockStatus === "low" ? (
                        <span className="text-xs font-medium text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">Low Stock</span>
                    ) : (
                        <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">In Stock</span>
                    )}
                </div>
            </div>

            {p.category_name && (
                <div className="flex items-center gap-1.5 mb-3">
                    <Tag className="w-3 h-3 text-surface-500" />
                    <span className="text-xs text-surface-500">{p.category_name}</span>
                </div>
            )}

            <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-surface-800/40 rounded-lg p-2.5 text-center">
                    <p className="text-sm font-bold text-white">{p.total_stock?.toLocaleString() || 0}</p>
                    <p className="text-[10px] text-surface-500 mt-0.5">In Stock</p>
                </div>
                <div className="bg-surface-800/40 rounded-lg p-2.5 text-center">
                    <p className="text-sm font-bold gradient-text">${p.base_price?.toFixed(0) || 0}</p>
                    <p className="text-[10px] text-surface-500 mt-0.5">Price</p>
                </div>
                <div className="bg-surface-800/40 rounded-lg p-2.5 text-center">
                    <p className="text-sm font-bold text-emerald-400">{margin}%</p>
                    <p className="text-[10px] text-surface-500 mt-0.5">Margin</p>
                </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-surface-600 mb-3">
                <span>ROP: {p.reorder_point || 0}</span>
                <span>•</span>
                <span>SS: {p.safety_stock || 0}</span>
                <span>•</span>
                <span>LT: {p.lead_time_days || 7}d</span>
                {p.variant_count > 0 && <><span>•</span><span>{p.variant_count} variants</span></>}
            </div>

            <div className="flex items-center gap-2 border-t border-surface-700/30 pt-3">
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
// CSV IMPORT MODAL
// ============================================================
function CsvImportModal({ onClose, onImport }: { onClose: () => void; onImport: (rows: any[]) => void }) {
    const [csvText, setCsvText] = useState("");
    const [preview, setPreview] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const parseCSV = () => {
        const lines = csvText.trim().split("\n");
        if (lines.length < 2) return;
        const headers = lines[0].split(",").map((h: string) => h.trim().toLowerCase());
        const rows = lines.slice(1).map((l: string) => {
            const vals = l.split(",");
            const obj: any = {};
            headers.forEach((h, i) => obj[h] = vals[i]?.trim() || "");
            return obj;
        });
        setPreview(rows);
    };

    const handleImport = async () => {
        setLoading(true);
        await onImport(preview);
        setLoading(false);
    };

    return (
        <div className="space-y-4">
            <div className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-xl">
                <p className="text-sm font-semibold text-primary-400 mb-2">CSV Format</p>
                <code className="text-xs text-surface-400 block">name,category,sku,unit,base_price,cost_price,reorder_point,lead_time_days</code>
            </div>
            <div>
                <label className="block text-xs font-semibold text-surface-400 mb-2 uppercase tracking-wide">Paste CSV Data</label>
                <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={8} placeholder="name,category,...&#10;Product 1,Electronics,..."
                    className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-surface-600 focus:outline-none focus:border-primary-500/60 transition-colors resize-none" />
            </div>
            <div className="flex gap-3">
                <button onClick={parseCSV} className="flex-1 btn-outline py-2.5 text-sm">Preview ({preview.length} rows)</button>
                {preview.length > 0 && (
                    <button onClick={handleImport} disabled={loading} className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2">
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Import
                    </button>
                )}
            </div>
            {preview.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1">
                    {preview.slice(0, 5).map((row, i) => (
                        <div key={i} className="text-xs text-surface-400 bg-surface-800/40 rounded-lg px-3 py-2">{row.name} — {row.category || "No category"}</div>
                    ))}
                    {preview.length > 5 && <p className="text-xs text-surface-500 text-center">...and {preview.length - 5} more rows</p>}
                </div>
            )}
        </div>
    );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function ProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [view, setView] = useState<"grid" | "list">("grid");
    const [total, setTotal] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<any>(null);
    const [detailProduct, setDetailProduct] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

    const showToast = (msg: string, type: "success" | "error" = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        let url = `/products?search=${search}&limit=60`;
        if (categoryFilter) url += `&category_id=${categoryFilter}`;
        if (statusFilter) url += statusFilter === "inactive" ? `&is_active=false` : `&is_active=true`;
        const data = await apiFetch(url);
        if (data.success) { setProducts(data.data || []); setTotal(data.meta?.total || (data.data || []).length); }
        setLoading(false);
    }, [search, categoryFilter, statusFilter]);

    const fetchCategories = useCallback(async () => {
        const data = await apiFetch("/products/categories");
        if (data.success) setCategories(data.data || []);
    }, []);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);
    useEffect(() => { fetchCategories(); }, [fetchCategories]);

    const handleCreate = async (formData: any) => {
        setSubmitting(true);
        const data = await apiFetch("/products", { method: "POST", body: JSON.stringify(formData) });
        setSubmitting(false);
        if (data.success) { showToast("Product created!"); setModalOpen(false); fetchProducts(); }
        else showToast(data.error?.message || "Failed to create", "error");
    };

    const handleUpdate = async (formData: any) => {
        if (!editTarget?.id) return;
        setSubmitting(true);
        const data = await apiFetch(`/products/${editTarget.id}`, { method: "PUT", body: JSON.stringify(formData) });
        setSubmitting(false);
        if (data.success) { showToast("Product updated!"); setEditTarget(null); fetchProducts(); }
        else showToast(data.error?.message || "Failed to update", "error");
    };

    const handleDelete = async (id: string) => {
        if (!id) return;
        const data = await apiFetch(`/products/${id}`, { method: "DELETE" });
        if (data.success) { showToast("Product deleted!"); fetchProducts(); }
        else showToast(data.error?.message || "Failed to delete", "error");
        setDeleteConfirm(null);
    };

    const handleView = async (id: string) => {
        if (!id) return;
        const data = await apiFetch(`/products/${id}`);
        if (data.success && data.data) setDetailProduct(data.data);
    };

    const handleExport = async () => {
        window.location.href = `${API_BASE}/products/export/csv?token=${getToken()}`;
    };

    const handleImport = async (rows: any[]) => {
        const data = await apiFetch("/products/import/csv", { method: "POST", body: JSON.stringify({ rows }) });
        if (data.success) {
            showToast(`Imported ${data.data.created_count} products!`);
            setImportOpen(false); fetchProducts();
        } else showToast("Import failed", "error");
    };

    const safeProducts = (products || []).filter(Boolean);
    const stats = [
        { label: "Total Products", value: total, icon: Boxes, color: "from-primary-500 to-violet-500" },
        { label: "Categories", value: (categories || []).length, icon: Tag, color: "from-cyan-400 to-cyan-600" },
        { label: "Low Stock", value: safeProducts.filter(p => p.total_stock <= p.reorder_point && p.reorder_point > 0 && p.total_stock > 0).length, icon: TrendingDown, color: "from-amber-400 to-amber-600" },
        { label: "Out of Stock", value: safeProducts.filter(p => p.total_stock === 0).length, icon: AlertTriangle, color: "from-rose-400 to-rose-600" },
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
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-primary-600 flex items-center justify-center">
                            <Package className="w-5 h-5 text-white" />
                        </div>
                        Products
                    </h1>
                    <p className="text-surface-500 text-sm mt-1">{total} products in your catalog</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setImportOpen(true)} className="btn-outline flex items-center gap-2 text-sm py-2">
                        <Upload className="w-4 h-4" /> Import
                    </button>
                    <button onClick={handleExport} className="btn-outline flex items-center gap-2 text-sm py-2">
                        <Download className="w-4 h-4" /> Export
                    </button>
                    <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2 text-sm">
                        <Plus className="w-4 h-4" /> Add Product
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map((s) => (
                    <div key={s.label} className="glass-card p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center flex-shrink-0`}>
                            <s.icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xl font-black text-white">{s.value}</p>
                            <p className="text-xs text-surface-500">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[200px] flex items-center glass rounded-xl px-4 py-2.5 gap-3">
                    <Search className="w-4 h-4 text-surface-500 flex-shrink-0" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products, SKU, barcode..."
                        className="bg-transparent border-none outline-none text-sm text-white placeholder:text-surface-500 w-full" />
                    {search && <button onClick={() => setSearch("")}><X className="w-4 h-4 text-surface-500 hover:text-white" /></button>}
                </div>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                    className="glass border border-surface-700/30 rounded-xl px-4 py-2.5 text-sm text-surface-300 focus:outline-none focus:border-primary-500/60">
                    <option value="">All Categories</option>
                    {categories.filter(Boolean).map((c) => <option key={c?.id} value={c?.id}>{c?.name}</option>)}
                </select>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="glass-card p-5 animate-pulse space-y-3">
                            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-surface-700/50" /><div className="space-y-2"><div className="h-4 w-28 bg-surface-700/50 rounded" /><div className="h-3 w-16 bg-surface-700/50 rounded" /></div></div>
                            <div className="grid grid-cols-3 gap-2">{[1, 2, 3].map(j => <div key={j} className="h-14 bg-surface-700/50 rounded-lg" />)}</div>
                        </div>
                    ))}
                </div>
            ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-primary-600 flex items-center justify-center mb-6 opacity-40">
                        <Package className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No products yet</h3>
                    <p className="text-surface-500 text-sm mb-6 max-w-xs">Start building your product catalog. Add individual items or import via CSV.</p>
                    <div className="flex gap-3">
                        <button onClick={() => setImportOpen(true)} className="btn-outline flex items-center gap-2 text-sm">
                            <Upload className="w-4 h-4" /> Import CSV
                        </button>
                        <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2 text-sm">
                            <Plus className="w-4 h-4" /> Add Product
                        </button>
                    </div>
                </div>
            ) : view === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {safeProducts.map((p) => (
                        <ProductCard key={p?.id || Math.random()} p={p}
                            onEdit={() => p?.id && setEditTarget(p)}
                            onDelete={() => p?.id && setDeleteConfirm(p.id)}
                            onView={() => p?.id && handleView(p.id)} />
                    ))}
                </div>
            ) : (
                <div className="glass-card overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-surface-700/50">
                                {["Product", "SKU", "Category", "Stock", "Price", "Margin", "Status", ""].map((h) => (
                                    <th key={h} className={`px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider ${!h ? "" : "hidden md:table-cell"} ${h === "Product" || h === "SKU" || h === "" ? "!table-cell" : ""}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-700/30">
                            {safeProducts.map((p) => {
                                const margin = p.base_price > 0 ? ((p.base_price - p.cost_price) / p.base_price * 100).toFixed(1) : 0;
                                const stockStatus = p.total_stock === 0 ? "out" : p.total_stock <= p.reorder_point && p.reorder_point > 0 ? "low" : "ok";
                                return (
                                    <tr key={p?.id || Math.random()} className="hover:bg-surface-800/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-primary-600 flex items-center justify-center flex-shrink-0">
                                                    <Package className="w-4 h-4 text-white" />
                                                </div>
                                                <p className="text-sm font-semibold text-white">{p.name}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3"><span className="text-xs font-mono text-surface-400">{p.sku}</span></td>
                                        <td className="px-4 py-3 hidden md:table-cell"><span className="text-xs text-surface-400">{p.category_name || "—"}</span></td>
                                        <td className="px-4 py-3 hidden md:table-cell"><span className="text-sm text-white font-semibold">{p.total_stock?.toLocaleString() || 0} {p.unit}</span></td>
                                        <td className="px-4 py-3 hidden md:table-cell"><span className="text-sm text-white">${p.base_price?.toFixed(2) || "0.00"}</span></td>
                                        <td className="px-4 py-3 hidden md:table-cell"><span className="text-sm text-emerald-400 font-semibold">{margin}%</span></td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${stockStatus === "out" ? "bg-red-400/10 text-red-400" : stockStatus === "low" ? "bg-amber-400/10 text-amber-400" : "bg-emerald-400/10 text-emerald-400"}`}>
                                                {stockStatus === "out" ? "Out of Stock" : stockStatus === "low" ? "Low Stock" : "In Stock"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => handleView(p?.id)} className="p-1.5 rounded-lg hover:bg-surface-700/50 text-surface-500 hover:text-primary-400 transition-all"><Eye className="w-4 h-4" /></button>
                                                <button onClick={() => setEditTarget(p)} className="p-1.5 rounded-lg hover:bg-surface-700/50 text-surface-500 hover:text-amber-400 transition-all"><Edit2 className="w-4 h-4" /></button>
                                                <button onClick={() => setDeleteConfirm(p?.id)} className="p-1.5 rounded-lg hover:bg-surface-700/50 text-surface-500 hover:text-red-400 transition-all"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modals */}
            <Modal open={modalOpen} title="Add New Product" onClose={() => setModalOpen(false)} wide>
                <ProductForm categories={categories} onSubmit={handleCreate} loading={submitting} />
            </Modal>
            <Modal open={!!editTarget} title="Edit Product" onClose={() => setEditTarget(null)} wide>
                {editTarget && <ProductForm initial={editTarget} categories={categories} onSubmit={handleUpdate} loading={submitting} />}
            </Modal>
            <Modal open={!!detailProduct} title={detailProduct?.name || "Product Detail"} onClose={() => setDetailProduct(null)} wide>
                {detailProduct && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            {[
                                ["SKU", detailProduct.sku],
                                ["Barcode", detailProduct.barcode || "—"],
                                ["Category", detailProduct.category_name || "—"],
                                ["Unit", detailProduct.unit],
                                ["Base Price", `$${detailProduct.base_price?.toFixed(2)}`],
                                ["Cost Price", `$${detailProduct.cost_price?.toFixed(2)}`],
                                ["Total Stock", `${detailProduct.total_stock?.toLocaleString()} ${detailProduct.unit}`],
                                ["Reorder Point", detailProduct.reorder_point || 0],
                                ["Safety Stock", detailProduct.safety_stock || 0],
                                ["Lead Time", `${detailProduct.lead_time_days || 7} days`],
                            ].map(([label, val]) => (
                                <div key={label} className="bg-surface-800/40 rounded-xl p-3">
                                    <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1">{label}</p>
                                    <p className="text-white font-medium text-sm">{val}</p>
                                </div>
                            ))}
                        </div>
                        {detailProduct.stock_by_warehouse?.length > 0 && (
                            <div>
                                <h4 className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-3">Stock by Warehouse</h4>
                                <div className="space-y-2">
                                    {detailProduct.stock_by_warehouse.filter(Boolean).map((s: any) => (
                                        <div key={s?.id || Math.random()} className="flex items-center justify-between bg-surface-800/40 rounded-xl px-4 py-3">
                                            <p className="text-sm text-white">{s.warehouse_name}</p>
                                            <span className="text-sm font-bold text-emerald-400">{s.quantity} {detailProduct.unit}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {detailProduct.variants?.length > 0 && (
                            <div>
                                <h4 className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-3">Variants ({detailProduct.variants.length})</h4>
                                <div className="space-y-2">
                                    {detailProduct.variants.filter(Boolean).map((v: any) => (
                                        <div key={v?.id || Math.random()} className="flex items-center justify-between bg-surface-800/40 rounded-xl px-4 py-3">
                                            <div>
                                                <p className="text-sm font-mono text-white">{detailProduct.sku}{v.sku_suffix || ""}</p>
                                                <p className="text-xs text-surface-500">{JSON.stringify(v.attributes)}</p>
                                            </div>
                                            <span className="text-sm text-primary-400">{v.price_modifier > 0 ? `+$${v.price_modifier}` : v.price_modifier < 0 ? `-$${Math.abs(v.price_modifier)}` : "Base"}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <button onClick={() => setEditTarget(detailProduct)} className="w-full btn-outline text-sm py-2.5">
                            <Edit2 className="w-4 h-4 inline mr-1" /> Edit Product
                        </button>
                    </div>
                )}
            </Modal>
            <Modal open={importOpen} title="Import Products from CSV" onClose={() => setImportOpen(false)} wide>
                <CsvImportModal onClose={() => setImportOpen(false)} onImport={handleImport} />
            </Modal>
            <Modal open={!!deleteConfirm} title="Confirm Delete" onClose={() => setDeleteConfirm(null)}>
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                        <Trash2 className="w-8 h-8 text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg">Delete Product?</h3>
                        <p className="text-surface-400 text-sm mt-1">Products with active stock cannot be deleted.</p>
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
