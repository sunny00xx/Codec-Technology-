"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Boxes,
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    Loader2,
    Building2,
    User,
} from "lucide-react";

export default function RegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState({
        organizationName: "",
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!form.organizationName || !form.fullName || !form.email || !form.password) {
            setError("Please fill in all fields");
            return;
        }
        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (form.password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("http://localhost:4000/api/v1/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    organizationName: form.organizationName,
                    fullName: form.fullName,
                    email: form.email,
                    password: form.password,
                }),
            });
            const data = await res.json();
            if (data.success) {
                localStorage.setItem("token", data.data.accessToken);
                localStorage.setItem("user", JSON.stringify(data.data.user));
                router.push("/dashboard");
            } else {
                setError(data.error?.message || "Registration failed");
            }
        } catch {
            setError("Server unavailable. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center px-4 py-12 relative" style={{ width: "100%" }}>
            {/* Background orbs */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-violet-500/10 rounded-full filter blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-cyan-500/8 rounded-full filter blur-[100px] pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center glow-primary">
                            <Boxes className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold">
                            <span className="gradient-text">Nexus</span>
                            <span className="text-surface-200">Flow</span>
                        </span>
                    </Link>
                    <h1 className="text-3xl font-black text-white mb-2">Create Account</h1>
                    <p className="text-surface-400">Start your 14-day free trial — no credit card required</p>
                </div>

                {/* Form Card */}
                <div className="glass-card p-8">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-sm text-rose-400 text-center">
                                {error}
                            </div>
                        )}

                        {/* Organization */}
                        <div>
                            <label className="block text-sm font-medium text-surface-300 mb-2">
                                Organization Name
                            </label>
                            <div className="relative">
                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                                <input
                                    type="text"
                                    placeholder="Acme Corporation"
                                    className="input-field"
                                    style={{ paddingLeft: "44px" }}
                                    value={form.organizationName}
                                    onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-medium text-surface-300 mb-2">
                                Full Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                                <input
                                    type="text"
                                    placeholder="John Doe"
                                    className="input-field"
                                    style={{ paddingLeft: "44px" }}
                                    value={form.fullName}
                                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-surface-300 mb-2">
                                Work Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                                <input
                                    type="email"
                                    placeholder="you@company.com"
                                    className="input-field"
                                    style={{ paddingLeft: "44px" }}
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-surface-300 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                                <input
                                    type={showPw ? "text" : "password"}
                                    placeholder="Min 6 characters"
                                    className="input-field"
                                    style={{ paddingLeft: "44px", paddingRight: "44px" }}
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                />
                                <button
                                    type="button"
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors"
                                    onClick={() => setShowPw(!showPw)}
                                >
                                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-surface-300 mb-2">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                                <input
                                    type="password"
                                    placeholder="Repeat your password"
                                    className="input-field"
                                    style={{ paddingLeft: "44px" }}
                                    value={form.confirmPassword}
                                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Create Account <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Terms */}
                    <p className="text-xs text-surface-500 text-center mt-4">
                        By creating an account, you agree to our{" "}
                        <a href="#" className="text-primary-400 hover:underline">Terms</a> and{" "}
                        <a href="#" className="text-primary-400 hover:underline">Privacy Policy</a>.
                    </p>
                </div>

                {/* Login link */}
                <p className="text-center mt-6 text-sm text-surface-500">
                    Already have an account?{" "}
                    <Link href="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
