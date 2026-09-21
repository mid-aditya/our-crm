<template>
  <div class="min-h-screen bg-slate-100 text-slate-900 flex">
    <aside class="shrink-0 bg-slate-900 text-slate-300 flex-col hidden md:flex transition-all" :class="collapsed ? 'w-16' : 'w-64'">
      <div class="px-4 py-5 flex items-center gap-3 border-b border-white/10" :class="collapsed ? 'justify-center px-0' : ''">
        <div class="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-950 shrink-0">
          <MessageSquareText :size="22" />
        </div>
        <div v-if="!collapsed">
          <div class="font-bold text-white tracking-tight">CRM Suite</div>
          <div class="text-[11px] text-slate-400">WhatsApp · Tiket · Sales</div>
        </div>
      </div>
      <button @click="toggle" :title="collapsed ? 'Buka sidebar' : 'Minimize sidebar'"
        class="mx-3 mt-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 flex items-center gap-2 text-xs">
        <component :is="collapsed ? PanelLeftOpen : PanelLeftClose" :size="16" />
        <span v-if="!collapsed">Minimize</span>
      </button>
      <nav class="flex-1 overflow-auto px-3 py-2 space-y-5">
        <div v-for="g in groups" :key="g.label">
          <div v-if="!collapsed" class="px-3 mb-1.5 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">{{ g.label }}</div>
          <div class="space-y-0.5">
            <RouterLink
              v-for="l in g.links"
              :key="l.to"
              :to="l.to"
              :title="l.label"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-white/10 hover:text-white transition-colors"
              :class="collapsed ? 'justify-center' : ''"
              active-class="bg-indigo-600 text-white shadow-md shadow-indigo-950"
            ><component :is="l.icon" :size="18" /><span v-if="!collapsed">{{ l.label }}</span></RouterLink>
          </div>
        </div>
      </nav>
      <div class="p-3 border-t border-white/10">
        <div class="flex items-center gap-3 px-2 py-2" :class="collapsed ? 'justify-center px-0' : ''">
          <div class="avatar bg-indigo-500 shrink-0">{{ initial }}</div>
          <div v-if="!collapsed" class="min-w-0 flex-1">
            <div class="text-sm font-semibold text-white truncate">{{ email || "Agent" }}</div>
            <div class="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />Online
            </div>
          </div>
          <button v-if="!collapsed" @click="logout" title="Keluar" class="text-slate-400 hover:text-rose-400 p-1"><LogOut :size="18" /></button>
        </div>
        <button v-if="collapsed" @click="logout" title="Keluar" class="w-full flex justify-center text-slate-400 hover:text-rose-400 p-2"><LogOut :size="18" /></button>
      </div>
    </aside>

    <div class="flex-1 min-w-0 flex flex-col">
      <header class="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center gap-3 sticky top-0 z-30">
        <details class="relative md:hidden">
          <summary class="cursor-pointer btn-secondary btn-sm list-none">Menu</summary>
          <nav class="absolute z-40 mt-2 w-56 bg-white border rounded-xl shadow-lg p-2 space-y-0.5 text-sm max-h-[70vh] overflow-auto">
            <RouterLink v-for="l in flatLinks" :key="l.to" :to="l.to" class="nav-link">{{ l.label }}</RouterLink>
          </nav>
        </details>
        <div class="md:hidden font-bold">CRM Suite</div>
        <div class="hidden md:block text-sm text-slate-500">Pusat kendali customer & sales</div>
        <div class="flex-1" />
        <RouterLink to="/tickets/new" class="btn-secondary btn-sm">Buat tiket</RouterLink>
      </header>
      <main class="p-4 md:p-6 w-full max-w-6xl mx-auto">
        <RouterView />
      </main>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import {
  LayoutDashboard, Users, MessageCircle, Megaphone, Ticket, BarChart3,
  Trophy, Handshake, LogOut, MessageSquareText, NotebookPen,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-vue-next";
import { useAuthStore } from "../stores/auth";

const groups = [
  { label: "Utama", links: [{ to: "/", label: "Dashboard", icon: LayoutDashboard }] },
  { label: "Komunikasi", links: [
    { to: "/conversations", label: "Percakapan", icon: MessageCircle },
    { to: "/campaigns", label: "Blasting", icon: Megaphone },
    { to: "/tickets", label: "Tiket", icon: Ticket },
  ]},
  { label: "Sales", links: [
    { to: "/contacts", label: "Kontak", icon: Users },
    { to: "/deals", label: "Deals", icon: Handshake },
    { to: "/activities", label: "Aktivitas", icon: NotebookPen },
  ]},
  { label: "Insight", links: [
    { to: "/reports", label: "Laporan", icon: BarChart3 },
    { to: "/performance", label: "Performa Agent", icon: Trophy },
  ]},
];
const flatLinks = computed(() => [...groups.flatMap((g) => g.links), { to: "/settings", label: "Pengaturan" }]);

const auth = useAuthStore();
const router = useRouter();
const collapsed = ref(localStorage.getItem("sidebar_collapsed") === "1");
function toggle() {
  collapsed.value = !collapsed.value;
  localStorage.setItem("sidebar_collapsed", collapsed.value ? "1" : "0");
}
const email = computed(() => auth.email);
const initial = computed(() => (auth.email?.[0] ?? "A").toUpperCase());
function logout() {
  auth.logout();
  router.push("/login");
}
</script>
