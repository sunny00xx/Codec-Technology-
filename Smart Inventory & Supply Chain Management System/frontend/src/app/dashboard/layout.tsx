"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Boxes,
    LayoutDashboard,
    Warehouse,
    Package,
    Layers,
    ShoppingCart,
    Users,
    Truck,
    BarChart3,
    Settings,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Bell,
    Search,
    Menu,
    X,
    Brain,
    Network,
    Leaf,
    Shield,
    User,
    ChevronDown,
    AlertTriangle,
    CheckCircle,
    FileText,
} from "lucide-react";

const sidebarSections = [
    {
        label: "Overview",
        items: [
            { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, active: true },
        ],
    },
    {
        label: "Operations",
        items: [
            { label: "Warehouses", href: "/dashboard/warehouses", icon: Warehouse },
            { label: "Products", href: "/dashboard/products", icon: Package },
            { label: "Inventory", href: "/dashboard/inventory", icon: Layers },
            { label: "Procurement", href: "/dashboard/procurement", icon: ShoppingCart },
            { label: "Suppliers", href: "/dashboard/suppliers", icon: Users },
            { label: "Shipments", href: "/dashboard/shipments", icon: Truck },
        ],
    },
    {
        label: "Intelligence",
        items: [
            { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
            { label: "Reports", href: "/dashboard/reports", icon: FileText },
            { label: "AI Forecasting", href: "/dashboard/forecasting", icon: Brain },
            { label: "Digital Twin", href: "/dashboard/digital-twin", icon: Network },
            { label: "Sustainability", href: "/dashboard/sustainability", icon: Leaf },
        ],
    },
    {
        label: "Administration",
        items: [
            { label: "Users & Roles", href: "/dashboard/users", icon: Shield },
            { label: "Settings", href: "/dashboard/settings", icon: Settings },
        ],
    },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unread, setUnread] = useState(0);
    const [user, setUser] = useState<{ fullName?: string; email?: string } | null>(null);
    const notifRef = useRef<HTMLDivElement>(null);

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
    const getToken = () => typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";

    const fetchNotifications = async () => {
        try {
            const res = await fetch(`${API_BASE}/notifications`, { headers: { Authorization: `Bearer ${getToken()}` } });
            const data = await res.json();
            if (data.success) { setNotifications(data.data || []); setUnread(data.meta?.unread || 0); }
        } catch (_) { }
    };

    const markAllRead = async () => {
        try {
            await fetch(`${API_BASE}/notifications/mark-read`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ all: true }) });
            fetchNotifications();
        } catch (_) { }
    };

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }
        const u = localStorage.getItem("user");
        if (u) setUser(JSON.parse(u));
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
    };

    return (
        <div className="flex min-h-screen">
            {/* ============ SIDEBAR ============ */}
            {/* Overlay for mobile */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside
                className={`fixed top-0 left-0 h-full z-50 flex flex-col bg-surface-900/95 backdrop-blur-xl border-r border-surface-800/50 transition-all duration-300 ${collapsed ? "w-20" : "w-[260px]"
                    } ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
            >
                {/* Logo */}
                <div className={`flex items-center gap-3 p-5 border-b border-surface-800/50 ${collapsed ? "justify-center" : ""}`}>
                    <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 glow-primary">
                        <Boxes className="w-5 h-5 text-white" />
                    </div>
                    {!collapsed && (
                        <span className="text-lg font-bold whitespace-nowrap">
                            <span className="gradient-text">Nexus</span>
                            <span className="text-surface-200">Flow</span>
                        </span>
                    )}
                </div>

                {/* Nav Items */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
                    {sidebarSections.map((section) => (
                        <div key={section.label}>
                            {!collapsed && (
                                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-surface-600 mb-2 px-3">
                                    {section.label}
                                </p>
                            )}
                            <ul className="space-y-1">
                                {section.items.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <li key={item.href}>
                                            <Link
                                                href={item.href}
                                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${isActive
                                                    ? "bg-primary-500/15 text-primary-400 shadow-sm shadow-primary-500/10"
                                                    : "text-surface-400 hover:text-surface-200 hover:bg-surface-800/50"
                                                    } ${collapsed ? "justify-center" : ""}`}
                                                onClick={() => setMobileOpen(false)}
                                                title={collapsed ? item.label : undefined}
                                            >
                                                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-primary-400" : "text-surface-500 group-hover:text-surface-300"}`} />
                                                {!collapsed && item.label}
                                                {isActive && !collapsed && (
                                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-400" />
                                                )}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>

                {/* Collapse Toggle */}
                <div className="hidden lg:flex p-3 border-t border-surface-800/50">
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-surface-500 hover:text-surface-300 hover:bg-surface-800/50 transition-all text-sm"
                    >
                        {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /> <span>Collapse</span></>}
                    </button>
                </div>
            </aside>

            {/* ============ MAIN CONTENT ============ */}
            <div className={`flex-1 flex flex-col transition-all duration-300 ${collapsed ? "lg:ml-20" : "lg:ml-[260px]"}`}>
                {/* Top Bar */}
                <header className="sticky top-0 z-30 glass-strong border-b border-surface-800/30">
                    <div className="flex items-center justify-between px-4 lg:px-6 py-3">
                        {/* Left: Mobile toggle + Search */}
                        <div className="flex items-center gap-4">
                            <button
                                className="lg:hidden text-surface-400 hover:text-white transition-colors"
                                onClick={() => setMobileOpen(true)}
                            >
                                <Menu className="w-6 h-6" />
                            </button>
                            <div className="hidden sm:flex items-center glass rounded-xl px-4 py-2.5 min-w-[280px]">
                                <Search className="w-4 h-4 text-surface-500 mr-3" />
                                <input
                                    type="text"
                                    placeholder="Search inventory, orders, suppliers..."
                                    className="bg-transparent border-none outline-none text-sm text-surface-200 placeholder:text-surface-500 w-full"
                                />
                                <kbd className="hidden md:inline-flex items-center gap-1 text-[10px] text-surface-600 bg-surface-800/50 px-2 py-0.5 rounded-md border border-surface-700/50">
                                    ⌘K
                                </kbd>
                            </div>
                        </div>

                        {/* Right: Notifications + User */}
                        <div className="flex items-center gap-3">
                            {/* Notification Bell */}
                            <div className="relative" ref={notifRef}>
                                <button onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) fetchNotifications(); }}
                                    className="relative p-2.5 rounded-xl text-surface-400 hover:text-white hover:bg-surface-800/50 transition-all">
                                    <Bell className="w-5 h-5" />
                                    {unread > 0 && (
                                        <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                                            {unread > 9 ? "9+" : unread}
                                        </span>
                                    )}
                                </button>
                                {notifOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-80 glass-strong rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden">
                                        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700/30">
                                            <p className="text-sm font-bold text-white">Notifications {unread > 0 && <span className="text-xs text-rose-400 ml-1">{unread} new</span>}</p>
                                            <div className="flex items-center gap-2">
                                                {unread > 0 && <button onClick={markAllRead} className="text-xs text-primary-400 hover:text-primary-300">Mark all read</button>}
                                                <button onClick={() => setNotifOpen(false)}><X className="w-4 h-4 text-surface-500" /></button>
                                            </div>
                                        </div>
                                        <div className="max-h-72 overflow-y-auto">
                                            {notifications.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                                    <Bell className="w-8 h-8 text-surface-600 mb-2" />
                                                    <p className="text-xs text-surface-500">No notifications yet</p>
                                                </div>
                                            ) : notifications.map((n: any) => (
                                                <div key={n.id} className={`flex items-start gap-3 px-4 py-3 border-b border-surface-700/20 hover:bg-surface-800/30 transition-all ${!n.read ? "bg-primary-500/5" : ""}`}>
                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${n.type?.includes("EXCEPTION") || n.type?.includes("DELAYED") ? "bg-rose-400/10" : "bg-emerald-400/10"}`}>
                                                        {n.type?.includes("EXCEPTION") || n.type?.includes("DELAYED") ?
                                                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> :
                                                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-semibold text-white">{n.type?.replace(/_/g, " ")}</p>
                                                        <p className="text-[10px] text-surface-500 truncate">{n.data?.tracking_number || n.data?.description || ""}</p>
                                                        <p className="text-[10px] text-surface-600">{n.timestamp ? new Date(n.timestamp).toLocaleTimeString() : ""}</p>
                                                    </div>
                                                    {!n.read && <div className="w-1.5 h-1.5 bg-primary-400 rounded-full mt-1.5 flex-shrink-0" />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* User Menu */}
                            <div className="relative">
                                <button
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-800/50 transition-all"
                                >
                                    <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                                        <User className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="hidden sm:block text-left">
                                        <p className="text-sm font-medium text-surface-200">{user?.fullName || "Admin"}</p>
                                        <p className="text-xs text-surface-500">{user?.email || "admin@demo.com"}</p>
                                    </div>
                                    <ChevronDown className="w-4 h-4 text-surface-500 hidden sm:block" />
                                </button>

                                {userMenuOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-56 glass-strong rounded-xl p-2 shadow-2xl shadow-black/40">
                                        <Link
                                            href="/dashboard/settings"
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-surface-300 hover:text-white hover:bg-surface-800/50 transition-all"
                                            onClick={() => setUserMenuOpen(false)}
                                        >
                                            <Settings className="w-4 h-4" /> Settings
                                        </Link>
                                        <hr className="my-1 border-surface-700/50" />
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-rose-400 hover:bg-rose-500/10 transition-all"
                                        >
                                            <LogOut className="w-4 h-4" /> Sign Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
