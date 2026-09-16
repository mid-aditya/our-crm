<template><h1 class="text-2xl font-bold mb-4">Karyawan</h1>
<form @submit.prevent="create" class="flex gap-2 mb-4">
<input v-model="name" required placeholder="Nama lengkap" class="border p-2 rounded" />
<input v-model="position" placeholder="Posisi" class="border p-2 rounded" />
<button class="bg-slate-900 text-white px-4 rounded">Tambah</button></form>
<ul class="bg-white rounded shadow divide-y"><li v-for="e in list" :key="e.id" class="p-3">{{ e.fullName }} — {{ e.position }} ({{ e.status }})</li></ul></template>
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../api/client";
const list = ref<{ id: string; fullName: string; position?: string; status: string }[]>([]);
const name = ref(""); const position = ref("");
async function load() { try { list.value = await api.employees() as typeof list.value; } catch { list.value = []; } }
async function create() { await api.createEmployee({ full_name: name.value, position: position.value || undefined }); name.value = ""; position.value = ""; await load(); }
onMounted(load);
</script>
