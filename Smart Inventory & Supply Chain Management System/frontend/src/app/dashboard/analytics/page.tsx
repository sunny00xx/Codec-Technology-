"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
    BarChart3, TrendingUp, Package, Warehouse, Truck, Users, DollarSign,
    Activity, AlertTriangle, CheckCircle, ShoppingCart, Layers, ArrowUpRight,
    ArrowDownRight, RefreshCw, Gauge, Box
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
function getToken() { return typeof window !== "undefined" ? localStorage.getItem("token") || "" : ""; }
async function apiFetch(path: string) {
    const r = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    return r.json();
}

// ── MiniSparkline (CSS) ──────────────────────────────────────
function Sparkline({ data, color = "#818cf8" }: { data: number[]; color?: string }) {
    if (!data?.length) return null;
    const max = Math.max(...data, 1);
    return (
        <div className="flex items-end gap-px h-8 w-24">
            {data.map((v, i) => (
                <div key={i} className="flex-1 rounded-t-sm transition-all duration-300" style={{ height: `${(v / max) * 100}%`, backgroundColor: color, opacity: 0.4 + (i / data.length) * 0.6 }} />
            ))}
        </div>
    );
}

// ── GaugeChart ───────────────────────────────────────────────
function GaugeChart({ value, label, size = 120 }: { value: number; label: string; size?: number }) {
    const r = (size - 16) / 2;
    const c = Math.PI * r;
    const pct = Math.min(Math.max(value, 0), 100);
    const color = pct >= 80 ? "#34d399" : pct >= 60 ? "#fbbf24" : "#f87171";
    return (
        <div className="flex flex-col items-center">
            <svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`}>
                <path d={`M 8 ${size / 2} A ${r} ${r} 0 0 1 ${size - 8} ${size / 2}`} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round" />
                <path d={`M 8 ${size / 2} A ${r} ${r} 0 0 1 ${size - 8} ${size / 2}`} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={`${c}`} strokeDashoffset={`${c - (c * pct) / 100}`} style={{ transition: "stroke-dashoffset 1s ease" }} />
                <text x={size / 2} y={size / 2 - 4} textAnchor="middle" className="font-black text-lg" fill="white">{pct}%</text>
            </svg>
            <p className="text-xs text-surface-500 -mt-1">{label}</p>
        </div>
    );
}

// ── BarChart (horizontal) ────────────────────────────────────
function HBar({ items, valueKey, labelKey, color = "from-primary-500 to-violet-500" }: any) {
    if (!items?.length) return <p className="text-xs text-surface-600 text-center py-4">No data</p>;
    const max = Math.max(...items.map((i: any) => i[valueKey] || 0), 1);
    return (
        <div className="space-y-2.5">
            {items.map((item: any, idx: number) => (
                <div key={idx}>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-white font-medium truncate max-w-[60%]">{item[labelKey]}</span>
                        <span className="text-surface-400">{typeof item[valueKey] === "number" ? item[valueKey].toLocaleString() : item[valueKey]}</span>
                    </div>
                    <div className="h-2 bg-surface-700/50 rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700`}
                            style={{ width: `${((item[valueKey] || 0) / max) * 100}%` }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── VerticalBarChart ─────────────────────────────────────────
function VBar({ data, xKey, yKeys, colors, labels }: { data: any[]; xKey: string; yKeys: string[]; colors: string[]; labels: string[] }) {
    if (!data?.length) return <p className="text-xs text-surface-600 text-center py-8">No data for selected period</p>;
    const max = Math.max(...data.flatMap((d) => yKeys.map((k) => d[k] || 0)), 1);
    return (
        <div>
            <div className="flex items-end gap-2 h-36">
                {data.map((d, i) => (
                    <div key={i} className="flex-1 flex items-end gap-0.5 justify-center">
                        {yKeys.map((k, ki) => (
                            <div key={k} className="flex-1 rounded-t-md transition-all duration-500" title={`${labels[ki]}: ${d[k] || 0}`}
                                style={{ height: `${Math.max(((d[k] || 0) / max) * 100, 3)}%`, backgroundColor: colors[ki] }} />
                        ))}
                    </div>
                ))}
            </div>
            <div className="flex gap-2 mt-2">
                {data.map((d, i) => <div key={i} className="flex-1 text-center text-[9px] text-surface-600 truncate">{d[xKey]?.slice(5)}</div>)}
            </div>
            <div className="flex items-center justify-center gap-4 mt-3">
                {labels.map((l, i) => <div key={l} className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: colors[i] }} /><span className="text-[10px] text-surface-400">{l}</span></div>)}
            </div>
        </div>
    );
}

