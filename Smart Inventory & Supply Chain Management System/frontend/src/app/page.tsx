"use client";
import React, { useEffect, useState } from "react";
import {
  Box,
  Zap,
  Shield,
  BarChart3,
  Truck,
  Globe,
  ArrowRight,
  ChevronDown,
  Package,
  Warehouse,
  Brain,
  Layers,
  Activity,
  CheckCircle2,
  Star,
  TrendingUp,
  Lock,
  Cpu,
  Network,
  Boxes,
  Search,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";

/* ================================================
   ANIMATED COUNTER COMPONENT
   ================================================ */
function AnimatedCounter({ end, suffix = "", prefix = "" }: { end: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 2000;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [end]);
  return <span>{prefix}{count.toLocaleString()}{suffix}</span>;
}

/* ================================================
   FLOATING ORB BACKGROUND COMPONENT
   ================================================ */
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large primary orb */}
      <div
        className="absolute animate-float"
        style={{
          width: 600, height: 600,
          background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
          top: "-10%", right: "-10%",
          borderRadius: "50%",
          filter: "blur(40px)",
        }}
      />
      {/* Secondary violet orb */}
      <div
        className="absolute animate-float-delayed"
        style={{
          width: 500, height: 500,
          background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)",
          bottom: "10%", left: "-5%",
          borderRadius: "50%",
          filter: "blur(60px)",
        }}
      />
      {/* Cyan accent orb */}
      <div
        className="absolute animate-float"
        style={{
          width: 300, height: 300,
          background: "radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)",
          top: "40%", left: "30%",
          borderRadius: "50%",
          filter: "blur(40px)",
          animationDelay: "3s",
        }}
      />
      {/* Emerald accent orb */}
      <div
        className="absolute animate-float-delayed"
        style={{
          width: 250, height: 250,
          background: "radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)",
          top: "60%", right: "20%",
          borderRadius: "50%",
          filter: "blur(30px)",
        }}
      />

      {/* Grid dots pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#818cf8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>
    </div>
  );
}

/* ================================================
   NAVBAR COMPONENT
   ================================================ */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Metrics", href: "#metrics" },
    { label: "Pricing", href: "#pricing" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled
        ? "glass-strong py-3 shadow-2xl shadow-black/20"
        : "bg-transparent py-5"
        }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between" style={{ margin: "0 auto", width: "100%" }}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center glow-primary transition-all duration-300 group-hover:scale-110">
              <Boxes className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -inset-1 rounded-xl gradient-primary opacity-20 blur-md group-hover:opacity-40 transition-opacity" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            <span className="gradient-text">Nexus</span>
            <span className="text-surface-200">Flow</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-surface-400 hover:text-white text-sm font-medium transition-colors duration-300 relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-primary-400 after:transition-all after:duration-300 hover:after:w-full"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/login"
            className="text-surface-300 hover:text-white text-sm font-medium transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="btn-primary text-sm py-2.5 px-6 flex items-center gap-2"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-surface-300 hover:text-white transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden glass-strong mt-2 mx-4 rounded-2xl p-6 animate-slide-up">
          <div className="flex flex-col gap-4">
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-surface-300 hover:text-white text-sm font-medium py-2"
                onClick={() => setMobileOpen(false)}
              >
                {l.label}
              </a>
            ))}
            <hr className="border-surface-700/50" />
            <Link href="/login" className="text-surface-300 hover:text-white text-sm font-medium py-2">
              Sign In
            </Link>
            <Link href="/register" className="btn-primary text-sm py-2.5 px-6 text-center flex items-center justify-center gap-2">
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ================================================
   HERO SECTION
   ================================================ */
