import pg from 'pg';
const p = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true });
const r = await p.query('SELECT action, "entityType", summary, "createdAt" FROM "AuditLog" ORDER BY "createdAt" DESC LIMIT 15');
console.table(r.rows);
await p.end();
