<template><h1 class="text-2xl font-bold mb-4">Tasks</h1>
<p class="text-sm text-slate-500 mb-2">Task project — pilih project di halaman Projects untuk detail. Ringkasan produktivitas di bawah.</p>
<pre class="bg-white p-4 rounded shadow text-xs overflow-auto">{{ productivity }}</pre></template>
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../api/client";
const productivity = ref("memuat...");
onMounted(async () => { try { productivity.value = JSON.stringify(await api.productivity(), null, 2); } catch { productivity.value = "API belum jalan"; } });
</script>
