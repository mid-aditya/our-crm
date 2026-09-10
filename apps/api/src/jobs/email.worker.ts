import { Queue, Worker } from "bullmq";
import { getRedis } from "../core/redis-client.js";

export const EMAIL_QUEUE = "email";

export function getEmailQueue(): Queue {
  return new Queue(EMAIL_QUEUE, { connection: getRedis() });
}

export async function enqueueEmail(to: string, subject: string, body: string) {
  await getEmailQueue().add("send", { to, subject, body });
}

// Worker email terpisah (bagian [8.2g]). Provider SMTP dikonfigurasi via env.
export function startEmailWorker() {
  return new Worker(
    EMAIL_QUEUE,
    async (job) => {
      const { to, subject } = job.data as { to: string; subject: string };
      // TODO: integrasi SMTP (nodemailer) dengan EMAIL_SMTP_* env.
      console.log(`[email] to=${to} subject=${subject}`);
    },
    { connection: getRedis() },
  );
}
