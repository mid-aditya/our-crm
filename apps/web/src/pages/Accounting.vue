<template>
  <h1 class="page-title">Accounting</h1>
  <p class="page-sub">Chart of accounts, jurnal double-entry, trial balance.</p>
  <p v-if="error" class="error-box mt-4">{{ error }}</p>
  <div class="grid lg:grid-cols-2 gap-4 mt-4">
    <div>
      <div class="toolbar"><button @click="modalCoa = true" class="btn-primary btn-sm">+ Akun</button></div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Kode</th><th>Nama</th><th>Tipe</th></tr></thead>
        <tbody>
          <tr v-for="a in accounts" :key="a.id">
            <td class="font-mono">{{ a.code }}</td><td>{{ a.name }}</td>
            <td><span class="badge-slate">{{ a.type }}</span></td>
          </tr>
        </tbody>
      </table>
      <p v-if="!accounts.length" class="empty">Belum ada akun.</p></div>
    </div>
    <div>
      <div class="card-pad mb-4">
        <h2 class="font-semibold mb-3">Posting jurnal</h2>
        <div v-for="(l, i) in lines" :key="i" class="grid grid-cols-12 gap-2 mb-2">
          <select v-model="l.account_id" class="input col-span-6">
            <option value="">Pilih akun…</option>
            <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.code }} — {{ a.name }}</option>
          </select>
          <input v-model="l.debit" placeholder="Debit" class="input col-span-2" />
          <input v-model="l.credit" placeholder="Kredit" class="input col-span-2" />
          <button @click="lines.splice(i, 1)" class="btn-danger btn-sm col-span-2">×</button>
        </div>
        <input v-model="description" placeholder="Keterangan" class="input mb-2" />
        <div class="flex gap-2">
          <button @click="lines.push({ account_id: '', debit: '0', credit: '0' })" class="btn-secondary btn-sm">+ Baris</button>
          <button @click="post" class="btn-primary btn-sm">Posting (debit = kredit)</button>
        </div>
      </div>
      <div class="card-pad">
        <h2 class="font-semibold mb-2">Trial balance</h2>
        <table class="table">
          <thead><tr><th>Akun</th><th class="text-right">Debit</th><th class="text-right">Kredit</th></tr></thead>
          <tbody>
            <tr v-for="t in tb" :key="t.accountId">
              <td>{{ t.account?.name ?? t.accountId.slice(0, 8) }}</td>
              <td class="text-right">{{ fmt(t.debit) }}</td>
              <td class="text-right">{{ fmt(t.credit) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="!tb.length" class="empty !py-4">Belum ada jurnal.</p>
      </div>
    </div>
  </div>
  <Modal :open="modalCoa" title="Tambah akun" @close="modalCoa = false">
    <form @submit.prevent="saveCoa" class="space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <div><label class="label">Kode *</label><input v-model="coa.code" required class="input" /></div>
        <div><label class="label">Tipe</label>
          <select v-model="coa.type" class="input">
            <option value="asset">asset</option><option value="liability">liability</option>
            <option value="equity">equity</option><option value="revenue">revenue</option><option value="expense">expense</option>
          </select>
        </div>
      </div>
      <div><label class="label">Nama *</label><input v-model="coa.name" required class="input" /></div>
      <p v-if="formError" class="text-red-600 text-sm">{{ formError }}</p>
      <button class="btn-primary w-full">Simpan</button>
    </form>
  </Modal>
</template>
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../api/client";
import Modal from "../components/Modal.vue";

const accounts = ref<{ id: string; code: string; name: string; type: string }[]>([]);
const tb = ref<{ accountId: string; debit: string; credit: string; account?: { name: string } }[]>([]);
const error = ref("");
const formError = ref("");
const modalCoa = ref(false);
const coa = ref({ code: "", name: "", type: "asset" });
const description = ref("");
const lines = ref([{ account_id: "", debit: "0", credit: "0" }]);

function fmt(v: unknown) { return Number(v ?? 0).toLocaleString("id-ID"); }
async function load() {
  error.value = "";
  try {
    const [a, t] = await Promise.all([api.ledger(), api.trialBalance().catch(() => [])]);
    accounts.value = a as typeof accounts.value;
    tb.value = t as typeof tb.value;
  } catch (e) { error.value = (e as Error).message; }
}
async function saveCoa() {
  formError.value = "";
  try {
    await api.createAccount(coa.value);
    coa.value = { code: "", name: "", type: "asset" };
    modalCoa.value = false;
    await load();
  } catch (e) { formError.value = (e as Error).message; }
}
async function post() {
  error.value = "";
  try {
    await api.postJournal({ description: description.value || undefined, lines: lines.value });
    description.value = "";
    lines.value = [{ account_id: "", debit: "0", credit: "0" }];
    await load();
  } catch (e) { error.value = (e as Error).message; }
}
onMounted(load);
</script>
