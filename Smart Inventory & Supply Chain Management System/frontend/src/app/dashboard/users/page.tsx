"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
    Shield, Plus, Edit2, Trash2, Users, CheckCircle, X, Save, RefreshCw,
    AlertTriangle, UserCheck, UserX, Key, Search, ChevronDown, Lock
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
function getToken() { return typeof window !== "undefined" ? localStorage.getItem("token") || "" : ""; }
async function apiFetch(path: string, options: RequestInit = {}) {
    const r = await fetch(`${API}${path}`, { ...options, headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...options.headers } });
    return r.json();
}

function Modal({ open, title, onClose, children, wide }: any) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative z-10 w-full ${wide ? "max-w-3xl" : "max-w-lg"} mx-4 glass-strong rounded-2xl shadow-2xl overflow-hidden animate-slide-up`}>
                <div className="flex items-center justify-between p-6 border-b border-surface-700/50">
                    <h2 className="text-lg font-bold text-white">{title}</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-700/50 text-surface-400 hover:text-white transition-all"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
            </div>
        </div>
    );
}

// ── Permission Matrix Editor ─────────────────────────────────
function PermissionMatrix({ permissions, allPerms, onChange }: { permissions: Record<string, any>; allPerms: Record<string, any>; onChange: (p: Record<string, any>) => void }) {
    const toggleAction = (module: string, action: string) => {
        const current = { ...permissions };
        if (!current[module]) current[module] = [];
        if (!Array.isArray(current[module])) current[module] = [];
        const idx = current[module].indexOf(action);
        if (idx >= 0) current[module].splice(idx, 1);
        else current[module].push(action);
        if (current[module].length === 0) delete current[module];
        onChange(current);
    };

    const toggleModule = (module: string, actions: string[]) => {
        const current = { ...permissions };
        const has = current[module] && Array.isArray(current[module]) && current[module].length === actions.length;
        if (has) delete current[module];
        else current[module] = [...actions];
        onChange(current);
    };

    return (
        <div className="space-y-1">
            <div className="grid grid-cols-[160px_1fr] gap-2 text-[10px] font-bold text-surface-500 uppercase tracking-wider mb-2 px-1">
                <span>Module</span><span>Permissions</span>
            </div>
            {Object.entries(allPerms).map(([mod, config]: [string, any]) => {
                const modPerms = Array.isArray(permissions[mod]) ? permissions[mod] : [];
                const allChecked = modPerms.length === config.actions.length;
                return (
                    <div key={mod} className="grid grid-cols-[160px_1fr] gap-2 items-center py-2 px-1 rounded-lg hover:bg-surface-800/30 transition-all">
                        <button onClick={() => toggleModule(mod, config.actions)} className="flex items-center gap-2 text-left">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${allChecked ? "bg-primary-500 border-primary-500" : "border-surface-600"}`}>
                                {allChecked && <CheckCircle className="w-3 h-3 text-white" />}
                            </div>
                            <span className="text-sm font-medium text-white">{config.label}</span>
                        </button>
                        <div className="flex flex-wrap gap-1.5">
                            {config.actions.map((act: string) => {
                                const active = modPerms.includes(act);
                                return (
                                    <button key={act} onClick={() => toggleAction(mod, act)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all ${active ? "bg-primary-500/20 text-primary-400 border border-primary-500/30" : "bg-surface-800/40 text-surface-500 border border-surface-700/30 hover:text-surface-300"}`}>
                                        {act.replace(/_/g, " ")}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function UsersPage() {
    const [tab, setTab] = useState<"users" | "roles" | "audit">("users");
    const [roles, setRoles] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [allPerms, setAllPerms] = useState<Record<string, any>>({});
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [roleModal, setRoleModal] = useState(false);
    const [editRole, setEditRole] = useState<any>(null);
    const [assignModal, setAssignModal] = useState<any>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

    const showToast = (msg: string, type: "success" | "error" = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [rRes, uRes, pRes, aRes] = await Promise.all([
            apiFetch("/rbac/roles"),
            apiFetch(`/rbac/users?search=${search}`),
            apiFetch("/rbac/permissions"),
            apiFetch("/analytics/audit-logs?limit=50"),
        ]);
        if (rRes.success) setRoles(rRes.data || []);
        if (uRes.success) setUsers(uRes.data || []);
        if (pRes.success) setAllPerms(pRes.data || {});
        if (aRes.success) setAuditLogs(aRes.data || []);
        setLoading(false);
    }, [search]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleCreateRole = async (name: string, description: string, permissions: any) => {
        const res = await apiFetch("/rbac/roles", { method: "POST", body: JSON.stringify({ name, description, permissions }) });
        if (res.success) { showToast("Role created!"); setRoleModal(false); fetchAll(); }
        else showToast(res.error?.message || "Failed", "error");
    };

    const handleUpdateRole = async (id: string, name: string, description: string, permissions: any) => {
        const res = await apiFetch(`/rbac/roles/${id}`, { method: "PUT", body: JSON.stringify({ name, description, permissions }) });
        if (res.success) { showToast("Role updated!"); setEditRole(null); fetchAll(); }
        else showToast(res.error?.message || "Failed", "error");
    };

    const handleDeleteRole = async (id: string) => {
        if (!id) return;
        const res = await apiFetch(`/rbac/roles/${id}`, { method: "DELETE" });
        if (res.success) { showToast("Role deleted!"); fetchAll(); }
        else showToast(res.error?.message || "Failed", "error");
        setDeleteConfirm(null);
    };

    const handleAssignRole = async (userId: string, roleId: string) => {
        if (!userId || !roleId) return;
        const res = await apiFetch(`/rbac/users/${userId}/role`, { method: "PUT", body: JSON.stringify({ role_id: roleId }) });
        if (res.success) { showToast("Role assigned!"); setAssignModal(null); fetchAll(); }
        else showToast(res.error?.message || "Failed", "error");
    };

    const handleToggleUser = async (userId: string, isActive: boolean) => {
        if (!userId) return;
        const res = await apiFetch(`/rbac/users/${userId}/status`, { method: "PUT", body: JSON.stringify({ is_active: !isActive }) });
        if (res.success) { showToast(`User ${isActive ? "deactivated" : "activated"}!`); fetchAll(); }
        else showToast(res.error?.message || "Failed", "error");
    };

    const tabs = [
        { id: "users", label: "Users", icon: Users },
        { id: "roles", label: "Roles", icon: Shield },
        { id: "audit", label: "Audit Log", icon: Key },
    ];

    return (
        <div className="space-y-6">
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl animate-slide-up text-sm font-medium ${toast.type === "success" ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300" : "bg-red-500/20 border border-red-500/30 text-red-300"}`}>
                    {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    {toast.msg}
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white">Users & Roles</h1>
                        <p className="text-surface-500 text-sm">RBAC management & audit trail</p>
                    </div>
                </div>
                {tab === "roles" && (
                    <button onClick={() => setRoleModal(true)} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> New Role</button>
                )}
            </div>

            <div className="flex items-center gap-1 glass rounded-xl p-1 w-fit">
                {tabs.map((t) => (
                    <button key={t.id} onClick={() => setTab(t.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-primary-500/20 text-primary-400" : "text-surface-500 hover:text-surface-300"}`}>
                        <t.icon className="w-4 h-4" />{t.label}
                    </button>
                ))}
            </div>

            {/* ── USERS TAB ── */}
            {tab === "users" && (
                <div className="space-y-4">
                    <div className="flex items-center glass rounded-xl px-4 py-2.5 gap-3 max-w-md">
                        <Search className="w-4 h-4 text-surface-500" />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..."
                            className="bg-transparent border-none outline-none text-sm text-white placeholder:text-surface-500 w-full" />
                    </div>
                    <div className="glass-card overflow-hidden">
                        <table className="w-full">
                            <thead><tr className="border-b border-surface-700/50">
                                {["User", "Email", "Role", "Status", "Last Login", "Actions"].map((h) => (
                                    <th key={h} className={`px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider ${["Last Login"].includes(h) ? "hidden md:table-cell" : ""}`}>{h}</th>
                                ))}
                            </tr></thead>
                            <tbody className="divide-y divide-surface-700/30">
                                {(users || []).filter(Boolean).map((u) => (
                                    <tr key={u?.id || Math.random()} className="hover:bg-surface-800/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white text-xs font-bold">
                                                    {u.full_name?.charAt(0)?.toUpperCase() || "U"}
                                                </div>
                                                <span className="text-sm font-medium text-white">{u.full_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3"><span className="text-sm text-surface-400">{u.email}</span></td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.role_name ? "bg-primary-500/10 text-primary-400" : "bg-surface-700/30 text-surface-500"}`}>
                                                {u.role_name || "No Role"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.is_active ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400"}`}>
                                                {u.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            <span className="text-xs text-surface-500">{u.last_login ? new Date(u.last_login).toLocaleDateString() : "Never"}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => u?.id && setAssignModal(u)} className="p-1.5 rounded-lg hover:bg-primary-500/10 text-surface-500 hover:text-primary-400 transition-all" title="Assign Role">
                                                    <Key className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => u?.id && handleToggleUser(u.id, u.is_active)} className={`p-1.5 rounded-lg transition-all ${u.is_active ? "hover:bg-red-500/10 text-surface-500 hover:text-red-400" : "hover:bg-emerald-400/10 text-surface-500 hover:text-emerald-400"}`} title={u.is_active ? "Deactivate" : "Activate"}>
                                                    {u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── ROLES TAB ── */}
            {tab === "roles" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(roles || []).filter(Boolean).map((role) => {
                        const permCount = Object.values(role.permissions || {}).flat().length;
                        return (
                            <div key={role?.id || Math.random()} className={`glass-card p-5 ${role.is_system ? "border-primary-500/20" : ""}`}>
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${role.is_system ? "bg-gradient-to-br from-primary-500 to-violet-600" : "bg-surface-700/50"}`}>
                                            {role.is_system ? <Shield className="w-4 h-4 text-white" /> : <Lock className="w-4 h-4 text-surface-400" />}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-white">{role.name}</h3>
                                            {role.is_system && <span className="text-[10px] text-primary-400 font-semibold">System Role</span>}
                                        </div>
                                    </div>
                                </div>
                                {role.description && <p className="text-xs text-surface-500 mb-3">{role.description}</p>}
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs text-surface-400">{permCount} permissions</span>
                                    <span className="text-xs text-surface-400">{role.user_count} user{role.user_count !== 1 ? "s" : ""}</span>
                                </div>
                                <div className="flex flex-wrap gap-1 mb-3">
                                    {Object.keys(role.permissions || {}).slice(0, 5).map((mod) => (
                                        <span key={mod} className="text-[10px] bg-surface-700/40 text-surface-400 px-2 py-0.5 rounded-lg capitalize">{mod}</span>
                                    ))}
                                    {Object.keys(role.permissions || {}).length > 5 && <span className="text-[10px] text-surface-600">+{Object.keys(role.permissions).length - 5}</span>}
                                </div>
                                {!role.is_system && (
                                    <div className="flex gap-1 border-t border-surface-700/30 pt-3">
                                        <button onClick={() => setEditRole(role)} className="flex-1 py-2 text-xs text-surface-400 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-all flex items-center justify-center gap-1">
                                            <Edit2 className="w-3.5 h-3.5" /> Edit
                                        </button>
                                        <button onClick={() => setDeleteConfirm(role)} className="flex-1 py-2 text-xs text-surface-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all flex items-center justify-center gap-1">
                                            <Trash2 className="w-3.5 h-3.5" /> Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── AUDIT TAB ── */}
            {tab === "audit" && (
                <div className="glass-card overflow-hidden">
                    {auditLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <Key className="w-12 h-12 text-surface-600 mb-3" />
                            <p className="text-surface-400 text-sm">No audit logs yet.</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead><tr className="border-b border-surface-700/50">
                                {["Timestamp", "User", "Action", "Entity", "Entity ID"].map((h) => (
                                    <th key={h} className={`px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider ${h === "Entity ID" ? "hidden md:table-cell" : ""}`}>{h}</th>
                                ))}
                            </tr></thead>
                            <tbody className="divide-y divide-surface-700/30">
                                {(auditLogs || []).filter(Boolean).map((log) => (
                                    <tr key={log?.id || Math.random()} className="hover:bg-surface-800/30 transition-colors">
                                        <td className="px-4 py-3"><span className="text-xs text-surface-400">{new Date(log.created_at).toLocaleString()}</span></td>
                                        <td className="px-4 py-3"><span className="text-sm text-white">{log.user_name || "System"}</span></td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${log.action === "DELETE" ? "bg-red-400/10 text-red-400" : log.action === "CREATE" ? "bg-emerald-400/10 text-emerald-400" : "bg-amber-400/10 text-amber-400"}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3"><span className="text-xs text-surface-400 capitalize">{log.entity}</span></td>
                                        <td className="px-4 py-3 hidden md:table-cell"><span className="text-[10px] font-mono text-surface-600">{log.entity_id?.slice(0, 12)}…</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* MODALS */}
            <Modal open={roleModal} title="Create New Role" onClose={() => setRoleModal(false)} wide>
                <RoleForm allPerms={allPerms} onSubmit={(n, d, p) => handleCreateRole(n, d, p)} />
            </Modal>
            <Modal open={!!editRole} title={`Edit Role: ${editRole?.name}`} onClose={() => setEditRole(null)} wide>
                {editRole && <RoleForm initial={editRole} allPerms={allPerms} onSubmit={(n, d, p) => handleUpdateRole(editRole.id, n, d, p)} />}
            </Modal>
            <Modal open={!!assignModal} title={`Assign Role — ${assignModal?.full_name}`} onClose={() => setAssignModal(null)}>
                {assignModal && <AssignRoleForm user={assignModal} roles={roles} onAssign={handleAssignRole} />}
            </Modal>
            <Modal open={!!deleteConfirm} title="Delete Role" onClose={() => setDeleteConfirm(null)}>
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto"><Trash2 className="w-8 h-8 text-red-400" /></div>
                    <p className="text-white">Delete role <strong>{deleteConfirm?.name}</strong>?</p>
                    <p className="text-xs text-surface-400">Roles with assigned users cannot be deleted.</p>
                    <div className="flex gap-3">
                        <button onClick={() => setDeleteConfirm(null)} className="flex-1 btn-outline py-2.5 text-sm">Cancel</button>
                        <button onClick={() => deleteConfirm?.id && handleDeleteRole(deleteConfirm.id)} className="flex-1 py-2.5 text-sm rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-semibold">Delete</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

function RoleForm({ initial, allPerms, onSubmit }: { initial?: any; allPerms: Record<string, any>; onSubmit: (n: string, d: string, p: any) => void }) {
    const [name, setName] = useState(initial?.name || "");
    const [description, setDescription] = useState(initial?.description || "");
    const [permissions, setPermissions] = useState<Record<string, any>>(initial?.permissions || {});
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Role Name *</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Warehouse Manager"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wide">Description</label>
                    <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description"
                        className="w-full bg-surface-800/60 border border-surface-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/60" />
                </div>
            </div>
            <div>
                <label className="block text-xs font-semibold text-surface-400 mb-2 uppercase tracking-wide">Permission Matrix</label>
                <div className="glass p-4 rounded-xl max-h-96 overflow-y-auto">
                    <PermissionMatrix permissions={permissions} allPerms={allPerms} onChange={setPermissions} />
                </div>
            </div>
            <button onClick={() => onSubmit(name, description, permissions)} disabled={!name} className="w-full btn-primary flex items-center justify-center gap-2 py-3">
                <Save className="w-4 h-4" /> {initial ? "Update Role" : "Create Role"}
            </button>
        </div>
    );
}

function AssignRoleForm({ user, roles, onAssign }: { user: any; roles: any[]; onAssign: (userId: string, roleId: string) => void }) {
    const [selectedRole, setSelectedRole] = useState(user.role_id || "");
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 glass rounded-xl">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white font-bold">
                    {user.full_name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div>
                    <p className="text-sm font-bold text-white">{user.full_name}</p>
                    <p className="text-xs text-surface-400">{user.email}</p>
                </div>
            </div>
            <div>
                <label className="block text-xs font-semibold text-surface-400 mb-2 uppercase tracking-wide">Select Role</label>
                <div className="space-y-2">
                    {(roles || []).filter(Boolean).map((role) => (
                        <button key={role?.id || Math.random()} onClick={() => setSelectedRole(role?.id || "")}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${selectedRole === role.id ? "border-primary-500/50 bg-primary-500/10" : "border-surface-700/30 hover:border-surface-600"}`}>
                            <Shield className={`w-4 h-4 ${selectedRole === role.id ? "text-primary-400" : "text-surface-500"}`} />
                            <div>
                                <p className={`text-sm font-medium ${selectedRole === role.id ? "text-white" : "text-surface-300"}`}>{role.name}</p>
                                <p className="text-xs text-surface-500">{Object.values(role.permissions || {}).flat().length} permissions</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
            <button onClick={() => onAssign(user.id, selectedRole)} disabled={!selectedRole} className="w-full btn-primary flex items-center justify-center gap-2 py-3">
                <Save className="w-4 h-4" /> Assign Role
            </button>
        </div>
    );
}
