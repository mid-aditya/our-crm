<template>
  <h1 class="page-title">Departemen</h1>
  <p class="page-sub">Struktur organisasi perusahaan.</p>
  <div class="toolbar mt-4"><button @click="modal = true" class="btn-primary btn-sm">+ Tambah</button></div>
  <p v-if="error" class="error-box">{{ error }}</p>
  <div class="table-wrap"><table class="table">
    <thead><tr><th>Nama</th></tr></thead>
    <tbody><tr v-for="d in list" :key="d.id"><td class="font-medium">{{ d.name }}</td></tr></tbody>
  </table>
  <p v-if="!list.length" class="empty">Belum ada departemen.</p></div>
  <Modal :open="modal" title="Tambah departemen" @close="modal = false">
    <form @submit.prevent="save" class="space-y-3">
      <div><label class="label">Nama *</label><input v-model="name" required class="input" /></div>
      <p v-if="formError" class="text-red-600 text-sm">{{ formError }}</p>
      <button class="btn-primary w-full">Simpan</button>
    </form>
  </Modal>
</template>
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../api/client";
import Modal from "../components/Modal.vue";

const list = ref<{ id: string; name: string }[]>([]);
const error = ref("");
const modal = ref(false);
const formError = ref("");
const name = ref("");

async function load() {
  error.value = "";
  try { list.value = (await api.departments()) as typeof list.value; }
  catch (e) { error.value = (e as Error).message; }
}
async function save() {
  formError.value = "";
  try {
    await api.createDepartment({ name: name.value });
    name.value = "";
    modal.value = false;
    await load();
  } catch (e) { formError.value = (e as Error).message; }
}
onMounted(load);
</script>
