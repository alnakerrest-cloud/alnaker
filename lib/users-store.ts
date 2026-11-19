import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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
  try {
    if (!fs.existsSync(USERS_DIR)) {
      fs.mkdirSync(USERS_DIR, { recursive: true });
    }
  } catch {}
}

function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    ensureStorageDir();
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch {
    return defaultValue;
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    ensureStorageDir();
    const tmpFile = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(tmpFile, filePath);
  } catch {}
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
  return sessions.filter((s) => new Date(s.expiresAt) > now);
}

function saveSessions(sessions: StoredSession[]): void {
  writeJsonFile(SESSIONS_FILE, sessions);
}

/* ========================================================================= */
/* User Operations                                                           */
/* ========================================================================= */

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const normalized = email.trim().toLowerCase();

  // 1. Primary: Query PostgreSQL database (Neon Production)
  try {
    const dbUser = await prisma.adminUser.findUnique({
      where: { email: normalized },
    });
    if (dbUser) {
      return {
        id: dbUser.id,
        email: dbUser.email,
        passwordHash: dbUser.passwordHash,
        displayName: dbUser.displayName,
        role: dbUser.role as AdminRole,
        isActive: dbUser.isActive,
        mustChangePassword: Boolean(dbUser.mustChangePassword),
        lastLoginAt: dbUser.lastLoginAt?.toISOString(),
        createdAt: dbUser.createdAt.toISOString(),
        updatedAt: dbUser.updatedAt.toISOString(),
      };
    }
  } catch (err: any) {
    console.warn("[users-store] Database lookup failed, checking local backup:", err?.message || err);
  }

  // 2. Fallback: Local users.json
  const users = loadUsers();
  return users.find((u) => u.email.toLowerCase() === normalized) || null;
}

export async function findUserById(id: string): Promise<StoredUser | null> {
  // 1. Primary: Query PostgreSQL database
  try {
    const dbUser = await prisma.adminUser.findUnique({ where: { id } });
    if (dbUser) {
      return {
        id: dbUser.id,
        email: dbUser.email,
        passwordHash: dbUser.passwordHash,
        displayName: dbUser.displayName,
        role: dbUser.role as AdminRole,
        isActive: dbUser.isActive,
        mustChangePassword: Boolean(dbUser.mustChangePassword),
        lastLoginAt: dbUser.lastLoginAt?.toISOString(),
        createdAt: dbUser.createdAt.toISOString(),
        updatedAt: dbUser.updatedAt.toISOString(),
      };
    }
  } catch (err: any) {
    console.warn("[users-store] Database lookup failed, checking local backup:", err?.message || err);
  }

  // 2. Fallback: Local users.json
  const users = loadUsers();
  return users.find((u) => u.id === id) || null;
}