function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-32 pb-32 overflow-hidden">
      <FloatingOrbs />

      {/* Rotating ring decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] opacity-[0.04] pointer-events-none">
        <div className="w-full h-full rounded-full border border-primary-400 animate-spin-slow" />
        <div className="absolute inset-8 rounded-full border border-violet-400 animate-spin-slow" style={{ animationDirection: "reverse", animationDuration: "30s" }} />
        <div className="absolute inset-16 rounded-full border border-cyan-400 animate-spin-slow" style={{ animationDuration: "25s" }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 text-center z-10" style={{ margin: "0 auto", width: "100%" }}>
        {/* Badge */}
        <div className="inline-flex items-center gap-2 glass rounded-full px-5 py-2.5 mb-10 animate-slide-up">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-surface-300 tracking-wide uppercase">
            Enterprise SaaS Platform — Now in Beta
          </span>
        </div>

        {/* Main Headline */}
        <h1
          className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black leading-[1.1] tracking-tight mb-10 animate-slide-up"
          style={{ animationDelay: "0.15s" }}
        >
          <span className="block text-white">The Future of</span>
          <span className="block gradient-text mt-3">Supply Chain</span>
          <span className="block text-white mt-3">Intelligence</span>
        </h1>

        {/* Sub text */}
        <p
          className="max-w-2xl mx-auto text-lg sm:text-xl text-surface-400 leading-relaxed mb-14 animate-slide-up opacity-0"
          style={{ margin: "0 auto", animationDelay: "0.3s" }}
        >
          AI-driven inventory management, real-time warehouse tracking, predictive
          analytics, and automated procurement — unified in one
          <span className="text-primary-400 font-semibold"> ultra-advanced</span> platform.
        </p>

        {/* CTA Buttons */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-20 animate-slide-up opacity-0"
          style={{ animationDelay: "0.45s" }}
        >
          <Link
            href="/register"
            className="btn-primary text-base py-3.5 px-8 flex items-center gap-3 group"
          >
            Start Free Trial
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <a
            href="#features"
            className="btn-outline text-base py-3.5 px-8 flex items-center gap-3"
          >
            Explore Features
            <ChevronDown className="w-5 h-5" />
          </a>
        </div>

        {/* Floating Feature Cards */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto animate-slide-up opacity-0"
          style={{ margin: "0 auto", width: "100%", animationDelay: "0.6s" }}
        >
          {[
            { icon: Package, label: "Smart Inventory", color: "from-primary-500 to-violet-500" },
            { icon: Brain, label: "AI Forecasting", color: "from-violet-500 to-rose-400" },
            { icon: Truck, label: "Live Tracking", color: "from-cyan-500 to-emerald-400" },
            { icon: Shield, label: "Zero-Trust Sec", color: "from-amber-400 to-rose-500" },
          ].map((item, i) => (
            <div
              key={item.label}
              className="glass-card p-6 flex flex-col items-center gap-4 group cursor-pointer"
              style={{ animationDelay: `${0.7 + i * 0.1}s` }}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                <item.icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold text-surface-200">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-surface-950 to-transparent z-20" />
    </section>
  );
}

/* ================================================
   METRICS BAR SECTION
   ================================================ */
function MetricsBar() {
  const metrics = [
    { value: 99.9, suffix: "%", label: "Uptime SLA" },
    { value: 200, suffix: "ms", label: "API Response (P95)", prefix: "<" },
    { value: 10000, suffix: "+", label: "Concurrent Users" },
    { value: 40, suffix: "%", label: "Stockout Reduction", prefix: "≥" },
  ];

  return (
    <section id="metrics" className="relative z-10" style={{ paddingTop: "120px", paddingBottom: "120px" }}>
      <div className="max-w-6xl mx-auto" style={{ margin: "0 auto", width: "100%", paddingLeft: "32px", paddingRight: "32px" }}>
        <div className="glass rounded-3xl glow-primary grid grid-cols-2 md:grid-cols-4" style={{ padding: "64px 48px", gap: "48px", boxShadow: "0 0 60px rgba(99,102,241,0.08)" }}>
          {metrics.map((m, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl md:text-4xl font-black gradient-text" style={{ marginBottom: "12px" }}>
                <AnimatedCounter end={m.value} suffix={m.suffix} prefix={m.prefix || ""} />
              </div>
              <div className="text-sm text-surface-400 font-medium">{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================
   FEATURES SECTION
   ================================================ */
function FeaturesSection() {
  const features = [
    {
      icon: Warehouse,
      title: "Multi-Warehouse Hierarchy",
      desc: "Region → Zone → Warehouse → Aisle → Rack → Shelf → Bin. Complete topology control with geo-based fulfillment optimization.",
      gradient: "from-primary-500 to-primary-700",
      glow: "glow-primary",
    },
    {
      icon: Activity,
      title: "Real-Time Stock Engine",
      desc: "FIFO/LIFO/FEFO accounting, batch tracking, safety stock auto-calculation, and dead-stock detection — all updated in real-time.",
      gradient: "from-cyan-500 to-cyan-600",
      glow: "glow-cyan",
    },
    {
      icon: Brain,
      title: "AI Demand Forecasting",
      desc: "Statistical models transitioning to ARIMA and LSTM neural networks with festival surge prediction and dynamic reorder thresholds.",
      gradient: "from-violet-500 to-violet-700",
      glow: "glow-violet",
    },
    {
      icon: Zap,
      title: "Auto Procurement",
      desc: "No-touch lifecycle: Low stock → Auto PR → Multi-level Approval → PO → Supplier Notify → GRN with barcode/QR scanning.",
      gradient: "from-amber-400 to-amber-600",
      glow: "",
    },
    {
      icon: BarChart3,
      title: "Supplier Intelligence",
      desc: "Algorithmic scoring with on-time, quality, and price components. Auto-blacklisting of failing suppliers with risk flagging.",
      gradient: "from-emerald-400 to-emerald-600",
      glow: "glow-emerald",
    },
    {
      icon: Truck,
      title: "Shipment Tracking",
      desc: "Granular lifecycle from created to delivered with live GPS, exception management, and automatic delay notifications.",
      gradient: "from-rose-400 to-rose-600",
      glow: "",
    },
    {
      icon: Network,
      title: "Digital Twin Simulation",
      desc: "Run 'What-If' crisis simulations on your entire supply chain. AI reroutes inventory and shows immediate financial impact.",
      gradient: "from-primary-400 to-cyan-500",
      glow: "glow-primary",
    },
    {
      icon: Lock,
      title: "Enterprise RBAC",
      desc: "Dynamic permission matrices with granular roles, zero-trust auditing, 2FA/MFA, IP restrictions, and full audit trails.",
      gradient: "from-surface-400 to-surface-600",
      glow: "",
    },
    {
      icon: Globe,
      title: "Carbon & ESG Tracker",
      desc: "Calculate greenhouse emissions per route, SKU-level carbon attribution, and generate compliance-grade sustainability reports.",
      gradient: "from-emerald-400 to-cyan-500",
      glow: "glow-emerald",
    },
  ];

  return (
    <section id="features" className="relative z-10" style={{ paddingTop: "160px", paddingBottom: "160px" }}>
      <div className="max-w-7xl mx-auto" style={{ margin: "0 auto", width: "100%", paddingLeft: "32px", paddingRight: "32px" }}>
        {/* Section Header */}
        <div className="text-center" style={{ marginBottom: "80px" }}>
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-6">
            <Layers className="w-4 h-4 text-primary-400" />
            <span className="text-xs font-medium text-surface-300 uppercase tracking-wider">
              Core Capabilities
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
            Enterprise-Grade <span className="gradient-text">Features</span>
          </h2>
          <p className="text-surface-400 text-lg max-w-2xl mx-auto leading-relaxed">
            Every module purpose-built for global-scale logistics operations with AI-first intelligence and zero-trust security.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: "32px" }}>
          {features.map((f, i) => (
            <div
              key={f.title}
              className="glass-card group"
              style={{ padding: "40px", animationDelay: `${i * 0.05}s` }}
            >
              {/* Icon */}
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 ${f.glow}`} style={{ marginBottom: "28px" }}>
                <f.icon className="w-7 h-7 text-white" />
              </div>
              {/* Content */}
              <h3 className="text-lg font-bold text-white group-hover:gradient-text transition-colors" style={{ marginBottom: "12px" }}>
                {f.title}
              </h3>
              <p className="text-sm text-surface-400 leading-loose">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================
   HOW IT WORKS SECTION
   ================================================ */
function HowItWorksSection() {
  const steps = [
    {
      step: "01",
      title: "Onboard Your Organization",
      desc: "Create your tenant, configure warehouses, invite team members, and set up roles — all in under 5 minutes.",
      icon: Box,
      color: "primary",
    },
    {
      step: "02",
      title: "Connect Your Supply Chain",
      desc: "Import products, map warehouse topology, link suppliers, and configure automated procurement thresholds.",
      icon: Cpu,
      color: "violet",
    },
    {
      step: "03",
      title: "AI Takes the Wheel",
      desc: "Our AI engine forecasts demand, auto-generates purchase orders, detects anomalies, and optimizes your entire operation.",
      icon: Brain,
      color: "cyan",
    },
    {
      step: "04",
      title: "Scale & Dominate",
      desc: "Monitor real-time dashboards, run digital twin simulations, track carbon footprint, and make data-driven decisions at scale.",
      icon: TrendingUp,
      color: "emerald",
    },
  ];

  const colorMap: Record<string, string> = {
    primary: "from-primary-500 to-primary-600",
    violet: "from-violet-500 to-violet-600",
    cyan: "from-cyan-500 to-cyan-600",
    emerald: "from-emerald-400 to-emerald-500",
  };

  return (
    <section id="how-it-works" className="relative z-10" style={{ paddingTop: "160px", paddingBottom: "160px" }}>
      <div className="max-w-6xl mx-auto" style={{ margin: "0 auto", width: "100%", paddingLeft: "32px", paddingRight: "32px" }}>
        {/* Section Header */}
        <div className="text-center" style={{ marginBottom: "80px" }}>
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-6">
            <Search className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-medium text-surface-300 uppercase tracking-wider">
              How It Works
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            From Setup to <span className="gradient-text">Scale</span>
          </h2>
          <p className="text-surface-400 text-lg max-w-2xl mx-auto">
            Getting started is seamless. Our platform guides you every step of the way.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line */}
          <div className="hidden md:block absolute top-24 left-0 right-0 h-[2px] bg-gradient-to-r from-primary-500/30 via-violet-500/30 to-emerald-400/30" />

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4" style={{ gap: "48px" }}>
            {steps.map((s, i) => (
              <div key={i} className="relative text-center group">
                {/* Step Number Circle */}
                <div className="relative inline-flex" style={{ marginBottom: "32px" }}>
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${colorMap[s.color]} flex items-center justify-center transition-all duration-500 group-hover:scale-110`}>
                    <s.icon className="w-9 h-9 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-surface-800 border-2 border-surface-600 flex items-center justify-center text-xs font-bold text-surface-300">
                    {s.step}
                  </div>
                </div>
                {/* Content */}
                <h3 className="text-lg font-bold text-white" style={{ marginBottom: "12px" }}>{s.title}</h3>
                <p className="text-sm text-surface-400" style={{ lineHeight: "1.8" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================
   PRICING SECTION
   ================================================ */
function PricingSection() {
  const plans = [
    {
      name: "Starter",
      price: "$49",
      period: "/mo",
      desc: "Perfect for small businesses and startups",
      features: [
        "1 Warehouse",
        "Up to 5 Users",
        "1,000 SKUs",
        "Basic Analytics",
        "Email Support",
      ],
      cta: "Start Free Trial",
      popular: false,
      gradient: "from-surface-700 to-surface-800",
    },
    {
      name: "Professional",
      price: "$199",
      period: "/mo",
      desc: "For growing businesses with multiple locations",
      features: [
        "10 Warehouses",
        "Up to 50 Users",
        "Unlimited SKUs",
        "AI Forecasting",
        "Procurement Automation",
        "Priority Support",
        "API Access",
      ],
      cta: "Start Free Trial",
      popular: true,
      gradient: "from-primary-600 to-violet-600",
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      desc: "For global operations requiring full power",
      features: [
        "Unlimited Warehouses",
        "Unlimited Users",
        "Digital Twin Simulation",
        "Carbon & ESG Tracking",
        "Dynamic Pricing Engine",
        "Blockchain Provenance",
        "Dedicated Account Manager",
        "Custom SLA",
      ],
      cta: "Contact Sales",
      popular: false,
      gradient: "from-surface-700 to-surface-800",
    },
  ];

  return (
    <section id="pricing" className="relative z-10" style={{ paddingTop: "160px", paddingBottom: "160px" }}>
      <div className="max-w-7xl mx-auto" style={{ margin: "0 auto", width: "100%", paddingLeft: "32px", paddingRight: "32px" }}>
        {/* Section Header */}
        <div className="text-center" style={{ marginBottom: "80px" }}>
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-6">
            <Star className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-medium text-surface-300 uppercase tracking-wider">
              Simple Pricing
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Choose Your <span className="gradient-text">Plan</span>
          </h2>
          <p className="text-surface-400 text-lg max-w-2xl mx-auto">
            Start free for 14 days. No credit card required. Scale as you grow.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3" style={{ margin: "0 auto", width: "100%", gap: "40px" }}>
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-3xl transition-all duration-500 hover:-translate-y-2 ${p.popular
                ? "bg-gradient-to-br from-primary-600/20 to-violet-600/20 border border-primary-500/30 glow-primary"
                : "glass-card border border-surface-700/30"
                }`}
              style={{ padding: "48px 40px" }}
            >
              {p.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 gradient-primary text-white text-xs font-bold px-4 py-1.5 rounded-full">
                  Most Popular
                </div>
              )}
              <div style={{ marginBottom: "32px" }}>
                <h3 className="text-xl font-bold text-white" style={{ marginBottom: "8px" }}>{p.name}</h3>
                <p className="text-sm text-surface-400" style={{ lineHeight: "1.7" }}>{p.desc}</p>
              </div>
              <div style={{ marginBottom: "40px" }}>
                <span className="text-5xl font-black text-white">{p.price}</span>
                <span className="text-surface-400 text-lg">{p.period}</span>
              </div>
              <ul style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "40px" }}>
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-surface-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={`block text-center py-3.5 px-6 rounded-xl font-semibold text-sm transition-all duration-300 ${p.popular
                  ? "btn-primary w-full"
                  : "btn-outline w-full"
                  }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================
   CTA SECTION
   ================================================ */
function CtaSection() {
  return (
    <section className="relative z-10" style={{ paddingTop: "160px", paddingBottom: "160px" }}>
      <div className="max-w-4xl mx-auto text-center" style={{ margin: "0 auto", width: "100%", paddingLeft: "32px", paddingRight: "32px" }}>
        <div className="glass rounded-3xl relative overflow-hidden" style={{ padding: "80px 60px" }}>
          {/* Background glow */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary-500 rounded-full filter blur-[100px]" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-violet-500 rounded-full filter blur-[100px]" />
          </div>

          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
              Ready to Transform Your <span className="gradient-text">Supply Chain?</span>
            </h2>
            <p className="text-surface-400 text-lg mb-8 max-w-xl mx-auto">
              Join hundreds of enterprises already using NexusFlow to optimize their operations with AI-driven intelligence.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="btn-primary text-base py-3.5 px-8 flex items-center gap-3 group"
              >
                Start Your Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="#features" className="btn-outline text-base py-3.5 px-8">
                Learn More
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================
   FOOTER SECTION
   ================================================ */
function Footer() {
  return (
    <footer className="relative border-t border-surface-800/50 z-10" style={{ paddingTop: "80px", paddingBottom: "40px" }}>
      <div className="max-w-7xl mx-auto" style={{ margin: "0 auto", width: "100%", paddingLeft: "32px", paddingRight: "32px" }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4" style={{ gap: "48px", marginBottom: "64px" }}>
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
                <Boxes className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold">
                <span className="gradient-text">Nexus</span>
                <span className="text-surface-200">Flow</span>
              </span>
            </div>
            <p className="text-sm text-surface-500 leading-relaxed">
              AI-driven supply chain intelligence platform for global logistics operations.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-surface-200 mb-4 uppercase tracking-wider">Product</h4>
            <ul className="space-y-3.5 text-sm text-surface-500">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-surface-200 mb-4 uppercase tracking-wider">Resources</h4>
            <ul className="space-y-3.5 text-sm text-surface-500">
              <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-surface-200 mb-4 uppercase tracking-wider">Company</h4>
            <ul className="space-y-3.5 text-sm text-surface-500">
              <li><a href="#" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-surface-800/50 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-surface-600">
            © 2026 NexusFlow. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-xs text-surface-600">
            <a href="#" className="hover:text-surface-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-surface-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-surface-400 transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ================================================
   MAIN PAGE EXPORT
   ================================================ */
export default function LandingPage() {
  return (
    <main className="relative">
      <Navbar />
      <HeroSection />
      <MetricsBar />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <CtaSection />
      <Footer />
    </main>
  );
}
