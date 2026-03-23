"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
    Package,
    Warehouse,
    TrendingUp,
    TrendingDown,
    ShoppingCart,
    Truck,
    AlertTriangle,
    Users,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    DollarSign,
    Boxes,
    BarChart3,
    Clock,
    CheckCircle2,
} from "lucide-react";

/* ============================================
   KPI CARD COMPONENT
   ============================================ */
function KpiCard({
    title,
    value,
    change,
    changeType,
    icon: Icon,
    gradient,
    subtitle,
}: {
    title: string;
    value: string;
    change: string;
    changeType: "up" | "down";
    icon: React.ElementType;
    gradient: string;
    subtitle?: string;
}) {
    return (
        <div className="glass-card p-6 group">
            <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
                <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${changeType === "up"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-rose-500/10 text-rose-400"
                    }`}>
                    {changeType === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {change}
                </div>
            </div>
            <h3 className="text-3xl font-black text-white mb-1">{value}</h3>
            <p className="text-sm text-surface-400 font-medium">{title}</p>
            {subtitle && <p className="text-xs text-surface-500 mt-1">{subtitle}</p>}
        </div>
    );
}

/* ============================================
   QUICK ACTION BUTTON
   ============================================ */
function QuickAction({
    icon: Icon,
    label,
    gradient,
    href,
}: {
    icon: React.ElementType;
    label: string;
    gradient: string;
    href: string;
}) {
    return (
        <Link href={href} className="glass-card p-4 flex flex-col items-center gap-3 group cursor-pointer w-full hover:bg-surface-800/50 transition-colors">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center transition-all duration-300 group-hover:scale-110`}>
                <Icon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-medium text-surface-300 text-center">{label}</span>
        </Link>
    );
}

/* ============================================
   RECENT ACTIVITY ITEM
   ============================================ */
function ActivityItem({
    icon: Icon,
    text,
    time,
    color,
}: {
    icon: React.ElementType;
    text: string;
    time: string;
    color: string;
}) {
    return (
        <div className="flex items-start gap-3 py-3 border-b border-surface-800/30 last:border-0">
            <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-surface-200 truncate">{text}</p>
                <p className="text-xs text-surface-500">{time}</p>
            </div>
        </div>
    );
}

/* ============================================
   ALERT ITEM
   ============================================ */
