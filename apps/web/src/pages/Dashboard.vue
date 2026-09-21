<template>
  <h1 class="page-title">Dashboard</h1>
  <p class="page-sub">Ringkasan aktivitas perusahaan hari ini.</p>
  <p v-if="error" class="error-box mt-4">{{ error }}</p>
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
    <div v-for="s in stats" :key="s.label" class="card-pad">
      <div class="text-xs text-slate-500">{{ s.label }}</div>
      <div class="text-2xl font-bold mt-1">{{ s.value }}</div>
    </div>
  </div>
  <div class="grid lg:grid-cols-2 gap-4 mt-4">
    <div class="card-pad">
      <h2 class="font-semibold mb-3">Deals per stage</h2>
      <div v-if="dealsByStage.length" class="space-y-2">
        <div v-for="d in dealsByStage" :key="d.stage" class="flex justify-between text-sm">
          <span>{{ d.stage }}</span><strong>{{ d.count }}</strong>
        </div>
      </div>
      <p v-else class="empty">Belum ada deal.</p>
    </div>
    <div class="card-pad">
      <h2 class="font-semibold mb-3">Aktivitas terbaru</h2>
      <ul v-if="recent.length" class="space-y-2 text-sm">
        <li v-for="a in recent" :key="a.id" class="border-b border-slate-100 pb-2">
          <span class="badge-slate mr-2">{{ a.type }}</span>{{ a.subject }}
        </li>
      </ul>
      <p v-else class="empty">Belum ada aktivitas.</p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../api/client";

interface Deal { stageId?: string; status: string }
interface Act { id: string; type: string; subject: string }

const stats = ref([
  { label: "Kontak", value: "…" },
  { label: "Deals terbuka", value: "…" },
  { label: "Projects aktif", value: "…" },
  { label: "Invoice belum lunas", value: "…" },
]);
const dealsByStage = ref<{ stage: string; count: number }[]>([]);
const recent = ref<Act[]>([]);
const error = ref("");

onMounted(async () => {
  try {
    const [c, d, p, inv, acts, stages] = await Promise.all([
      api.contacts({ limit: 1 }),
      api.deals() as Promise<Deal[]>,
      api.projects() as Promise<{ status: string }[]>,
      api.invoices() as Promise<{ status: string }[]>,
      api.activities() as Promise<Act[]>,
      api.stages().catch(() => []),
    ]);
    void c;
    const open = d.filter((x) => x.status === "open").length;
    const stageName = new Map((stages as { id: string; name: string }[]).map((s) => [s.id, s.name]));
    const byStage = new Map<string, number>();
    for (const x of d) {
      const k = (x.stageId && stageName.get(x.stageId)) || x.status;
      byStage.set(k, (byStage.get(k) ?? 0) + 1);
    }
    const contactCount = await api.contacts({ limit: 100 }).then((r) => r.list.length).catch(() => 0);
    stats.value = [
      { label: "Kontak", value: String(contactCount) },
      { label: "Deals terbuka", value: String(open) },
      { label: "Projects aktif", value: String(p.filter((x) => x.status === "active").length) },
      { label: "Invoice belum lunas", value: String(inv.filter((x) => ["sent", "partial", "overdue"].includes(x.status)).length) },
    ];
    dealsByStage.value = [...byStage.entries()].map(([stage, count]) => ({ stage, count }));
    recent.value = acts.slice(0, 8);
  } catch (e) {
    error.value = (e as Error).message;
  }
});
</script>
