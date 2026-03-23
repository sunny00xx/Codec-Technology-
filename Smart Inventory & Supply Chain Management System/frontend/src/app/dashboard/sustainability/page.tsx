"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
    Leaf, Truck, TreePine, Sun, RefreshCw, Shield, CheckCircle, Link2,
    Hash, Clock, User, Search, X, BarChart3, Box, Anchor, Plane, Zap, Plus
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
function getToken() { return typeof window !== "undefined" ? localStorage.getItem("token") || "" : ""; }
async function apiFetch(path: string, options: RequestInit = {}) {
    const r = await fetch(`${API}${path}`, { ...options, headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...options.headers } });
    return r.json();
}

const MODE_ICONS: Record<string, any> = { truck: Truck, rail: Box, air: Plane, sea: Anchor, courier: Zap, electric: Leaf };
const MODE_COLORS: Record<string, string> = { truck: "#fb923c", rail: "#fbbf24", air: "#f87171", sea: "#38bdf8", courier: "#a78bfa", electric: "#34d399" };

function GaugeChart({ value, label, size = 130 }: { value: number; label: string; size?: number }) {
    const r = (size - 16) / 2;
    const c = Math.PI * r;
    const pct = Math.min(Math.max(value, 0), 100);
    const color = pct >= 70 ? "#34d399" : pct >= 40 ? "#fbbf24" : "#f87171";
    return (
        <div className="flex flex-col items-center">
            <svg width={size} height={size / 2 + 12} viewBox={`0 0 ${size} ${size / 2 + 12}`}>
                <path d={`M 8 ${size / 2} A ${r} ${r} 0 0 1 ${size - 8} ${size / 2}`} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round" />
                <path d={`M 8 ${size / 2} A ${r} ${r} 0 0 1 ${size - 8} ${size / 2}`} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={`${c}`} strokeDashoffset={`${c - (c * pct) / 100}`} style={{ transition: "stroke-dashoffset 1s ease" }} />
                <text x={size / 2} y={size / 2 - 4} textAnchor="middle" className="font-black text-lg" fill="white">{pct}</text>
            </svg>
            <p className="text-xs text-surface-500 -mt-1">{label}</p>
        </div>
    );
}

