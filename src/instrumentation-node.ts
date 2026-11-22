import { getServerEnv } from "@/lib/env";
import { parseKeyring } from "@/lib/security/crypto";

/* Fail fast on boot: invalid configuration or an unusable PII keyring stops
   the server before it can accept a registration it could not encrypt. */
getServerEnv();
parseKeyring();
