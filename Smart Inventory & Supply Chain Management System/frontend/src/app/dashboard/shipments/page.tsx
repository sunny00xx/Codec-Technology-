"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Truck, Plus, Search, X, Save, RefreshCw, AlertTriangle, CheckCircle,
    MapPin, Clock, Package, ChevronRight, Activity, Zap, Navigation,
    Eye, Radio, Shield, FileCheck, BarChart3, TrendingUp
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const WS_URL = (process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000") + "/ws";
function getToken() { return typeof window !== "undefined" ? localStorage.getItem("token") || "" : ""; }
function getTenantId() {
    try { const u = typeof window !== "undefined" ? localStorage.getItem("user") : null; return u ? JSON.parse(u).tenantId || JSON.parse(u).tenant_id || "" : ""; } catch { return ""; }
}
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

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    created: { label: "Created", color: "text-surface-300", bg: "bg-surface-700/40", icon: Package },
    pickup_scheduled: { label: "Pickup Scheduled", color: "text-blue-400", bg: "bg-blue-400/10", icon: Clock },
    picked_up: { label: "Picked Up", color: "text-cyan-400", bg: "bg-cyan-400/10", icon: Truck },
    in_transit: { label: "In Transit", color: "text-primary-400", bg: "bg-primary-400/10", icon: Navigation },
    out_for_delivery: { label: "Out for Delivery", color: "text-amber-400", bg: "bg-amber-400/10", icon: Activity },
    delivered: { label: "Delivered", color: "text-emerald-400", bg: "bg-emerald-400/10", icon: CheckCircle },
    exception: { label: "Exception", color: "text-rose-400", bg: "bg-rose-400/10", icon: AlertTriangle },
    cancelled: { label: "Cancelled", color: "text-surface-500", bg: "bg-surface-700/20", icon: X },
};

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_MAP[status] || { label: status, color: "text-surface-400", bg: "bg-surface-700/30", icon: Activity };
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
            <Icon className="w-3 h-3" />{cfg.label}
        </span>
    );
}