function AlertItem({
    title,
    desc,
    severity,
}: {
    title: string;
    desc: string;
    severity: "critical" | "warning" | "info";
}) {
    const severityStyles = {
        critical: "border-rose-500/20 bg-rose-500/5",
        warning: "border-amber-500/20 bg-amber-500/5",
        info: "border-primary-500/20 bg-primary-500/5",
    };
    const dotColor = {
        critical: "bg-rose-500",
        warning: "bg-amber-500",
        info: "bg-primary-500",
    };
    return (
        <div className={`rounded-xl border p-4 ${severityStyles[severity]} transition-all hover:translate-x-1`}>
            <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${dotColor[severity]}`} />
                <span className="text-sm font-semibold text-surface-200">{title}</span>
            </div>
            <p className="text-xs text-surface-400 ml-4">{desc}</p>
        </div>
    );
}

/* ============================================
   MAIN DASHBOARD PAGE
   ============================================ */
export default function DashboardPage() {
    const [greeting, setGreeting] = useState("Good morning");
    const [user, setUser] = useState<{ fullName?: string } | null>(null);

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting("Good morning");
        else if (hour < 17) setGreeting("Good afternoon");
        else setGreeting("Good evening");

        const u = localStorage.getItem("user");
        if (u) setUser(JSON.parse(u));
    }, []);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-white">
                        {greeting}, <span className="gradient-text">{user?.fullName || "Admin"}</span>
                    </h1>
                    <p className="text-surface-400 text-sm mt-1">
                        Here&apos;s what&apos;s happening across your supply chain today.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="glass rounded-xl px-4 py-2 flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-xs font-medium text-surface-300">All Systems Operational</span>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <KpiCard
                    title="Total Products"
                    value="12,847"
                    change="+12.5%"
                    changeType="up"
                    icon={Package}
                    gradient="from-primary-500 to-primary-700"
                    subtitle="Across 6 warehouses"
                />
                <KpiCard
                    title="Active Orders"
                    value="1,284"
                    change="+8.2%"
                    changeType="up"
                    icon={ShoppingCart}
                    gradient="from-violet-500 to-violet-700"
                    subtitle="156 pending approval"
                />
                <KpiCard
                    title="In Transit"
                    value="342"
                    change="-3.1%"
                    changeType="down"
                    icon={Truck}
                    gradient="from-cyan-500 to-cyan-600"
                    subtitle="12 delayed shipments"
                />
                <KpiCard
                    title="Revenue (MTD)"
                    value="$2.4M"
                    change="+18.7%"
                    changeType="up"
                    icon={DollarSign}
                    gradient="from-emerald-400 to-emerald-600"
                    subtitle="vs $2.0M last month"
                />
            </div>

            {/* Second Row: Quick Actions + Alerts + Recent Activity */}
            <div className="grid lg:grid-cols-3 gap-5">
                {/* Quick Actions */}
                <div className="glass-card p-6">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary-400" /> Quick Actions
                    </h2>
                    <div className="grid grid-cols-3 gap-3">
                        <QuickAction icon={Package} label="Add Product" gradient="from-primary-500 to-primary-600" href="/dashboard/products" />
                        <QuickAction icon={Warehouse} label="New Warehouse" gradient="from-violet-500 to-violet-600" href="/dashboard/warehouses" />
                        <QuickAction icon={ShoppingCart} label="Create PO" gradient="from-cyan-500 to-cyan-600" href="/dashboard/procurement" />
                        <QuickAction icon={Users} label="Add Supplier" gradient="from-amber-400 to-amber-500" href="/dashboard/suppliers" />
                        <QuickAction icon={Truck} label="New Shipment" gradient="from-emerald-400 to-emerald-500" href="/dashboard/shipments" />
                        <QuickAction icon={BarChart3} label="Run Report" gradient="from-rose-400 to-rose-500" href="/dashboard/reports" />
                    </div>
                </div>

                {/* Alerts */}
                <div className="glass-card p-6">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-400" /> Active Alerts
                        <span className="ml-auto text-xs font-medium text-surface-500 bg-surface-800/50 px-2 py-1 rounded-lg">5 new</span>
                    </h2>
                    <div className="space-y-3">
                        <AlertItem
                            severity="critical"
                            title="Low Stock Alert"
                            desc="Widget-A (SKU-1042) below safety threshold in Warehouse-3"
                        />
                        <AlertItem
                            severity="warning"
                            title="Shipment Delayed"
                            desc="SHP-2847 delayed by 2 days — Carrier: FastLog Express"
                        />
                        <AlertItem
                            severity="warning"
                            title="Supplier Score Drop"
                            desc="GlobalParts Inc. score dropped to 58 — auto-blacklist pending"
                        />
                        <AlertItem
                            severity="info"
                            title="PO Approval Needed"
                            desc="PO-8291 ($24,500) awaiting Regional Manager approval"
                        />
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="glass-card p-6">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-cyan-400" /> Recent Activity
                    </h2>
                    <div className="space-y-0">
                        <ActivityItem
                            icon={CheckCircle2}
                            text="GRN-1842 received — 500 units of Widget-C"
                            time="2 minutes ago"
                            color="bg-emerald-500/20"
                        />
                        <ActivityItem
                            icon={ShoppingCart}
                            text="PO-8290 auto-generated for low stock items"
                            time="15 minutes ago"
                            color="bg-primary-500/20"
                        />
                        <ActivityItem
                            icon={Truck}
                            text="Shipment SHP-2845 marked as Delivered"
                            time="1 hour ago"
                            color="bg-cyan-500/20"
                        />
                        <ActivityItem
                            icon={AlertTriangle}
                            text="Temperature spike detected in Cold-Zone B2"
                            time="2 hours ago"
                            color="bg-amber-500/20"
                        />
                        <ActivityItem
                            icon={Users}
                            text="New supplier MegaSupply Corp onboarded"
                            time="3 hours ago"
                            color="bg-violet-500/20"
                        />
                    </div>
                </div>
            </div>

            {/* Third Row: Warehouse Overview + Inventory Stats */}
            <div className="grid lg:grid-cols-2 gap-5">
                {/* Warehouse Overview */}
                <div className="glass-card p-6">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Warehouse className="w-5 h-5 text-violet-400" /> Warehouse Utilization
                    </h2>
                    <div className="space-y-4">
                        {[
                            { name: "Warehouse Alpha — Mumbai", usage: 87, color: "bg-primary-500" },
                            { name: "Warehouse Beta — Delhi", usage: 62, color: "bg-violet-500" },
                            { name: "Warehouse Gamma — Bangalore", usage: 94, color: "bg-rose-500" },
                            { name: "Warehouse Delta — Pune", usage: 45, color: "bg-cyan-500" },
                            { name: "Warehouse Epsilon — Hyderabad", usage: 73, color: "bg-emerald-500" },
                        ].map((wh) => (
                            <div key={wh.name}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-sm text-surface-300">{wh.name}</span>
                                    <span className={`text-xs font-bold ${wh.usage > 90 ? "text-rose-400" : wh.usage > 70 ? "text-amber-400" : "text-emerald-400"}`}>
                                        {wh.usage}%
                                    </span>
                                </div>
                                <div className="h-2 rounded-full bg-surface-800/80 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${wh.color} transition-all duration-1000`}
                                        style={{ width: `${wh.usage}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Inventory Health */}
                <div className="glass-card p-6">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Boxes className="w-5 h-5 text-emerald-400" /> Inventory Health
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { label: "Total SKUs", value: "12,847", icon: Package, color: "text-primary-400" },
                            { label: "Low Stock Items", value: "127", icon: AlertTriangle, color: "text-amber-400" },
                            { label: "Expiring (30d)", value: "43", icon: Clock, color: "text-rose-400" },
                            { label: "Dead Stock", value: "89", icon: TrendingDown, color: "text-surface-500" },
                            { label: "Turnover Rate", value: "8.4x", icon: TrendingUp, color: "text-emerald-400" },
                            { label: "Accuracy", value: "99.7%", icon: CheckCircle2, color: "text-cyan-400" },
                        ].map((stat) => (
                            <div key={stat.label} className="glass rounded-xl p-4 flex items-center gap-3">
                                <stat.icon className={`w-5 h-5 ${stat.color} flex-shrink-0`} />
                                <div>
                                    <p className="text-lg font-bold text-white">{stat.value}</p>
                                    <p className="text-xs text-surface-500">{stat.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
