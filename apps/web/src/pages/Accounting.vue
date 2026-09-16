<template><h1 class="text-2xl font-bold mb-4">Accounting</h1>
<h2 class="font-bold mb-2">Trial Balance</h2>
<pre class="bg-white p-4 rounded shadow text-xs overflow-auto">{{ tb }}</pre></template>
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../api/client";
const tb = ref("memuat...");
onMounted(async () => { try { tb.value = JSON.stringify(await api.trialBalance(), null, 2); } catch { tb.value = "API belum jalan"; } });
</script>
