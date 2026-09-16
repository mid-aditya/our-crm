<template><h1 class="text-2xl font-bold mb-4">Klien (Organizations)</h1>
<form @submit.prevent="create" class="flex gap-2 mb-4">
<input v-model="name" required placeholder="Nama perusahaan" class="border p-2 rounded" />
<input v-model="email" placeholder="Email" class="border p-2 rounded" />
<button class="bg-slate-900 text-white px-4 rounded">Tambah</button></form>
<ul class="bg-white rounded shadow divide-y"><li v-for="c in list" :key="c.id" class="p-3">{{ c.name }} — {{ c.email }}</li></ul></template>
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../api/client";
const list = ref<{ id: string; name: string; email?: string }[]>([]);
const name = ref(""); const email = ref("");
async function load() { try { list.value = await api.organizations() as typeof list.value; } catch { list.value = []; } }
async function create() { await api.createOrganization({ name: name.value, email: email.value || undefined }); name.value = ""; email.value = ""; await load(); }
onMounted(load);
</script>
