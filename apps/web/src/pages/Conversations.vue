<template>
  <div class="flex flex-col md:flex-row gap-4 md:h-[calc(100vh-140px)]">
    <!-- Daftar percakapan -->
    <div class="card w-full md:w-80 shrink-0 flex flex-col overflow-hidden">
      <div class="p-3 border-b border-slate-100 flex gap-2">
        <select v-model="filter" @change="load" class="input !py-1.5 !text-xs">
          <option value="">Semua status</option>
          <option value="open">Open</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
        </select>
        <button @click="modalNew = true" class="btn-primary btn-sm shrink-0">Baru</button>
      </div>
      <p v-if="error" class="text-rose-600 text-xs p-3">{{ error }}</p>
      <div class="flex-1 overflow-auto divide-y divide-slate-100">
        <button
          v-for="c in list" :key="c.id" @click="select(c)"
          class="w-full text-left p-3 hover:bg-slate-50 flex gap-3"
          :class="selected?.id === c.id ? 'bg-indigo-50' : ''"
        >
          <span class="avatar" :class="c.status === 'open' ? 'bg-emerald-500' : c.status === 'pending' ? 'bg-amber-500' : 'bg-slate-400'">
            <User :size="16" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="flex justify-between gap-2">
              <strong class="text-sm truncate">{{ c.contactName || c.contactId?.slice(0, 8) || "Tanpa kontak" }}</strong>
              <span class="text-[11px] text-slate-400 shrink-0">{{ timeAgo(c.lastMessageAt) }}</span>
            </span>
            <span class="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <span class="w-1.5 h-1.5 rounded-full inline-block" :class="dot(c.status)" />
              {{ c.status }}{{ c.awaitingSince ? " · menunggu balasan" : "" }}
            </span>
          </span>
        </button>
        <p v-if="!list.length" class="empty">Belum ada percakapan.</p>
      </div>
    </div>

    <!-- Thread -->
    <div class="card flex-1 flex flex-col overflow-hidden min-h-[50vh]">
      <template v-if="selected">
        <div class="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <strong>{{ selected.contactName || "Percakapan" }}</strong>
          <span :class="'badge-' + (selected.status === 'open' ? 'green' : selected.status === 'pending' ? 'amber' : 'slate')">{{ selected.status }}</span>
          <div class="flex-1" />
          <select :value="selected.status" @change="setStatus(($event.target as HTMLSelectElement).value)" class="input !w-auto !py-1 !text-xs">
            <option value="open">open</option><option value="pending">pending</option><option value="resolved">resolved</option>
          </select>
        </div>
        <div ref="threadBox" class="flex-1 overflow-auto p-4 space-y-2 bg-slate-50">
          <div v-for="m in messages" :key="m.id" class="flex" :class="m.direction === 'outbound' ? 'justify-end' : 'justify-start'">
            <div class="max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm"
              :class="m.direction === 'outbound' ? 'bg-indigo-600 text-white rounded-br-md' : 'bg-white border border-slate-200 rounded-bl-md'">
              {{ m.body }}
              <div class="text-[10px] mt-1 opacity-70 flex gap-1 items-center" :class="m.direction === 'outbound' ? 'justify-end' : ''">
                {{ fmtTime(m.createdAt) }}
                <span v-if="m.direction === 'outbound'">{{ m.status === 'failed' ? 'gagal' : '✓' }}</span>
              </div>
            </div>
          </div>
          <p v-if="!messages.length" class="empty">Belum ada pesan. Mulai percakapan di bawah.</p>
        </div>
        <form @submit.prevent="send" class="p-3 border-t border-slate-100 flex gap-2">
          <input v-model="draft" placeholder="Tulis balasan..." class="input" :disabled="selected.status === 'resolved'" />
          <button class="btn-primary shrink-0" :disabled="!draft.trim()"><Send :size="16" /></button>
        </form>
      </template>
      <p v-else class="empty m-auto">Pilih percakapan di kiri untuk mulai membalas.</p>
    </div>
  </div>

  <Modal :open="modalNew" title="Percakapan baru" @close="modalNew = false">
    <form @submit.prevent="create" class="space-y-3">
      <div><label class="label">Channel *</label>
        <select v-model="newForm.channel_id" class="input">
          <option value="">Pilih channel…</option>
          <option v-for="ch in channels" :key="ch.id" :value="ch.id">{{ ch.name }} ({{ ch.type }})</option>
        </select>
      </div>
      <div><label class="label">Contact ID (opsional)</label><input v-model="newForm.contact_id" class="input" placeholder="UUID kontak" /></div>
      <p v-if="formError" class="text-rose-600 text-sm">{{ formError }}</p>
      <button class="btn-primary w-full">Buat</button>
    </form>
  </Modal>
