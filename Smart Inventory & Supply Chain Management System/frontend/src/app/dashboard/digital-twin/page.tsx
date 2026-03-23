"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Network, Play, RefreshCw, AlertTriangle, CheckCircle, TrendingUp, Warehouse,
    Users, Truck, Target, Zap, X, Shield, BarChart3, ArrowRight, Box, Activity
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
function getToken() { return typeof window !== "undefined" ? localStorage.getItem("token") || "" : ""; }
async function apiFetch(path: string, options: RequestInit = {}) {
    const r = await fetch(`${API}${path}`, { ...options, headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...options.headers } });
    return r.json();
}

function Modal({ open, title, onClose, children }: any) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-2xl mx-4 glass-strong rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
                <div className="flex items-center justify-between p-6 border-b border-surface-700/50"><h2 className="text-lg font-bold text-white">{title}</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-700/50 text-surface-400 hover:text-white transition-all"><X className="w-5 h-5" /></button></div>
                <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
            </div>
        </div>
    );
}

// ── Force-Directed Graph (SVG) ───────────────────────────────
function SupplyChainGraph({ nodes, edges }: { nodes: any[]; edges: any[] }) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
    const [hovered, setHovered] = useState<string | null>(null);

    useEffect(() => {
        if (!nodes.length) return;
        const w = 700, h = 400;
        const pos: Record<string, { x: number; y: number; vx: number; vy: number }> = {};

        // Initialize positions by type
        nodes.forEach((n, i) => {
            const angle = (i / nodes.length) * Math.PI * 2;
            const r = n.type === "supplier" ? 120 : n.type === "warehouse" ? 60 : 170;
            pos[n.id] = { x: w / 2 + Math.cos(angle) * r + (Math.random() - 0.5) * 80, y: h / 2 + Math.sin(angle) * r + (Math.random() - 0.5) * 80, vx: 0, vy: 0 };
        });

        // Simple force simulation (50 iterations)
        for (let iter = 0; iter < 50; iter++) {
            // Repulsion
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const a = pos[nodes[i].id], b = pos[nodes[j].id];
                    const dx = b.x - a.x, dy = b.y - a.y;
                    const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
                    const force = 2000 / (dist * dist);
                    a.vx -= (dx / dist) * force; a.vy -= (dy / dist) * force;
                    b.vx += (dx / dist) * force; b.vy += (dy / dist) * force;
                }
            }
            // Attraction along edges
            for (const e of edges) {
                const a = pos[e.source], b = pos[e.target];
                if (!a || !b) continue;
                const dx = b.x - a.x, dy = b.y - a.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const force = (dist - 150) * 0.01;
                a.vx += (dx / dist) * force; a.vy += (dy / dist) * force;
                b.vx -= (dx / dist) * force; b.vy -= (dy / dist) * force;
            }
            // Center gravity
            for (const n of nodes) {
                const p = pos[n.id];
                p.vx += (w / 2 - p.x) * 0.005; p.vy += (h / 2 - p.y) * 0.005;
                p.x += p.vx * 0.3; p.y += p.vy * 0.3;
                p.vx *= 0.8; p.vy *= 0.8;
                p.x = Math.max(40, Math.min(w - 40, p.x));
                p.y = Math.max(40, Math.min(h - 40, p.y));
            }
        }
        setPositions(Object.fromEntries(Object.entries(pos).map(([k, v]) => [k, { x: v.x, y: v.y }])));
    }, [nodes, edges]);

    const typeColors: Record<string, string> = { supplier: "#818cf8", warehouse: "#34d399", customer: "#fbbf24" };
    const typeIcons: Record<string, string> = { supplier: "S", warehouse: "W", customer: "C" };

    if (!nodes.length) return <div className="flex items-center justify-center py-20 text-surface-500 text-sm">No supply chain data available</div>;

    return (
        <svg ref={svgRef} viewBox="0 0 700 400" className="w-full h-auto">
            <defs>
                <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto"><polygon points="0 0, 6 2, 0 4" fill="rgba(255,255,255,0.15)" /></marker>
            </defs>
            {/* Edges */}
            {edges.map((e, i) => {
                const a = positions[e.source], b = positions[e.target];
                if (!a || !b) return null;
                return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={e.type === "supply" ? "rgba(129,140,248,0.2)" : "rgba(251,191,36,0.2)"} strokeWidth={Math.min(3, (e.weight || 1) * 0.5)} markerEnd="url(#arrowhead)" />;
            })}
            {/* Nodes */}
            {nodes.map((n) => {
                const p = positions[n.id];
                if (!p) return null;
                const color = typeColors[n.type] || "#94a3b8";
                const isHov = hovered === n.id;
                return (
                    <g key={n.id} onMouseEnter={() => setHovered(n.id)} onMouseLeave={() => setHovered(null)} style={{ cursor: "pointer" }}>
                        <circle cx={p.x} cy={p.y} r={isHov ? 22 : 18} fill={`${color}20`} stroke={color} strokeWidth={isHov ? 2.5 : 1.5} />
                        <text x={p.x} y={p.y + 4} textAnchor="middle" fill={color} fontSize="11" fontWeight="bold">{typeIcons[n.type]}</text>
                        <text x={p.x} y={p.y + 32} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="8">{n.label?.slice(0, 15)}</text>
                        {isHov && (
                            <foreignObject x={p.x + 25} y={p.y - 35} width="160" height="70">
                                <div className="bg-surface-900/95 border border-surface-700/50 rounded-lg p-2 text-[10px] shadow-lg">
                                    <p className="text-white font-bold">{n.label}</p>
                                    <p className="text-surface-400">{n.type} • {n.city || ""}</p>
                                    {n.utilization !== undefined && <p className="text-surface-400">Utilization: {n.utilization}%</p>}
                                    {n.rating !== undefined && <p className="text-surface-400">Rating: {n.rating}/5</p>}
                                </div>
                            </foreignObject>
                        )}
                    </g>
                );
            })}
            {/* Legend */}
            {[{ type: "supplier", color: "#818cf8" }, { type: "warehouse", color: "#34d399" }, { type: "customer", color: "#fbbf24" }].map((l, i) => (
                <g key={l.type} transform={`translate(20, ${360 + i * 14})`}>
                    <circle cx="5" cy="-3" r="4" fill={l.color} opacity="0.5" /><text x="14" y="0" fill="rgba(255,255,255,0.4)" fontSize="8" className="capitalize">{l.type}</text>
                </g>
            ))}
        </svg>
    );
}

