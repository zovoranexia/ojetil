#!/usr/bin/env node
/**
 * Verifies every message catalogue has exactly the same keys as messages/en.json
 * (the typed source of truth) and no empty strings. Exits 1 on any mismatch.
 *   node scripts/check-messages.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "messages");
const LOCALES = ["tet", "pt", "id", "en"];

function flatten(obj, prefix = "") {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? flatten(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]],
  );
}

const catalogues = Object.fromEntries(
  LOCALES.map((l) => [l, new Map(flatten(JSON.parse(readFileSync(join(dir, `${l}.json`), "utf8"))))]),
);
const reference = catalogues.en;
let problems = 0;
const report = (msg) => {
  problems++;
  console.error(msg);
};

for (const locale of LOCALES) {
  const cat = catalogues[locale];
  for (const key of reference.keys()) {
    if (!cat.has(key)) report(`✖ ${locale}: missing "${key}"`);
  }
  for (const [key, value] of cat) {
    if (!reference.has(key)) report(`✖ ${locale}: unexpected "${key}"`);
    if (typeof value !== "string" || value.trim() === "") report(`✖ ${locale}: empty "${key}"`);
  }
}

if (problems) process.exit(1);
console.log(`✔ ${LOCALES.length} catalogues × ${reference.size} keys match.`);
