<template>
  <h1 class="page-title">Projects</h1>
  <p class="page-sub">Project management + budgeting + members.</p>
  <div class="toolbar mt-4"><button @click="openCreate" class="btn-primary btn-sm">+ Tambah project</button></div>
  <p v-if="error" class="error-box">{{ error }}</p>
  <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
    <RouterLink v-for="p in list" :key="p.id" :to="`/projects/${p.id}`" class="card-pad hover:shadow-md">
      <div class="flex justify-between items-start">
        <strong>{{ p.name }}</strong>
        <span :class="p.status === 'active' ? 'badge-green' : 'badge-slate'">{{ p.status }}</span>
      </div>
      <p v-if="p.description" class="text-sm text-slate-500 mt-1 line-clamp-2">{{ p.description }}</p>
      <p v-if="p.endDate" class="text-xs text-slate-400 mt-2">Target: {{ fmtDate(p.endDate) }}</p>
    </RouterLink>
  </div>
  <p v-if="!list.length" class="empty">Belum ada project.</p>
  <Modal :open="modal" title="Tambah project" @close="modal = false">
    <form @submit.prevent="save" class="space-y-3">
      <div><label class="label">Nama *</label><input v-model="form.name" required class="input" /></div>
      <div><label class="label">Deskripsi</label><textarea v-model="form.description" class="input" rows="2" /></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="label">Mulai</label><input v-model="form.start_date" type="date" class="input" /></div>
        <div><label class="label">Selesai</label><input v-model="form.end_date" type="date" class="input" /></div>
      </div>
      <p v-if="formError" class="text-red-600 text-sm">{{ formError }}</p>
      <button class="btn-primary w-full">Simpan</button>
    </form>
  </Modal>
</template>
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../api/client";
import Modal from "../components/Modal.vue";

interface Project { id: string; name: string; description?: string; status: string; endDate?: string }
const list = ref<Project[]>([]);
const error = ref("");
const modal = ref(false);
const formError = ref("");
const form = ref({ name: "", description: "", start_date: "", end_date: "" });

function fmtDate(s: string) { return new Date(s).toLocaleDateString("id-ID"); }
async function load() {
  error.value = "";
  try { list.value = (await api.projects()) as Project[]; }
  catch (e) { error.value = (e as Error).message; }
}
function openCreate() { form.value = { name: "", description: "", start_date: "", end_date: "" }; formError.value = ""; modal.value = true; }
async function save() {
  formError.value = "";
  try {
    const p: Record<string, string> = { name: form.value.name };
    if (form.value.description) p.description = form.value.description;
    if (form.value.start_date) p.start_date = new Date(form.value.start_date).toISOString();
    if (form.value.end_date) p.end_date = new Date(form.value.end_date).toISOString();
    await api.createProject(p);
    modal.value = false;
    await load();
  } catch (e) { formError.value = (e as Error).message; }
}
onMounted(load);
</script>
