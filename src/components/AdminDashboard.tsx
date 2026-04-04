/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { UserPlus, Mail, Lock, CheckCircle2, AlertCircle, Users, Loader2, Trash2, Edit2, X, Save } from "lucide-react";
import { addUser, getUsers, deleteUser, updateUser } from "../lib/auth";
import { User, UserRole } from "../types";

export const AdminDashboard: React.FC = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // State for editing
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editIdentifier, setEditIdentifier] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("user");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    const data = await getUsers();
    setUsers(data);
    setIsLoading(false);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    const result = await addUser(identifier, password, role);
    
    if (result.success) {
      setMessage({ type: "success", text: result.message });
      setIdentifier("");
      setPassword("");
      setRole("user");
      await loadUsers();
    } else {
      setMessage({ type: "error", text: result.message });
    }

    setIsAdding(false);
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const handleDeleteUser = async (userEmail: string) => {
    if (confirmDelete !== userEmail) {
      setConfirmDelete(userEmail);
      setTimeout(() => setConfirmDelete(null), 3000); // Reset after 3 seconds
      return;
    }
    
    setIsDeleting(userEmail);
    const result = await deleteUser(userEmail);
    
    if (result.success) {
      setMessage({ type: "success", text: result.message });
      setConfirmDelete(null);
      await loadUsers();
    } else {
      setMessage({ type: "error", text: result.message });
    }
    
    setIsDeleting(null);
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setEditIdentifier(user.email || "");
    setEditPassword(""); // Don't show old password
    setEditRole(user.role);
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditIdentifier("");
    setEditPassword("");
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsUpdating(true);
    const result = await updateUser(
      editingUser.email || "",
      editIdentifier,
      editPassword || undefined,
      editRole
    );

    if (result.success) {
      setMessage({ type: "success", text: result.message });
      setEditingUser(null);
      await loadUsers();
    } else {
      setMessage({ type: "error", text: result.message });
    }

    setIsUpdating(false);
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500" id="admin-dashboard">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-red-100 p-2 rounded-lg">
            <UserPlus className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Thêm tài khoản người dùng</h2>
            <p className="text-sm text-slate-500">Cấp quyền truy cập cho giáo viên mới</p>
          </div>
        </div>

        <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email hoặc Số điện thoại</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Email hoặc Số điện thoại"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mật khẩu</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quyền hạn</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
            >
              <option value="user">Người dùng (User)</option>
              <option value="admin">Quản trị viên (Admin)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isAdding}
            className="h-[42px] bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Tạo tài khoản
          </button>
        </form>

        {message.text && (
          <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-2 ${
            message.type === "success" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
          }`}>
            {message.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-slate-400" />
            <h3 className="font-bold text-slate-800">Danh sách người dùng</h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-xs font-bold text-slate-500">
            {users.length} thành viên
          </span>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm font-medium">Đang tải danh sách...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tài khoản (Email/SĐT)</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vai trò</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      {editingUser?.id === user.id ? (
                        <input
                          type="text"
                          value={editIdentifier}
                          onChange={(e) => setEditIdentifier(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-500"
                        />
                      ) : (
                        <span className="text-sm font-medium text-slate-700">{user.email || user.phone}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingUser?.id === user.id ? (
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value as UserRole)}
                          className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          user.role === "admin" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                        }`}>
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {editingUser?.id === user.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="password"
                            placeholder="Mật khẩu mới (để trống nếu không đổi)"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            className="w-40 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-500"
                          />
                          <button
                            onClick={handleUpdateUser}
                            disabled={isUpdating}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Lưu"
                          >
                            {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Hủy"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.email || user.phone || "")}
                            disabled={isDeleting === (user.email || user.phone)}
                            className={`p-2 rounded-lg transition-all flex items-center gap-1 ${
                              confirmDelete === (user.email || user.phone)
                                ? "bg-red-600 text-white px-3"
                                : "text-red-600 hover:bg-red-50"
                            }`}
                            title={confirmDelete === (user.email || user.phone) ? "Nhấn lần nữa để xóa" : "Xóa"}
                          >
                            {isDeleting === (user.email || user.phone) ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : confirmDelete === (user.email || user.phone) ? (
                              <>
                                <Trash2 className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase">Xác nhận?</span>
                              </>
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
