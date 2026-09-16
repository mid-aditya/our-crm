<template><h1 class="text-2xl font-bold mb-4">Invoices</h1>
<ul class="bg-white rounded shadow divide-y"><li v-for="i in list" :key="i.id" class="p-3">{{ i.number }} — {{ i.status }}</li></ul></template>
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../api/client";
const list = ref<{ id: string; number: string; status: string }[]>([]);
onMounted(async () => { try { list.value = await api.invoices() as typeof list.value; } catch { list.value = []; } });
</script>
