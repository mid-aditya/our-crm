<template>
  <h1 class="text-2xl font-bold mb-4">Kontak</h1>
  <form @submit.prevent="create" class="flex gap-2 mb-4">
    <input v-model="name" required placeholder="Nama lengkap" class="border p-2 rounded" />
    <input v-model="phone" placeholder="No. HP" class="border p-2 rounded" />
    <button class="bg-slate-900 text-white px-4 rounded">Tambah</button>
  </form>
  <ul class="bg-white rounded shadow divide-y">
    <li v-for="c in list" :key="c.id" class="p-3">{{ c.fullName ?? c.full_name }} — {{ c.phone }}</li>
  </ul>
</template>
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../api/client";
const list = ref<{ id: string; fullName?: string; full_name?: string; phone?: string }[]>([]);
const name = ref(""); const phone = ref("");
async function load() { try { list.value = await api.contacts() as typeof list.value; } catch { list.value = []; } }
async function create() {
  await api.createContact({ full_name: name.value, phone: phone.value || undefined });
  name.value = ""; phone.value = ""; await load();
}
onMounted(load);
</script>
