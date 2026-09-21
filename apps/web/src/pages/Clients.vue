<template>
  <h1 class="page-title">Klien</h1>
  <p class="page-sub">Perusahaan/B2B + departemen internal.</p>
  <div class="grid lg:grid-cols-2 gap-4 mt-4">
    <div>
      <div class="toolbar"><button @click="openOrg" class="btn-primary btn-sm">+ Tambah klien</button></div>
      <p v-if="error" class="error-box">{{ error }}</p>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Nama</th><th>Email</th><th>Telepon</th><th></th></tr></thead>
          <tbody>
            <tr v-for="o in orgs" :key="o.id">
              <td class="font-medium">{{ o.name }}</td><td>{{ o.email ?? "-" }}</td><td>{{ o.phone ?? "-" }}</td>
              <td class="text-right"><button @click="removeOrg(o)" class="btn-danger btn-sm">Hapus</button></td>
            </tr>
          </tbody>
        </table>
        <p v-if="!orgs.length" class="empty">Belum ada klien.</p>
      </div>
    </div>
    <div>
      <div class="toolbar"><button @click="openDept" class="btn-primary btn-sm">+ Tambah departemen</button></div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Departemen</th></tr></thead>
          <tbody><tr v-for="d in depts" :key="d.id"><td>{{ d.name }}</td></tr></tbody>
        </table>
        <p v-if="!depts.length" class="empty">Belum ada departemen.</p>
      </div>
    </div>
  </div>
  <Modal :open="modalOrg" title="Tambah klien" @close="modalOrg = false">
    <form @submit.prevent="saveOrg" class="space-y-3">
      <div><label class="label">Nama *</label><input v-model="orgForm.name" required class="input" /></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="label">Email</label><input v-model="orgForm.email" type="email" class="input" /></div>
        <div><label class="label">Telepon</label><input v-model="orgForm.phone" class="input" /></div>
      </div>
      <div><label class="label">Alamat</label><input v-model="orgForm.address" class="input" /></div>
      <p v-if="formError" class="text-red-600 text-sm">{{ formError }}</p>
      <button class="btn-primary w-full">Simpan</button>
    </form>
  </Modal>
  <Modal :open="modalDept" title="Tambah departemen" @close="modalDept = false">
    <form @submit.prevent="saveDept" class="space-y-3">
      <div><label class="label">Nama *</label><input v-model="deptName" required class="input" /></div>
      <p v-if="formError" class="text-red-600 text-sm">{{ formError }}</p>
      <button class="btn-primary w-full">Simpan</button>
    </form>
  </Modal>
</template>
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../api/client";
import Modal from "../components/Modal.vue";

const orgs = ref<{ id: string; name: string; email?: string; phone?: string }[]>([]);
const depts = ref<{ id: string; name: string }[]>([]);
const error = ref("");
const formError = ref("");
const modalOrg = ref(false);
const modalDept = ref(false);
const orgForm = ref({ name: "", email: "", phone: "", address: "" });
const deptName = ref("");

async function load() {
  error.value = "";
  try {
    const [o, d] = await Promise.all([api.organizations(), api.departments().catch(() => [])]);
    orgs.value = o as typeof orgs.value;
    depts.value = d as typeof depts.value;
  } catch (e) { error.value = (e as Error).message; }
}
function openOrg() { orgForm.value = { name: "", email: "", phone: "", address: "" }; formError.value = ""; modalOrg.value = true; }
function openDept() { deptName.value = ""; formError.value = ""; modalDept.value = true; }
async function saveOrg() {
  formError.value = "";
  try {
    const p: Record<string, string> = { name: orgForm.value.name };
    if (orgForm.value.email) p.email = orgForm.value.email;
    if (orgForm.value.phone) p.phone = orgForm.value.phone;
    if (orgForm.value.address) p.address = orgForm.value.address;
    await api.createOrganization(p);
    modalOrg.value = false;
    await load();
  } catch (e) { formError.value = (e as Error).message; }
}
async function saveDept() {
  formError.value = "";
  try {
    await api.createDepartment({ name: deptName.value });
    modalDept.value = false;
    await load();
  } catch (e) { formError.value = (e as Error).message; }
}
async function removeOrg(o: { id: string; name: string }) {
  if (!confirm(`Hapus klien "${o.name}"?`)) return;
  try {
    await api.deleteOrganization(o.id);
    await load();
  } catch (e) { error.value = (e as Error).message; }
}
onMounted(load);
</script>
