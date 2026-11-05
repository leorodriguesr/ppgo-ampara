import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
  pgPoolVersion: number | undefined;
};

/** Troca o pool antigo (várias conexões + wrapper) quando o módulo recarrega. */
const POOL_VERSION = 3;

function createPool(connectionString: string) {
  const pool = new Pool({
    connectionString,
    // Prisma Dev (e pooler em modo transação) compartilham uma sessão.
    // Várias conexões misturam o prepared statement sem nome e o Postgres
    // responde 08P01. Uma conexão serializa Parse/Bind.
    max: process.env.NODE_ENV === "production" ? 10 : 1,
  });

  pool.on("error", () => {
    // Conexão ociosa caiu. Sem listener o Node encerra o processo.
  });

  return pool;
}

if (globalForPrisma.pgPoolVersion !== POOL_VERSION) {
  void globalForPrisma.pgPool?.end().catch(() => {});
  globalForPrisma.pgPool = undefined;
  globalForPrisma.prisma = undefined;
  globalForPrisma.pgPoolVersion = POOL_VERSION;
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = globalForPrisma.pgPool ?? createPool(connectionString);

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pgPool = pool;
  }

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