export async function listSanitizedUsers(): Promise<SanitizedUser[]> {
  try {
    const dbUsers = await prisma.adminUser.findMany({
      orderBy: { createdAt: "asc" },
    });
    if (dbUsers && dbUsers.length > 0) {
      return dbUsers.map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        role: u.role as AdminRole,
        isActive: u.isActive,
        mustChangePassword: Boolean(u.mustChangePassword),
        lastLoginAt: u.lastLoginAt?.toISOString(),
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      }));
    }
  } catch {}

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
  const normalized = params.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(params.password, 12);
  const now = new Date();
  const userId = `usr-${crypto.randomUUID()}`;

  try {
    const created = await prisma.adminUser.create({
      data: {
        id: userId,
        email: normalized,
        passwordHash,
        displayName: params.displayName.trim(),
        role: params.role as any,
        isActive: true,
        mustChangePassword: Boolean(params.mustChangePassword),
        createdAt: now,
        updatedAt: now,
      },
    });

    // Also update local file for redundancy
    try {
      const users = loadUsers();
      users.push({
        id: created.id,
        email: created.email,
        passwordHash: created.passwordHash,
        displayName: created.displayName,
        role: created.role as AdminRole,
        isActive: created.isActive,
        mustChangePassword: Boolean(created.mustChangePassword),
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      });
      saveUsers(users);
    } catch {}

    return {
      id: created.id,
      email: created.email,
      displayName: created.displayName,
      role: created.role as AdminRole,
      isActive: created.isActive,
      mustChangePassword: Boolean(created.mustChangePassword),
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  } catch (err: any) {
    if (err?.code === "P2002") {
      throw new Error("البريد الإلكتروني مسجل بالفعل لمستخدم آخر");
    }
    throw err;
  }
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
  const data: Record<string, any> = { updatedAt: new Date() };
  if (params.displayName !== undefined) data.displayName = params.displayName.trim();
  if (params.role !== undefined) data.role = params.role as any;
  if (params.isActive !== undefined) data.isActive = params.isActive;
  if (params.mustChangePassword !== undefined) data.mustChangePassword = params.mustChangePassword;
  if (params.newPassword) {
    data.passwordHash = await bcrypt.hash(params.newPassword, 12);
    data.mustChangePassword = false;
  }

  const updated = await prisma.adminUser.update({
    where: { id },
    data,
  });

  if (params.isActive === false || params.newPassword) {
    await revokeAllUserSessions(id);
  }

  // Update local file for redundancy
  try {
    const users = loadUsers();
    const u = users.find((x) => x.id === id);
    if (u) {
      if (params.displayName !== undefined) u.displayName = params.displayName.trim();
      if (params.role !== undefined) u.role = params.role;
      if (params.isActive !== undefined) u.isActive = params.isActive;
      if (params.mustChangePassword !== undefined) u.mustChangePassword = params.mustChangePassword;
      if (data.passwordHash) {
        u.passwordHash = data.passwordHash;
        u.mustChangePassword = false;
      }
      u.updatedAt = new Date().toISOString();
      saveUsers(users);
    }
  } catch {}

  return {
    id: updated.id,
    email: updated.email,
    displayName: updated.displayName,
    role: updated.role as AdminRole,
    isActive: updated.isActive,
    mustChangePassword: Boolean(updated.mustChangePassword),
    lastLoginAt: updated.lastLoginAt?.toISOString(),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function deleteUser(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.adminUser.delete({ where: { id } });
    await revokeAllUserSessions(id);
  } catch (err: any) {
    return { success: false, error: err?.message || "فشل حذف المستخدم" };
  }

  try {
    const users = loadUsers().filter((u) => u.id !== id);
    saveUsers(users);
  } catch {}

  return { success: true };
}

export async function touchLastLogin(id: string): Promise<void> {
  const now = new Date();
  try {
    await prisma.adminUser.update({
      where: { id },
      data: { lastLoginAt: now },
    });
  } catch {}

  try {
    const users = loadUsers();
    const u = users.find((x) => x.id === id);
    if (u) {
      u.lastLoginAt = now.toISOString();
      saveUsers(users);
    }
  } catch {}
}

/* ========================================================================= */
/* Session Operations                                                        */
/* ========================================================================= */

export async function createStoreSession(
  userId: string,
  tokenHash: string,
  expiresAt: Date | string
): Promise<StoredSession> {
  const expiresAtDate = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  const sessionId = `sess-${crypto.randomUUID()}`;

  // 1. Primary: Save to PostgreSQL Session table
  try {
    await prisma.session.create({
      data: {
        id: sessionId,
        adminId: userId,
        tokenHash,
        expiresAt: expiresAtDate,
      },
    });
  } catch (err: any) {
    console.warn("[users-store] Failed to save session to DB, using local fallback:", err?.message || err);
  }

  // 2. Secondary: Save to local sessions.json for redundancy
  const newSession: StoredSession = {
    id: sessionId,
    userId,
    tokenHash,
    expiresAt: expiresAtDate.toISOString(),
    createdAt: new Date().toISOString(),
  };

  try {
    const sessions = loadSessions();
    sessions.push(newSession);
    saveSessions(sessions);
  } catch {}

  return newSession;
}

export async function findSessionByTokenHash(
  tokenHash: string
): Promise<{ session: StoredSession; user: StoredUser } | null> {
  // 1. Primary: Query PostgreSQL Session table
  try {
    const dbSession = await prisma.session.findUnique({
      where: { tokenHash },
      include: { admin: true },
    });

    if (dbSession) {
      if (new Date(dbSession.expiresAt) <= new Date()) {
        await prisma.session.delete({ where: { id: dbSession.id } }).catch(() => {});
        return null;
      }
      if (!dbSession.admin || !dbSession.admin.isActive) {
        return null;
      }

      return {
        session: {
          id: dbSession.id,
          userId: dbSession.adminId,
          tokenHash: dbSession.tokenHash,
          expiresAt: dbSession.expiresAt.toISOString(),
          createdAt: dbSession.createdAt.toISOString(),
        },
        user: {
          id: dbSession.admin.id,
          email: dbSession.admin.email,
          passwordHash: dbSession.admin.passwordHash,
          displayName: dbSession.admin.displayName,
          role: dbSession.admin.role as AdminRole,
          isActive: dbSession.admin.isActive,
          mustChangePassword: Boolean(dbSession.admin.mustChangePassword),
          lastLoginAt: dbSession.admin.lastLoginAt?.toISOString(),
          createdAt: dbSession.admin.createdAt.toISOString(),
          updatedAt: dbSession.admin.updatedAt.toISOString(),
        },
      };
    }
  } catch (err: any) {
    console.warn("[users-store] Database session lookup failed, checking local backup:", err?.message || err);
  }

  // 2. Fallback: Local sessions.json
  const sessions = loadSessions();
  const session = sessions.find((s) => s.tokenHash === tokenHash);
  if (!session) return null;

  if (new Date(session.expiresAt) <= new Date()) {
    deleteSessionByTokenHash(tokenHash);
    return null;
  }

  const user = (await findUserById(session.userId)) || loadUsers().find((u) => u.id === session.userId);
  if (!user || !user.isActive) {
    deleteSessionByTokenHash(tokenHash);
    return null;
  }

  return { session, user };
}

export async function deleteSessionByTokenHash(tokenHash: string): Promise<boolean> {
  try {
    await prisma.session.deleteMany({ where: { tokenHash } });
  } catch {}

  try {
    const sessions = loadSessions();
    const remaining = sessions.filter((s) => s.tokenHash !== tokenHash);
    saveSessions(remaining);
  } catch {}

  return true;
}

export async function revokeAllUserSessions(userId: string): Promise<number> {
  let count = 0;
  try {
    const res = await prisma.session.deleteMany({ where: { adminId: userId } });
    count = res.count;
  } catch {}

  try {
    const sessions = loadSessions();
    const remaining = sessions.filter((s) => s.userId !== userId);
    count = Math.max(count, sessions.length - remaining.length);
    saveSessions(remaining);
  } catch {}

  return count;
}
