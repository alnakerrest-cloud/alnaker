import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

export type AdminRole = "OWNER" | "ADMIN" | "EDITOR" | "ORDERS_STAFF";

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  role: AdminRole;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SanitizedUser {
  id: string;
  email: string;
  displayName: string;
  role: AdminRole;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredSession {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
}

const USERS_DIR = path.join(process.cwd(), "data", "users");
const USERS_FILE = path.join(USERS_DIR, "users.json");
const SESSIONS_FILE = path.join(USERS_DIR, "sessions.json");

function ensureStorageDir() {
  if (!fs.existsSync(USERS_DIR)) {
    fs.mkdirSync(USERS_DIR, { recursive: true });
  }
}

function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    ensureStorageDir();
    if (!fs.existsSync(filePath)) {
      writeJsonFile(filePath, defaultValue);
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch (err) {
    console.error(`[users-store] Error reading ${filePath}:`, err);
    return defaultValue;
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  ensureStorageDir();
  const tmpFile = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmpFile, filePath);
}

function sanitizeUser(u: StoredUser): SanitizedUser {
  const { passwordHash, ...rest } = u;
  return rest;
}

function loadUsers(): StoredUser[] {
  return readJsonFile<StoredUser[]>(USERS_FILE, []);
}

function saveUsers(users: StoredUser[]): void {
  writeJsonFile(USERS_FILE, users);
}

function loadSessions(): StoredSession[] {
  const sessions = readJsonFile<StoredSession[]>(SESSIONS_FILE, []);
  const now = new Date();
  const active = sessions.filter((s) => new Date(s.expiresAt) > now);
  if (active.length !== sessions.length) {
    saveSessions(active);
  }
  return active;
}

function saveSessions(sessions: StoredSession[]): void {
  writeJsonFile(SESSIONS_FILE, sessions);
}

/* ========================================================================= */
/* User Operations                                                           */
/* ========================================================================= */

export function findUserByEmail(email: string): StoredUser | null {
  const users = loadUsers();
  const normalized = email.trim().toLowerCase();
  return users.find((u) => u.email.toLowerCase() === normalized) || null;
}

export function findUserById(id: string): StoredUser | null {
  const users = loadUsers();
  return users.find((u) => u.id === id) || null;
}

export function listSanitizedUsers(): SanitizedUser[] {
  const users = loadUsers();
  return users.map(sanitizeUser).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function createUser(params: {
  email: string;
  password: string;
  displayName: string;
  role: AdminRole;
  mustChangePassword?: boolean;
}): Promise<SanitizedUser> {
  const users = loadUsers();
  const normalized = params.email.trim().toLowerCase();

  if (users.some((u) => u.email.toLowerCase() === normalized)) {
    throw new Error("البريد الإلكتروني مسجل بالفعل لمستخدم آخر");
  }

  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(params.password, 12);

  const newUser: StoredUser = {
    id: `usr-${crypto.randomUUID()}`,
    email: normalized,
    passwordHash,
    displayName: params.displayName.trim(),
    role: params.role,
    isActive: true,
    mustChangePassword: Boolean(params.mustChangePassword),
    createdAt: now,
    updatedAt: now,
  };

  users.push(newUser);
  saveUsers(users);
  return sanitizeUser(newUser);
}

export async function updateUser(
  id: string,
  params: {
    displayName?: string;
    role?: AdminRole;
    isActive?: boolean;
    mustChangePassword?: boolean;
    newPassword?: string;
  }
): Promise<SanitizedUser> {
  const users = loadUsers();
  const user = users.find((u) => u.id === id);
  if (!user) {
    throw new Error("المستخدم غير موجود");
  }

  // Prevent disabling or demoting the last active OWNER/ADMIN
  if (
    (params.isActive === false || (params.role && params.role !== "OWNER" && params.role !== "ADMIN")) &&
    (user.role === "OWNER" || user.role === "ADMIN") &&
    user.isActive
  ) {
    const activeAdminsCount = users.filter(
      (u) => (u.role === "OWNER" || u.role === "ADMIN") && u.isActive && u.id !== id
    ).length;
    if (activeAdminsCount === 0) {
      throw new Error("لا يمكن تعطيل أو تغيير دور مسؤول النظام النشط الوحيد في النظام");
    }
  }

  if (params.displayName !== undefined) user.displayName = params.displayName.trim();
  if (params.role !== undefined) user.role = params.role;
  if (params.isActive !== undefined) {
    user.isActive = params.isActive;
    if (!params.isActive) {
      revokeAllUserSessions(id);
    }
  }
  if (params.mustChangePassword !== undefined) user.mustChangePassword = params.mustChangePassword;

  if (params.newPassword) {
    user.passwordHash = await bcrypt.hash(params.newPassword, 12);
    user.mustChangePassword = false;
    revokeAllUserSessions(id);
  }

  user.updatedAt = new Date().toISOString();
  saveUsers(users);
  return sanitizeUser(user);
}

export function deleteUser(id: string): { success: boolean; error?: string } {
  const users = loadUsers();
  const user = users.find((u) => u.id === id);
  if (!user) return { success: false, error: "المستخدم غير موجود" };

  if (user.role === "OWNER" || user.role === "ADMIN") {
    const remainingAdmins = users.filter(
      (u) => (u.role === "OWNER" || u.role === "ADMIN") && u.isActive && u.id !== id
    );
    if (remainingAdmins.length === 0) {
      return { success: false, error: "لا يمكن حذف المسؤول النشط الوحيد في النظام" };
    }
  }

  const updated = users.filter((u) => u.id !== id);
  saveUsers(updated);
  revokeAllUserSessions(id);
  return { success: true };
}

export function touchLastLogin(id: string): void {
  const users = loadUsers();
  const user = users.find((u) => u.id === id);
  if (user) {
    user.lastLoginAt = new Date().toISOString();
    saveUsers(users);
  }
}

/* ========================================================================= */
/* Session Operations                                                        */
/* ========================================================================= */

export function createStoreSession(userId: string, tokenHash: string, expiresAt: Date): StoredSession {
  const sessions = loadSessions();
  const newSession: StoredSession = {
    id: `sess-${crypto.randomUUID()}`,
    userId,
    tokenHash,
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
  };
  sessions.push(newSession);
  saveSessions(sessions);
  return newSession;
}

export function findSessionByTokenHash(tokenHash: string): { session: StoredSession; user: StoredUser } | null {
  const sessions = loadSessions();
  const session = sessions.find((s) => s.tokenHash === tokenHash);
  if (!session) return null;

  if (new Date(session.expiresAt) < new Date()) {
    saveSessions(sessions.filter((s) => s.id !== session.id));
    return null;
  }

  const user = findUserById(session.userId);
  if (!user || !user.isActive) {
    saveSessions(sessions.filter((s) => s.id !== session.id));
    return null;
  }

  return { session, user };
}

export function deleteSessionByTokenHash(tokenHash: string): boolean {
  const sessions = loadSessions();
  const remaining = sessions.filter((s) => s.tokenHash !== tokenHash);
  const deleted = remaining.length !== sessions.length;
  if (deleted) saveSessions(remaining);
  return deleted;
}

export function revokeAllUserSessions(userId: string): number {
  const sessions = loadSessions();
  const remaining = sessions.filter((s) => s.userId !== userId);
  const count = sessions.length - remaining.length;
  if (count > 0) saveSessions(remaining);
  return count;
}
