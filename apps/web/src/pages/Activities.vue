<template>
  <h1 class="page-title">Aktivitas</h1>
  <p class="page-sub">Call, meeting, email, note, task personal.</p>
  <div class="toolbar mt-3"><button @click="openCreate" class="btn-primary btn-sm">+ Tambah</button></div>
  <p v-if="error" class="error-box">{{ error }}</p>
  <div class="card divide-y divide-slate-100">
    <div v-for="a in list" :key="a.id" class="p-4 flex items-start justify-between gap-3">
      <div>
        <span :class="a.completedAt ? 'badge-green' : 'badge-slate'" class="mr-2">{{ a.type }}</span>
        <strong>{{ a.subject }}</strong>
        <p v-if="a.notes" class="text-sm text-slate-500 mt-1">{{ a.notes }}</p>
        <p v-if="a.dueAt" class="text-xs text-slate-400 mt-1">Jatuh tempo: {{ fmtDate(a.dueAt) }}</p>
      </div>
      <button v-if="!a.completedAt" @click="complete(a)" class="btn-secondary btn-sm shrink-0">Selesai</button>
    </div>
    <p v-if="!list.length" class="empty">Belum ada aktivitas.</p>
  </div>
  <Modal :open="modal" title="Tambah aktivitas" @close="modal = false">
    <form @submit.prevent="save" class="space-y-2">
      <div class="grid grid-cols-2 gap-3">
        <div><label class="label">Tipe</label>
          <select v-model="form.type" class="input">
            <option value="call">Call</option><option value="meeting">Meeting</option>
            <option value="email">Email</option><option value="note">Note</option><option value="task">Task</option>
          </select>
        </div>
        <div><label class="label">Jatuh tempo</label><input v-model="form.due_at" type="datetime-local" class="input" /></div>
      </div>
      <div><label class="label">Subjek *</label><input v-model="form.subject" required class="input" /></div>
      <div><label class="label">Catatan</label><textarea v-model="form.notes" class="input" rows="3" /></div>
      <p v-if="formError" class="text-red-600 text-sm">{{ formError }}</p>
      <button class="btn-primary w-full">Simpan</button>
    </form>
  </Modal>
</template>
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../api/client";
import Modal from "../components/Modal.vue";

interface Act { id: string; type: string; subject: string; notes?: string; dueAt?: string; completedAt?: string }
const list = ref<Act[]>([]);
const error = ref("");
const modal = ref(false);
const formError = ref("");
const form = ref({ type: "note", subject: "", notes: "", due_at: "" });

function fmtDate(s: string) { return new Date(s).toLocaleString("id-ID"); }
async function load() {
  error.value = "";
  try { list.value = (await api.activities()) as Act[]; }
  catch (e) { error.value = (e as Error).message; }
}
function openCreate() { form.value = { type: "note", subject: "", notes: "", due_at: "" }; formError.value = ""; modal.value = true; }
async function save() {
  formError.value = "";
  try {
    const p: Record<string, string> = { type: form.value.type, subject: form.value.subject };
    if (form.value.notes) p.notes = form.value.notes;
    if (form.value.due_at) p.due_at = new Date(form.value.due_at).toISOString();
    await api.createActivity(p);
    modal.value = false;
    await load();
  } catch (e) { formError.value = (e as Error).message; }
}
async function complete(a: Act) {
  try {
    await api.completeActivity(a.id);
    await load();
  } catch (e) { error.value = (e as Error).message; }
}
onMounted(load);
</script>
