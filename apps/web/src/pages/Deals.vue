<template>
  <h1 class="page-title">Deals</h1>
  <p class="page-sub">Pipeline penjualan per stage.</p>
  <div class="toolbar mt-3">
    <button @click="openCreate" class="btn-primary btn-sm">+ Tambah deal</button>
  </div>
  <p v-if="error" class="error-box">{{ error }}</p>
  <div class="grid md:grid-cols-5 gap-3">
    <div v-for="(s, i) in stages" :key="s.id" class="kanban-col">
      <div class="flex items-center gap-2 font-bold text-sm mb-2">
        <span class="w-2.5 h-2.5 rounded-full" :class="stageDot(i)" />{{ s.name }}
        <span class="badge-slate ml-auto">{{ grouped[s.id]?.length ?? 0 }}</span>
      </div>
      <div class="space-y-2">
        <div v-for="d in grouped[s.id] ?? []" :key="d.id" class="kanban-card">
          <div class="font-semibold">{{ d.title }}</div>
          <div class="text-emerald-700 font-bold text-xs mt-0.5">Rp{{ fmtMoney(d.value) }}</div>
          <div class="flex gap-1 mt-2">
            <select :value="d.stageId" @change="move(d, ($event.target as HTMLSelectElement).value)" class="input !py-1 !text-xs">
              <option v-for="st in stages" :key="st.id" :value="st.id">{{ st.name }}</option>
            </select>
            <button @click="remove(d)" title="Hapus" class="btn-danger btn-sm">×</button>
          </div>
        </div>
        <p v-if="!(grouped[s.id]?.length)" class="text-xs text-slate-400 text-center py-3">— kosong —</p>
      </div>
    </div>
  </div>
  <div class="card-pad mt-3">
    <h2 class="font-semibold text-sm mb-2">Deal tanpa stage / status lain</h2>
    <ul class="text-sm space-y-1">
      <li v-for="d in ungrouped" :key="d.id" class="flex justify-between border-b border-slate-100 py-1">
        <span>{{ d.title }} ({{ d.status }})</span>
        <button @click="remove(d)" class="text-red-600 text-xs">hapus</button>
      </li>
    </ul>
    <p v-if="!ungrouped.length" class="empty !py-4">Tidak ada.</p>
  </div>
  <Modal :open="modal" title="Tambah deal" @close="modal = false">
    <form @submit.prevent="save" class="space-y-2">
      <div><label class="label">Judul *</label><input v-model="form.title" required class="input" /></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="label">Nilai</label><input v-model="form.value" class="input" placeholder="5000000" /></div>
        <div><label class="label">Stage</label>
          <select v-model="form.stage_id" class="input"><option value="">—</option><option v-for="s in stages" :key="s.id" :value="s.id">{{ s.name }}</option></select>
        </div>
      </div>
      <p v-if="formError" class="text-red-600 text-sm">{{ formError }}</p>
      <button class="btn-primary w-full">Simpan</button>
    </form>
  </Modal>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { api } from "../api/client";
import Modal from "../components/Modal.vue";

interface Deal { id: string; title: string; value: string; currency: string; stageId?: string; status: string }
interface Stage { id: string; name: string }

const deals = ref<Deal[]>([]);
const stages = ref<Stage[]>([]);
const error = ref("");
const modal = ref(false);
const formError = ref("");
const form = ref({ title: "", value: "", stage_id: "" });

const grouped = computed(() => {
  const g: Record<string, Deal[]> = {};
  for (const d of deals.value) {
    if (d.stageId && stages.value.some((s) => s.id === d.stageId)) {
      (g[d.stageId] ??= []).push(d);
    }
  }
  return g;
});
const ungrouped = computed(() => deals.value.filter((d) => !d.stageId || !stages.value.some((s) => s.id === d.stageId)));

function fmtMoney(v: string) { return Number(v || 0).toLocaleString("id-ID"); }
const STAGE_DOTS = ["bg-sky-500", "bg-indigo-500", "bg-amber-500", "bg-emerald-500", "bg-rose-500"];
function stageDot(i: number) { return STAGE_DOTS[i % STAGE_DOTS.length]; }

async function load() {
  error.value = "";
  try {
    deals.value = (await api.deals()) as Deal[];
    stages.value = (await api.stages()) as Stage[];
  } catch (e) { error.value = (e as Error).message; }
}
function openCreate() { form.value = { title: "", value: "", stage_id: "" }; formError.value = ""; modal.value = true; }
async function save() {
  formError.value = "";
  try {
    const payload: Record<string, string> = { title: form.value.title };
    if (form.value.value) payload.value = form.value.value;
    if (form.value.stage_id) payload.stage_id = form.value.stage_id;
    await api.createDeal(payload);
    modal.value = false;
    await load();
  } catch (e) { formError.value = (e as Error).message; }
}
async function move(d: Deal, stageId: string) {
  try {
    await api.updateDeal(d.id, { stage_id: stageId });
    await load();
  } catch (e) { error.value = (e as Error).message; }
}
async function remove(d: Deal) {
  if (!confirm(`Hapus deal "${d.title}"?`)) return;
  try {
    await api.deleteDeal(d.id);
    await load();
  } catch (e) { error.value = (e as Error).message; }
}
onMounted(load);
</script>
