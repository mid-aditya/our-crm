<template>
  <div class="flex items-center justify-between">
    <div>
      <h1 class="page-title">Dashboard</h1>
      <p class="page-sub">Operasional customer & sales hari ini.</p>
    </div>
    <RouterLink to="/conversations" class="btn-primary btn-sm">Buka percakapan</RouterLink>
  </div>
  <p v-if="error" class="error-box mt-4">{{ error }}</p>

  <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
    <div v-for="s in stats" :key="s.label" class="card-pad card-hover">
      <div class="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <component :is="s.icon" :size="15" class="text-indigo-500" />{{ s.label }}
      </div>
      <div class="text-2xl font-extrabold tracking-tight mt-1">{{ s.value }}</div>
    </div>
  </div>

  <div class="grid lg:grid-cols-2 gap-4 mt-4">
    <div class="card-pad">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-bold">Perlu perhatian</h2>
        <span v-if="attention.length" class="badge-red">{{ attention.length }}</span>
      </div>
      <ul v-if="attention.length" class="space-y-2 text-sm">
        <li v-for="a in attention" :key="a.id" class="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">{{ a.text }}</li>
      </ul>
      <p v-else class="empty !py-4">Semua beres. Tidak ada antrean mendesak.</p>
    </div>
    <div class="card-pad">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-bold">Pipeline deals</h2>
        <RouterLink to="/deals" class="text-xs text-indigo-600 font-semibold hover:underline">Kanban</RouterLink>
      </div>
      <div v-if="pipeline.length" class="space-y-3">
        <div v-for="d in pipeline" :key="d.stage">
          <div class="flex justify-between text-sm mb-1">
            <span class="font-medium">{{ d.stage }}</span>
            <span class="text-slate-500">{{ d.count }} · Rp{{ fmt(d.total) }}</span>
          </div>
          <div class="bar-track"><div class="bar-fill" :style="{ width: d.pct + '%' }" /></div>
        </div>
      </div>
      <p v-else class="empty !py-4">Belum ada deal terbuka.</p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { MessageCircle, Ticket, Handshake, Users, Megaphone } from "lucide-vue-next";
import { api } from "../api/client";

const stats = ref([
  { label: "Chat open", value: "…", icon: MessageCircle },
  { label: "Tiket open", value: "…", icon: Ticket },
  { label: "Deals", value: "…", icon: Handshake },
  { label: "Kontak", value: "…", icon: Users },
  { label: "Blasting terkirim", value: "…", icon: Megaphone },
]);
const attention = ref<{ id: string; text: string }[]>([]);
const pipeline = ref<{ stage: string; count: number; total: number; pct: number }[]>([]);
const error = ref("");

function fmt(v: number) { return Math.round(v).toLocaleString("id-ID"); }

onMounted(async () => {
  try {
    const [ov, deals, stages, convsRaw, ticketsRaw, camps] = await Promise.all([
      api.overview().catch(() => ({} as Record<string, number>)),
      api.deals() as Promise<{ value: string; stageId?: string; status: string }[]>,
      api.stages().catch(() => [] as { id: string; name: string }[]),
      api.conversations("open").catch(() => [] as unknown[]),
      api.tickets("open").catch(() => [] as unknown[]),
      api.campaigns().catch(() => [] as { stats?: { sent: number } }[]),
    ]);
    const convs = convsRaw as { id: string; awaitingSince?: string; lastMessageAt?: string }[];
    const tickets = ticketsRaw as { id: string; number: string; priority: string }[];
    const campsList = camps as { stats?: { sent: number } }[];
    const open = deals.filter((x) => x.status === "open");
    stats.value = [
      { label: "Chat open", value: String(ov.open_conversations ?? convs.length), icon: MessageCircle },
      { label: "Tiket open", value: String(ov.open_tickets ?? tickets.length), icon: Ticket },
      { label: "Deals", value: String(open.length), icon: Handshake },
      { label: "Kontak", value: String(ov.contacts ?? 0), icon: Users },
      { label: "Blasting terkirim", value: String(campsList.reduce((s, c) => s + Number(c.stats?.sent ?? 0), 0)), icon: Megaphone },
    ];
    const attn: typeof attention.value = [];
    const waiting = convs.filter((c) => c.awaitingSince);
    if (waiting.length) attn.push({ id: "w", text: `${waiting.length} chat menunggu balasan agent` });
    for (const t of tickets.filter((x) => x.priority === "urgent").slice(0, 3)) {
      attn.push({ id: t.id, text: `Tiket ${t.number} prioritas urgent` });
    }
    attention.value = attn.slice(0, 6);

    const names = new Map(stages.map((s) => [s.id, s.name]));
    const byStage = new Map<string, { count: number; total: number }>();
    for (const d of open) {
      const k = (d.stageId && names.get(d.stageId)) || "Tanpa stage";
      const cur = byStage.get(k) ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total += Number(d.value || 0);
      byStage.set(k, cur);
    }
    const max = Math.max(1, ...[...byStage.values()].map((v) => v.total));
    pipeline.value = [...byStage.entries()].map(([stage, v]) => ({ stage, ...v, pct: Math.max(4, Math.round((v.total / max) * 100)) }));
  } catch (e) {
    error.value = (e as Error).message;
  }
});
</script>
