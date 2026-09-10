import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

let pool: Pool | null = null;

export function getMasterDb() {
  if (!pool) {
    pool = new Pool({
      host: process.env.MASTER_DB_HOST,
      port: Number(process.env.MASTER_DB_PORT ?? 5432),
      database: process.env.MASTER_DB_NAME ?? "crm_master",
      user: process.env.MASTER_DB_USER,
      password: process.env.MASTER_DB_PASSWORD,
      max: 10,
    });
  }
  return drizzle(pool);
}
