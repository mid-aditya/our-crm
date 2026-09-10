import { z } from "zod";

// Fail fast kalau ada secret yang kosong (bagian [11]).
const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  API_PORT: z.coerce.number().default(3001),
  MASTER_DB_HOST: z.string().min(1),
  MASTER_DB_PORT: z.coerce.number().default(5432),
  MASTER_DB_NAME: z.string().default("crm_master"),
  MASTER_DB_USER: z.string().min(1),
  MASTER_DB_PASSWORD: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET minimal 32 char"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET minimal 32 char"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  TENANT_CRED_ENCRYPTION_KEY: z
    .string()
    .min(16, "TENANT_CRED_ENCRYPTION_KEY wajib diisi"),
  TENANT_POOL_MAX: z.coerce.number().default(50),
  TENANT_CONN_CACHE_TTL_SEC: z.coerce.number().default(300),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${msg}`);
  }
  return parsed.data;
}