// ── Donut Chart ──────────────────────────────────────────────
function DonutChart({ items, colors }: { items: { label: string; value: number }[]; colors: string[] }) {
    const total = items.reduce((s, i) => s + i.value, 0) || 1;
    let cum = 0;
    return (
        <div className="flex items-center gap-4">
            <svg width="80" height="80" viewBox="0 0 80 80">
                {items.map((item, i) => {
                    const pct = item.value / total;
                    const offset = cum;
                    cum += pct;
                    const r = 32;
                    const c = 2 * Math.PI * r;
                    return <circle key={i} cx="40" cy="40" r={r} fill="none" stroke={colors[i % colors.length]} strokeWidth="12"
                        strokeDasharray={`${c * pct} ${c}`} strokeDashoffset={`${-c * offset}`} transform="rotate(-90 40 40)" />;
                })}
                <text x="40" y="44" textAnchor="middle" fill="white" className="text-sm font-bold">{total}</text>
            </svg>
            <div className="space-y-1.5">
                {items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                        <span className="text-xs text-surface-400">{item.label}</span>
                        <span className="text-xs text-white font-semibold ml-auto">{item.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Heat Map ─────────────────────────────────────────────────
function HeatMap({ items }: { items: { name: string; capacity: number; used: number }[] }) {
    if (!items?.length) return <p className="text-xs text-surface-600 text-center py-4">No warehouses</p>;
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {items.map((w) => {
                const pct = w.capacity > 0 ? Math.round((w.used / w.capacity) * 100) : 0;
                const bg = pct >= 90 ? "bg-rose-500" : pct >= 70 ? "bg-amber-500" : pct >= 40 ? "bg-emerald-500" : "bg-cyan-500";
                return (
                    <div key={w.name} className="glass p-3 rounded-xl text-center relative overflow-hidden">
                        <div className={`absolute inset-0 ${bg} opacity-10`} />
                        <p className="text-sm font-bold text-white relative">{pct}%</p>
                        <p className="text-[10px] text-surface-400 relative truncate">{w.name}</p>
                        <p className="text-[10px] text-surface-600 relative">{w.used.toLocaleString()}/{w.capacity.toLocaleString()}</p>
                    </div>
                );
            })}
        </div>
    );
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function AnalyticsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const res = await apiFetch("/analytics/dashboard-stats");
        if (res.success) setData(res.data);
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading || !data) return (
        <div className="space-y-6">
            <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-white" /></div><h1 className="text-2xl font-black text-white">Analytics</h1></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="glass-card h-28 animate-pulse" />)}</div>
        </div>
    );

    const { kpis, sparklines, charts } = data;
    const kpiCards = [
        { label: "Products", value: kpis.total_products, icon: Package, color: "from-primary-500 to-violet-500", spark: [] },
        { label: "Warehouses", value: kpis.total_warehouses, icon: Warehouse, color: "from-emerald-400 to-emerald-600", spark: [] },
        { label: "Suppliers", value: kpis.total_suppliers, icon: Users, color: "from-cyan-400 to-cyan-600", spark: [] },
        { label: "Shipments", value: kpis.total_shipments, icon: Truck, color: "from-amber-400 to-amber-600", spark: sparklines?.shipments?.map((s: any) => s.count) || [] },
        { label: "Stock Value", value: `$${(kpis.stock_value / 1000).toFixed(1)}K`, icon: DollarSign, color: "from-emerald-400 to-emerald-600", spark: [] },
        { label: "Total Inventory", value: kpis.total_inventory?.toLocaleString(), icon: Layers, color: "from-primary-400 to-primary-600", spark: [] },
        { label: "Low Stock Items", value: kpis.low_stock, icon: AlertTriangle, color: "from-amber-400 to-amber-600", spark: [], alert: kpis.low_stock > 0 },
        { label: "Out of Stock", value: kpis.out_of_stock, icon: Box, color: "from-rose-400 to-rose-600", spark: [], alert: kpis.out_of_stock > 0 },
    ];

    const shipStatusColors = ["#818cf8", "#34d399", "#fbbf24", "#f87171", "#38bdf8", "#a78bfa", "#fb923c", "#94a3b8"];
    const shipStatus = (charts.shipment_status || []).map((s: any) => ({ label: s.status, value: s.count }));
    const poStatus = (charts.po_status || []).map((s: any) => ({ label: s.status, value: s.count }));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white">Analytics</h1>
                        <p className="text-surface-500 text-sm">Executive intelligence dashboard</p>
                    </div>
                </div>
                <button onClick={fetchData} className="btn-outline flex items-center gap-2 text-sm py-2">
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {kpiCards.map((k) => (
                    <div key={k.label} className={`glass-card p-4 flex items-center gap-3 ${k.alert ? "border-amber-400/20" : ""}`}>
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${k.color} flex items-center justify-center flex-shrink-0`}>
                            <k.icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xl font-black text-white">{k.value}</p>
                            <p className="text-[10px] text-surface-500 uppercase tracking-wider">{k.label}</p>
                        </div>
                        {k.spark?.length > 0 && <Sparkline data={k.spark} />}
                    </div>
                ))}
            </div>

            {/* Row 1: Inventory Health + Shipment Status + PO Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-5 flex flex-col items-center justify-center">
                    <h3 className="text-sm font-bold text-surface-300 mb-4 flex items-center gap-2"><Gauge className="w-4 h-4 text-primary-400" /> Inventory Health</h3>
                    <GaugeChart value={kpis.inventory_health} label="Overall Health" size={140} />
                    <div className="flex items-center gap-4 mt-4 text-xs">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400" /> Healthy: {kpis.healthy_stock}</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400" /> Low: {kpis.low_stock}</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-400" /> Out: {kpis.out_of_stock}</span>
                    </div>
                </div>
                <div className="glass-card p-5">
                    <h3 className="text-sm font-bold text-surface-300 mb-4 flex items-center gap-2"><Truck className="w-4 h-4 text-cyan-400" /> Shipments by Status</h3>
                    <DonutChart items={shipStatus} colors={shipStatusColors} />
                </div>
                <div className="glass-card p-5">
                    <h3 className="text-sm font-bold text-surface-300 mb-4 flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-violet-400" /> POs by Status</h3>
                    <DonutChart items={poStatus} colors={["#818cf8", "#34d399", "#f87171", "#fbbf24", "#38bdf8", "#a78bfa"]} />
                </div>
            </div>

            {/* Row 2: Supply-Demand Gap + Procurement Cost Trend */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-card p-5">
                    <h3 className="text-sm font-bold text-surface-300 mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-400" /> Supply vs Demand Gap</h3>
                    <VBar data={charts.supply_demand || []} xKey="month" yKeys={["supply", "demand"]} colors={["#34d399", "#f87171"]} labels={["Supply (IN)", "Demand (OUT)"]} />
                </div>
                <div className="glass-card p-5">
                    <h3 className="text-sm font-bold text-surface-300 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-violet-400" /> Procurement Cost Trend</h3>
                    <VBar data={charts.procurement_trend || []} xKey="month" yKeys={["spend"]} colors={["#818cf8"]} labels={["Spend ($)"]} />
                </div>
            </div>

            {/* Row 3: Top SKUs + Supplier Performance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-card p-5">
                    <h3 className="text-sm font-bold text-surface-300 mb-4 flex items-center gap-2"><Package className="w-4 h-4 text-amber-400" /> Top SKUs by Movement</h3>
                    <HBar items={charts.top_skus || []} valueKey="total_moved" labelKey="name" color="from-amber-400 to-amber-600" />
                </div>
                <div className="glass-card p-5">
                    <h3 className="text-sm font-bold text-surface-300 mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-primary-400" /> Supplier Performance</h3>
                    <HBar items={charts.supplier_performance || []} valueKey="score" labelKey="name" color="from-primary-500 to-violet-500" />
                </div>
            </div>

            {/* Row 4: Warehouse Utilization Heat Map + Stock Movement */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-card p-5">
                    <h3 className="text-sm font-bold text-surface-300 mb-4 flex items-center gap-2"><Warehouse className="w-4 h-4 text-emerald-400" /> Warehouse Utilization</h3>
                    <HeatMap items={charts.warehouse_utilization || []} />
                </div>
                <div className="glass-card p-5">
                    <h3 className="text-sm font-bold text-surface-300 mb-4 flex items-center gap-2"><Layers className="w-4 h-4 text-cyan-400" /> Stock In vs Out</h3>
                    <VBar data={charts.movements || []} xKey="month" yKeys={["stock_in", "stock_out"]} colors={["#34d399", "#f87171"]} labels={["Stock In", "Stock Out"]} />
                </div>
            </div>
        </div>
    );
}
