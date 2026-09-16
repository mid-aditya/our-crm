<template><h1 class="text-2xl font-bold mb-4">Projects</h1>
<form @submit.prevent="create" class="flex gap-2 mb-4">
<input v-model="name" required placeholder="Nama project" class="border p-2 rounded" />
<button class="bg-slate-900 text-white px-4 rounded">Tambah</button></form>
<ul class="bg-white rounded shadow divide-y"><li v-for="p in list" :key="p.id" class="p-3">{{ p.name }} — {{ p.status }}</li></ul></template>
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../api/client";
const list = ref<{ id: string; name: string; status: string }[]>([]);
const name = ref("");
async function load() { try { list.value = await api.projects() as typeof list.value; } catch { list.value = []; } }
async function create() { await api.createProject({ name: name.value }); name.value = ""; await load(); }
onMounted(load);
</script>
