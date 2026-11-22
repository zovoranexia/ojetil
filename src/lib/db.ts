import { PrismaClient } from "@prisma/client";

/**
 * Single PrismaClient per server process. In development, Next.js hot reload
 * re-evaluates modules, so the instance is cached on globalThis.
 */
const globalForPrisma = globalThis as unknown as { __ojetilPrisma?: PrismaClient };

export const db: PrismaClient =
  globalForPrisma.__ojetilPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__ojetilPrisma = db;
}

export type DbClient = PrismaClient;
