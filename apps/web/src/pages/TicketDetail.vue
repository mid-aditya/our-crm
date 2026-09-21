<template>
  <RouterLink to="/tickets" class="text-sm text-slate-500 hover:text-slate-800">← Kembali</RouterLink>
  <h1 class="page-title mt-1">{{ isNew ? "Tiket baru" : ticket?.number }}</h1>

  <div v-if="isNew" class="card-pad mt-4 max-w-xl">
    <form @submit.prevent="create" class="space-y-3">
      <div><label class="label">Subjek *</label><input v-model="form.subject" required class="input" /></div>
      <div><label class="label">Deskripsi</label><textarea v-model="form.description" rows="4" class="input" /></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="label">Prioritas</label>
          <select v-model="form.priority" class="input"><option value="low">low</option><option value="medium">medium</option><option value="urgent">urgent</option></select>
        </div>
        <div><label class="label">Contact ID (opsional)</label><input v-model="form.contact_id" class="input" placeholder="UUID" /></div>
      </div>
      <p v-if="error" class="text-rose-600 text-sm">{{ error }}</p>
      <button class="btn-primary w-full">Buat tiket</button>
    </form>
  </div>

  <div v-else class="grid lg:grid-cols-3 gap-4 mt-4">
    <div class="lg:col-span-2 card-pad">
      <h2 class="font-bold">{{ ticket?.subject }}</h2>
      <p class="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{{ ticket?.description || "—" }}</p>
      <h3 class="font-semibold text-sm mt-5 mb-2">Balasan ({{ replies.length }})</h3>
      <div class="space-y-2">
        <div v-for="r in replies" :key="r.id" class="rounded-xl px-3 py-2 text-sm"
          :class="r.authorType === 'agent' ? 'bg-indigo-50 border border-indigo-100' : 'bg-slate-50 border border-slate-200'">
          <span class="badge-slate mr-2">{{ r.authorType }}</span>{{ r.body }}
          <div class="text-[11px] text-slate-400 mt-1">{{ fmtDate(r.createdAt) }}</div>
        </div>
        <p v-if="!replies.length" class="empty !py-4">Belum ada balasan.</p>
      </div>
      <form @submit.prevent="reply" class="flex gap-2 mt-3">
        <input v-model="draft" placeholder="Tulis balasan..." class="input" />
        <button class="btn-primary btn-sm shrink-0">Kirim</button>
      </form>
    </div>
    <div class="card-pad h-fit">
      <h3 class="font-semibold text-sm mb-3">Pengaturan</h3>
      <label class="label">Status</label>
      <select :value="ticket?.status" @change="update({ status: ($event.target as HTMLSelectElement).value })" class="input mb-3">
        <option value="open">open</option><option value="pending">pending</option>
        <option value="resolved">resolved</option><option value="closed">closed</option>
      </select>
      <label class="label">Prioritas</label>
      <select :value="ticket?.priority" @change="update({ priority: ($event.target as HTMLSelectElement).value })" class="input mb-3">
        <option value="low">low</option><option value="medium">medium</option><option value="urgent">urgent</option>
      </select>
      <label class="label">Assignee (User ID)</label>
      <div class="flex gap-2">
        <input v-model="assignee" :placeholder="ticket?.assigneeId || 'UUID'" class="input" />
        <button @click="update({ assignee_id: assignee || null })" class="btn-secondary btn-sm shrink-0">Set</button>
      </div>
    </div>
  </div>
  <p v-if="error && !isNew" class="error-box mt-4">{{ error }}</p>
</template>
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api } from "../api/client";

const props = defineProps<{ isNew?: boolean }>();
const route = useRoute();
const router = useRouter();
const id = route.params.id as string;
const ticket = ref<{ number: string; subject: string; description?: string; status: string; priority: string; assigneeId?: string } | null>(null);
const replies = ref<{ id: string; body: string; authorType: string; createdAt: string }[]>([]);
const error = ref("");
const draft = ref("");
const assignee = ref("");
const form = ref({ subject: "", description: "", priority: "medium", contact_id: "" });

function fmtDate(s: string) { return new Date(s).toLocaleString("id-ID"); }

async function load() {
  if (props.isNew) return;
  error.value = "";
  try {
    const r = await api.ticketDetail(id);
    ticket.value = r.data as typeof ticket.value;
    replies.value = r.replies as typeof replies.value;
  } catch (e) { error.value = (e as Error).message; }
}
async function create() {
  error.value = "";
  try {
    const p: Record<string, string> = { subject: form.value.subject, priority: form.value.priority };
    if (form.value.description) p.description = form.value.description;
    if (form.value.contact_id) p.contact_id = form.value.contact_id;
    const t = (await api.createTicket(p)) as { id: string };
    router.push(`/tickets/${t.id}`);
  } catch (e) { error.value = (e as Error).message; }
}
async function reply() {
  if (!draft.value.trim()) return;
  error.value = "";
  try {
    await api.replyTicket(id, draft.value);
    draft.value = "";
    await load();
  } catch (e) { error.value = (e as Error).message; }
}
async function update(v: object) {
  error.value = "";
  try {
    await api.updateTicket(id, v);
    assignee.value = "";
    await load();
  } catch (e) { error.value = (e as Error).message; }
}
onMounted(load);
</script>
