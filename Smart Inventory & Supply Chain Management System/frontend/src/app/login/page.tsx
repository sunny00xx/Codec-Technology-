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
} from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [form, setForm] = useState({ email: "", password: "" });
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!form.email || !form.password) {
            setError("Please fill in all fields");
            return;
        }
        setLoading(true);

        try {
            const res = await fetch("http://localhost:4000/api/v1/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (data.success) {
                localStorage.setItem("token", data.data.accessToken);
                localStorage.setItem("user", JSON.stringify(data.data.user));
                router.push("/dashboard");
            } else {
                setError(data.error?.message || "Invalid credentials");
            }
        } catch {
            setError("Server unavailable. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center px-4 relative" style={{ width: "100%" }}>
            {/* Background orbs */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-500/10 rounded-full filter blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-500/10 rounded-full filter blur-[100px] pointer-events-none" />

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
                    <h1 className="text-3xl font-black text-white mb-2">Welcome Back</h1>
                    <p className="text-surface-400">Sign in to your account to continue</p>
                </div>

                {/* Form Card */}
                <div className="glass-card p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Error */}
                        {error && (
                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-sm text-rose-400 text-center">
                                {error}
                            </div>
                        )}

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-surface-300 mb-2">
                                Email Address
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
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-surface-300">Password</label>
                                <a href="#" className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
                                    Forgot password?
                                </a>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                                <input
                                    type={showPw ? "text" : "password"}
                                    placeholder="Enter your password"
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

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Sign In <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-surface-700/50" />
                        <span className="text-xs text-surface-500">or</span>
                        <div className="flex-1 h-px bg-surface-700/50" />
                    </div>

                    {/* Demo Account */}
                    <button
                        className="btn-outline w-full py-3 text-sm"
                        onClick={() => {
                            setForm({ email: "admin@demo.com", password: "admin123" });
                        }}
                    >
                        Use Demo Account
                    </button>
                </div>

                {/* Register link */}
                <p className="text-center mt-6 text-sm text-surface-500">
                    Don&apos;t have an account?{" "}
                    <Link href="/register" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                        Create one
                    </Link>
                </p>
            </div>
        </div>
    );
}
