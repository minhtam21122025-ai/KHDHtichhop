/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Sparkles, Lock, Mail, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { login } from "../lib/auth";
import { User } from "../types";

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const user = await login(identifier, password);
      if (user) {
        onLoginSuccess(user);
      } else {
        setError("Email/Số điện thoại hoặc mật khẩu không chính xác.");
      }
    } catch (err) {
      setError("Đã xảy ra lỗi khi kết nối máy chủ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-500 flex items-center justify-center p-4" id="login-page">
      <div className="max-w-md w-full bg-white/95 backdrop-blur-md rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden animate-in fade-in zoom-in duration-500">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-10 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
            <Sparkles className="w-full h-full scale-150 rotate-12 animate-pulse" />
          </div>
          <div className="relative z-10">
            <div className="bg-white/20 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md shadow-inner border border-white/30">
              <Sparkles className="w-10 h-10 text-white drop-shadow-lg" />
            </div>
            <h1 className="text-2xl font-black leading-tight tracking-tight">
              Hệ thống tạo năng lực số và năng lực AI cho giáo viên THCS
            </h1>
            <p className="text-blue-100 text-sm mt-3 font-medium opacity-90">Đăng nhập để bắt đầu kiến tạo giáo án</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email hoặc Số điện thoại</label>
              <div className="relative group">
                <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Email hoặc Số điện thoại"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 focus:bg-white outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Mật khẩu bảo mật</label>
              <div className="relative group">
                <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 focus:bg-white outline-none transition-all shadow-sm"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 items-center text-red-700 text-sm font-bold animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-200 hover:shadow-blue-300 hover:scale-[1.02] transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70 disabled:hover:scale-100"
          >
            {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : (
              <>
                Đăng nhập ngay
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          <div className="pt-6 border-t border-slate-100 text-center space-y-4">
            <div className="flex flex-col items-center gap-1">
              <p className="text-xs font-bold text-slate-600">Bản quyền: Đào Minh Tâm</p>
              <a 
                href="https://zalo.me/0366000555" 
                target="_blank" 
                rel="noreferrer"
                className="text-[10px] font-black text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
              >
                Zalo: 0366000555
              </a>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