// ── Create Shipment Form ──────────────────────────────────────
function ShipmentForm({ warehouses, products, onSubmit, loading }: any) {
    const CARRIERS = ["FedEx", "DHL", "UPS", "BlueDart", "EcomExpress", "Delhivery", "DTDC"];
    const [form, setForm] = useState({
        carrier: "BlueDart", service_type: "standard", origin_warehouse_id: "",
        destination_city: "", destination_state: "", destination_country: "India",
        destination_address: "", destination_zip: "", recipient_name: "", recipient_phone: "",
        estimated_delivery: "", weight: "", notes: "",
    });
    const [items, setItems] = useState([{ product_id: "", quantity: 1, description: "" }]);
    const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, weight: parseFloat(form.weight) || null, items }); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Carrier *</label>
                    <select value={form.carrier} onChange={(e) => set("carrier", e.target.value)} required
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60">
                        {CARRIERS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Service Type</label>
                    <select value={form.service_type} onChange={(e) => set("service_type", e.target.value)}
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60">
                        {["standard", "express", "overnight", "economy"].map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                </div>
                <div className="col-span-2">
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Origin Warehouse</label>
                    <select value={form.origin_warehouse_id} onChange={(e) => set("origin_warehouse_id", e.target.value)}
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60">
                        <option value="">Select warehouse…</option>
                        {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Recipient Name</label>
                    <input value={form.recipient_name} onChange={(e) => set("recipient_name", e.target.value)} placeholder="John Doe"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Recipient Phone</label>
                    <input value={form.recipient_phone} onChange={(e) => set("recipient_phone", e.target.value)} placeholder="+91 98765 43210"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60" />
                </div>
                <div className="col-span-2">
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Destination Address</label>
                    <input value={form.destination_address} onChange={(e) => set("destination_address", e.target.value)} placeholder="Street address"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">City *</label>
                    <input value={form.destination_city} onChange={(e) => set("destination_city", e.target.value)} required placeholder="Mumbai"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">State</label>
                    <input value={form.destination_state} onChange={(e) => set("destination_state", e.target.value)} placeholder="Maharashtra"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Estimated Delivery</label>
                    <input type="date" value={form.estimated_delivery} onChange={(e) => set("estimated_delivery", e.target.value)}
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Weight (kg)</label>
                    <input type="number" step="0.1" value={form.weight} onChange={(e) => set("weight", e.target.value)} placeholder="2.5"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60" />
                </div>
            </div>

            {/* Items */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-surface-400 uppercase tracking-wide">Package Contents</label>
                    <button type="button" onClick={() => setItems([...items, { product_id: "", quantity: 1, description: "" }])}
                        className="text-xs text-primary-400 flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
                </div>
                <div className="space-y-2">
                    {items.map((item, i) => (
                        <div key={i} className="flex gap-2">
                            <select value={item.product_id} onChange={(e) => setItems(items.map((it, idx) => idx === i ? { ...it, product_id: e.target.value } : it))}
                                className="flex-1 bg-surface-800/60 border border-surface-700/50 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60">
                                <option value="">Product (optional)…</option>
                                {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <input type="number" min="1" value={item.quantity} onChange={(e) => setItems(items.map((it, idx) => idx === i ? { ...it, quantity: parseInt(e.target.value) } : it))}
                                className="w-20 bg-surface-800/60 border border-surface-700/50 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60" placeholder="Qty" />
                            {items.length > 1 && <button type="button" onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="p-2.5 rounded-xl hover:bg-red-500/10 text-surface-500 hover:text-red-400"><X className="w-4 h-4" /></button>}
                        </div>
                    ))}
                </div>
            </div>

            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Additional notes..."
                className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60 resize-none" />
            <button type="submit" disabled={loading} className="w-full btn-primary flex items-center justify-center gap-2 py-3">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Create Shipment
            </button>
        </form>
    );
}

// ── Shipment Detail ───────────────────────────────────────────
function ShipmentDetail({ shipment, onStatusUpdate, onSimulateGPS, onResolveException, onPOD }: any) {
    if (!shipment) return null;
    const TRANSITIONS: Record<string, string[]> = {
        created: ["pickup_scheduled", "cancelled"], pickup_scheduled: ["picked_up", "exception", "cancelled"],
        picked_up: ["in_transit", "exception"], in_transit: ["out_for_delivery", "exception"],
        out_for_delivery: ["delivered", "exception"], exception: ["in_transit", "out_for_delivery"],
    };
    const nextStatuses = TRANSITIONS[shipment.status] || [];
    const [newStatus, setNewStatus] = useState(nextStatuses[0] || "");
    const [statusDesc, setStatusDesc] = useState("");
    const [location, setLocation] = useState("");
    const [podName, setPodName] = useState("");

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-lg font-black text-white font-mono">{shipment.tracking_number}</p>
                    <p className="text-xs text-surface-500">{shipment.carrier} · {shipment.service_type}</p>
                </div>
                <StatusBadge status={shipment.status} />
            </div>

            {/* Route */}
            <div className="glass p-4 rounded-xl flex items-center gap-4">
                <div className="text-center">
                    <MapPin className="w-4 h-4 text-primary-400 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-white">{shipment.origin_warehouse_name || "Origin"}</p>
                </div>
                <div className="flex-1 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="flex-1 h-0.5 bg-surface-700 rounded-full" />)}
                    <Truck className="w-4 h-4 text-primary-400 flex-shrink-0" />
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="flex-1 h-0.5 bg-surface-700 rounded-full" />)}
                </div>
                <div className="text-center">
                    <MapPin className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-white">{shipment.destination_city}</p>
                    {shipment.recipient_name && <p className="text-[10px] text-surface-500">{shipment.recipient_name}</p>}
                </div>
            </div>

            {/* GPS Trail */}
            {shipment.gps_logs?.length > 0 && (
                <div className="glass p-4 rounded-xl">
                    <h4 className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Navigation className="w-3.5 h-3.5 text-cyan-400" /> Current Location</h4>
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
                        <p className="text-sm text-white">{shipment.current_location || shipment.gps_logs[0]?.location_name || "Tracking active"}</p>
                        <span className="text-xs text-surface-500 ml-auto">{shipment.gps_logs[0]?.speed_kmh ? `${shipment.gps_logs[0].speed_kmh} km/h` : ""}</span>
                    </div>
                    <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto">
                        {shipment.gps_logs.map((g: any, i: number) => (
                            <div key={g.id} className="flex items-center gap-2 text-xs">
                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${i === 0 ? "bg-cyan-400" : "bg-surface-600"}`} />
                                <span className="text-surface-400">{g.location_name || `${g.latitude?.toFixed(3)}, ${g.longitude?.toFixed(3)}`}</span>
                                <span className="text-surface-600 ml-auto">{new Date(g.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Timeline */}
            {shipment.events?.length > 0 && (
                <div>
                    <h4 className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-3">Shipment Timeline</h4>
                    <div className="space-y-0">
                        {shipment.events.map((ev: any, i: number) => (
                            <div key={ev.id} className="flex gap-3">
                                <div className="flex flex-col items-center">
                                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${i === 0 ? "bg-primary-400" : "bg-surface-600"}`} />
                                    {i < shipment.events.length - 1 && <div className="w-px flex-1 bg-surface-700/50 my-1" />}
                                </div>
                                <div className="pb-3">
                                    <p className="text-sm font-semibold text-white">{ev.description}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {ev.location && <span className="text-xs text-surface-500 flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{ev.location}</span>}
                                        <span className="text-xs text-surface-600">{new Date(ev.created_at).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Open Exceptions */}
            {shipment.exceptions?.filter((e: any) => !e.resolved).length > 0 && (
                <div>
                    <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5" /> Open Exceptions</h4>
                    <div className="space-y-2">
                        {shipment.exceptions.filter((e: any) => !e.resolved).map((ex: any) => (
                            <div key={ex.id} className="flex items-start justify-between gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                                <div>
                                    <p className="text-sm font-semibold text-rose-300">{ex.exception_type}</p>
                                    <p className="text-xs text-surface-400">{ex.description}</p>
                                </div>
                                <button onClick={() => onResolveException(shipment.id, ex.id)} className="text-xs text-emerald-400 hover:text-emerald-300 flex-shrink-0">Resolve</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
                <button onClick={() => onSimulateGPS(shipment.id)} className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium rounded-xl bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 hover:bg-cyan-400/20 transition-all">
                    <Radio className="w-3.5 h-3.5" /> Simulate GPS
                </button>
                {shipment.status === "delivered" && !shipment.pod_collected && (
                    <button onClick={() => { const n = prompt("Received by (name)?"); if (n) onPOD(shipment.id, n); }}
                        className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 hover:bg-emerald-400/20 transition-all col-span-2">
                        <FileCheck className="w-3.5 h-3.5" /> Record Proof of Delivery
                    </button>
                )}
            </div>

            {/* Status update */}
            {nextStatuses.length > 0 && (
                <div className="border-t border-surface-700/30 pt-4 space-y-3">
                    <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide">Update Status</label>
                    <div className="flex gap-2 flex-wrap">
                        {nextStatuses.map((s) => (
                            <button key={s} type="button" onClick={() => setNewStatus(s)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize border transition-all ${newStatus === s ? "border-primary-500/50 bg-primary-500/10 text-white" : "border-surface-700/50 text-surface-400"}`}>
                                {STATUS_MAP[s]?.label || s}
                            </button>
                        ))}
                    </div>
                    <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Current location (optional)"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60" />
                    <input value={statusDesc} onChange={(e) => setStatusDesc(e.target.value)} placeholder="Description / notes"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60" />
                    <button onClick={() => onStatusUpdate(shipment.id, newStatus, statusDesc, location)} disabled={!newStatus}
                        className="w-full btn-primary py-2.5 text-sm flex items-center justify-center gap-2">
                        <ChevronRight className="w-4 h-4" /> Update to {STATUS_MAP[newStatus]?.label || newStatus}
                    </button>
                </div>
            )}
        </div>
    );
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function ShipmentsPage() {
    const [shipments, setShipments] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({});
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [createModal, setCreateModal] = useState(false);
    const [detailShipment, setDetailShipment] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
    const [wsEvents, setWsEvents] = useState<any[]>([]);
    const wsRef = useRef<WebSocket | null>(null);

    const showToast = (msg: string, type: "success" | "error" = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

    // WebSocket connection
    useEffect(() => {
        const tenantId = getTenantId();
        let ws: WebSocket;
        try {
            ws = new WebSocket(`${WS_URL}?tenant_id=${tenantId}&token=${getToken()}`);
            ws.onopen = () => console.log("[WS] Connected");
            ws.onmessage = (e) => {
                try {
                    const msg = JSON.parse(e.data);
                    if (msg.type !== "CONNECTED" && msg.type !== "BUFFERED_NOTIFICATIONS") {
                        setWsEvents((prev) => [msg, ...prev].slice(0, 20));
                        if (msg.type === "SHIPMENT_EXCEPTION") showToast(`⚠ Exception: ${msg.data?.tracking_number}`, "error");
                        if (msg.type === "SHIPMENT_DELIVERED") showToast(`✓ Delivered: ${msg.data?.tracking_number}`);
                    }
                } catch (_) { }
            };
            ws.onerror = () => { };
            wsRef.current = ws;
        } catch (_) { }
        return () => { try { ws?.close(); } catch (_) { } };
    }, []);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [shipRes, statsRes, whRes, prodRes] = await Promise.all([
            apiFetch(`/shipments?search=${search}&status=${statusFilter}&limit=60`),
            apiFetch("/shipments/stats/overview"),
            apiFetch("/warehouses?limit=100"),
            apiFetch("/products?limit=200"),
        ]);
        if (shipRes.success) setShipments(shipRes.data);
        if (statsRes.success) setStats(statsRes.data);
        if (whRes.success) setWarehouses(whRes.data);
        if (prodRes.success) setProducts(prodRes.data);
        setLoading(false);
    }, [search, statusFilter]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleCreate = async (data: any) => {
        setSubmitting(true);
        const res = await apiFetch("/shipments", { method: "POST", body: JSON.stringify(data) });
        setSubmitting(false);
        if (res.success) { showToast("Shipment created!"); setCreateModal(false); fetchAll(); }
        else showToast(res.error?.message || "Failed", "error");
    };

    const handleView = async (id: string) => {
        const res = await apiFetch(`/shipments/${id}`);
        if (res.success) setDetailShipment(res.data);
    };

    const handleStatusUpdate = async (id: string, status: string, description: string, location: string) => {
        const res = await apiFetch(`/shipments/${id}/status`, { method: "POST", body: JSON.stringify({ status, description, location }) });
        if (res.success) { showToast(`Status → ${status}`); handleView(id); fetchAll(); }
        else showToast(res.error?.message || "Failed", "error");
    };

    const handleSimulateGPS = async (id: string) => {
        const res = await apiFetch(`/shipments/${id}/simulate-gps`, { method: "POST" });
        if (res.success) { showToast("GPS simulation recorded!"); handleView(id); }
        else showToast("Simulation failed", "error");
    };

    const handleResolveException = async (shipId: string, exId: string) => {
        const res = await apiFetch(`/shipments/${shipId}/exceptions/${exId}/resolve`, { method: "PATCH", body: JSON.stringify({ resolution_notes: "Resolved by operator" }) });
        if (res.success) { showToast("Exception resolved!"); handleView(shipId); fetchAll(); }
        else showToast("Failed", "error");
    };

    const handlePOD = async (shipId: string, receivedBy: string) => {
        const res = await apiFetch(`/shipments/${shipId}/pod`, { method: "POST", body: JSON.stringify({ received_by: receivedBy }) });
        if (res.success) { showToast("POD recorded!"); handleView(shipId); fetchAll(); }
        else showToast(res.error?.message || "Failed", "error");
    };

    const statCards = [
        { label: "Total", value: stats.total || 0, icon: Package, color: "from-primary-500 to-violet-500" },
        { label: "In Transit", value: stats.in_transit || 0, icon: Truck, color: "from-cyan-400 to-cyan-600" },
        { label: "Delivered", value: stats.delivered || 0, icon: CheckCircle, color: "from-emerald-400 to-emerald-600" },
        { label: "Exceptions", value: stats.open_exceptions || 0, icon: AlertTriangle, color: "from-rose-400 to-rose-600" },
        { label: "Overdue", value: stats.overdue || 0, icon: Clock, color: "from-amber-400 to-amber-600" },
    ];

    const allStatuses = ["", "created", "pickup_scheduled", "picked_up", "in_transit", "out_for_delivery", "delivered", "exception", "cancelled"];

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
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                            <Truck className="w-5 h-5 text-white" />
                        </div>
                        Shipments
                    </h1>
                    <p className="text-surface-500 text-sm mt-1 flex items-center gap-2">
                        Real-time tracking dashboard
                        <span className="flex items-center gap-1 text-emerald-400 text-xs"><Radio className="w-3 h-3 animate-pulse" /> Live</span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchAll} className="btn-outline flex items-center gap-2 text-sm py-2"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
                    <button onClick={() => setCreateModal(true)} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> New Shipment</button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {statCards.map((s) => (
                    <div key={s.label} className="glass-card p-4 text-center">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center mx-auto mb-2`}>
                            <s.icon className="w-4 h-4 text-white" />
                        </div>
                        <p className="text-xl font-black text-white">{s.value}</p>
                        <p className="text-[10px] text-surface-500">{s.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Shipment List */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Filters */}
                    <div className="flex gap-3">
                        <div className="flex-1 flex items-center glass rounded-xl px-4 py-2.5 gap-3">
                            <Search className="w-4 h-4 text-surface-500 flex-shrink-0" />
                            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tracking #, city, recipient..."
                                className="bg-transparent border-none outline-none text-sm text-white placeholder:text-surface-500 w-full" />
                            {search && <button onClick={() => setSearch("")}><X className="w-4 h-4 text-surface-500" /></button>}
                        </div>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                            className="glass border border-surface-700/30 rounded-xl px-3 py-2.5 text-sm text-surface-300 focus:outline-none">
                            {allStatuses.map((s) => <option key={s} value={s}>{s ? (STATUS_MAP[s]?.label || s) : "All Status"}</option>)}
                        </select>
                    </div>

                    {loading ? (
                        <div className="space-y-2">{[1, 2, 3, 4].map(i => <div key={i} className="glass-card h-20 animate-pulse" />)}</div>
                    ) : shipments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center glass-card">
                            <Truck className="w-12 h-12 text-surface-600 mb-3" />
                            <p className="text-surface-400 text-sm">No shipments found.</p>
                            <button onClick={() => setCreateModal(true)} className="btn-primary text-sm mt-4 flex items-center gap-2"><Plus className="w-4 h-4" /> Create Shipment</button>
                        </div>
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <table className="w-full">
                                <thead><tr className="border-b border-surface-700/50">
                                    {["Tracking #", "Destination", "Carrier", "Est. Delivery", "Status", ""].map((h) => (
                                        <th key={h} className={`px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider ${["Est. Delivery"].includes(h) ? "hidden md:table-cell" : ""}`}>{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody className="divide-y divide-surface-700/30">
                                    {shipments.map((s) => {
                                        const overdue = s.estimated_delivery && new Date(s.estimated_delivery) < new Date() && !["delivered", "cancelled"].includes(s.status);
                                        return (
                                            <tr key={s.id} className={`hover:bg-surface-800/30 transition-colors cursor-pointer ${overdue ? "bg-rose-500/5" : ""} ${s.open_exceptions > 0 ? "bg-amber-400/5" : ""}`}
                                                onClick={() => handleView(s.id)}>
                                                <td className="px-4 py-3">
                                                    <p className="text-sm font-mono text-primary-400">{s.tracking_number}</p>
                                                    {overdue && <p className="text-[10px] text-rose-400 font-semibold">⚠ Overdue</p>}
                                                    {s.open_exceptions > 0 && <p className="text-[10px] text-amber-400">{s.open_exceptions} exception{s.open_exceptions > 1 ? "s" : ""}</p>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="text-sm text-white">{s.destination_city}</p>
                                                    {s.recipient_name && <p className="text-xs text-surface-500">{s.recipient_name}</p>}
                                                </td>
                                                <td className="px-4 py-3"><span className="text-xs text-surface-400">{s.carrier}</span></td>
                                                <td className="px-4 py-3 hidden md:table-cell">
                                                    <span className={`text-xs ${overdue ? "text-rose-400 font-semibold" : "text-surface-400"}`}>
                                                        {s.estimated_delivery ? new Date(s.estimated_delivery).toLocaleDateString() : "—"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                                                <td className="px-4 py-3"><Eye className="w-4 h-4 text-surface-500" /></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Right Panel: Live Event Feed + Carrier Stats */}
                <div className="space-y-4">
                    {/* Live WS events */}
                    <div className="glass-card p-4">
                        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" /> Live Event Feed
                        </h3>
                        {wsEvents.length === 0 ? (
                            <p className="text-xs text-surface-600 text-center py-4">Waiting for real-time events…</p>
                        ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {wsEvents.map((ev, i) => (
                                    <div key={i} className="flex items-start gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0 animate-pulse" />
                                        <div>
                                            <p className="text-xs font-semibold text-white">{ev.type?.replace(/_/g, " ")}</p>
                                            <p className="text-[10px] text-surface-500">{ev.data?.tracking_number || ev.data?.description || ""}</p>
                                            <p className="text-[10px] text-surface-600">{new Date(ev.timestamp).toLocaleTimeString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Carrier breakdown */}
                    {stats.by_carrier?.length > 0 && (
                        <div className="glass-card p-4">
                            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-primary-400" /> Carrier Breakdown
                            </h3>
                            <div className="space-y-3">
                                {stats.by_carrier.map((c: any) => {
                                    const rate = c.shipments > 0 ? Math.round((c.delivered / c.shipments) * 100) : 0;
                                    return (
                                        <div key={c.carrier}>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-white font-medium">{c.carrier}</span>
                                                <span className="text-surface-400">{c.shipments} shipments · <span className={rate >= 80 ? "text-emerald-400" : rate >= 60 ? "text-amber-400" : "text-rose-400"}>{rate}%</span> delivered</span>
                                            </div>
                                            <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-primary-500 to-violet-500 rounded-full" style={{ width: `${rate}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Recent system events */}
                    {stats.recent_events?.length > 0 && (
                        <div className="glass-card p-4">
                            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-cyan-400" /> Recent Updates
                            </h3>
                            <div className="space-y-2">
                                {stats.recent_events.slice(0, 6).map((ev: any) => (
                                    <div key={ev.id} className="flex items-start gap-2">
                                        <div className="w-1 h-1 rounded-full bg-surface-500 mt-1.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs text-white">{ev.description}</p>
                                            <p className="text-[10px] text-surface-500 font-mono">{ev.tracking_number} · {new Date(ev.created_at).toLocaleTimeString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <Modal open={createModal} title="Create New Shipment" onClose={() => setCreateModal(false)} wide>
                <ShipmentForm warehouses={warehouses} products={products} onSubmit={handleCreate} loading={submitting} />
            </Modal>

            <Modal open={!!detailShipment} title="Shipment Details" onClose={() => setDetailShipment(null)} wide>
                <ShipmentDetail
                    shipment={detailShipment}
                    onStatusUpdate={handleStatusUpdate}
                    onSimulateGPS={handleSimulateGPS}
                    onResolveException={handleResolveException}
                    onPOD={handlePOD}
                />
            </Modal>
        </div>
    );
}
