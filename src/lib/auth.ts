/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, UserRole } from "../types";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxZzTSiTZjiY-uRCMJZHWdvV3mPG1XX8Z14NQc4KMK5NocWWnB7JJR1z-YSYhUNLnlg/exec";
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
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "addUser",
        account: identifier,
        password: password,
        role: role
      })
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error adding user:", error);
    return { success: false, message: "Lỗi kết nối máy chủ." };
  }
};

export const login = async (identifier: string, password: string): Promise<User | null> => {
  try {
    const response = await fetch(`${SCRIPT_URL}?action=login&account=${encodeURIComponent(identifier)}&password=${encodeURIComponent(password)}`);
    const result = await response.json();
    
    if (result.success) {
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
    console.error("Login error:", error);
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
