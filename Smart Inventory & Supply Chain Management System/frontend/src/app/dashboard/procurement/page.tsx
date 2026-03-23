"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
    ShoppingCart, Plus, CheckCircle, XCircle, Clock, AlertTriangle,
    X, Save, RefreshCw, FileText, TrendingUp, Package, Truck,
    ChevronRight, ArrowRight, DollarSign, BarChart3, Search,
    ClipboardList, ReceiptText, Activity, Zap
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
            <div className={`relative z-10 w-full ${wide ? "max-w-2xl" : "max-w-lg"} mx-4 glass-strong rounded-2xl shadow-2xl overflow-hidden animate-slide-up`}>
                <div className="flex items-center justify-between p-6 border-b border-surface-700/50">
                    <h2 className="text-lg font-bold text-white">{title}</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-700/50 text-surface-400 hover:text-white transition-all"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
            </div>
        </div>
    );
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: "Pending", color: "text-amber-400", bg: "bg-amber-400/10" },
    under_review: { label: "Under Review", color: "text-blue-400", bg: "bg-blue-400/10" },
    approved: { label: "Approved", color: "text-emerald-400", bg: "bg-emerald-400/10" },
    rejected: { label: "Rejected", color: "text-red-400", bg: "bg-red-400/10" },
    converted: { label: "Converted", color: "text-violet-400", bg: "bg-violet-400/10" },
    sent: { label: "Sent", color: "text-cyan-400", bg: "bg-cyan-400/10" },
    acknowledged: { label: "Acknowledged", color: "text-blue-400", bg: "bg-blue-400/10" },
    partial: { label: "Partial", color: "text-amber-400", bg: "bg-amber-400/10" },
    received: { label: "Received", color: "text-emerald-400", bg: "bg-emerald-400/10" },
    cancelled: { label: "Cancelled", color: "text-red-400", bg: "bg-red-400/10" },
};

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] || { label: status, color: "text-surface-400", bg: "bg-surface-700/30" };
    return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>;
}

