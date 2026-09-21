<template>
  <h1 class="page-title">Karyawan</h1>
  <p class="page-sub">Employee management + clock in/out + riwayat aktivitas.</p>
  <div class="toolbar mt-4"><button @click="openCreate" class="btn-primary btn-sm">+ Tambah karyawan</button></div>
  <p v-if="error" class="error-box">{{ error }}</p>
  <div class="grid lg:grid-cols-2 gap-4">
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Nama</th><th>Posisi</th><th>Status</th><th></th></tr></thead>
      <tbody>
        <tr v-for="e in list" :key="e.id" :class="selected?.id === e.id ? 'bg-blue-50' : ''">
          <td class="font-medium">{{ e.fullName }}</td>
          <td>{{ e.position ?? "-" }}</td>
          <td><span class="badge-green">{{ e.status }}</span></td>
          <td class="text-right whitespace-nowrap">
            <button @click="clockIn(e)" class="btn-secondary btn-sm mr-1">Clock-in</button>
            <button @click="select(e)" class="btn-secondary btn-sm">Riwayat</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="!list.length" class="empty">Belum ada karyawan.</p></div>
    <div class="card-pad">
      <h2 class="font-semibold mb-2">Riwayat aktivitas {{ selected ? `— ${selected.fullName}` : "" }}</h2>
      <ul v-if="acts.length" class="text-sm space-y-2 max-h-96 overflow-auto">
        <li v-for="a in acts" :key="a.id" class="border-b border-slate-100 pb-1">
          <span class="badge-slate mr-2">{{ a.activityType }}</span>{{ a.description }}
          <span class="text-xs text-slate-400 block">{{ fmtDate(a.occurredAt) }}</span>
        </li>
      </ul>
      <p v-else class="empty">Pilih karyawan untuk melihat riwayat.</p>
      <div v-if="openEntry" class="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
        Clock-in berjalan ({{ openEntry.id.slice(0, 8) }}…).
        <button @click="clockOut()" class="btn-primary btn-sm ml-2">Clock-out</button>
      </div>
    </div>
  </div>
  <Modal :open="modal" title="Tambah karyawan" @close="modal = false">
    <form @submit.prevent="save" class="space-y-3">
      <div><label class="label">Nama lengkap *</label><input v-model="form.full_name" required class="input" /></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="label">Email</label><input v-model="form.email" type="email" class="input" /></div>
        <div><label class="label">Posisi</label><input v-model="form.position" class="input" /></div>
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

interface Emp { id: string; fullName: string; position?: string; status: string }
const list = ref<Emp[]>([]);
const selected = ref<Emp | null>(null);
const acts = ref<{ id: string; activityType: string; description: string; occurredAt: string }[]>([]);
const openEntry = ref<{ id: string } | null>(null);
const error = ref("");
const modal = ref(false);
const formError = ref("");
const form = ref({ full_name: "", email: "", position: "" });

function fmtDate(s: string) { return new Date(s).toLocaleString("id-ID"); }
async function load() {
  error.value = "";
  try { list.value = (await api.employees()) as Emp[]; }
  catch (e) { error.value = (e as Error).message; }
}
function openCreate() { form.value = { full_name: "", email: "", position: "" }; formError.value = ""; modal.value = true; }
async function save() {
  formError.value = "";
  try {
    const p: Record<string, string> = { full_name: form.value.full_name };
    if (form.value.email) p.email = form.value.email;
    if (form.value.position) p.position = form.value.position;
    await api.createEmployee(p);
    modal.value = false;
    await load();
  } catch (e) { formError.value = (e as Error).message; }
}
async function select(e: Emp) {
  selected.value = e;
  try { acts.value = (await api.employeeActivities(e.id)) as typeof acts.value; }
  catch (err) { error.value = (err as Error).message; }
}
async function clockIn(e: Emp) {
  error.value = "";
  try {
    openEntry.value = (await api.clockIn({ employee_id: e.id })) as { id: string };
    await select(e);
  } catch (err) { error.value = (err as Error).message; }
}
async function clockOut() {
  if (!openEntry.value) return;
  error.value = "";
  try {
    const r = (await api.clockOut(openEntry.value.id)) as { durationMinutes: number };
    openEntry.value = null;
    error.value = "";
    if (selected.value) await select(selected.value);
    alert(`Clock-out tercatat (${r.durationMinutes} menit).`);
  } catch (err) { error.value = (err as Error).message; }
}
onMounted(load);
</script>
