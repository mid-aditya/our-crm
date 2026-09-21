<template>
  <div>
    <h1 class="page-title">Laporan</h1>
    <p class="page-sub">Volume percakapan, funnel sales & tiket, statistik blasting.</p>
  </div>
  <p v-if="error" class="error-box mt-3">{{ error }}</p>
  <div class="grid lg:grid-cols-2 gap-3 mt-3">
    <div class="card-pad">
      <h2 class="font-bold mb-3">Pesan per hari (30 hari)</h2>
      <div v-if="volume.length" class="space-y-1.5 max-h-80 overflow-auto">
        <div v-for="v in volume" :key="v.day + v.direction" class="flex items-center gap-2 text-xs">
          <span class="w-20 shrink-0 text-slate-500">{{ v.day }}</span>
          <div class="bar-track flex-1"><div class="bar-fill" :style="{ width: pct(v.n) + '%' }" /></div>
          <span class="w-16 text-right">{{ v.direction }} {{ v.n }}</span>
        </div>
      </div>
      <p v-else class="empty">Belum ada data pesan.</p>
    </div>
    <div class="card-pad">
      <h2 class="font-bold mb-3">Funnel deals</h2>
      <div v-if="funnelDeals.length" class="space-y-2">
        <div v-for="d in funnelDeals" :key="d.status" class="flex justify-between text-sm">
          <span class="capitalize">{{ d.status }}</span><strong>{{ d.n }}</strong>
        </div>
      </div>
      <p v-else class="empty !py-4">Belum ada deal.</p>
      <h2 class="font-bold mt-5 mb-3">Status tiket</h2>
      <div v-if="funnelTickets.length" class="space-y-2">
        <div v-for="t in funnelTickets" :key="t.status" class="flex justify-between text-sm">
          <span class="capitalize">{{ t.status }}</span><strong>{{ t.n }}</strong>
        </div>
      </div>
      <p v-else class="empty !py-4">Belum ada tiket.</p>
    </div>
  </div>
  <div class="card-pad mt-3">
    <h2 class="font-bold mb-3">Statistik blasting</h2>
    <div class="table-wrap !shadow-none !border-0"><table class="table">
      <thead><tr><th>Campaign</th><th>Status</th><th class="text-right">Terkirim</th><th class="text-right">Gagal</th><th class="text-right">Total</th></tr></thead>
      <tbody>
        <tr v-for="c in campaigns" :key="c.id">
          <td class="font-medium">{{ c.name }}</td><td>{{ c.status }}</td>
          <td class="text-right text-emerald-600 font-semibold">{{ c.stats?.sent ?? 0 }}</td>
          <td class="text-right text-rose-600 font-semibold">{{ c.stats?.failed ?? 0 }}</td>
          <td class="text-right">{{ c.stats?.total ?? 0 }}</td>
        </tr>
      </tbody>
    </table>
    <p v-if="!campaigns.length" class="empty !py-4">Belum ada campaign.</p></div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../api/client";

const volume = ref<{ day: string; direction: string; n: number }[]>([]);
const funnelDeals = ref<{ status: string; n: number }[]>([]);
const funnelTickets = ref<{ status: string; n: number }[]>([]);
const campaigns = ref<{ id: string; name: string; status: string; stats?: { sent: number; failed: number; total: number } }[]>([]);
const error = ref("");
let maxN = 1;

function pct(n: number) { return Math.max(3, Math.round((Number(n) / maxN) * 100)); }

onMounted(async () => {
  try {
    const [v, f] = await Promise.all([
      api.convVolume(),
      api.funnel() as Promise<{ deals: { status: string; n: number }[]; tickets: { status: string; n: number }[]; campaigns: typeof campaigns.value }>,
    ]);
    volume.value = v as typeof volume.value;
    maxN = Math.max(1, ...volume.value.map((x) => Number(x.n)));
    funnelDeals.value = f.deals ?? [];
    funnelTickets.value = f.tickets ?? [];
    campaigns.value = f.campaigns ?? [];
  } catch (e) { error.value = (e as Error).message; }
});
</script>