// ── PR FORM ──────────────────────────────────────────────────
function PRForm({ warehouses, products, onSubmit, loading }: any) {
    const [warehouse_id, setWarehouse] = useState("");
    const [priority, setPriority] = useState("medium");
    const [notes, setNotes] = useState("");
    const [items, setItems] = useState([{ product_id: "", quantity: 1, estimated_unit_cost: "" }]);

    const addItem = () => setItems([...items, { product_id: "", quantity: 1, estimated_unit_cost: "" }]);
    const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
    const setItem = (i: number, f: string, v: any) => setItems(items.map((it, idx) => idx === i ? { ...it, [f]: v } : it));

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit({ warehouse_id, priority, notes, items }); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Warehouse</label>
                    <select value={warehouse_id} onChange={(e) => setWarehouse(e.target.value)}
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60">
                        <option value="">Any Warehouse</option>
                        {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Priority</label>
                    <select value={priority} onChange={(e) => setPriority(e.target.value)}
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60">
                        {["low", "medium", "high", "critical"].map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                    </select>
                </div>
            </div>
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-surface-400 uppercase tracking-wide">Line Items *</label>
                    <button type="button" onClick={addItem} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"><Plus className="w-3 h-3" /> Add Item</button>
                </div>
                <div className="space-y-2">
                    {items.map((item, i) => (
                        <div key={i} className="flex gap-2 items-start">
                            <select value={item.product_id} onChange={(e) => setItem(i, "product_id", e.target.value)} required
                                className="flex-1 bg-surface-800/60 border border-surface-700/50 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60">
                                <option value="">Select product…</option>
                                {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                            </select>
                            <input type="number" min="1" value={item.quantity} onChange={(e) => setItem(i, "quantity", parseInt(e.target.value))}
                                className="w-20 bg-surface-800/60 border border-surface-700/50 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60" placeholder="Qty" />
                            <input type="number" step="0.01" value={item.estimated_unit_cost} onChange={(e) => setItem(i, "estimated_unit_cost", e.target.value)}
                                className="w-24 bg-surface-800/60 border border-surface-700/50 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60" placeholder="Cost" />
                            {items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="p-2.5 rounded-xl hover:bg-red-500/10 text-surface-500 hover:text-red-400"><X className="w-4 h-4" /></button>}
                        </div>
                    ))}
                </div>
            </div>
            <div>
                <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Reason for requisition..."
                    className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60 resize-none" />
            </div>
            <button type="submit" disabled={loading} className="w-full btn-primary flex items-center justify-center gap-2 py-3">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Create Requisition
            </button>
        </form>
    );
}

// ── PO FORM ──────────────────────────────────────────────────
function POForm({ suppliers, warehouses, products, requisitions, onSubmit, loading }: any) {
    const [form, setForm] = useState({ supplier_id: "", warehouse_id: "", requisition_id: "", expected_delivery_date: "", payment_terms: "NET30", notes: "" });
    const [items, setItems] = useState([{ product_id: "", quantity: 1, unit_price: "" }]);
    const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));
    const addItem = () => setItems([...items, { product_id: "", quantity: 1, unit_price: "" }]);
    const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
    const setItem = (i: number, f: string, v: any) => setItems(items.map((it, idx) => idx === i ? { ...it, [f]: v } : it));
    const subtotal = items.reduce((s, i) => s + (parseFloat(i.unit_price as any) || 0) * (i.quantity || 0), 0);

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, items }); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Supplier *</label>
                    <select value={form.supplier_id} onChange={(e) => set("supplier_id", e.target.value)} required
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60">
                        <option value="">Select supplier…</option>
                        {suppliers.filter((s: any) => !s.is_blacklisted).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Warehouse</label>
                    <select value={form.warehouse_id} onChange={(e) => set("warehouse_id", e.target.value)}
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60">
                        <option value="">Select warehouse…</option>
                        {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Link to PR</label>
                    <select value={form.requisition_id} onChange={(e) => set("requisition_id", e.target.value)}
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60">
                        <option value="">None (standalone PO)</option>
                        {requisitions.filter((r: any) => r.status === "approved").map((r: any) => <option key={r.id} value={r.id}>{r.pr_number}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Expected Delivery</label>
                    <input type="date" value={form.expected_delivery_date} onChange={(e) => set("expected_delivery_date", e.target.value)}
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Payment Terms</label>
                    <select value={form.payment_terms} onChange={(e) => set("payment_terms", e.target.value)}
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60">
                        {["NET7", "NET15", "NET30", "NET45", "NET60", "COD", "ADVANCE"].map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            </div>
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-surface-400 uppercase tracking-wide">Line Items *</label>
                    <button type="button" onClick={addItem} className="text-xs text-primary-400 flex items-center gap-1"><Plus className="w-3 h-3" /> Add Item</button>
                </div>
                <div className="space-y-2">
                    {items.map((item, i) => (
                        <div key={i} className="flex gap-2 items-start">
                            <select value={item.product_id} onChange={(e) => setItem(i, "product_id", e.target.value)} required
                                className="flex-1 bg-surface-800/60 border border-surface-700/50 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60">
                                <option value="">Select product…</option>
                                {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <input type="number" min="1" value={item.quantity} onChange={(e) => setItem(i, "quantity", parseInt(e.target.value))}
                                className="w-20 bg-surface-800/60 border border-surface-700/50 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60" placeholder="Qty" />
                            <input type="number" step="0.01" value={item.unit_price} onChange={(e) => setItem(i, "unit_price", e.target.value)} required
                                className="w-28 bg-surface-800/60 border border-surface-700/50 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60" placeholder="Unit $" />
                            {items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="p-2.5 rounded-xl hover:bg-red-500/10 text-surface-500 hover:text-red-400"><X className="w-4 h-4" /></button>}
                        </div>
                    ))}
                </div>
                <div className="flex justify-end mt-3 gap-4 text-sm">
                    <span className="text-surface-400">Subtotal: <span className="text-white font-semibold">${subtotal.toFixed(2)}</span></span>
                    <span className="text-surface-400">Tax (18%): <span className="text-white font-semibold">${(subtotal * 0.18).toFixed(2)}</span></span>
                    <span className="text-surface-400">Total: <span className="text-emerald-400 font-bold">${(subtotal * 1.18).toFixed(2)}</span></span>
                </div>
            </div>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Additional notes..."
                className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60 resize-none" />
            <button type="submit" disabled={loading} className="w-full btn-primary flex items-center justify-center gap-2 py-3">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Create Purchase Order
            </button>
        </form>
    );
}

// ── GRN FORM ─────────────────────────────────────────────────
function GRNForm({ orders, products, warehouses, onSubmit, loading }: any) {
    const [po_id, setPoId] = useState("");
    const [warehouse_id, setWh] = useState("");
    const [delivery_note, setDn] = useState("");
    const [vehicle_number, setVn] = useState("");
    const [notes, setNotes] = useState("");
    const [items, setItems] = useState([{ product_id: "", quantity_received: 1, quality_passed: 1 }]);
    const addItem = () => setItems([...items, { product_id: "", quantity_received: 1, quality_passed: 1 }]);
    const setItem = (i: number, f: string, v: any) => setItems(items.map((it, idx) => idx === i ? { ...it, [f]: v } : it));

    const selectedPO = orders.find((o: any) => o.id === po_id);

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit({ po_id, warehouse_id, delivery_note, vehicle_number, notes, items, supplier_id: selectedPO?.supplier_id }); }} className="space-y-4">
            <div>
                <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Purchase Order *</label>
                <select value={po_id} onChange={(e) => setPoId(e.target.value)} required
                    className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60">
                    <option value="">Select PO to receive…</option>
                    {orders.filter((o: any) => ["sent", "acknowledged", "partial"].includes(o.status)).map((o: any) => (
                        <option key={o.id} value={o.id}>{o.po_number} — {o.supplier_name}</option>
                    ))}
                </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Receiving Warehouse</label>
                    <select value={warehouse_id} onChange={(e) => setWh(e.target.value)}
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60">
                        <option value="">Use PO warehouse</option>
                        {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Vehicle No.</label>
                    <input value={vehicle_number} onChange={(e) => setVn(e.target.value)} placeholder="MH-12-AB-1234"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60" />
                </div>
                <div className="col-span-2">
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Delivery Note No.</label>
                    <input value={delivery_note} onChange={(e) => setDn(e.target.value)} placeholder="DN-2026-001"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60" />
                </div>
            </div>
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-surface-400 uppercase tracking-wide">Items Received *</label>
                    <button type="button" onClick={addItem} className="text-xs text-primary-400 flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
                </div>
                <div className="space-y-2">
                    {items.map((item, i) => (
                        <div key={i} className="grid grid-cols-3 gap-2">
                            <select value={item.product_id} onChange={(e) => setItem(i, "product_id", e.target.value)} required
                                className="bg-surface-800/60 border border-surface-700/50 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60">
                                <option value="">Product…</option>
                                {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <input type="number" min="0" value={item.quantity_received} onChange={(e) => setItem(i, "quantity_received", parseInt(e.target.value))}
                                className="bg-surface-800/60 border border-surface-700/50 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60" placeholder="Qty received" />
                            <input type="number" min="0" value={item.quality_passed} onChange={(e) => setItem(i, "quality_passed", parseInt(e.target.value))}
                                className="bg-surface-800/60 border border-surface-700/50 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60" placeholder="Quality passed" />
                        </div>
                    ))}
                </div>
                <p className="text-xs text-surface-500 mt-2">Columns: Product | Qty Received | Quality Passed</p>
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Remarks..."
                className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60 resize-none" />
            <button type="submit" disabled={loading} className="w-full btn-primary flex items-center justify-center gap-2 py-3">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Record GRN & Update Inventory
            </button>
        </form>
    );
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function ProcurementPage() {
    const [tab, setTab] = useState<"dashboard" | "prs" | "pos" | "grn">("dashboard");
    const [dashStats, setDashStats] = useState<any>({});
    const [prs, setPrs] = useState<any[]>([]);
    const [pos, setPos] = useState<any[]>([]);
    const [grns, setGrns] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [prModal, setPrModal] = useState(false);
    const [poModal, setPoModal] = useState(false);
    const [grnModal, setGrnModal] = useState(false);
    const [approveModal, setApproveModal] = useState<any>(null);
    const [poStatusModal, setPoStatusModal] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

    const showToast = (msg: string, type: "success" | "error" = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [dashRes, prRes, poRes, grnRes, supRes, whRes, prodRes] = await Promise.all([
            apiFetch("/procurement/dashboard"),
            apiFetch("/procurement/requisitions?limit=50"),
            apiFetch("/procurement/orders?limit=50"),
            apiFetch("/procurement/grn?limit=50"),
            apiFetch("/suppliers?limit=100"),
            apiFetch("/warehouses?limit=100"),
            apiFetch("/products?limit=200"),
        ]);
        if (dashRes.success) setDashStats(dashRes.data);
        if (prRes.success) setPrs(prRes.data);
        if (poRes.success) setPos(poRes.data);
        if (grnRes.success) setGrns(grnRes.data);
        if (supRes.success) setSuppliers(supRes.data);
        if (whRes.success) setWarehouses(whRes.data);
        if (prodRes.success) setProducts(prodRes.data);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleCreatePR = async (data: any) => {
        setSubmitting(true);
        const res = await apiFetch("/procurement/requisitions", { method: "POST", body: JSON.stringify(data) });
        setSubmitting(false);
        if (res.success) { showToast("PR created!"); setPrModal(false); fetchAll(); }
        else showToast(res.error?.message || "Failed", "error");
    };

    const handleAutoGenPR = async () => {
        const res = await apiFetch("/procurement/requisitions/auto-generate", { method: "POST" });
        if (res.success) { showToast(`Auto-generated ${res.data.created} PR(s) from low stock!`); fetchAll(); }
        else showToast(res.error?.message || "Failed", "error");
    };

    const handleApprovePR = async (id: string, action: "approve" | "reject", notes: string) => {
        const res = await apiFetch(`/procurement/requisitions/${id}/approve`, { method: "POST", body: JSON.stringify({ action, notes }) });
        if (res.success) { showToast(`PR ${action}d!`); setApproveModal(null); fetchAll(); }
        else showToast(res.error?.message || "Failed", "error");
    };

    const handleCreatePO = async (data: any) => {
        setSubmitting(true);
        const res = await apiFetch("/procurement/orders", { method: "POST", body: JSON.stringify(data) });
        setSubmitting(false);
        if (res.success) { showToast("Purchase Order created!"); setPoModal(false); fetchAll(); }
        else showToast(res.error?.message || "Failed", "error");
    };

    const handlePoStatus = async (id: string, status: string, notes: string) => {
        const res = await apiFetch(`/procurement/orders/${id}/status`, { method: "POST", body: JSON.stringify({ status, notes }) });
        if (res.success) { showToast(`PO updated to ${status}!`); setPoStatusModal(null); fetchAll(); }
        else showToast(res.error?.message || "Failed", "error");
    };

    const handleCreateGRN = async (data: any) => {
        setSubmitting(true);
        const res = await apiFetch("/procurement/grn", { method: "POST", body: JSON.stringify(data) });
        setSubmitting(false);
        if (res.success) { showToast("GRN recorded & inventory updated!"); setGrnModal(false); fetchAll(); }
        else showToast(res.error?.message || "Failed", "error");
    };

    const tabs = [
        { id: "dashboard", label: "Dashboard", icon: BarChart3 },
        { id: "prs", label: "Requisitions", icon: ClipboardList, badge: dashStats.pending_prs },
        { id: "pos", label: "Purchase Orders", icon: FileText, badge: dashStats.overdue_pos },
        { id: "grn", label: "GRN", icon: ReceiptText },
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
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-pink-600 flex items-center justify-center">
                            <ShoppingCart className="w-5 h-5 text-white" />
                        </div>
                        Procurement
                    </h1>
                    <p className="text-surface-500 text-sm mt-1">PR → PO → GRN lifecycle management</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={handleAutoGenPR} className="btn-outline flex items-center gap-2 text-sm py-2">
                        <Zap className="w-4 h-4 text-amber-400" /> Auto-Generate PRs
                    </button>
                    <button onClick={() => setGrnModal(true)} className="btn-outline flex items-center gap-2 text-sm py-2">
                        <ReceiptText className="w-4 h-4" /> Record GRN
                    </button>
                    <button onClick={() => setPoModal(true)} className="btn-outline flex items-center gap-2 text-sm py-2">
                        <FileText className="w-4 h-4" /> Create PO
                    </button>
                    <button onClick={() => setPrModal(true)} className="btn-primary flex items-center gap-2 text-sm">
                        <Plus className="w-4 h-4" /> New PR
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 glass rounded-xl p-1 w-fit">
                {tabs.map((t) => (
                    <button key={t.id} onClick={() => setTab(t.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-primary-500/20 text-primary-400" : "text-surface-500 hover:text-surface-300"}`}>
                        <t.icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{t.label}</span>
                        {t.badge > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400">{t.badge}</span>}
                    </button>
                ))}
            </div>

            {/* ── DASHBOARD TAB ── */}
            {tab === "dashboard" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: "Pending PRs", value: dashStats.pending_prs || 0, icon: ClipboardList, color: "from-amber-400 to-amber-600" },
                            { label: "Open POs", value: dashStats.open_pos || 0, icon: FileText, color: "from-primary-500 to-violet-500" },
                            { label: "Month Spend", value: `$${((dashStats.month_spend || 0) / 1000).toFixed(0)}K`, icon: DollarSign, color: "from-emerald-400 to-emerald-600" },
                            { label: "Overdue POs", value: dashStats.overdue_pos || 0, icon: AlertTriangle, color: "from-rose-400 to-rose-600" },
                        ].map((s) => (
                            <div key={s.label} className="glass-card p-5 flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center flex-shrink-0`}>
                                    <s.icon className="w-6 h-6 text-white" />
                                </div>
                                <div><p className="text-2xl font-black text-white">{s.value}</p><p className="text-xs text-surface-500">{s.label}</p></div>
                            </div>
                        ))}
                    </div>

                    {/* Monthly spend trend */}
                    {dashStats.monthly_spend_trend?.length > 0 && (
                        <div className="glass-card p-5">
                            <h3 className="text-sm font-bold text-surface-300 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary-400" /> Monthly Procurement Spend</h3>
                            <div className="flex items-end gap-3 h-32">
                                {dashStats.monthly_spend_trend.map((m: any) => {
                                    const max = Math.max(...dashStats.monthly_spend_trend.map((x: any) => x.spend || 1));
                                    const pct = ((m.spend || 0) / max) * 100;
                                    return (
                                        <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                                            <span className="text-[10px] text-surface-500">${((m.spend || 0) / 1000).toFixed(0)}K</span>
                                            <div className="w-full rounded-t-lg bg-gradient-to-t from-primary-600 to-violet-500 transition-all" style={{ height: `${Math.max(pct, 4)}%` }} />
                                            <span className="text-[10px] text-surface-500 truncate w-full text-center">{m.month?.slice(5)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Top suppliers */}
                        {dashStats.top_suppliers?.length > 0 && (
                            <div className="glass-card p-5">
                                <h3 className="text-sm font-bold text-surface-300 mb-4 flex items-center gap-2"><Truck className="w-4 h-4 text-emerald-400" /> Top Suppliers by Spend</h3>
                                <div className="space-y-3">
                                    {dashStats.top_suppliers.map((s: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-5 h-5 rounded-full bg-surface-700 text-xs text-surface-400 flex items-center justify-center">{i + 1}</span>
                                                <span className="text-sm text-white">{s.name}</span>
                                                <span className="text-xs text-surface-500">{s.orders} orders</span>
                                            </div>
                                            <span className="text-sm font-bold text-emerald-400">${((s.spend || 0) / 1000).toFixed(1)}K</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recent POs */}
                        {dashStats.recent_pos?.length > 0 && (
                            <div className="glass-card p-5">
                                <h3 className="text-sm font-bold text-surface-300 mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-primary-400" /> Recent Purchase Orders</h3>
                                <div className="space-y-2">
                                    {dashStats.recent_pos.map((po: any) => (
                                        <div key={po.id} className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-mono text-white">{po.po_number}</p>
                                                <p className="text-xs text-surface-500">{po.supplier_name}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-white">${po.total_amount?.toFixed(0)}</p>
                                                <StatusBadge status={po.status} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── PRs TAB ── */}
            {tab === "prs" && (
                <div className="glass-card overflow-hidden">
                    {prs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <ClipboardList className="w-12 h-12 text-surface-600 mb-3" />
                            <p className="text-surface-400 text-sm">No requisitions yet. Create one or use Auto-Generate.</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead><tr className="border-b border-surface-700/50">
                                {["PR#", "Warehouse", "Priority", "Items", "Est. Value", "Status", "Auto?", "Actions"].map((h) => (
                                    <th key={h} className={`px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider ${["Warehouse", "Est. Value", "Auto?"].includes(h) ? "hidden md:table-cell" : ""}`}>{h}</th>
                                ))}
                            </tr></thead>
                            <tbody className="divide-y divide-surface-700/30">
                                {prs.map((pr) => (
                                    <tr key={pr.id} className="hover:bg-surface-800/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-mono text-white">{pr.pr_number}</p>
                                            <p className="text-xs text-surface-500">{new Date(pr.created_at).toLocaleDateString()}</p>
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell"><span className="text-xs text-surface-400">{pr.warehouse_name || "Any"}</span></td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${pr.priority === "critical" ? "bg-red-400/10 text-red-400" : pr.priority === "high" ? "bg-amber-400/10 text-amber-400" : "bg-surface-700/30 text-surface-400"}`}>{pr.priority}</span>
                                        </td>
                                        <td className="px-4 py-3"><span className="text-sm text-white">{pr.items?.length || 0} items</span></td>
                                        <td className="px-4 py-3 hidden md:table-cell"><span className="text-sm font-semibold text-emerald-400">${(pr.estimated_total || 0).toFixed(0)}</span></td>
                                        <td className="px-4 py-3"><StatusBadge status={pr.status} /></td>
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            {pr.auto_generated ? <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">Auto</span> : <span className="text-xs text-surface-600">Manual</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            {pr.status === "pending" && (
                                                <button onClick={() => setApproveModal(pr)} className="text-xs font-medium text-primary-400 hover:text-primary-300 flex items-center gap-1">
                                                    Review <ChevronRight className="w-3 h-3" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* ── POs TAB ── */}
            {tab === "pos" && (
                <div className="glass-card overflow-hidden">
                    {pos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <FileText className="w-12 h-12 text-surface-600 mb-3" />
                            <p className="text-surface-400 text-sm">No purchase orders yet.</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead><tr className="border-b border-surface-700/50">
                                {["PO#", "Supplier", "Items", "Total", "Expected", "Status", "Actions"].map((h) => (
                                    <th key={h} className={`px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider ${["Items", "Expected"].includes(h) ? "hidden md:table-cell" : ""}`}>{h}</th>
                                ))}
                            </tr></thead>
                            <tbody className="divide-y divide-surface-700/30">
                                {pos.map((po) => {
                                    const overdue = po.expected_delivery_date && new Date(po.expected_delivery_date) < new Date() && !["received", "cancelled"].includes(po.status);
                                    return (
                                        <tr key={po.id} className={`hover:bg-surface-800/30 transition-colors ${overdue ? "bg-rose-500/5" : ""}`}>
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-mono text-white">{po.po_number}</p>
                                                {overdue && <p className="text-[10px] text-rose-400 font-semibold">⚠ Overdue</p>}
                                            </td>
                                            <td className="px-4 py-3"><span className="text-sm text-white">{po.supplier_name}</span></td>
                                            <td className="px-4 py-3 hidden md:table-cell"><span className="text-sm text-white">{po.items?.length || 0}</span></td>
                                            <td className="px-4 py-3"><span className="text-sm font-bold text-emerald-400">${po.total_amount?.toFixed(0)}</span></td>
                                            <td className="px-4 py-3 hidden md:table-cell"><span className="text-xs text-surface-400">{po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : "—"}</span></td>
                                            <td className="px-4 py-3"><StatusBadge status={po.status} /></td>
                                            <td className="px-4 py-3">
                                                {!["received", "cancelled"].includes(po.status) && (
                                                    <button onClick={() => setPoStatusModal(po)} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
                                                        Update <ChevronRight className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* ── GRN TAB ── */}
            {tab === "grn" && (
                <div className="glass-card overflow-hidden">
                    {grns.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <ReceiptText className="w-12 h-12 text-surface-600 mb-3" />
                            <p className="text-surface-400 text-sm">No GRNs recorded yet. Receive goods against a PO.</p>
                            <button onClick={() => setGrnModal(true)} className="btn-primary text-sm mt-4 flex items-center gap-2"><Plus className="w-4 h-4" /> Record GRN</button>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead><tr className="border-b border-surface-700/50">
                                {["GRN#", "PO#", "Supplier", "Warehouse", "Received", "Quality %", "Date"].map((h) => (
                                    <th key={h} className={`px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider ${["Warehouse", "Quality %"].includes(h) ? "hidden md:table-cell" : ""}`}>{h}</th>
                                ))}
                            </tr></thead>
                            <tbody className="divide-y divide-surface-700/30">
                                {grns.map((grn) => {
                                    const qualityPct = grn.quantity_received > 0 ? Math.round((grn.quality_passed / grn.quantity_received) * 100) : 100;
                                    return (
                                        <tr key={grn.id} className="hover:bg-surface-800/30 transition-colors">
                                            <td className="px-4 py-3"><p className="text-sm font-mono text-white">{grn.grn_number}</p></td>
                                            <td className="px-4 py-3"><span className="text-xs font-mono text-surface-400">{grn.po_number}</span></td>
                                            <td className="px-4 py-3"><span className="text-sm text-white">{grn.supplier_name || "—"}</span></td>
                                            <td className="px-4 py-3 hidden md:table-cell"><span className="text-xs text-surface-400">{grn.warehouse_name || "—"}</span></td>
                                            <td className="px-4 py-3"><span className="text-sm font-bold text-white">{grn.quantity_received} units</span></td>
                                            <td className="px-4 py-3 hidden md:table-cell">
                                                <span className={`text-sm font-bold ${qualityPct >= 90 ? "text-emerald-400" : qualityPct >= 70 ? "text-amber-400" : "text-red-400"}`}>{qualityPct}%</span>
                                            </td>
                                            <td className="px-4 py-3"><span className="text-xs text-surface-500">{new Date(grn.received_date || grn.created_at).toLocaleDateString()}</span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* MODALS */}
            <Modal open={prModal} title="Create Purchase Requisition" onClose={() => setPrModal(false)} wide>
                <PRForm warehouses={warehouses} products={products} onSubmit={handleCreatePR} loading={submitting} />
            </Modal>
            <Modal open={poModal} title="Create Purchase Order" onClose={() => setPoModal(false)} wide>
                <POForm suppliers={suppliers} warehouses={warehouses} products={products} requisitions={prs} onSubmit={handleCreatePO} loading={submitting} />
            </Modal>
            <Modal open={grnModal} title="Record Goods Receipt Note" onClose={() => setGrnModal(false)} wide>
                <GRNForm orders={pos} products={products} warehouses={warehouses} onSubmit={handleCreateGRN} loading={submitting} />
            </Modal>

            {/* PR Approve Modal */}
            <Modal open={!!approveModal} title={`Review PR: ${approveModal?.pr_number}`} onClose={() => setApproveModal(null)}>
                {approveModal && <PRApproveForm pr={approveModal} onApprove={handleApprovePR} onClose={() => setApproveModal(null)} />}
            </Modal>

            {/* PO Status Modal */}
            <Modal open={!!poStatusModal} title={`Update PO: ${poStatusModal?.po_number}`} onClose={() => setPoStatusModal(null)}>
                {poStatusModal && <POStatusForm po={poStatusModal} onUpdate={handlePoStatus} onClose={() => setPoStatusModal(null)} />}
            </Modal>
        </div>
    );
}

function PRApproveForm({ pr, onApprove, onClose }: any) {
    const [notes, setNotes] = useState("");
    return (
        <div className="space-y-4">
            <div className="bg-surface-800/40 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-surface-400">PR Number</span><span className="text-white font-mono">{pr.pr_number}</span></div>
                <div className="flex justify-between text-sm"><span className="text-surface-400">Items</span><span className="text-white">{pr.items?.length || 0} line items</span></div>
                <div className="flex justify-between text-sm"><span className="text-surface-400">Est. Total</span><span className="text-emerald-400 font-bold">${(pr.estimated_total || 0).toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-surface-400">Priority</span><span className="text-white capitalize">{pr.priority}</span></div>
            </div>
            <div>
                <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Review Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Add review comments..."
                    className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60 resize-none" />
            </div>
            <div className="flex gap-3">
                <button onClick={() => onApprove(pr.id, "reject", notes)} className="flex-1 py-2.5 text-sm rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 font-semibold flex items-center justify-center gap-2">
                    <XCircle className="w-4 h-4" /> Reject
                </button>
                <button onClick={() => onApprove(pr.id, "approve", notes)} className="flex-1 py-2.5 text-sm rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 hover:bg-emerald-400/20 font-semibold flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Approve
                </button>
            </div>
        </div>
    );
}

function POStatusForm({ po, onUpdate, onClose }: any) {
    const transitions: Record<string, string[]> = { pending: ["sent", "cancelled"], sent: ["acknowledged", "cancelled"], acknowledged: ["partial", "received", "cancelled"], partial: ["received", "cancelled"] };
    const nextStatuses = transitions[po.status] || [];
    const [status, setStatus] = useState(nextStatuses[0] || "");
    const [notes, setNotes] = useState("");
    return (
        <div className="space-y-4">
            <div className="bg-surface-800/40 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-surface-400">PO Number</span><span className="text-white font-mono">{po.po_number}</span></div>
                <div className="flex justify-between text-sm"><span className="text-surface-400">Supplier</span><span className="text-white">{po.supplier_name}</span></div>
                <div className="flex justify-between text-sm"><span className="text-surface-400">Current Status</span><StatusBadge status={po.status} /></div>
                <div className="flex justify-between text-sm"><span className="text-surface-400">Total</span><span className="text-emerald-400 font-bold">${po.total_amount?.toFixed(2)}</span></div>
            </div>
            {nextStatuses.length > 0 ? <>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-2 uppercase tracking-wide">Update Status To</label>
                    <div className="flex gap-2 flex-wrap">
                        {nextStatuses.map((s) => (
                            <button key={s} type="button" onClick={() => setStatus(s)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium capitalize border transition-all ${status === s ? "border-primary-500/50 bg-primary-500/10 text-white" : "border-surface-700/50 text-surface-400 hover:border-surface-600"}`}>
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notes (optional)..."
                    className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60 resize-none" />
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 btn-outline py-2.5 text-sm">Cancel</button>
                    <button onClick={() => onUpdate(po.id, status, notes)} disabled={!status} className="flex-1 btn-primary py-2.5 text-sm">Update Status</button>
                </div>
            </> : <p className="text-center text-surface-400 text-sm py-4">No further transitions available for this PO.</p>}
        </div>
    );
}