export default function SustainabilityPage() {
    const [tab, setTab] = useState<"carbon" | "provenance">("carbon");
    const [carbon, setCarbon] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [provEntityType, setProvEntityType] = useState("product");
    const [provEntityId, setProvEntityId] = useState("");
    const [provChain, setProvChain] = useState<any>(null);
    const [verifyHash, setVerifyHash] = useState("");
    const [verifyResult, setVerifyResult] = useState<any>(null);
    const [newBlock, setNewBlock] = useState<any>({ entity_type: "product", entity_id: "", action: "", data: {} });
    const [showNewBlock, setShowNewBlock] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

    const showToast = (msg: string, type: "success" | "error" = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

    const fetchCarbon = useCallback(async () => {
        setLoading(true);
        const res = await apiFetch("/sustainability/carbon/dashboard");
        if (res.success) setCarbon(res.data);
        setLoading(false);
    }, []);

    useEffect(() => { fetchCarbon(); }, [fetchCarbon]);

    const searchProvenance = async () => {
        if (!provEntityId) return;
        const res = await apiFetch(`/sustainability/provenance/${provEntityType}/${provEntityId}`);
        if (res.success) setProvChain(res.data);
        else showToast(res.error?.message || "Not found", "error");
    };

    const verifyBlock = async () => {
        if (!verifyHash) return;
        const res = await apiFetch(`/sustainability/provenance/verify/${verifyHash}`);
        if (res.success) setVerifyResult(res.data);
        else { setVerifyResult(null); showToast("Block not found", "error"); }
    };

    const createBlock = async () => {
        const res = await apiFetch("/sustainability/provenance/block", { method: "POST", body: JSON.stringify(newBlock) });
        if (res.success) { showToast("Block created!"); setShowNewBlock(false); setNewBlock({ entity_type: "product", entity_id: "", action: "", data: {} }); }
        else showToast(res.error?.message || "Failed", "error");
    };

    const tabs = [{ id: "carbon", label: "Carbon Tracker", icon: Leaf }, { id: "provenance", label: "Provenance Ledger", icon: Shield }];

    return (
        <div className="space-y-6">
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl animate-slide-up text-sm font-medium ${toast.type === "success" ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300" : "bg-red-500/20 border border-red-500/30 text-red-300"}`}>
                    {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}{toast.msg}
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center"><Leaf className="w-5 h-5 text-white" /></div>
                    <div><h1 className="text-2xl font-black text-white">Sustainability</h1><p className="text-surface-500 text-sm">Carbon tracking & blockchain provenance</p></div>
                </div>
                <button onClick={fetchCarbon} className="btn-outline flex items-center gap-2 text-sm py-2"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
            </div>

            <div className="flex items-center gap-1 glass rounded-xl p-1 w-fit">
                {tabs.map((t) => (
                    <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-emerald-500/20 text-emerald-400" : "text-surface-500 hover:text-surface-300"}`}>
                        <t.icon className="w-4 h-4" />{t.label}
                    </button>
                ))}
            </div>

            {/* ── CARBON TAB ── */}
            {tab === "carbon" && (
                <div className="space-y-4">
                    {loading || !carbon ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1, 2, 3, 4].map(i => <div key={i} className="glass-card h-28 animate-pulse" />)}</div>
                    ) : (
                        <>
                            {/* KPIs */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="glass-card p-4 text-center">
                                    <p className="text-2xl font-black text-white">{carbon.total_emissions.toFixed(1)}</p>
                                    <p className="text-[10px] text-surface-500 uppercase">Total CO₂ (kg)</p>
                                </div>
                                <div className="glass-card p-4 text-center">
                                    <p className="text-2xl font-black text-emerald-400">{carbon.avg_per_shipment.toFixed(2)}</p>
                                    <p className="text-[10px] text-surface-500 uppercase">Avg per Shipment</p>
                                </div>
                                <div className="glass-card p-4 text-center">
                                    <p className="text-2xl font-black text-white">{carbon.total_shipments}</p>
                                    <p className="text-[10px] text-surface-500 uppercase">Shipments Tracked</p>
                                </div>
                                <div className="glass-card p-4 flex flex-col items-center justify-center">
                                    <GaugeChart value={carbon.sustainability_score} label="Sustainability Score" size={100} />
                                </div>
                            </div>

                            {/* Mode Breakdown + Trend */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="glass-card p-5">
                                    <h3 className="text-sm font-bold text-surface-300 mb-4 flex items-center gap-2"><Truck className="w-4 h-4 text-amber-400" /> Emissions by Transport Mode</h3>
                                    {carbon.mode_breakdown.length === 0 ? (
                                        <p className="text-xs text-surface-600 text-center py-4">No transport data</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {carbon.mode_breakdown.map((m: any) => {
                                                const Icon = MODE_ICONS[m.mode] || Truck;
                                                const color = MODE_COLORS[m.mode] || "#94a3b8";
                                                const maxE = Math.max(...carbon.mode_breakdown.map((x: any) => x.emissions), 1);
                                                return (
                                                    <div key={m.mode}>
                                                        <div className="flex items-center justify-between text-xs mb-1">
                                                            <div className="flex items-center gap-2"><Icon className="w-3.5 h-3.5" style={{ color }} /><span className="text-white font-medium capitalize">{m.mode}</span></div>
                                                            <span className="text-surface-400">{m.emissions} kg ({m.count} trips)</span>
                                                        </div>
                                                        <div className="h-2 bg-surface-700/50 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(m.emissions / maxE) * 100}%`, backgroundColor: color }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                <div className="glass-card p-5">
                                    <h3 className="text-sm font-bold text-surface-300 mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-emerald-400" /> Monthly Emissions Trend</h3>
                                    {carbon.monthly_trend.length === 0 ? (
                                        <p className="text-xs text-surface-600 text-center py-4">No trend data</p>
                                    ) : (
                                        <div className="flex items-end gap-2 h-32">
                                            {carbon.monthly_trend.map((m: any) => {
                                                const max = Math.max(...carbon.monthly_trend.map((x: any) => x.emissions), 1);
                                                return (
                                                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                                                        <span className="text-[9px] text-surface-500">{m.emissions.toFixed(1)}</span>
                                                        <div className="w-full rounded-t-md bg-gradient-to-t from-emerald-500/60 to-emerald-400/30 transition-all" style={{ height: `${(m.emissions / max) * 100}%` }} />
                                                        <span className="text-[8px] text-surface-600">{m.month.slice(5)}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Offset Suggestions */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="glass-card p-5 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-400/10 flex items-center justify-center"><TreePine className="w-6 h-6 text-emerald-400" /></div>
                                    <div><p className="text-xl font-black text-white">{carbon.offsets.trees_needed}</p><p className="text-xs text-surface-400">Trees needed to offset emissions</p><p className="text-[10px] text-surface-600">1 tree ≈ 21 kg CO₂/year absorbed</p></div>
                                </div>
                                <div className="glass-card p-5 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-amber-400/10 flex items-center justify-center"><Sun className="w-6 h-6 text-amber-400" /></div>
                                    <div><p className="text-xl font-black text-white">{carbon.offsets.solar_panels}</p><p className="text-xs text-surface-400">Solar panels equivalent</p><p className="text-[10px] text-surface-600">1 panel ≈ 900 kg CO₂/year saved</p></div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── PROVENANCE TAB ── */}
            {tab === "provenance" && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Search */}
                        <div className="glass-card p-5 space-y-3">
                            <h3 className="text-sm font-bold text-surface-300 flex items-center gap-2"><Link2 className="w-4 h-4 text-primary-400" /> Trace Provenance</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {["product", "shipment", "order"].map((t) => (
                                    <button key={t} onClick={() => setProvEntityType(t)} className={`py-2 rounded-lg text-xs font-medium capitalize transition-all ${provEntityType === t ? "bg-primary-500/20 text-primary-400" : "bg-surface-800/40 text-surface-500"}`}>{t}</button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input value={provEntityId} onChange={(e) => setProvEntityId(e.target.value)} placeholder="Enter entity ID..." className="flex-1 bg-surface-800/60 border border-surface-700/50 rounded-xl px-3 py-2 text-sm text-white" />
                                <button onClick={searchProvenance} className="btn-primary px-4 py-2 text-sm"><Search className="w-4 h-4" /></button>
                            </div>
                            <button onClick={() => setShowNewBlock(!showNewBlock)} className="w-full py-2 text-xs text-primary-400 hover:text-primary-300 flex items-center justify-center gap-1"><Plus className="w-3 h-3" /> Record New Block</button>
                            {showNewBlock && (
                                <div className="space-y-2 p-3 glass rounded-xl">
                                    <input value={newBlock.entity_id} onChange={(e) => setNewBlock({ ...newBlock, entity_id: e.target.value })} placeholder="Entity ID" className="w-full bg-surface-800/60 border border-surface-700/50 rounded-lg px-3 py-2 text-xs text-white" />
                                    <input value={newBlock.action} onChange={(e) => setNewBlock({ ...newBlock, action: e.target.value })} placeholder="Action (e.g. MANUFACTURED, SHIPPED)" className="w-full bg-surface-800/60 border border-surface-700/50 rounded-lg px-3 py-2 text-xs text-white" />
                                    <button onClick={createBlock} disabled={!newBlock.entity_id || !newBlock.action} className="w-full btn-primary py-2 text-xs">Create Block</button>
                                </div>
                            )}
                        </div>
                        {/* Verify */}
                        <div className="glass-card p-5 space-y-3">
                            <h3 className="text-sm font-bold text-surface-300 flex items-center gap-2"><Hash className="w-4 h-4 text-amber-400" /> Verify Block</h3>
                            <div className="flex gap-2">
                                <input value={verifyHash} onChange={(e) => setVerifyHash(e.target.value)} placeholder="Enter SHA-256 hash..." className="flex-1 bg-surface-800/60 border border-surface-700/50 rounded-xl px-3 py-2 text-sm text-white font-mono text-xs" />
                                <button onClick={verifyBlock} className="btn-primary px-4 py-2 text-sm"><Shield className="w-4 h-4" /></button>
                            </div>
                            {verifyResult && (
                                <div className="glass p-3 rounded-xl space-y-2">
                                    <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /><span className="text-sm font-bold text-emerald-400">Verified ✓</span></div>
                                    <div className="text-xs space-y-1">
                                        <p className="text-surface-400">Block #{verifyResult.block_number} • {verifyResult.action}</p>
                                        <p className="text-surface-500">Entity: {verifyResult.entity_type}/{verifyResult.entity_id}</p>
                                        <p className="text-surface-500">Actor: {verifyResult.actor}</p>
                                        <p className="text-surface-600 font-mono text-[10px] break-all">Hash: {verifyResult.hash}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chain Timeline */}
                    {provChain && (
                        <div className="glass-card p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-surface-300 flex items-center gap-2"><Link2 className="w-4 h-4 text-primary-400" /> Provenance Chain</h3>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${provChain.integrity === "VALID" ? "bg-emerald-400/10 text-emerald-400" : "bg-rose-400/10 text-rose-400"}`}>
                                        {provChain.integrity === "VALID" ? "✓ Chain Valid" : "✗ Chain Broken"}
                                    </span>
                                    <span className="text-xs text-surface-500">{provChain.length} blocks</span>
                                </div>
                            </div>
                            {provChain.chain.length === 0 ? (
                                <p className="text-xs text-surface-600 text-center py-8">No provenance records for this entity</p>
                            ) : (
                                <div className="relative">
                                    <div className="absolute left-6 top-0 bottom-0 w-px bg-surface-700/30" />
                                    <div className="space-y-4">
                                        {provChain.chain.map((block: any, i: number) => (
                                            <div key={block.id} className="relative flex items-start gap-4 pl-2">
                                                <div className="relative z-10 w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                                                    <span className="text-[10px] font-bold text-white">#{block.block_number}</span>
                                                </div>
                                                <div className="flex-1 glass p-3 rounded-xl">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs font-bold text-white uppercase">{block.action}</span>
                                                        <div className="flex items-center gap-1 text-[10px] text-surface-500"><Clock className="w-3 h-3" />{new Date(block.created_at).toLocaleString()}</div>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[10px] text-surface-500 mb-1"><User className="w-3 h-3" />{block.actor}</div>
                                                    <p className="text-[10px] font-mono text-surface-600 break-all">Hash: {block.hash?.slice(0, 24)}…</p>
                                                    {i > 0 && <p className="text-[10px] font-mono text-surface-700 break-all">Prev: {block.previous_hash?.slice(0, 24)}…</p>}
                                                    {Object.keys(block.data || {}).length > 0 && (
                                                        <pre className="text-[10px] text-surface-500 mt-1 bg-surface-800/30 p-1.5 rounded-lg overflow-x-auto">{JSON.stringify(block.data, null, 2)}</pre>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
