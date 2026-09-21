<template>
  <div class="flex flex-col xl:flex-row gap-4 xl:h-[calc(100vh-140px)]">
    <!-- Panel 1: list chat -->
    <div class="card w-full xl:w-72 shrink-0 flex flex-col overflow-hidden">
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
      <div class="flex-1 overflow-auto divide-y divide-slate-100 min-h-[20vh]">
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
              <strong class="text-sm truncate">{{ c.contactName || "Tanpa kontak" }}</strong>
              <span class="text-[11px] text-slate-400 shrink-0">{{ timeAgo(c.lastMessageAt) }}</span>
            </span>
            <span class="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <span class="w-1.5 h-1.5 rounded-full inline-block" :class="dot(c.status)" />
              {{ c.status }}{{ c.awaitingSince ? " · menunggu" : "" }}
            </span>
          </span>
        </button>
        <p v-if="!list.length" class="empty">Belum ada percakapan.</p>
      </div>
    </div>

    <!-- Panel 2: isi chat -->
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

    <!-- Panel 3: ticketing (profile / ticket / history) -->
    <div class="card w-full xl:w-80 shrink-0 flex-col overflow-hidden hidden xl:flex">
      <template v-if="selected">
        <div class="flex border-b border-slate-100">
          <button v-for="t in sideTabs" :key="t.key" @click="sideTab = t.key"
            class="tab-btn flex-1" :class="sideTab === t.key ? 'tab-active' : ''">{{ t.label }}</button>
        </div>
        <div class="flex-1 overflow-auto p-4">
          <!-- PROFILE -->
          <div v-if="sideTab === 'profile'">
            <div v-if="contact" class="space-y-3">
              <div class="flex items-center gap-3">
                <span class="avatar bg-gradient-to-br from-indigo-500 to-violet-500 text-sm">{{ contactInitials }}</span>
                <div>
                  <div class="font-bold">{{ contact.fullName }}</div>
                  <div class="text-xs text-slate-400">Sejak {{ fmtDate(contact.createdAt) }}</div>
                </div>
              </div>
              <div class="ticket-form">
                <div><label class="label">Nama</label><input v-model="profileForm.full_name" class="input !py-1.5 !text-xs" /></div>
                <div class="grid grid-cols-2 gap-2">
                  <div><label class="label">Email</label><input v-model="profileForm.email" class="input !py-1.5 !text-xs" /></div>
                  <div><label class="label">HP</label><input v-model="profileForm.phone" class="input !py-1.5 !text-xs" /></div>
                </div>
                <div><label class="label">Perusahaan</label><input v-model="profileForm.company_name" class="input !py-1.5 !text-xs" /></div>
                <div><label class="label">Sumber</label><input v-model="profileForm.source" class="input !py-1.5 !text-xs" /></div>
                <div><label class="label">Catatan</label><textarea v-model="profileForm.notes" rows="2" class="input !py-1.5 !text-xs" /></div>
              </div>
              <button @click="saveProfile" class="btn-primary btn-sm w-full">Simpan profil</button>
              <p v-if="sideMsg" class="text-xs text-emerald-600">{{ sideMsg }}</p>
            </div>
            <p v-else class="empty">Percakapan ini belum terhubung ke kontak.</p>
          </div>
          <!-- TICKET -->
          <div v-if="sideTab === 'ticket'">
            <form @submit.prevent="createTicket" class="ticket-form">
              <div class="ticket-section">
                <div class="ticket-section-title">Tiket baru</div>
                <div><label class="label">Subjek *</label><input v-model="ticketForm.subject" required class="input !py-1.5 !text-xs" /></div>
                <div><label class="label">Deskripsi</label><textarea v-model="ticketForm.description" rows="2" class="input !py-1.5 !text-xs" /></div>
                <div class="grid grid-cols-2 gap-2">
                  <div><label class="label">Prioritas</label>
                    <select v-model="ticketForm.priority" class="input !py-1.5 !text-xs">
                      <option value="low">low</option><option value="medium">medium</option><option value="urgent">urgent</option>
                    </select>
                  </div>
                  <div class="flex items-end"><button class="btn-primary btn-sm w-full">Buat</button></div>
                </div>
              </div>
            </form>
            <div class="ticket-section-title mt-4">Tiket kontak ini ({{ contactTickets.length }})</div>
            <ul class="space-y-2">
              <li v-for="t in contactTickets" :key="t.id" class="text-xs border border-slate-200 rounded-xl px-3 py-2 flex justify-between gap-2">
                <span><strong class="font-mono">{{ t.number }}</strong> — {{ t.subject }}</span>
                <RouterLink :to="`/tickets/${t.id}`" class="text-indigo-600 font-semibold shrink-0">Buka</RouterLink>
              </li>
            </ul>
            <p v-if="!contactTickets.length" class="empty !py-4">Belum ada tiket.</p>
          </div>
          <!-- HISTORY -->
          <div v-if="sideTab === 'history'">
            <div class="ticket-section-title">Percakapan lain ({{ otherConvs.length }})</div>
            <ul class="space-y-1.5 text-xs mb-4">
              <li v-for="c in otherConvs" :key="c.id" class="border border-slate-200 rounded-xl px-3 py-2 flex justify-between">
                <span>{{ c.status }} · {{ timeAgo(c.lastMessageAt) }}</span>
                <button @click="select(c)" class="text-indigo-600 font-semibold">Buka</button>
              </li>
            </ul>
            <div class="ticket-section-title">Tiket ({{ contactTickets.length }})</div>
            <ul class="space-y-1.5 text-xs">
              <li v-for="t in contactTickets" :key="t.id" class="border border-slate-200 rounded-xl px-3 py-2 flex justify-between">
                <span><strong class="font-mono">{{ t.number }}</strong> · {{ t.status }}</span>
                <RouterLink :to="`/tickets/${t.id}`" class="text-indigo-600 font-semibold">Buka</RouterLink>
              </li>
            </ul>
            <p v-if="!otherConvs.length && !contactTickets.length" class="empty !py-4">Belum ada riwayat.</p>
          </div>
        </div>
      </template>
      <p v-else class="empty m-auto">Pilih chat untuk melihat profil, tiket & riwayat.</p>
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
import { ref, computed, onMounted, nextTick } from "vue";
import { Send, User } from "lucide-vue-next";
import { api } from "../api/client";
import Modal from "../components/Modal.vue";

