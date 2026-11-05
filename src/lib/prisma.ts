import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { resolveDatabaseUrl } from "@/lib/database-url";
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
  const connectionString = resolveDatabaseUrl();

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

let cachedClient: PrismaClient | undefined;

function getPrismaClient() {
  if (process.env.NODE_ENV !== "production" && globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  if (cachedClient) return cachedClient;

  cachedClient = createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = cachedClient;
  }

  return cachedClient;
}

// O next build importa as rotas sem banco. A conexão só abre no primeiro uso.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (prop === "then" || prop === "catch" || prop === "finally") {
      return undefined;
    }

    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export default prisma;
