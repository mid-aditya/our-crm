<template>
  <h1 class="page-title">Kontak</h1>
  <p class="page-sub">Kelola kontak pelanggan (clients individual).</p>
  <div class="toolbar mt-4">
    <input v-model="search" @input="debouncedLoad" placeholder="Cari nama / email / HP..." class="input max-w-xs" />
    <button @click="openCreate" class="btn-primary btn-sm">+ Tambah</button>
  </div>
  <p v-if="error" class="error-box">{{ error }}</p>
  <div class="table-wrap">
    <table class="table">
      <thead><tr><th>Nama</th><th>Email</th><th>HP</th><th>Perusahaan</th><th></th></tr></thead>
      <tbody>
        <tr v-for="c in list" :key="c.id">
          <td><div class="flex items-center gap-3"><span class="avatar" :class="avatarBg(c.fullName)">{{ initials(c.fullName) }}</span><span class="font-semibold">{{ c.fullName }}</span></div></td>
          <td>{{ c.email ?? "-" }}</td>
          <td>{{ c.phone ?? "-" }}</td>
          <td>{{ c.companyName ?? "-" }}</td>
          <td class="text-right whitespace-nowrap">
            <button @click="openEdit(c)" class="btn-secondary btn-sm mr-1">Ubah</button>
            <button @click="remove(c)" class="btn-danger btn-sm">Hapus</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="!loading && !list.length" class="empty">Belum ada kontak.</p>
    <div class="p-3 border-t border-slate-100">
      <button v-if="cursor" @click="loadMore" class="btn-secondary btn-sm">Muat lagi</button>
    </div>
  </div>
  <Modal :open="modal" :title="editing ? 'Ubah kontak' : 'Tambah kontak'" @close="modal = false">
    <form @submit.prevent="save" class="space-y-3">
      <div><label class="label">Nama lengkap *</label><input v-model="form.full_name" required class="input" /></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="label">Email</label><input v-model="form.email" type="email" class="input" /></div>
        <div><label class="label">HP</label><input v-model="form.phone" class="input" placeholder="0812..." /></div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="label">Perusahaan</label><input v-model="form.company_name" class="input" /></div>
        <div><label class="label">Sumber</label><input v-model="form.source" class="input" placeholder="web / referral" /></div>
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

interface Contact { id: string; fullName: string; email?: string; phone?: string; companyName?: string; source?: string }

const list = ref<Contact[]>([]);
const cursor = ref<string | null>(null);
const search = ref("");
const loading = ref(false);
const error = ref("");
const modal = ref(false);
const editing = ref<Contact | null>(null);
const formError = ref("");
const form = ref({ full_name: "", email: "", phone: "", company_name: "", source: "" });
let timer: ReturnType<typeof setTimeout> | undefined;

const AVATAR_BG = ["bg-indigo-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-sky-500"];
function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}
function avatarBg(name: string) {
  let h = 0;
  for (const ch of name) h += ch.charCodeAt(0);
  return AVATAR_BG[h % AVATAR_BG.length];
}

function debouncedLoad() {  clearTimeout(timer);
  timer = setTimeout(() => load(true), 300);
}

async function load(reset = true) {
  loading.value = true;
  error.value = "";
  try {
    const r = await api.contacts({ search: search.value || undefined, limit: 20, cursor: reset ? undefined : cursor.value ?? undefined });
    list.value = reset ? (r.list as Contact[]) : [...list.value, ...(r.list as Contact[])];
    cursor.value = r.cursor;
  } catch (e) { error.value = (e as Error).message; }
  finally { loading.value = false; }
}
function loadMore() { void load(false); }
function openCreate() {
  editing.value = null;
  form.value = { full_name: "", email: "", phone: "", company_name: "", source: "" };
  formError.value = "";
  modal.value = true;
}
function openEdit(c: Contact) {
  editing.value = c;
  form.value = { full_name: c.fullName, email: c.email ?? "", phone: c.phone ?? "", company_name: c.companyName ?? "", source: c.source ?? "" };
  formError.value = "";
  modal.value = true;
}
async function save() {
  formError.value = "";
  const payload: Record<string, string> = { full_name: form.value.full_name };
  if (form.value.email) payload.email = form.value.email;
  if (form.value.phone) payload.phone = form.value.phone;
  if (form.value.company_name) payload.company_name = form.value.company_name;
  if (form.value.source) payload.source = form.value.source;
  try {
    if (editing.value) await api.updateContact(editing.value.id, payload);
    else await api.createContact(payload);
    modal.value = false;
    await load(true);
  } catch (e) { formError.value = (e as Error).message; }
}
async function remove(c: Contact) {
  if (!confirm(`Hapus ${c.fullName}? (soft delete)`)) return;
  try {
    await api.deleteContact(c.id);
    await load(true);
  } catch (e) { error.value = (e as Error).message; }
}
onMounted(() => load(true));
</script>
