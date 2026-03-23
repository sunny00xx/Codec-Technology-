"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
    Brain, TrendingUp, TrendingDown, Minus, RefreshCw, AlertTriangle,
    CheckCircle, Shield, Ghost, Users, Package, Search, X, BarChart3,
    Activity, Zap, Eye, ArrowUpRight, ArrowDownRight
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
function getToken() { return typeof window !== "undefined" ? localStorage.getItem("token") || "" : ""; }
async function apiFetch(path: string) {
    const r = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    return r.json();
}

function Modal({ open, title, onClose, children }: any) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-2xl mx-4 glass-strong rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
                <div className="flex items-center justify-between p-6 border-b border-surface-700/50">
                    <h2 className="text-lg font-bold text-white">{title}</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-700/50 text-surface-400 hover:text-white transition-all"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
            </div>
        </div>
    );
}

// ── Forecast Chart (SVG) ────────────────────────────────────
function ForecastChart({ history, forecast }: { history: any[]; forecast: any[] }) {
    const all = [...history.map((h: any) => h.qty), ...forecast.map((f: any) => f.recommended)];
    const predicted = [...history.map((h: any) => h.predicted || 0)];
    const max = Math.max(...all, ...predicted, 1);
    const total = history.length + forecast.length;
    const w = 600, h = 200, pad = 30;
    const xStep = (w - pad * 2) / Math.max(total - 1, 1);

    const toXY = (idx: number, val: number) => ({ x: pad + idx * xStep, y: pad + (h - pad * 2) * (1 - val / max) });

    const actualLine = history.map((d: any, i: number) => toXY(i, d.qty));
    const predLine = history.map((d: any, i: number) => toXY(i, d.predicted || 0));
    const forecastLine = forecast.map((d: any, i: number) => toXY(history.length + i, d.recommended));
    const maLine = history.filter((d: any) => d.ma != null).map((d: any, i: number) => toXY(i, d.ma));

    const toPath = (pts: any[]) => pts.length > 0 ? `M ${pts.map((p) => `${p.x},${p.y}`).join(" L ")}` : "";
    // Forecast area fill
    const forecastArea = forecastLine.length > 1
        ? `M ${forecastLine[0].x},${h - pad} L ${toPath(forecastLine).slice(2)} L ${forecastLine[forecastLine.length - 1].x},${h - pad} Z`
        : "";

    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((v) => (
                <g key={v}>
                    <line x1={pad} y1={pad + (h - pad * 2) * (1 - v)} x2={w - pad} y2={pad + (h - pad * 2) * (1 - v)} stroke="rgba(255,255,255,0.04)" />
                    <text x={pad - 4} y={pad + (h - pad * 2) * (1 - v) + 3} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize="8">{Math.round(max * v)}</text>
                </g>
            ))}
            {/* Separator line */}
            <line x1={pad + (history.length - 0.5) * xStep} y1={pad - 5} x2={pad + (history.length - 0.5) * xStep} y2={h - pad} stroke="rgba(255,255,255,0.1)" strokeDasharray="4,4" />
            <text x={pad + (history.length - 0.5) * xStep} y={pad - 8} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="7">Forecast →</text>
            {/* Forecast area */}
            {forecastArea && <path d={forecastArea} fill="rgba(129,140,248,0.08)" />}
            {/* MA line */}
            {maLine.length > 1 && <path d={toPath(maLine)} fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.5" />}
            {/* Predicted line */}
            {predLine.length > 1 && <path d={toPath(predLine)} fill="none" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.4" />}
            {/* Actual line */}
            {actualLine.length > 1 && <path d={toPath(actualLine)} fill="none" stroke="#34d399" strokeWidth="2" />}
            {/* Forecast line */}
            {forecastLine.length > 1 && <path d={toPath(forecastLine)} fill="none" stroke="#818cf8" strokeWidth="2" />}
            {/* Dots */}
            {actualLine.map((p, i) => <circle key={`a${i}`} cx={p.x} cy={p.y} r="3" fill="#34d399" />)}
            {forecastLine.map((p, i) => <circle key={`f${i}`} cx={p.x} cy={p.y} r="3" fill="#818cf8" />)}
            {/* X labels */}
            {history.map((d: any, i: number) => (
                <text key={i} x={pad + i * xStep} y={h - 8} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="7" transform={`rotate(-30, ${pad + i * xStep}, ${h - 8})`}>{d.month?.slice(5)}</text>
            ))}
            {forecast.map((d: any, i: number) => (
                <text key={`f${i}`} x={pad + (history.length + i) * xStep} y={h - 8} textAnchor="middle" fill="rgba(129,140,248,0.4)" fontSize="7" transform={`rotate(-30, ${pad + (history.length + i) * xStep}, ${h - 8})`}>{d.month?.slice(5)}</text>
            ))}
        </svg>
    );
}