</template>
<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import { Send, User } from "lucide-vue-next";
import { api } from "../api/client";
import Modal from "../components/Modal.vue";

interface Conv { id: string; contactId?: string; contactName?: string; status: string; lastMessageAt?: string; awaitingSince?: string }
interface Msg { id: string; direction: string; body: string; status: string; createdAt: string }

const list = ref<Conv[]>([]);
const messages = ref<Msg[]>([]);
const selected = ref<Conv | null>(null);
const channels = ref<{ id: string; name: string; type: string }[]>([]);
const filter = ref("");
const error = ref("");
const formError = ref("");
const draft = ref("");
const modalNew = ref(false);
const newForm = ref({ channel_id: "", contact_id: "" });
const threadBox = ref<HTMLElement | null>(null);

function dot(s: string) { return s === "open" ? "bg-emerald-500" : s === "pending" ? "bg-amber-500" : "bg-slate-400"; }
function fmtTime(s: string) { return new Date(s).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" }); }
function timeAgo(s?: string) {
  if (!s) return "";
  const m = Math.round((Date.now() - new Date(s).getTime()) / 60000);
  if (m < 1) return "baru";
  if (m < 60) return `${m} mnt`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} jam`;
  return `${Math.round(h / 24)} hari`;
}

async function load() {
  error.value = "";
  try {
    const [convs, chs, contactList] = await Promise.all([
      api.conversations(filter.value || undefined) as Promise<Conv[]>,
      api.waChannels().catch(() => []),
      api.contacts({ limit: 200 }).then((r) => r.list as { id: string; fullName: string }[]).catch(() => []),
    ]);
    const names = new Map(contactList.map((c) => [c.id, c.fullName]));
    list.value = convs.map((c) => ({ ...c, contactName: c.contactId ? names.get(c.contactId) : undefined }));
    channels.value = chs as typeof channels.value;
    if (selected.value) {
      const upd = list.value.find((c) => c.id === selected.value!.id);
      if (upd) selected.value = upd;
    }
  } catch (e) { error.value = (e as Error).message; }
}

async function select(c: Conv) {
  selected.value = c;
  messages.value = [];
  try {
    messages.value = (await api.convMessages(c.id)) as Msg[];
    await nextTick();
    threadBox.value?.scrollTo({ top: threadBox.value.scrollHeight });
  } catch (e) { error.value = (e as Error).message; }
}

async function send() {
  if (!selected.value || !draft.value.trim()) return;
  const body = draft.value;
  draft.value = "";
  try {
    const m = (await api.replyConversation(selected.value.id, body)) as Msg;
    messages.value.push(m);
    await nextTick();
    threadBox.value?.scrollTo({ top: threadBox.value.scrollHeight });
    await load();
  } catch (e) { error.value = (e as Error).message; }
}

async function setStatus(s: string) {
  if (!selected.value) return;
  try {
    await api.updateConversation(selected.value.id, { status: s });
    await load();
  } catch (e) { error.value = (e as Error).message; }
}

async function create() {
  formError.value = "";
  try {
    const p: Record<string, string> = { channel_id: newForm.value.channel_id };
    if (newForm.value.contact_id) p.contact_id = newForm.value.contact_id;
    const c = (await api.createConversation(p)) as Conv;
    modalNew.value = false;
    newForm.value = { channel_id: "", contact_id: "" };
    await load();
    const found = list.value.find((x) => x.id === c.id);
    if (found) await select(found);
  } catch (e) { formError.value = (e as Error).message; }
}

onMounted(load);
</script>
