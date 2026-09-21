<template>
  <RouterLink to="/invoices" class="text-sm text-slate-500 hover:text-slate-800">← Kembali</RouterLink>
  <h1 class="page-title mt-1">{{ inv?.number ?? "Invoice" }}</h1>
  <p v-if="error" class="error-box mt-4">{{ error }}</p>
  <div v-if="inv" class="grid lg:grid-cols-2 gap-4 mt-4">
    <div class="card-pad">
      <h2 class="font-semibold mb-2">Ringkasan</h2>
      <dl class="text-sm space-y-1">
        <div class="flex justify-between"><dt>Status</dt><dd><span :class="badge">{{ inv.status }}</span></dd></div>
        <div class="flex justify-between"><dt>Subtotal</dt><dd>{{ fmt(meta.subtotal) }}</dd></div>
        <div class="flex justify-between"><dt>Pajak</dt><dd>{{ fmt(meta.tax) }}</dd></div>
        <div class="flex justify-between font-bold"><dt>Total</dt><dd>{{ fmt(meta.total) }}</dd></div>
        <div class="flex justify-between"><dt>Dibayar</dt><dd>{{ fmt(meta.paid) }}</dd></div>
        <div class="flex justify-between font-bold"><dt>Sisa</dt><dd>{{ fmt(meta.balance) }}</dd></div>
      </dl>
      <div class="mt-3 flex gap-2 items-center">
        <label class="label !mb-0">Ubah status:</label>
        <select :value="inv.status" @change="setStatus(($event.target as HTMLSelectElement).value)" class="input !w-auto !py-1 !text-xs">
          <option value="draft">draft</option><option value="sent">sent</option><option value="partial">partial</option>
          <option value="paid">paid</option><option value="overdue">overdue</option><option value="cancelled">cancelled</option>
        </select>
      </div>
      <h3 class="font-semibold mt-4 mb-2 text-sm">Items</h3>
      <ul class="text-sm space-y-1">
        <li v-for="it in items" :key="it.id" class="flex justify-between border-b border-slate-100 py-1">
          <span>{{ it.description }} × {{ it.quantity }}</span><span>{{ fmt(Number(it.quantity) * Number(it.unitPrice)) }}</span>
        </li>
      </ul>
    </div>
    <div class="card-pad">
      <h2 class="font-semibold mb-2">Pembayaran</h2>
      <form @submit.prevent="pay" class="flex gap-2 mb-3">
        <input v-model="amount" required placeholder="Nominal" class="input" />
        <input v-model="method" placeholder="transfer/cash" class="input" />
        <button class="btn-primary btn-sm shrink-0">Catat</button>
      </form>
      <ul class="text-sm space-y-1">
        <li v-for="p in payments" :key="p.id" class="flex justify-between border-b border-slate-100 py-1">
          <span>{{ fmt(p.amount) }} <span class="text-slate-400">({{ p.method ?? "-" }})</span></span>
          <span class="text-xs text-slate-400">{{ fmtDate(p.paidAt) }}</span>
        </li>
      </ul>
      <p v-if="!payments.length" class="empty !py-4">Belum ada pembayaran.</p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { api } from "../api/client";

const route = useRoute();
const id = route.params.id as string;
const inv = ref<{ number: string; status: string } | null>(null);
const meta = ref<Record<string, number>>({});
const items = ref<{ id: string; description: string; quantity: string; unitPrice: string }[]>([]);
const payments = ref<{ id: string; amount: string; method?: string; paidAt: string }[]>([]);
const error = ref("");
const amount = ref("");
const method = ref("");

const badge = computed(() => inv.value?.status === "paid" ? "badge-green" : "badge-slate");
function fmt(v: unknown) { return Number(v ?? 0).toLocaleString("id-ID"); }
function fmtDate(s: string) { return new Date(s).toLocaleString("id-ID"); }

async function load() {
  error.value = "";
  try {
    const r = await api.invoiceDetail(id);
    inv.value = r.data as typeof inv.value;
    meta.value = (r.meta ?? {}) as Record<string, number>;
    items.value = (r.meta?.items ?? []) as typeof items.value;
    payments.value = (r.meta?.payments ?? []) as typeof payments.value;
  } catch (e) { error.value = (e as Error).message; }
}
async function pay() {
  error.value = "";
  try {
    await api.payInvoice(id, { amount: amount.value, method: method.value || undefined });
    amount.value = "";
    method.value = "";
    await load();
  } catch (e) { error.value = (e as Error).message; }
}
async function setStatus(s: string) {
  error.value = "";
  try {
    await api.invoiceStatus(id, s);
    await load();
  } catch (e) { error.value = (e as Error).message; }
}
onMounted(load);
</script>
