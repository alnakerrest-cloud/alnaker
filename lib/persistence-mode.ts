// lib/persistence-mode.ts
// ==============================================================================
// Authoritative Environment & Persistence Provider Policy
//
// Strict Production Invariant:
// On Vercel / Production environments (NODE_ENV=production, VERCEL=1, or VERCEL_ENV),
// Neon PostgreSQL is the sole authoritative persistent store.
// Local JSON overlay writes (EROFS on read-only serverless lambdas) are STRICTLY FORBIDDEN.
//
// In Development:
// Offline JSON mock/overlay mode is permitted by default for local laptop work,
// unless USE_BACKUP_DATA is explicitly set to "false" to connect to PostgreSQL.
// ==============================================================================

/**
 * Returns true if running in a deployed or production environment
 * (e.g. Vercel deployment, Docker production container, or NODE_ENV === "production").
 */
export function isProductionEnvironment(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL === "1" ||
    Boolean(process.env.VERCEL_ENV)
  );
}

/**
 * Returns true ONLY when the application is running in local offline JSON backup mode.
 *
 * Strict Invariant:
 * In any production or deployed environment, this ALWAYS returns false.
 * Persistent operations MUST target Neon PostgreSQL.
 */
export function shouldUseLocalBackup(): boolean {
  if (isProductionEnvironment()) {
    return false;
  }
  return process.env.USE_BACKUP_DATA !== "false";
}

/**
 * Defensive guard that throws an immediate fatal configuration exception
 * if a local filesystem mutation is attempted in a production environment.
 */
export function assertNotProduction(operationName: string): void {
  if (isProductionEnvironment()) {
    throw new Error(
      `[persistence-mode] FATAL: "${operationName}" attempted local filesystem mutation in production environment. ` +
        "Local file writes are strictly prohibited on serverless read-only containers. All business data mutations must target Neon PostgreSQL."
    );
  }
}
