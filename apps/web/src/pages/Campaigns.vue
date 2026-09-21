<template>
  <div class="flex items-center justify-between">
    <div>
      <h1 class="page-title">Blasting</h1>
      <p class="page-sub">Kirim pesan massal WhatsApp dengan template variabel.</p>
    </div>
    <button @click="openCreate" class="btn-primary btn-sm">Buat campaign</button>
  </div>
  <p v-if="error" class="error-box mt-4">{{ error }}</p>
  <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
    <div v-for="c in list" :key="c.id" class="card-pad card-hover">
      <div class="flex justify-between items-start gap-2">
        <strong>{{ c.name }}</strong>
        <span :class="badge(c.status)">{{ c.status }}</span>
      </div>
      <p class="text-xs text-slate-500 mt-2 line-clamp-3 bg-slate-50 rounded-lg p-2 font-mono">{{ c.template }}</p>
      <div class="text-xs text-slate-500 mt-2">Terkirim {{ c.stats?.sent ?? 0 }} · Gagal {{ c.stats?.failed ?? 0 }} · Total {{ c.stats?.total ?? 0 }}</div>
      <div class="flex gap-2 mt-3">
        <button @click="preview(c)" class="btn-secondary btn-sm flex-1">Preview</button>
        <button v-if="c.status === 'draft'" @click="launch(c)" class="btn-primary btn-sm flex-1">Luncurkan</button>
        <button v-if="c.status !== 'sending'" @click="remove(c)" class="btn-danger btn-sm">Hapus</button>
      </div>
      <div v-if="prev?.id === c.id" class="mt-3 text-xs bg-indigo-50 border border-indigo-100 rounded-xl p-3">
        <div class="font-semibold text-indigo-900">Estimasi penerima: {{ prev.total }}</div>
        <div class="mt-1 text-slate-600">Contoh: “{{ prev.sample }}”</div>
      </div>
    </div>
  </div>
  <p v-if="!list.length" class="empty">Belum ada campaign.</p>

  <Modal :open="modal" title="Campaign baru" @close="modal = false">
    <form @submit.prevent="save" class="space-y-3">
      <div><label class="label">Nama *</label><input v-model="form.name" required class="input" placeholder="Promo Lebaran" /></div>
      <div><label class="label">Channel *</label>
        <select v-model="form.channel_id" class="input">
          <option value="">Pilih channel…</option>
          <option v-for="ch in channels" :key="ch.id" :value="ch.id">{{ ch.name }} ({{ ch.type }})</option>
        </select>
      </div>
      <div>
        <label class="label">Template * — klik variabel untuk sisipkan</label>
        <div class="flex flex-wrap gap-1.5 mb-2">
          <button v-for="v in varKeys" :key="v" type="button" @click="insertVar(v)" class="badge-blue hover:bg-indigo-200 font-mono">{{ varTag(v) }}</button>
        </div>
        <textarea ref="templateBox" v-model="form.template" required rows="4" class="input font-mono" placeholder="Halo {{nama}}, ada promo spesial..." />
      </div>
      <div class="ticket-section">
        <div class="ticket-section-title">Live preview</div>
        <div class="grid grid-cols-2 gap-2 mb-2">
          <input v-model="sample.nama" placeholder="nama" class="input !py-1 !text-xs" />
          <input v-model="sample.perusahaan" placeholder="perusahaan" class="input !py-1 !text-xs" />
        </div>
        <div class="bg-slate-900 text-white rounded-xl px-3.5 py-2.5 text-sm whitespace-pre-wrap max-w-[85%]">{{ rendered }}</div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="label">Filter sumber (opsional)</label><input v-model="form.source" class="input" placeholder="web" /></div>
        <div><label class="label">Jadwalkan (opsional)</label><input v-model="form.scheduled_at" type="datetime-local" class="input" /></div>
      </div>
      <p v-if="formError" class="text-rose-600 text-sm">{{ formError }}</p>
      <button class="btn-primary w-full">Simpan sebagai draft</button>
    </form>
  </Modal>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { api } from "../api/client";
import Modal from "../components/Modal.vue";

interface Campaign { id: string; name: string; template: string; status: string; stats?: { sent: number; failed: number; total: number } }
const list = ref<Campaign[]>([]);
const channels = ref<{ id: string; name: string; type: string }[]>([]);
const error = ref("");
const modal = ref(false);
const formError = ref("");
const form = ref({ name: "", channel_id: "", template: "", source: "", scheduled_at: "" });
const prev = ref<{ id: string; total: number; sample: string } | null>(null);
const varKeys = ["nama", "nama_lengkap", "perusahaan", "email", "hp"];
const sample = ref({ nama: "Budi", perusahaan: "PT Maju Jaya" });
const templateBox = ref<HTMLTextAreaElement | null>(null);

function renderLocal(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, key: string) => vars[key.toLowerCase()] ?? m);
}
const rendered = computed(() =>
  renderLocal(form.value.template || "Tulis template untuk melihat preview…", {
    nama: sample.value.nama,
    nama_lengkap: `${sample.value.nama} Santoso`,
    perusahaan: sample.value.perusahaan,
    email: "budi@example.id",
    hp: "+628123456789",
  }),
);
function varTag(v: string) {
  return "{{" + v + "}}";
}
function insertVar(v: string) {
  const el = templateBox.value;
  const tag = `{{${v}}}`;
  if (!el) {
    form.value.template += tag;
    return;
  }
  const start = el.selectionStart ?? form.value.template.length;
  const end = el.selectionEnd ?? start;
  form.value.template = form.value.template.slice(0, start) + tag + form.value.template.slice(end);
  requestAnimationFrame(() => {
    el.focus();
    el.selectionStart = el.selectionEnd = start + tag.length;
  });
}

function badge(s: string) {
  return s === "done" ? "badge-green" : s === "sending" ? "badge-blue" : "badge-slate";
}
async function load() {
  error.value = "";
  try {
    const [c, ch] = await Promise.all([api.campaigns(), api.waChannels().catch(() => [])]);
    list.value = c as Campaign[];
    channels.value = ch as typeof channels.value;
  } catch (e) { error.value = (e as Error).message; }
}
function openCreate() {
  form.value = { name: "", channel_id: "", template: "", source: "", scheduled_at: "" };
  formError.value = "";
  modal.value = true;
}
async function save() {
  formError.value = "";
  try {
    const p: Record<string, unknown> = {
      name: form.value.name, channel_id: form.value.channel_id, template: form.value.template,
      audience: form.value.source ? { source: form.value.source } : {},
    };
    if (form.value.scheduled_at) p.scheduled_at = new Date(form.value.scheduled_at).toISOString();
    await api.createCampaign(p);
    modal.value = false;
    await load();
  } catch (e) { formError.value = (e as Error).message; }
}
async function preview(c: Campaign) {
  error.value = "";
  try {
    const r = (await api.campaignPreview(c.id)) as { total: number; sample: string };
    prev.value = { id: c.id, ...r };
  } catch (e) { error.value = (e as Error).message; }
}
async function launch(c: Campaign) {
  if (!confirm(`Luncurkan "${c.name}" sekarang?`)) return;
  error.value = "";
  try {
    await api.launchCampaign(c.id);
    prev.value = null;
    await load();
  } catch (e) { error.value = (e as Error).message; }
}
async function remove(c: Campaign) {
  if (!confirm(`Hapus campaign "${c.name}"?`)) return;
  try {
    await api.deleteCampaign(c.id);
    await load();
  } catch (e) { error.value = (e as Error).message; }
}
onMounted(load);
</script>
