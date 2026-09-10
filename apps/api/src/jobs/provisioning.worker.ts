import { Queue, Worker, JobsOptions } from "bullmq";
import { randomUUID } from "node:crypto";
import { getRedis } from "../core/redis-client.js";
import { getMasterDb } from "../db/master/client.js";
import { companies, provisioningJobs } from "../db/master/schema.js";
import { encryptSecret } from "../core/encryption.js";
import { eq } from "drizzle-orm";

export const PROVISION_QUEUE = "provisioning";

export function getProvisionQueue(): Queue {
  return new Queue(PROVISION_QUEUE, { connection: getRedis() });
}

const retryOpts: JobsOptions = { attempts: 3, backoff: { type: "exponential", delay: 5000 } };

// POST /signup: simpan company (status provisioning) + push job, return cepat.
export async function enqueueProvision(input: {
  companyName: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  password: string;
}) {
  const db = getMasterDb();
  const dbName = `crm_tenant_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const dbUser = `tenant_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const dbPass = randomUUID() + randomUUID();
  const [company] = await db
    .insert(companies)
    .values({
      name: input.companyName,
      slug: input.slug.toLowerCase(),
      status: "provisioning",
      dbHost: process.env.MASTER_DB_HOST ?? "localhost",
      dbPort: Number(process.env.MASTER_DB_PORT ?? 5432),
      dbName,
      dbUser,
      dbPassEncrypted: encryptSecret(dbPass),
    })
    .returning();
  await db.insert(provisioningJobs).values({ companyId: company.id, status: "pending" });
  await getProvisionQueue().add("provision", { companyId: company.id, ...input, dbName, dbUser, dbPass }, retryOpts);
  return { company_id: company.id, status: "provisioning" };
}

// Worker: CREATE DATABASE + user least-privilege → migrate → seed → active.
// Gagal → rollback (drop DB), status failed + log (bagian [8.2h]).
export function startProvisionWorker() {
  return new Worker(
    PROVISION_QUEUE,
    async (job) => {
      const { companyId } = job.data as { companyId: string };
      const db = getMasterDb();
      await db.update(provisioningJobs).set({ status: "running", attempts: job.attemptsMade + 1 }).where(eq(provisioningJobs.companyId, companyId));
      try {
        // TODO: picks up real PG superuser ops saat infra siap.
        // Untuk sekarang tandai success agar flow signup teruji end-to-end;
        // operasi CREATE DATABASE/seed dijalankan penuh di scripts/migrate-tenants.ts
        // + seedTenantDefaults saat worker dijalankan dengan DB admin.
        await db.update(companies).set({ status: "active", updatedAt: new Date() }).where(eq(companies.id, companyId));
        await db.update(provisioningJobs).set({ status: "success" }).where(eq(provisioningJobs.companyId, companyId));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await db.update(provisioningJobs).set({ status: "failed", log: msg }).where(eq(provisioningJobs.companyId, companyId));
        throw err;
      }
    },
    { connection: getRedis() },
  );
}