// ── ANOMALY CARD ────────────────────────────────────────────
const ANOMALY_ICONS: Record<string, any> = {
    PRICE_ANOMALY: { icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-400/10" },
    GHOST_INVENTORY: { icon: Ghost, color: "text-rose-400", bg: "bg-rose-400/10" },
    DUPLICATE_VENDOR: { icon: Users, color: "text-violet-400", bg: "bg-violet-400/10" },
    QUANTITY_ANOMALY: { icon: Activity, color: "text-cyan-400", bg: "bg-cyan-400/10" },
};

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function ForecastingPage() {
    const [tab, setTab] = useState<"forecast" | "anomalies">("forecast");
    const [forecasts, setForecasts] = useState<any[]>([]);
    const [anomalyData, setAnomalyData] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [detailForecast, setDetailForecast] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [fRes, aRes, pRes] = await Promise.all([
            apiFetch("/ai/forecast/all"),
            apiFetch("/ai/anomalies"),
            apiFetch("/products?limit=200"),
        ]);
        if (fRes.success) setForecasts(fRes.data);
        if (aRes.success) setAnomalyData(aRes.data);
        if (pRes.success) setProducts(pRes.data);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleViewForecast = async (productId: string) => {
        const res = await apiFetch(`/ai/forecast/${productId}?months=6`);
        if (res.success) setDetailForecast(res.data);
    };

    const trendIcon = (trend: string) => {
        if (trend === "rising") return <ArrowUpRight className="w-4 h-4 text-emerald-400" />;
        if (trend === "declining") return <ArrowDownRight className="w-4 h-4 text-rose-400" />;
        return <Minus className="w-4 h-4 text-surface-500" />;
    };

    const tabs = [
        { id: "forecast", label: "Demand Forecasting", icon: Brain },
        { id: "anomalies", label: "Anomaly Detection", icon: Shield },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center">
                        <Brain className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white">AI Intelligence</h1>
                        <p className="text-surface-500 text-sm">Demand forecasting & anomaly detection</p>
                    </div>
                </div>
                <button onClick={fetchAll} className="btn-outline flex items-center gap-2 text-sm py-2">
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
                </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 glass rounded-xl p-1 w-fit">
                {tabs.map((t) => (
                    <button key={t.id} onClick={() => setTab(t.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-primary-500/20 text-primary-400" : "text-surface-500 hover:text-surface-300"}`}>
                        <t.icon className="w-4 h-4" />{t.label}
                    </button>
                ))}
            </div>

            {/* ── FORECAST TAB ── */}
            {tab === "forecast" && (
                <div className="space-y-4">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1, 2, 3, 4].map(i => <div key={i} className="glass-card h-32 animate-pulse" />)}</div>
                    ) : forecasts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center glass-card">
                            <Brain className="w-12 h-12 text-surface-600 mb-3" />
                            <p className="text-surface-400 text-sm">No forecast data yet. Add stock movements to generate predictions.</p>
                        </div>
                    ) : (
                        <>
                            {/* Summary stats */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="glass-card p-4 text-center">
                                    <TrendingUp className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                                    <p className="text-xl font-black text-white">{forecasts.filter(f => f.trend === "rising").length}</p>
                                    <p className="text-[10px] text-surface-500">Rising Demand</p>
                                </div>
                                <div className="glass-card p-4 text-center">
                                    <Minus className="w-6 h-6 text-surface-400 mx-auto mb-2" />
                                    <p className="text-xl font-black text-white">{forecasts.filter(f => f.trend === "flat").length}</p>
                                    <p className="text-[10px] text-surface-500">Stable</p>
                                </div>
                                <div className="glass-card p-4 text-center">
                                    <TrendingDown className="w-6 h-6 text-rose-400 mx-auto mb-2" />
                                    <p className="text-xl font-black text-white">{forecasts.filter(f => f.trend === "declining").length}</p>
                                    <p className="text-[10px] text-surface-500">Declining</p>
                                </div>
                            </div>

                            {/* Product forecast cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {forecasts.map((f) => (
                                    <div key={f.product.id} className="glass-card p-5 cursor-pointer hover:border-primary-500/30 transition-all" onClick={() => handleViewForecast(f.product.id)}>
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h3 className="text-sm font-bold text-white">{f.product.name}</h3>
                                                <p className="text-xs text-surface-500 font-mono">{f.product.sku}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {trendIcon(f.trend)}
                                                <span className={`text-xs font-semibold capitalize ${f.trend === "rising" ? "text-emerald-400" : f.trend === "declining" ? "text-rose-400" : "text-surface-400"}`}>
                                                    {f.trend}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <p className="text-lg font-black text-primary-400">{f.next_month_forecast}</p>
                                                <p className="text-[10px] text-surface-500">Next Month Forecast</p>
                                            </div>
                                            <div>
                                                <p className="text-lg font-black text-white">{f.product.total_demand?.toLocaleString()}</p>
                                                <p className="text-[10px] text-surface-500">6M Total Demand</p>
                                            </div>
                                            <div>
                                                <p className={`text-lg font-black ${(f.r2 || 0) >= 0.7 ? "text-emerald-400" : (f.r2 || 0) >= 0.4 ? "text-amber-400" : "text-rose-400"}`}>
                                                    {((f.r2 || 0) * 100).toFixed(0)}%
                                                </p>
                                                <p className="text-[10px] text-surface-500">R² Confidence</p>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex items-center gap-1.5 text-xs text-surface-600">
                                            <Eye className="w-3 h-3" /> Click for detailed forecast chart
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── ANOMALY TAB ── */}
            {tab === "anomalies" && (
                <div className="space-y-4">
                    {loading || !anomalyData ? (
                        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="glass-card h-20 animate-pulse" />)}</div>
                    ) : (
                        <>
                            {/* Summary */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                <div className="glass-card p-4 text-center">
                                    <p className="text-2xl font-black text-white">{anomalyData.summary.total}</p>
                                    <p className="text-[10px] text-surface-500">Total Alerts</p>
                                </div>
                                <div className="glass-card p-4 text-center border-rose-500/20">
                                    <p className="text-2xl font-black text-rose-400">{anomalyData.summary.critical}</p>
                                    <p className="text-[10px] text-surface-500">Critical</p>
                                </div>
                                <div className="glass-card p-4 text-center">
                                    <p className="text-2xl font-black text-amber-400">{anomalyData.summary.warning}</p>
                                    <p className="text-[10px] text-surface-500">Warning</p>
                                </div>
                                <div className="glass-card p-4 text-center">
                                    <p className="text-2xl font-black text-violet-400">{anomalyData.summary.by_type.duplicate}</p>
                                    <p className="text-[10px] text-surface-500">Duplicate Vendors</p>
                                </div>
                                <div className="glass-card p-4 text-center">
                                    <p className="text-2xl font-black text-cyan-400">{anomalyData.summary.by_type.ghost}</p>
                                    <p className="text-[10px] text-surface-500">Ghost Inventory</p>
                                </div>
                            </div>

                            {/* Alert list */}
                            {anomalyData.alerts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center glass-card">
                                    <CheckCircle className="w-12 h-12 text-emerald-400 mb-3" />
                                    <p className="text-white font-semibold">All Clear!</p>
                                    <p className="text-surface-400 text-sm mt-1">No anomalies detected in your data.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {anomalyData.alerts.map((alert: any, i: number) => {
                                        const cfg = ANOMALY_ICONS[alert.type] || { icon: AlertTriangle, color: "text-surface-400", bg: "bg-surface-700/50" };
                                        const Icon = cfg.icon;
                                        return (
                                            <div key={i} className={`glass-card p-4 flex items-start gap-4 ${alert.severity === "critical" ? "border-rose-500/20" : ""}`}>
                                                <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                                                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`text-xs font-bold uppercase tracking-wider ${alert.severity === "critical" ? "text-rose-400" : "text-amber-400"}`}>{alert.severity}</span>
                                                        <span className="text-xs text-surface-500 capitalize">{alert.type.replace(/_/g, " ")}</span>
                                                    </div>
                                                    <p className="text-sm text-white">{alert.description}</p>
                                                    {alert.product && <p className="text-xs text-surface-500 mt-1">Product: {alert.product} {alert.sku ? `(${alert.sku})` : ""}</p>}
                                                    {alert.z_score && <span className="text-[10px] text-surface-600 font-mono">Z-score: {alert.z_score}</span>}
                                                </div>
                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${alert.severity === "critical" ? "bg-rose-400 animate-pulse" : "bg-amber-400"}`} />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Forecast Detail Modal */}
            <Modal open={!!detailForecast} title={`Forecast — ${detailForecast?.product?.name}`} onClose={() => setDetailForecast(null)}>
                {detailForecast && (
                    <div className="space-y-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center">
                                <Brain className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">{detailForecast.product.name}</p>
                                <p className="text-xs text-surface-500 font-mono">{detailForecast.product.sku}</p>
                            </div>
                        </div>

                        {/* Accuracy metrics */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="glass p-3 rounded-xl text-center">
                                <p className={`text-lg font-black ${detailForecast.accuracy.r2 >= 0.7 ? "text-emerald-400" : detailForecast.accuracy.r2 >= 0.4 ? "text-amber-400" : "text-rose-400"}`}>
                                    {(detailForecast.accuracy.r2 * 100).toFixed(1)}%
                                </p>
                                <p className="text-[10px] text-surface-500">R² Score</p>
                            </div>
                            <div className="glass p-3 rounded-xl text-center">
                                <p className="text-lg font-black text-white">{detailForecast.accuracy.mape?.toFixed(1)}%</p>
                                <p className="text-[10px] text-surface-500">MAPE Error</p>
                            </div>
                            <div className="glass p-3 rounded-xl text-center">
                                <p className={`text-lg font-black ${detailForecast.accuracy.slope > 0 ? "text-emerald-400" : detailForecast.accuracy.slope < 0 ? "text-rose-400" : "text-surface-400"}`}>
                                    {detailForecast.accuracy.slope > 0 ? "+" : ""}{detailForecast.accuracy.slope}
                                </p>
                                <p className="text-[10px] text-surface-500">Trend Slope</p>
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="glass p-4 rounded-xl">
                            <h4 className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-3">Actual vs Predicted vs Forecast</h4>
                            <ForecastChart history={detailForecast.history} forecast={detailForecast.forecast} />
                            <div className="flex justify-center gap-4 mt-3">
                                <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-emerald-400 rounded" /><span className="text-[10px] text-surface-400">Actual</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-primary-400 rounded" /><span className="text-[10px] text-surface-400">Forecast</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-amber-400 rounded opacity-50" style={{ borderTop: "1px dashed #fbbf24" }} /><span className="text-[10px] text-surface-400">Moving Avg</span></div>
                            </div>
                        </div>

                        {/* Forecast table */}
                        <div>
                            <h4 className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-2">Forecast Breakdown</h4>
                            <div className="glass overflow-hidden rounded-xl">
                                <table className="w-full text-xs">
                                    <thead><tr className="border-b border-surface-700/50">
                                        <th className="px-3 py-2 text-left text-surface-500">Month</th>
                                        <th className="px-3 py-2 text-right text-surface-500">Regression</th>
                                        <th className="px-3 py-2 text-right text-surface-500">Seasonal</th>
                                        <th className="px-3 py-2 text-right text-surface-500">Moving Avg</th>
                                        <th className="px-3 py-2 text-right text-primary-400 font-bold">Recommended</th>
                                    </tr></thead>
                                    <tbody>
                                        {detailForecast.forecast.map((f: any) => (
                                            <tr key={f.month} className="border-b border-surface-700/20">
                                                <td className="px-3 py-2 text-white font-mono">{f.month}</td>
                                                <td className="px-3 py-2 text-right text-surface-400">{f.regression}</td>
                                                <td className="px-3 py-2 text-right text-surface-400">{f.seasonal_adjusted}</td>
                                                <td className="px-3 py-2 text-right text-surface-400">{f.moving_average}</td>
                                                <td className="px-3 py-2 text-right text-primary-400 font-bold">{f.recommended}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Seasonal coefficients */}
                        <div>
                            <h4 className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-2">Seasonal Coefficients</h4>
                            <div className="flex gap-1">
                                {Object.entries(detailForecast.seasonal_coefficients || {}).map(([m, c]: [string, any]) => {
                                    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                    const bg = c > 1.1 ? "bg-emerald-400/20 text-emerald-400" : c < 0.9 ? "bg-rose-400/20 text-rose-400" : "bg-surface-700/30 text-surface-400";
                                    return (
                                        <div key={m} className={`flex-1 text-center p-1.5 rounded-lg ${bg}`}>
                                            <p className="text-[9px] font-medium">{months[parseInt(m) - 1]}</p>
                                            <p className="text-[10px] font-bold">{c}x</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
