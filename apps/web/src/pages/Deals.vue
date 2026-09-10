<template>
  <h1 class="text-2xl font-bold mb-4">Deals</h1>
  <ul class="bg-white rounded shadow divide-y">
    <li v-for="d in list" :key="d.id" class="p-3">{{ d.title }} — {{ d.status }} ({{ d.value }})</li>
  </ul>
  <h2 class="mt-6 font-bold">Stages</h2>
  <ul class="flex gap-2 mt-2">
    <li v-for="s in stages" :key="s.id" class="bg-white px-3 py-1 rounded shadow text-sm">{{ s.name }}</li>
  </ul>
</template>
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../api/client";
const list = ref<{ id: string; title: string; status: string; value: string }[]>([]);
const stages = ref<{ id: string; name: string }[]>([]);
onMounted(async () => {
  try {
    list.value = await api.deals() as typeof list.value;
    stages.value = await api.stages() as typeof stages.value;
  } catch { /* API belum jalan */ }
});
</script>
