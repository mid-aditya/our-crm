<template>
  <div>
    <h1 class="page-title">Performa Agent</h1>
    <p class="page-sub">Balasan, tiket resolved, deals won & percakapan aktif per agent.</p>
  </div>
  <p v-if="error" class="error-box mt-4">{{ error }}</p>
  <div class="table-wrap mt-4"><table class="table">
    <thead><tr><th>Agent</th><th class="text-right">Balasan</th><th class="text-right">Tiket resolved</th><th class="text-right">Deals won</th><th class="text-right">Aktif</th><th>Skor</th></tr></thead>
    <tbody>
      <tr v-for="a in ranked" :key="a.id">
        <td>
          <div class="font-semibold">{{ a.name }}</div>
          <div class="text-xs text-slate-400">{{ a.email }}</div>
        </td>
        <td class="text-right">{{ a.replies }}</td>
        <td class="text-right">{{ a.tickets_resolved }}</td>
        <td class="text-right">{{ a.deals_won }}</td>
        <td class="text-right">{{ a.active_conversations }}</td>
        <td>
          <div class="flex items-center gap-2">
            <div class="bar-track w-24"><div class="bar-fill" :style="{ width: scorePct(a) + '%' }" /></div>
            <strong>{{ score(a) }}</strong>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
  <p v-if="!ranked.length" class="empty">Belum ada data agent.</p></div>
  <p class="text-xs text-slate-400 mt-2">Skor = balasan + 3×tiket resolved + 5×deals won.</p>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { api } from "../api/client";

interface Agent { id: string; name: string; email: string; replies: number; tickets_resolved: number; deals_won: number; active_conversations: number }
const list = ref<Agent[]>([]);
const error = ref("");

function score(a: Agent) { return a.replies + 3 * a.tickets_resolved + 5 * a.deals_won; }
const ranked = computed(() => [...list.value].sort((x, y) => score(y) - score(x)));
const maxScore = computed(() => Math.max(1, ...ranked.value.map(score)));
function scorePct(a: Agent) { return Math.max(3, Math.round((score(a) / maxScore.value) * 100)); }

onMounted(async () => {
  try { list.value = (await api.agentStats()) as Agent[]; }
  catch (e) { error.value = (e as Error).message; }
});
</script>
