<template>
  <h1 class="page-title">Pengaturan</h1>
  <p class="page-sub">Users, roles & permissions.</p>
  <p v-if="error" class="error-box mt-4">{{ error }}</p>
  <div class="grid lg:grid-cols-2 gap-4 mt-4">
    <div>
      <div class="toolbar"><button @click="modalInvite = true" class="btn-primary btn-sm">+ Invite user</button></div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Nama</th><th>Email</th><th>Status</th><th></th></tr></thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td class="font-medium">{{ u.fullName }}</td><td>{{ u.email }}</td>
            <td><span class="badge-slate">{{ u.status }}</span></td>
            <td class="text-right">
              <select :value="u.roleId" @change="setRole(u, ($event.target as HTMLSelectElement).value)" class="input !py-1 !text-xs !w-auto">
                <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
              </select>
            </td>
          </tr>
        </tbody>
      </table></div>
    </div>
    <div>
      <h2 class="font-semibold mb-2">Roles & permissions</h2>
      <div v-for="r in roles" :key="r.id" class="card-pad mb-3">
        <div class="flex justify-between items-center mb-2">
          <strong>{{ r.name }}</strong>
          <span v-if="r.isSystemRole" class="badge-slate">system</span>
        </div>
        <div class="flex flex-wrap gap-1 mb-2">
          <span v-for="p in r.permissions" :key="p" class="badge-blue">{{ p }}</span>
        </div>
        <details v-if="!(r.isSystemRole && r.name === 'Owner')" class="text-sm">
          <summary class="cursor-pointer text-slate-500">Ubah permissions</summary>
          <div class="mt-2 max-h-48 overflow-auto border rounded-lg p-2 space-y-1">
            <label v-for="p in allPerms" :key="p" class="flex gap-2 text-xs">
              <input type="checkbox" :value="p" v-model="editPerms[r.id]" /> {{ p }}
            </label>
          </div>
          <button @click="savePerms(r)" class="btn-primary btn-sm mt-2">Simpan</button>
        </details>
      </div>
    </div>
  </div>
  <Modal :open="modalInvite" title="Invite user" @close="modalInvite = false">
    <form @submit.prevent="invite" class="space-y-3">
      <div><label class="label">Nama *</label><input v-model="inv.full_name" required class="input" /></div>
      <div><label class="label">Email *</label><input v-model="inv.email" type="email" required class="input" /></div>
      <div><label class="label">Role</label>
        <select v-model="inv.role_id" class="input"><option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option></select>
      </div>
      <p v-if="formError" class="text-red-600 text-sm">{{ formError }}</p>
      <button class="btn-primary w-full">Kirim invite</button>
    </form>
  </Modal>
</template>
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../api/client";
import Modal from "../components/Modal.vue";

interface Role { id: string; name: string; isSystemRole: boolean; permissions: string[] }
const users = ref<{ id: string; fullName: string; email: string; status: string; roleId: string }[]>([]);
const roles = ref<Role[]>([]);
const allPerms = ref<string[]>([]);
const editPerms = ref<Record<string, string[]>>({});
const error = ref("");
const formError = ref("");
const modalInvite = ref(false);
const inv = ref({ full_name: "", email: "", role_id: "" });

async function load() {
  error.value = "";
  try {
    const [u, r] = await Promise.all([api.users(), api.roles()]);
    users.value = u as typeof users.value;
    roles.value = r;
    const set = new Set<string>();
    for (const role of r) {
      for (const p of role.permissions) set.add(p);
    }
    allPerms.value = [...set].sort();
    for (const role of r) editPerms.value[role.id] = [...role.permissions];
    if (!inv.value.role_id && r.length) inv.value.role_id = r[r.length - 1].id;
  } catch (e) { error.value = (e as Error).message; }
}
async function setRole(u: { id: string }, roleId: string) {
  error.value = "";
  try {
    await api.changeRole(u.id, roleId);
    await load();
  } catch (e) { error.value = (e as Error).message; }
}
async function invite() {
  formError.value = "";
  try {
    await api.inviteUser(inv.value);
    inv.value = { full_name: "", email: "", role_id: inv.value.role_id };
    modalInvite.value = false;
    await load();
  } catch (e) { formError.value = (e as Error).message; }
}
async function savePerms(r: Role) {
  error.value = "";
  try {
    await api.updateRolePermissions(r.id, editPerms.value[r.id] ?? []);
    await load();
  } catch (e) { error.value = (e as Error).message; }
}
onMounted(load);
</script>