// ── Risk Distribution Bar ────────────────────────────────────
function RiskBar({ distribution }: { distribution: any[] }) {
    const total = distribution.reduce((s: number, d: any) => s + d.count, 0) || 1;
    return (
        <div>
            <div className="flex h-6 rounded-lg overflow-hidden">
                {distribution.map((d: any) => (
                    <div key={d.range} style={{ width: `${(d.count / total) * 100}%`, backgroundColor: d.color }} className="transition-all" title={`${d.label}: ${d.count}`} />
                ))}
            </div>
            <div className="flex justify-between mt-2">
                {distribution.map((d: any) => (
                    <div key={d.range} className="text-center">
                        <p className="text-xs font-bold" style={{ color: d.color }}>{d.count}</p>
                        <p className="text-[9px] text-surface-600">{d.label}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function DigitalTwinPage() {
    const [graph, setGraph] = useState<any>(null);
    const [risk, setRisk] = useState<any>(null);
    const [pricing, setPricing] = useState<any>(null);
    const [simResult, setSimResult] = useState<any>(null);
    const [simModal, setSimModal] = useState(false);
    const [simScenario, setSimScenario] = useState("supplier_disruption");
    const [simParams, setSimParams] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [simulating, setSimulating] = useState(false);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [gRes, rRes, pRes, sRes, prRes, wRes] = await Promise.all([
            apiFetch("/digital-twin/graph"),
            apiFetch("/digital-twin/risk-assessment"),
            apiFetch("/digital-twin/pricing/suggestions"),
            apiFetch("/suppliers?limit=100"),
            apiFetch("/products?limit=200"),
            apiFetch("/warehouses?limit=100"),
        ]);
        if (gRes.success) setGraph(gRes.data);
        if (rRes.success) setRisk(rRes.data);
        if (pRes.success) setPricing(pRes.data);
        if (sRes.success) setSuppliers(Array.isArray(sRes.data) ? sRes.data : sRes.data?.suppliers || []);
        if (prRes.success) setProducts(Array.isArray(prRes.data) ? prRes.data : prRes.data?.products || []);
        if (wRes.success) setWarehouses(Array.isArray(wRes.data) ? wRes.data : wRes.data?.warehouses || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const runSimulation = async () => {
        setSimulating(true);
        const res = await apiFetch("/digital-twin/simulate", { method: "POST", body: JSON.stringify({ scenario: simScenario, parameters: simParams }) });
        if (res.success) setSimResult(res.data);
        else setSimResult(null);
        setSimulating(false);
    };

    const scenarios = [
        { id: "supplier_disruption", label: "Supplier Disruption", icon: Users, desc: "Simulate a key supplier going offline" },
        { id: "demand_spike", label: "Demand Spike", icon: TrendingUp, desc: "Model a sudden increase in product demand" },
        { id: "warehouse_closure", label: "Warehouse Closure", icon: Warehouse, desc: "Assess impact of losing a warehouse" },
    ];

    const riskColor = (level: string) => level === "LOW" ? "text-emerald-400" : level === "MODERATE" ? "text-amber-400" : level === "ELEVATED" ? "text-orange-400" : "text-rose-400";

    // Auto-select first entity when modal opens or scenario changes
    useEffect(() => {
        if (simScenario === "supplier_disruption" && suppliers.length > 0 && !simParams.supplier_id) {
            setSimParams((p: any) => ({ ...p, supplier_id: suppliers[0].id }));
        } else if (simScenario === "demand_spike" && products.length > 0 && !simParams.product_id) {
            setSimParams((p: any) => ({ ...p, product_id: products[0].id }));
        } else if (simScenario === "warehouse_closure" && warehouses.length > 0 && !simParams.warehouse_id) {
            setSimParams((p: any) => ({ ...p, warehouse_id: warehouses[0].id }));
        }
    }, [simScenario, suppliers, products, warehouses]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center"><Network className="w-5 h-5 text-white" /></div>
                    <div><h1 className="text-2xl font-black text-white">Digital Twin</h1><p className="text-surface-500 text-sm">Supply chain simulation & risk analysis</p></div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setSimModal(true)} className="btn-primary flex items-center gap-2 text-sm"><Play className="w-4 h-4" /> Simulate</button>
                    <button onClick={fetchAll} className="btn-outline flex items-center gap-2 text-sm py-2"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1, 2, 3, 4].map(i => <div key={i} className="glass-card h-48 animate-pulse" />)}</div>
            ) : (
                <>
                    {/* Row 1: Supply Chain Graph + Risk */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2 glass-card p-5">
                            <h3 className="text-sm font-bold text-surface-300 mb-3 flex items-center gap-2"><Network className="w-4 h-4 text-cyan-400" /> Supply Chain Network</h3>
                            <SupplyChainGraph nodes={graph?.nodes || []} edges={graph?.edges || []} />
                            <div className="flex gap-4 mt-2 text-xs text-surface-500">
                                <span>{graph?.stats?.suppliers || 0} suppliers</span>•
                                <span>{graph?.stats?.warehouses || 0} warehouses</span>•
                                <span>{graph?.stats?.total_edges || 0} links</span>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {risk && (
                                <div className="glass-card p-5">
                                    <h3 className="text-sm font-bold text-surface-300 mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-amber-400" /> Risk Score</h3>
                                    <div className="text-center mb-4">
                                        <p className={`text-4xl font-black ${riskColor(risk.overall_risk)}`}>{risk.mean}</p>
                                        <p className={`text-sm font-bold mt-1 ${riskColor(risk.overall_risk)}`}>{risk.overall_risk}</p>
                                        <p className="text-[10px] text-surface-600">{risk.iterations} Monte Carlo iterations</p>
                                    </div>
                                    <RiskBar distribution={risk.distribution} />
                                    <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                                        <div className="glass p-2 rounded-lg text-center"><p className="font-bold text-white">{risk.percentiles.p50}</p><p className="text-surface-500">P50</p></div>
                                        <div className="glass p-2 rounded-lg text-center"><p className="font-bold text-white">{risk.percentiles.p95}</p><p className="text-surface-500">P95</p></div>
                                    </div>
                                </div>
                            )}
                            <div className="glass-card p-5">
                                <h3 className="text-sm font-bold text-surface-300 mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-primary-400" /> Model Inputs</h3>
                                {risk && (
                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between"><span className="text-surface-400">Avg Supplier Rating</span><span className="text-white font-semibold">{risk.inputs.avg_supplier_rating}/5</span></div>
                                        <div className="flex justify-between"><span className="text-surface-400">Avg Lead Time</span><span className="text-white font-semibold">{risk.inputs.avg_lead_time}d</span></div>
                                        <div className="flex justify-between"><span className="text-surface-400">Low Stock Ratio</span><span className="text-white font-semibold">{risk.inputs.low_stock_ratio}%</span></div>
                                        <div className="flex justify-between"><span className="text-surface-400">Total Inventory</span><span className="text-white font-semibold">{risk.inputs.total_inventory?.toLocaleString()}</span></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Pricing Suggestions */}
                    <div className="glass-card p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-surface-300 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-400" /> Dynamic Pricing Suggestions</h3>
                            <span className="text-xs text-surface-500">{pricing?.summary?.total || 0} suggestions</span>
                        </div>
                        {!pricing?.suggestions?.length ? (
                            <div className="text-center py-8"><CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" /><p className="text-sm text-surface-400">No pricing adjustments needed</p></div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {pricing.suggestions.slice(0, 9).map((s: any, i: number) => (
                                    <div key={i} className={`glass p-4 rounded-xl ${s.priority === "critical" ? "border border-rose-500/20" : ""}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${s.type === "SCARCITY" ? "bg-amber-400/10 text-amber-400" : s.type === "EXPIRY_DISCOUNT" ? "bg-rose-400/10 text-rose-400" : "bg-violet-400/10 text-violet-400"}`}>
                                                {s.type.replace(/_/g, " ")}
                                            </span>
                                            <span className={`text-[10px] font-bold ${s.priority === "critical" ? "text-rose-400" : s.priority === "high" ? "text-amber-400" : "text-surface-500"}`}>{s.priority}</span>
                                        </div>
                                        <p className="text-sm font-bold text-white truncate">{s.product}</p>
                                        <p className="text-xs text-surface-500 mb-2">{s.reason}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-surface-500 line-through">${s.current_price?.toFixed(2)}</span>
                                            <ArrowRight className="w-3 h-3 text-surface-600" />
                                            <span className="text-sm font-bold text-primary-400">${s.suggested_price?.toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Simulation Modal */}
            <Modal open={simModal} title="What-If Simulation" onClose={() => { setSimModal(false); setSimResult(null); }}>
                <div className="space-y-4">
                    <div className="space-y-2">
                        {scenarios.map((sc) => (
                            <button key={sc.id} onClick={() => { setSimScenario(sc.id); setSimParams({}); setSimResult(null); }}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${simScenario === sc.id ? "border-primary-500/50 bg-primary-500/10" : "border-surface-700/30 hover:border-surface-600"}`}>
                                <sc.icon className={`w-5 h-5 ${simScenario === sc.id ? "text-primary-400" : "text-surface-500"}`} />
                                <div><p className={`text-sm font-medium ${simScenario === sc.id ? "text-white" : "text-surface-300"}`}>{sc.label}</p><p className="text-xs text-surface-500">{sc.desc}</p></div>
                            </button>
                        ))}
                    </div>

                    {simScenario === "supplier_disruption" && (
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-xs font-semibold text-surface-400 uppercase">Supplier</label>
                                <select value={simParams.supplier_id || ""} onChange={(e) => setSimParams({ ...simParams, supplier_id: e.target.value })} className="w-full mt-1 bg-surface-800/60 border border-surface-700/50 rounded-xl px-3 py-2 text-sm text-white appearance-none">
                                    <option value="">Auto-select</option>
                                    {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select></div>
                            <div><label className="text-xs font-semibold text-surface-400 uppercase">Duration (days)</label>
                                <input type="number" value={simParams.duration_days || 30} onChange={(e) => setSimParams({ ...simParams, duration_days: +e.target.value })} className="w-full mt-1 bg-surface-800/60 border border-surface-700/50 rounded-xl px-3 py-2 text-sm text-white" /></div>
                        </div>
                    )}
                    {simScenario === "demand_spike" && (
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-xs font-semibold text-surface-400 uppercase">Product</label>
                                <select value={simParams.product_id || ""} onChange={(e) => setSimParams({ ...simParams, product_id: e.target.value })} className="w-full mt-1 bg-surface-800/60 border border-surface-700/50 rounded-xl px-3 py-2 text-sm text-white appearance-none">
                                    <option value="">Auto-select</option>
                                    {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                                </select></div>
                            <div><label className="text-xs font-semibold text-surface-400 uppercase">Spike %</label>
                                <input type="number" value={simParams.spike_percent || 50} onChange={(e) => setSimParams({ ...simParams, spike_percent: +e.target.value })} className="w-full mt-1 bg-surface-800/60 border border-surface-700/50 rounded-xl px-3 py-2 text-sm text-white" /></div>
                        </div>
                    )}
                    {simScenario === "warehouse_closure" && (
                        <div><label className="text-xs font-semibold text-surface-400 uppercase">Warehouse</label>
                            <select value={simParams.warehouse_id || ""} onChange={(e) => setSimParams({ ...simParams, warehouse_id: e.target.value })} className="w-full mt-1 bg-surface-800/60 border border-surface-700/50 rounded-xl px-3 py-2 text-sm text-white appearance-none">
                                <option value="">Auto-select</option>
                                {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select></div>
                    )}

                    <button onClick={runSimulation} disabled={simulating} className="w-full btn-primary flex items-center justify-center gap-2 py-3">
                        {simulating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Run Simulation
                    </button>

                    {simResult && (
                        <div className="space-y-3 pt-2 border-t border-surface-700/30">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-white">Simulation Results</h4>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-surface-400">Risk:</span>
                                    <span className={`text-sm font-bold ${simResult.risk_score > 60 ? "text-rose-400" : simResult.risk_score > 30 ? "text-amber-400" : "text-emerald-400"}`}>{simResult.risk_score}/100</span>
                                </div>
                            </div>
                            <div className="glass p-3 rounded-xl"><p className="text-xs text-surface-400 mb-1">Financial Impact</p><p className="text-lg font-black text-rose-400">${simResult.financial_impact?.toLocaleString()}</p></div>
                            <div className="space-y-2">
                                {simResult.impacts?.map((imp: any, i: number) => (
                                    <div key={i} className="flex items-start gap-2 p-2 glass rounded-lg">
                                        <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${imp.severity === "critical" ? "text-rose-400" : imp.severity === "high" ? "text-amber-400" : "text-surface-400"}`} />
                                        <p className="text-xs text-surface-300">{imp.description}</p>
                                    </div>
                                ))}
                            </div>
                            {simResult.recommendations?.length > 0 && (
                                <div><p className="text-xs font-bold text-surface-400 uppercase mb-1.5">Recommendations</p>
                                    {simResult.recommendations.map((r: string, i: number) => (
                                        <div key={i} className="flex items-center gap-2 py-1"><CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" /><p className="text-xs text-surface-300">{r}</p></div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}
