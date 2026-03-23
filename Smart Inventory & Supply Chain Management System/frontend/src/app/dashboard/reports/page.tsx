"use client";
import React, { useState } from "react";
import {
    FileText, Download, Calendar, Filter, RefreshCw, CheckCircle, AlertTriangle,
    FileSpreadsheet, BarChart3, Package, Truck, Users as UsersIcon, Layers, Shield
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
function getToken() { return typeof window !== "undefined" ? localStorage.getItem("token") || "" : ""; }

const REPORT_TYPES = [
    { id: "inventory", label: "Inventory Stock Report", desc: "Current stock levels, reorder points, and stock values across all warehouses", icon: Layers, color: "from-primary-500 to-violet-500" },
    { id: "procurement", label: "Procurement Report", desc: "Purchase orders, spend analysis, and vendor performance", icon: Package, color: "from-emerald-400 to-emerald-600" },
    { id: "movements", label: "Stock Movements Report", desc: "Detailed history of all stock IN/OUT movements", icon: BarChart3, color: "from-cyan-400 to-cyan-600" },
    { id: "suppliers", label: "Supplier Directory", desc: "Complete supplier listing with ratings, lead times, and status", icon: UsersIcon, color: "from-amber-400 to-amber-600" },
    { id: "shipments", label: "Shipment Tracking Report", desc: "All shipments with carrier, status, and delivery dates", icon: Truck, color: "from-rose-400 to-rose-600" },
    { id: "audit", label: "Audit Log Export", desc: "System audit trail — user actions, entity changes, timestamps", icon: Shield, color: "from-violet-400 to-purple-600" },
];

export default function ReportsPage() {
    const [selectedType, setSelectedType] = useState("inventory");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [exporting, setExporting] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
    const [history, setHistory] = useState<{ type: string; format: string; date: string }[]>([]);

    const showToast = (msg: string, type: "success" | "error" = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

    const handleExportCSV = async () => {
        setExporting(true);
        try {
            const params = new URLSearchParams({ type: selectedType });
            if (dateFrom) params.append("from", dateFrom);
            if (dateTo) params.append("to", dateTo);

            const res = await fetch(`${API}/analytics/reports/csv?${params}`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                const disp = res.headers.get("content-disposition");
                a.download = disp?.split("filename=")[1]?.replace(/"/g, "") || `${selectedType}_report.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                showToast("CSV exported successfully!");
                setHistory((prev) => [{ type: selectedType, format: "CSV", date: new Date().toLocaleString() }, ...prev].slice(0, 10));
            } else {
                showToast("Export failed", "error");
            }
        } catch (err) {
            showToast("Network error", "error");
        }
        setExporting(false);
    };

    const handleExportPDF = async () => {
        setExporting(true);
        try {
            // Client-side PDF generation using the CSV data rendered into an HTML table
            const params = new URLSearchParams({ type: selectedType });
            if (dateFrom) params.append("from", dateFrom);
            if (dateTo) params.append("to", dateTo);

            const res = await fetch(`${API}/analytics/reports/csv?${params}`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });

            if (res.ok) {
                const csv = await res.text();
                const lines = csv.split("\n");
                const headers = lines[0]?.split(",") || [];
                const rows = lines.slice(1).filter(Boolean).map((l) => l.split(","));

                const reportInfo = REPORT_TYPES.find((r) => r.id === selectedType);
                const htmlContent = `<!DOCTYPE html><html><head><title>${reportInfo?.label || "Report"}</title>
                    <style>
                    body { font-family: 'Segoe UI', sans-serif; margin: 40px; color: #333; }
                    h1 { color: #4f46e5; margin-bottom: 5px; }
                    .meta { color: #888; font-size: 12px; margin-bottom: 24px; }
                    table { width: 100%; border-collapse: collapse; font-size: 11px; }
                    th { background: #4f46e5; color: white; padding: 8px 12px; text-align: left; }
                    td { padding: 6px 12px; border-bottom: 1px solid #eee; }
                    tr:nth-child(even) { background: #f9fafb; }
                    .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #aaa; }
                    </style></head><body>
                    <h1>${reportInfo?.label}</h1>
                    <p class="meta">Generated: ${new Date().toLocaleString()} ${dateFrom ? `| From: ${dateFrom}` : ""} ${dateTo ? `| To: ${dateTo}` : ""}</p>
                    <table><thead><tr>${headers.map((h) => `<th>${h.replace(/"/g, "")}</th>`).join("")}</tr></thead>
                    <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c.replace(/"/g, "")}</td>`).join("")}</tr>`).join("")}</tbody></table>
                    <div class="footer">NexusFlow — Smart Inventory & Supply Chain Management</div>
                    </body></html>`;

                const pdfWindow = window.open("", "_blank");
                if (pdfWindow) {
                    pdfWindow.document.write(htmlContent);
                    pdfWindow.document.close();
                    setTimeout(() => { pdfWindow.print(); }, 500);
                }
                showToast("PDF ready — use Print dialog to save");
                setHistory((prev) => [{ type: selectedType, format: "PDF", date: new Date().toLocaleString() }, ...prev].slice(0, 10));
            } else {
                showToast("Export failed", "error");
            }
        } catch (err) {
            showToast("Network error", "error");
        }
        setExporting(false);
    };

    const selectedReport = REPORT_TYPES.find((r) => r.id === selectedType);

    return (
        <div className="space-y-6">
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl animate-slide-up text-sm font-medium ${toast.type === "success" ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300" : "bg-red-500/20 border border-red-500/30 text-red-300"}`}>
                    {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    {toast.msg}
                </div>
            )}

            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-white">Reports</h1>
                    <p className="text-surface-500 text-sm">Generate and export data reports</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Report Type Selector */}
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider">Select Report Type</h3>
                    <div className="space-y-2">
                        {REPORT_TYPES.map((r) => (
                            <button key={r.id} onClick={() => setSelectedType(r.id)}
                                className={`w-full flex items-start gap-3 p-4 rounded-xl border transition-all text-left ${selectedType === r.id ? "border-primary-500/50 bg-primary-500/5 glass-strong" : "border-surface-700/30 hover:border-surface-600 glass"}`}>
                                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${r.color} flex items-center justify-center flex-shrink-0`}>
                                    <r.icon className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <p className={`text-sm font-semibold ${selectedType === r.id ? "text-white" : "text-surface-300"}`}>{r.label}</p>
                                    <p className="text-xs text-surface-500 mt-0.5">{r.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Builder + Actions */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Preview Card */}
                    <div className="glass-card p-6">
                        <div className="flex items-center gap-3 mb-4">
                            {selectedReport && (
                                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${selectedReport.color} flex items-center justify-center`}>
                                    <selectedReport.icon className="w-5 h-5 text-white" />
                                </div>
                            )}
                            <div>
                                <h2 className="text-lg font-bold text-white">{selectedReport?.label}</h2>
                                <p className="text-sm text-surface-400">{selectedReport?.desc}</p>
                            </div>
                        </div>

                        {/* Date range */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> From Date
                                </label>
                                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                                    className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> To Date
                                </label>
                                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                                    className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60" />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button onClick={handleExportCSV} disabled={exporting}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold text-sm hover:bg-emerald-500/25 transition-all disabled:opacity-50">
                                {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                                Export CSV
                            </button>
                            <button onClick={handleExportPDF} disabled={exporting}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 font-semibold text-sm hover:bg-rose-500/25 transition-all disabled:opacity-50">
                                {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                Export PDF
                            </button>
                        </div>
                    </div>

                    {/* Report info */}
                    <div className="glass-card p-5">
                        <h3 className="text-sm font-bold text-surface-300 mb-3 flex items-center gap-2"><Filter className="w-4 h-4 text-primary-400" /> Report Contents</h3>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            {selectedType === "inventory" && ["Product Name", "SKU", "Warehouse", "Qty On Hand", "Reorder Point", "Unit Cost", "Stock Value"].map((f) => (
                                <div key={f} className="flex items-center gap-2 text-surface-400"><CheckCircle className="w-3 h-3 text-emerald-400" />{f}</div>
                            ))}
                            {selectedType === "procurement" && ["PO Number", "Supplier", "Total Amount", "Status", "Order Date", "Expected Delivery"].map((f) => (
                                <div key={f} className="flex items-center gap-2 text-surface-400"><CheckCircle className="w-3 h-3 text-emerald-400" />{f}</div>
                            ))}
                            {selectedType === "movements" && ["Date", "Product", "SKU", "Type (IN/OUT)", "Quantity", "Reference", "Warehouse"].map((f) => (
                                <div key={f} className="flex items-center gap-2 text-surface-400"><CheckCircle className="w-3 h-3 text-emerald-400" />{f}</div>
                            ))}
                            {selectedType === "suppliers" && ["Name", "Code", "Rating", "Lead Time", "Payment Terms", "City", "Country", "Blacklisted"].map((f) => (
                                <div key={f} className="flex items-center gap-2 text-surface-400"><CheckCircle className="w-3 h-3 text-emerald-400" />{f}</div>
                            ))}
                            {selectedType === "shipments" && ["Tracking #", "Carrier", "Status", "Destination", "Recipient", "Est. Delivery", "Actual Delivery"].map((f) => (
                                <div key={f} className="flex items-center gap-2 text-surface-400"><CheckCircle className="w-3 h-3 text-emerald-400" />{f}</div>
                            ))}
                            {selectedType === "audit" && ["Date", "User", "Action", "Entity", "Entity ID"].map((f) => (
                                <div key={f} className="flex items-center gap-2 text-surface-400"><CheckCircle className="w-3 h-3 text-emerald-400" />{f}</div>
                            ))}
                        </div>
                    </div>

                    {/* Export History */}
                    {history.length > 0 && (
                        <div className="glass-card p-5">
                            <h3 className="text-sm font-bold text-surface-300 mb-3">Recent Exports</h3>
                            <div className="space-y-2">
                                {history.map((h, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs py-2 border-b border-surface-700/20 last:border-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-full font-medium ${h.format === "CSV" ? "bg-emerald-400/10 text-emerald-400" : "bg-rose-400/10 text-rose-400"}`}>{h.format}</span>
                                            <span className="text-surface-400 capitalize">{REPORT_TYPES.find((r) => r.id === h.type)?.label || h.type}</span>
                                        </div>
                                        <span className="text-surface-600">{h.date}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
