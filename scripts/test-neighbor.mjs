import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: true });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const cur = { sortOrder: 9999 };
const neighbor = await prisma.category.findFirst({
  where: { sortOrder: { lt: cur.sortOrder } },
  orderBy: { sortOrder: 'desc' },
});
console.log('Neighbor:', neighbor ? { name: neighbor.nameAr, sortOrder: neighbor.sortOrder } : null);
await prisma.$disconnect();
await pool.end();
