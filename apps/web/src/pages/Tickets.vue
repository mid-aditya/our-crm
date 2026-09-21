<template>
  <div class="flex items-center justify-between">
    <div>
      <h1 class="page-title">Tiket</h1>
      <p class="page-sub">Layanan pelanggan: dari form publik maupun agent.</p>
    </div>
    <RouterLink to="/tickets/new" class="btn-primary btn-sm">Buat tiket</RouterLink>
  </div>
  <div class="toolbar mt-3">
    <select v-model="filter" @change="load" class="input !w-auto !py-1.5 !text-xs">
      <option value="">Semua status</option>
      <option value="open">Open</option><option value="pending">Pending</option>
      <option value="resolved">Resolved</option><option value="closed">Closed</option>
    </select>
  </div>
  <p v-if="error" class="error-box">{{ error }}</p>
  <div class="table-wrap"><table class="table">
    <thead><tr><th>Nomor</th><th>Subjek</th><th>Prioritas</th><th>Status</th><th>Sumber</th><th></th></tr></thead>
    <tbody>
      <tr v-for="t in list" :key="t.id">
        <td class="font-mono font-semibold">{{ t.number }}</td>
        <td>{{ t.subject }}</td>
        <td><span :class="t.priority === 'urgent' ? 'badge-red' : t.priority === 'medium' ? 'badge-amber' : 'badge-slate'">{{ t.priority }}</span></td>
        <td><span :class="statusBadge(t.status)">{{ t.status }}</span></td>
        <td class="text-xs text-slate-500">{{ t.source }}</td>
        <td class="text-right"><RouterLink :to="`/tickets/${t.id}`" class="btn-secondary btn-sm">Buka</RouterLink></td>
      </tr>
    </tbody>
  </table>
  <p v-if="!list.length" class="empty">Belum ada tiket.</p></div>
</template>
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../api/client";

const list = ref<{ id: string; number: string; subject: string; priority: string; status: string; source: string }[]>([]);
const filter = ref("");
const error = ref("");

function statusBadge(s: string) {
  return s === "resolved" || s === "closed" ? "badge-green" : s === "pending" ? "badge-amber" : "badge-blue";
}
async function load() {
  error.value = "";
  try { list.value = (await api.tickets(filter.value || undefined)) as typeof list.value; }
  catch (e) { error.value = (e as Error).message; }
}
onMounted(load);
</script>
