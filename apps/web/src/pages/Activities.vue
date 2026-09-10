<template><h1 class="text-2xl font-bold mb-4">Aktivitas</h1><ul class="bg-white rounded shadow divide-y"><li v-for="a in list" :key="a.id" class="p-3">[{{ a.type }}] {{ a.subject }}</li></ul></template>
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../api/client";
const list = ref<{ id: string; type: string; subject: string }[]>([]);
onMounted(async () => { try { list.value = await api.activities() as typeof list.value; } catch { list.value = []; } });
</script>
