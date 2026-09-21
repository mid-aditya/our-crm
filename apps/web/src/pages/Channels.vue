<template>
  <div class="flex items-center justify-between">
    <div>
      <h1 class="page-title">Channel WhatsApp</h1>
      <p class="page-sub">Official (Meta Cloud API) & unofficial (gateway). Token disensor saat ditampilkan.</p>
    </div>
    <button @click="openCreate" class="btn-primary btn-sm">Tambah channel</button>
  </div>
  <p v-if="error" class="error-box mt-3">{{ error }}</p>
  <div class="grid md:grid-cols-2 gap-3 mt-3">
    <div v-for="c in list" :key="c.id" class="card-pad">
      <div class="flex justify-between items-start">
        <div>
          <strong>{{ c.name }}</strong>
          <div class="mt-1"><span :class="c.type === 'official' ? 'badge-green' : 'badge-amber'">{{ c.type }}</span></div>
        </div>
        <span class="badge-slate">{{ c.status }}</span>
      </div>
      <div class="mt-3 text-xs bg-slate-900 text-slate-200 rounded-xl p-3 font-mono">
        <div class="text-slate-400 mb-1">Webhook inbound untuk gateway/Meta:</div>
        POST /api/v1/wa-webhook/{{ c.id }}<br />
        <span class="text-slate-400">header: X-Company-Id: &lt;company_id&gt;</span><br />
        <span class="text-slate-400">body: {"from": "628..", "text": "..."}</span>
      </div>
    </div>
  </div>
  <p v-if="!list.length" class="empty">Belum ada channel. Tambahkan satu untuk mulai.</p>

  <Modal :open="modal" title="Channel baru" @close="modal = false">
    <form @submit.prevent="save" class="space-y-2">
      <div><label class="label">Nama *</label><input v-model="form.name" required class="input" placeholder="CS Utama" /></div>
      <div><label class="label">Tipe *</label>
        <select v-model="form.type" class="input">
          <option value="unofficial">Unofficial (gateway Baileys)</option>
          <option value="official">Official (Meta Cloud API)</option>
        </select>
      </div>
      <div v-if="form.type === 'official'" class="space-y-2">
        <div><label class="label">Phone Number ID *</label><input v-model="form.phone_number_id" class="input" /></div>
        <div><label class="label">Access Token *</label><input v-model="form.access_token" type="password" class="input" /></div>
      </div>
      <div v-else class="space-y-2">
        <div><label class="label">Gateway URL *</label><input v-model="form.gateway_url" class="input" placeholder="http://localhost:8080" /></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="label">API Key</label><input v-model="form.api_key" class="input" /></div>
          <div><label class="label">Session</label><input v-model="form.session" class="input" placeholder="default" /></div>
        </div>
      </div>
      <p v-if="formError" class="text-rose-600 text-sm">{{ formError }}</p>
      <button class="btn-primary w-full">Simpan</button>
    </form>
  </Modal>
</template>
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../api/client";
import Modal from "../components/Modal.vue";

const list = ref<{ id: string; name: string; type: string; status: string }[]>([]);
const error = ref("");
const modal = ref(false);
const formError = ref("");
const form = ref({ name: "", type: "unofficial", phone_number_id: "", access_token: "", gateway_url: "", api_key: "", session: "" });

async function load() {
  error.value = "";
  try { list.value = (await api.waChannels()) as typeof list.value; }
  catch (e) { error.value = (e as Error).message; }
}
function openCreate() {
  form.value = { name: "", type: "unofficial", phone_number_id: "", access_token: "", gateway_url: "", api_key: "", session: "" };
  formError.value = "";
  modal.value = true;
}
async function save() {
  formError.value = "";
  try {
    const config: Record<string, string> = {};
    if (form.value.type === "official") {
      if (!form.value.phone_number_id || !form.value.access_token) throw new Error("Phone Number ID & Access Token wajib");
      config.phone_number_id = form.value.phone_number_id;
      config.access_token = form.value.access_token;
    } else {
      if (!form.value.gateway_url) throw new Error("Gateway URL wajib");
      config.gateway_url = form.value.gateway_url;
      if (form.value.api_key) config.api_key = form.value.api_key;
      if (form.value.session) config.session = form.value.session;
    }
    await api.createChannel({ name: form.value.name, type: form.value.type, config });
    modal.value = false;
    await load();
  } catch (e) { formError.value = (e as Error).message; }
}
onMounted(load);
</script>
