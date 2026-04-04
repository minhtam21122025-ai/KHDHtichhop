/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, UserRole } from "../types";

const USERS_KEY = "app_users";
const SESSION_KEY = "app_session";

// Default admin account
const DEFAULT_ADMIN: User = {
  id: "admin-1",
  email: "cosogiaoduchoanggia269@gmail.com",
  password: "Laichau@123",
  role: "admin",
  createdAt: new Date().toISOString(),
};

export const initAuth = () => {
  const storedUsers = localStorage.getItem(USERS_KEY);
  if (!storedUsers) {
    localStorage.setItem(USERS_KEY, JSON.stringify([DEFAULT_ADMIN]));
  }
};

export const getUsers = (): User[] => {
  const storedUsers = localStorage.getItem(USERS_KEY);
  return storedUsers ? JSON.parse(storedUsers) : [DEFAULT_ADMIN];
};

export const addUser = (identifier: string, password: string, role: UserRole = "user"): { success: boolean; message: string } => {
  const users = getUsers();
  const isEmail = identifier.includes("@");
  
  if (users.find((u) => (isEmail ? u.email === identifier : u.phone === identifier))) {
    return { success: false, message: `${isEmail ? "Email" : "Số điện thoại"} đã tồn tại.` };
  }

  const newUser: User = {
    id: Math.random().toString(36).substring(2, 9),
    ...(isEmail ? { email: identifier } : { phone: identifier }),
    password,
    role,
    createdAt: new Date().toISOString(),
  };

  localStorage.setItem(USERS_KEY, JSON.stringify([...users, newUser]));
  return { success: true, message: "Thêm người dùng thành công." };
};

export const login = (identifier: string, password: string): User | null => {
  const users = getUsers();
  const user = users.find((u) => 
    (u.email === identifier || u.phone === identifier) && u.password === password
  );
  if (user) {
    const sessionUser = { ...user };
    delete sessionUser.password; // Don't store password in session
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    return sessionUser;
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
