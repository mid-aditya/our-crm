<template>
  <h1 class="text-2xl font-bold mb-4">Dashboard</h1>
  <div class="grid grid-cols-3 gap-4">
    <div class="bg-white p-4 rounded shadow">Kontak: {{ contacts }}</div>
    <div class="bg-white p-4 rounded shadow">Deals: {{ deals }}</div>
    <div class="bg-white p-4 rounded shadow">Aktivitas: {{ activities }}</div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../api/client";
const contacts = ref(0); const deals = ref(0); const activities = ref(0);
onMounted(async () => {
  try {
    contacts.value = (await api.contacts()).length;
    deals.value = (await api.deals()).length;
    activities.value = (await api.activities()).length;
  } catch { /* tampilkan 0 bila API belum jalan */ }
});
</script>
