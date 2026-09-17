import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient, UserRole } from "../src/generated/prisma/client";

/**
 * Seed opcional.
 * Com SSO, usuários são criados/atualizados no primeiro login via validate.
 * Este seed apenas garante usuários de referência para o login local de desenvolvimento.
 */

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const USERS: Array<{
  name: string;
  email: string;
  role: UserRole;
}> = [
  {
    name: "Admin Dev",
    email: "admin@mulhersegura.local",
    role: "ADMIN",
  },
  {
    name: "Polícia Dev",
    email: "police@mulhersegura.local",
    role: "POLICE",
  },
];

async function main() {
  for (const user of USERS) {
    const saved = await prisma.user.upsert({
      where: { email: user.email },
      create: {
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: true,
        isActive: true,
      },
      update: {
        name: user.name,
        role: user.role,
        isActive: true,
      },
    });
    console.log(`✓ ${saved.email} (${user.role})`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
