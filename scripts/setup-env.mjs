#!/usr/bin/env node
/**
 * Creates `.env` from `.env.example`, replacing every generator marker with a
 * fresh random value:
 *   __GENERATE_KEY__          → 32 random bytes, base64 (distinct per occurrence)
 *   __GENERATE_DB_PASSWORD__  → one URL-safe password shared by all occurrences
 *   __GENERATE_PASSWORD__     → one human-typeable password (demo admin accounts)
 *
 * Usage: npm run setup:env              (first time)
 *        npm run setup:env -- --force   (overwrite; the extra "--" makes npm forward the flag)
 */
import { randomBytes, randomInt } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const examplePath = join(root, ".env.example");
const envPath = join(root, ".env");
const force = process.argv.includes("--force");

if (existsSync(envPath) && !force) {
  console.error("✖ .env already exists. Run `npm run setup:env -- --force` to overwrite it (this rotates all secrets,");
  console.error("  which makes previously encrypted PII unreadable).");
  process.exit(1);
}

const base64Key = () => randomBytes(32).toString("base64");
const urlSafe = (bytes) => randomBytes(bytes).toString("base64url");

function typeablePassword() {
  // Avoids look-alike characters (0/O, 1/l/I) so it can be typed from the .env file.
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const groups = Array.from({ length: 4 }, () =>
    Array.from({ length: 5 }, () => alphabet[randomInt(alphabet.length)]).join(""),
  );
  return `${groups.join("-")}!`;
}

const dbPassword = urlSafe(24);
const demoPassword = typeablePassword();

const output = readFileSync(examplePath, "utf8")
  .replaceAll("__GENERATE_DB_PASSWORD__", dbPassword)
  .replaceAll("__GENERATE_PASSWORD__", demoPassword)
  .replace(/__GENERATE_KEY__/g, () => base64Key());

writeFileSync(envPath, output, { encoding: "utf8", mode: 0o600 });

console.log("✔ Wrote .env with freshly generated secrets.");
console.log("  The demo admin password is stored in .env as SEED_DEMO_PASSWORD.");
