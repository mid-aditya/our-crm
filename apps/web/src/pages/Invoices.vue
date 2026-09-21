<template>
  <h1 class="page-title">Invoices</h1>
  <p class="page-sub">Invoicing + pembayaran.</p>
  <div class="toolbar mt-4"><button @click="modal = true" class="btn-primary btn-sm">+ Buat invoice</button></div>
  <p v-if="error" class="error-box">{{ error }}</p>
  <div class="table-wrap"><table class="table">
    <thead><tr><th>Nomor</th><th>Status</th><th></th></tr></thead>
    <tbody>
      <tr v-for="i in list" :key="i.id">
        <td class="font-medium">{{ i.number }}</td>
        <td><span :class="statusBadge(i.status)">{{ i.status }}</span></td>
        <td class="text-right"><RouterLink :to="`/invoices/${i.id}`" class="btn-secondary btn-sm">Detail</RouterLink></td>
      </tr>
    </tbody>
  </table>
  <p v-if="!list.length" class="empty">Belum ada invoice.</p></div>
  <Modal :open="modal" title="Buat invoice" @close="modal = false">
    <form @submit.prevent="save" class="space-y-3">
      <div><label class="label">Pajak (%)</label><input v-model="form.tax_percent" class="input" placeholder="11" /></div>
      <div v-for="(it, idx) in form.items" :key="idx" class="grid grid-cols-12 gap-2">
        <input v-model="it.description" required placeholder="Deskripsi" class="input col-span-6" />
        <input v-model="it.quantity" placeholder="Qty" class="input col-span-2" />
        <input v-model="it.unit_price" required placeholder="Harga" class="input col-span-3" />
        <button type="button" @click="form.items.splice(idx, 1)" class="btn-danger btn-sm col-span-1">×</button>
      </div>
      <button type="button" @click="form.items.push({ description: '', quantity: '1', unit_price: '' })" class="btn-secondary btn-sm">+ Item</button>
      <p v-if="formError" class="text-red-600 text-sm">{{ formError }}</p>
      <button class="btn-primary w-full">Simpan</button>
    </form>
  </Modal>
</template>
<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { api } from "../api/client";
import Modal from "../components/Modal.vue";

const list = ref<{ id: string; number: string; status: string }[]>([]);
const error = ref("");
const modal = ref(false);
const formError = ref("");
interface InvoiceItem { description: string; quantity: string; unit_price: string }
const form = reactive({ tax_percent: "", items: [{ description: "", quantity: "1", unit_price: "" }] as InvoiceItem[] });

function resetForm() {
  form.tax_percent = "";
  form.items = [{ description: "", quantity: "1", unit_price: "" }];
}

function statusBadge(s: string) {
  return s === "paid" ? "badge-green" : ["sent", "partial"].includes(s) ? "badge-blue" : s === "overdue" ? "badge-red" : "badge-slate";
}
async function load() {
  error.value = "";
  try { list.value = (await api.invoices()) as typeof list.value; }
  catch (e) { error.value = (e as Error).message; }
}
async function save() {
  formError.value = "";
  try {
    const payload: Record<string, unknown> = { items: form.items };
    if (form.tax_percent) payload.tax_percent = form.tax_percent;
    await api.createInvoice(payload);
    modal.value = false;
    resetForm();
    await load();
  } catch (e) { formError.value = (e as Error).message; }
}
onMounted(load);
</script>