interface Conv { id: string; contactId?: string; contactName?: string; status: string; lastMessageAt?: string; awaitingSince?: string }
interface Msg { id: string; direction: string; body: string; status: string; createdAt: string }
interface Contact { id: string; fullName: string; email?: string; phone?: string; companyName?: string; source?: string; notes?: string; createdAt: string }
interface Ticket { id: string; number: string; subject: string; status: string; contactId?: string }

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

const sideTabs = [
  { key: "profile", label: "Profil" },
  { key: "ticket", label: "Tiket" },
  { key: "history", label: "Riwayat" },
];
const sideTab = ref("profile");
const contact = ref<Contact | null>(null);
const profileForm = ref({ full_name: "", email: "", phone: "", company_name: "", source: "", notes: "" });
const contactTickets = ref<Ticket[]>([]);
const ticketForm = ref({ subject: "", description: "", priority: "medium" });
const sideMsg = ref("");

const contactInitials = computed(() =>
  (contact.value?.fullName ?? "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase(),
);
const otherConvs = computed(() =>
  list.value.filter((c) => selected.value && c.id !== selected.value.id && c.contactId && c.contactId === selected.value.contactId),
);

function dot(s: string) { return s === "open" ? "bg-emerald-500" : s === "pending" ? "bg-amber-500" : "bg-slate-400"; }
function fmtTime(s: string) { return new Date(s).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" }); }
function fmtDate(s: string) { return new Date(s).toLocaleDateString("id-ID"); }
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

async function loadSide() {
  contact.value = null;
  contactTickets.value = [];
  sideMsg.value = "";
  if (!selected.value?.contactId) return;
  try {
    const [c, t] = await Promise.all([
      api.getContact(selected.value.contactId) as Promise<Contact>,
      api.tickets() as Promise<Ticket[]>,
    ]);
    contact.value = c;
    profileForm.value = {
      full_name: c.fullName ?? "", email: c.email ?? "", phone: c.phone ?? "",
      company_name: c.companyName ?? "", source: c.source ?? "", notes: c.notes ?? "",
    };
    contactTickets.value = t.filter((x) => x.contactId === selected.value!.contactId);
  } catch (e) { error.value = (e as Error).message; }
}

async function select(c: Conv) {
  selected.value = c;
  messages.value = [];
  sideTab.value = "profile";
  try {
    messages.value = (await api.convMessages(c.id)) as Msg[];
    await loadSide();
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

async function saveProfile() {
  if (!contact.value) return;
  sideMsg.value = "";
  try {
    const p: Record<string, string> = { full_name: profileForm.value.full_name };
    for (const k of ["email", "phone", "company_name", "source", "notes"] as const) {
      if (profileForm.value[k]) p[k] = profileForm.value[k];
    }
    await api.updateContact(contact.value.id, p);
    sideMsg.value = "Profil tersimpan.";
    await load();
    await loadSide();
  } catch (e) { error.value = (e as Error).message; }
}

async function createTicket() {
  if (!ticketForm.value.subject.trim()) return;
  error.value = "";
  try {
    const p: Record<string, string> = { subject: ticketForm.value.subject, priority: ticketForm.value.priority };
    if (ticketForm.value.description) p.description = ticketForm.value.description;
    if (selected.value?.contactId) p.contact_id = selected.value.contactId;
    await api.createTicket(p);
    ticketForm.value = { subject: "", description: "", priority: "medium" };
    await loadSide();
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
