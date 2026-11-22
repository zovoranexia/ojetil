import { isAbsolute, resolve } from "node:path";
import { getServerEnv } from "@/lib/env";
import { parseKeyring } from "@/lib/security/crypto";

/* Fail fast on boot: invalid configuration or an unusable PII keyring stops
   the server before it can accept a registration it could not encrypt. */
const env = getServerEnv();
parseKeyring();

/* Storage folders must live outside the release folder in production. A
   relative path resolves inside releases/<timestamp>/, so every deploy would
   start with an empty folder and earlier uploads would "disappear" (and be
   deleted for good when old releases are pruned). Warn loudly in the journal. */
if (env.NODE_ENV === "production") {
  const dirs = { UPLOAD_DIR: env.UPLOAD_DIR, PUBLIC_UPLOAD_DIR: env.PUBLIC_UPLOAD_DIR, DOCUMENT_DIR: env.DOCUMENT_DIR };
  for (const [name, value] of Object.entries(dirs)) {
    if (!isAbsolute(value)) {
      console.error(
        `[storage] ⚠ ${name} is relative ("${value}" → ${resolve(value)}). Files stored there are lost on the next deploy. ` +
          `Set an absolute path under /srv/ojetil/shared/storage in .env (see docs/DEPLOYMENT.md).`,
      );
    }
  }
}
