import { z } from "zod";

/**
 * Server environment, validated once. `instrumentation.ts` calls
 * `getServerEnv()` at boot so a misconfigured deployment fails immediately
 * instead of on the first request that needs a secret.
 */
const base64Key = (name: string) =>
  z
    .string()
    .min(1, `${name} is required`)
    .refine((v) => Buffer.from(v, "base64").length === 32, `${name} must be 32 random bytes, base64-encoded`);

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, "DATABASE_URL must be a PostgreSQL connection string"),
  AUTH_SECRET: base64Key("AUTH_SECRET"),
  PII_ENCRYPTION_KEYS: z
    .string()
    .regex(/^\d+:[A-Za-z0-9+/=]+(,\s*\d+:[A-Za-z0-9+/=]+)*$/, 'PII_ENCRYPTION_KEYS must look like "1:<base64>,2:<base64>"'),
  PII_ACTIVE_KEY_VERSION: z.coerce.number().int().positive(),
  PII_BLIND_INDEX_KEY: base64Key("PII_BLIND_INDEX_KEY"),
  UPLOAD_DIR: z.string().default("./storage/uploads"),
  MAX_PROFILE_PHOTO_BYTES: z.coerce.number().int().positive().default(1_048_576),
  /** Public editorial images (news covers, inline images): served at /uploads/…, never member data. */
  PUBLIC_UPLOAD_DIR: z.string().default("./storage/public-uploads"),
  MAX_IMAGE_UPLOAD_BYTES: z.coerce.number().int().positive().max(20_971_520).default(5_242_880),
  /** PDF library (Documents module). Outside /public: drafts must not be reachable. */
  DOCUMENT_DIR: z.string().default("./storage/documents"),
  MAX_DOCUMENT_BYTES: z.coerce.number().int().positive().max(20_971_520).default(10_485_760),
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(1).max(10).default(1),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  • ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid server environment:\n${issues}\nRun \`npm run setup:env\` for local development.`);
  }
  cached = parsed.data;
  return cached;
}
