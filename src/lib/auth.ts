/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, UserRole } from "../types";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyhJzkafJxxUKcHEqPCVzuTm9kFruWj_ixmsdBSPRXERvbI4t0VruuyetvKeSGlPjcP/exec";
const SESSION_KEY = "app_session";

export const initAuth = () => {
  // No local initialization needed for Google Sheet
};

export const getUsers = async (): Promise<User[]> => {
  try {
    const response = await fetch(`${SCRIPT_URL}?action=getUsers`);
    const data = await response.json();
    return data.map((u: any) => ({
      id: u.id,
      email: u.account,
      role: u.role,
      createdAt: new Date().toISOString(), // Mocking date since it's not in sheet
    }));
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};

export const addUser = async (identifier: string, password: string, role: UserRole = "user"): Promise<{ success: boolean; message: string }> => {
  try {
    // Chuyển sang GET để tránh lỗi CORS Preflight
    const url = `${SCRIPT_URL}?action=addUser&account=${encodeURIComponent(identifier.trim())}&password=${encodeURIComponent(password.trim())}&role=${encodeURIComponent(role)}`;
    const response = await fetch(url, { method: 'GET', cache: 'no-cache' });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Lỗi thêm người dùng:", error);
    return { success: false, message: "Không thể kết nối với máy chủ Google Sheet." };
  }
};

export const login = async (identifier: string, password: string): Promise<User | null> => {
  const cleanId = identifier.trim().toLowerCase();
  const cleanPass = password.trim();

  // 1. Tài khoản Admin mặc định (Dự phòng ưu tiên)
  if (cleanId === "cosogiaoduchoanggia269@gmail.com" && cleanPass === "Laichau@123") {
    const adminUser: User = {
      id: "default-admin",
      email: "cosogiaoduchoanggia269@gmail.com",
      role: "admin",
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(adminUser));
    return adminUser;
  }

  try {
    const url = `${SCRIPT_URL}?action=login&account=${encodeURIComponent(cleanId)}&password=${encodeURIComponent(cleanPass)}`;
    
    // Đơn giản hóa fetch để tránh lỗi CORS
    const response = await fetch(url, { method: 'GET', cache: 'no-cache' });
    
    if (!response.ok) {
      console.error("Lỗi kết nối script:", response.status);
      return null;
    }

    const result = await response.json();
    
    if (result && result.success) {
      const sessionUser: User = {
        id: result.user.id,
        email: result.user.account,
        role: result.user.role,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
      return sessionUser;
    }
  } catch (error) {
    console.error("Lỗi đăng nhập hệ thống:", error);
  }
  return null;
};

export const logout = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const getCurrentUser = (): User | null => {
  const session = localStorage.getItem(SESSION_KEY);
  return session ? JSON.parse(session) : null;
};
