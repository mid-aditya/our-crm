<template>
  <div class="min-h-screen bg-slate-100 text-slate-900 flex">
    <!-- Sidebar desktop -->
    <aside class="w-64 shrink-0 bg-white border-r border-slate-200/70 flex-col hidden md:flex">
      <div class="px-5 py-5 flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-indigo-200">C</div>
        <div>
          <div class="font-extrabold tracking-tight">CRM Suite</div>
          <div class="text-[11px] text-slate-400 font-medium">ERP · CRM · HRM · PM</div>
        </div>
      </div>
      <nav class="flex-1 overflow-auto px-3 pb-3 space-y-5">
        <div v-for="g in groups" :key="g.label">
          <div class="px-3 mb-1.5 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">{{ g.label }}</div>
          <div class="space-y-0.5">
            <RouterLink
              v-for="l in g.links"
              :key="l.to"
              :to="l.to"
              class="nav-link"
              active-class="nav-active"
            ><span class="text-base w-5 text-center">{{ l.icon }}</span>{{ l.label }}</RouterLink>
          </div>
        </div>
      </nav>
      <div class="p-3 border-t border-slate-100">
        <div class="flex items-center gap-3 px-2 py-2">
          <div class="avatar bg-gradient-to-br from-indigo-500 to-violet-500">{{ initial }}</div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-semibold truncate">{{ email || "User" }}</div>
            <div class="text-[11px] text-emerald-600 font-medium flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />Online</div>
          </div>
          <button @click="logout" title="Keluar" class="text-slate-400 hover:text-rose-600 text-lg px-1">⏻</button>
        </div>
      </div>
    </aside>

    <div class="flex-1 min-w-0 flex flex-col">
      <!-- Topbar -->
      <header class="bg-white/80 backdrop-blur border-b border-slate-200/70 px-4 md:px-6 py-3 flex items-center gap-3 sticky top-0 z-30">
        <details class="relative md:hidden">
          <summary class="cursor-pointer btn-secondary btn-sm list-none">☰ Menu</summary>
          <nav class="absolute z-40 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 space-y-0.5 text-sm max-h-[70vh] overflow-auto">
            <RouterLink v-for="l in flatLinks" :key="l.to" :to="l.to" class="nav-link">{{ l.icon }} {{ l.label }}</RouterLink>
          </nav>
        </details>
        <div class="md:hidden font-extrabold">CRM Suite</div>
        <div class="hidden md:block text-sm text-slate-500">Selamat datang kembali 👋</div>
        <div class="flex-1" />
        <RouterLink to="/settings" class="btn-secondary btn-sm">⚙ Pengaturan</RouterLink>
      </header>
      <main class="p-4 md:p-6 w-full max-w-6xl mx-auto">
        <RouterView />
      </main>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const groups = [
  { label: "Utama", links: [{ to: "/", label: "Dashboard", icon: "📊" }] },
  { label: "CRM", links: [
    { to: "/contacts", label: "Kontak", icon: "👥" },
    { to: "/clients", label: "Klien", icon: "🏢" },
    { to: "/activities", label: "Aktivitas", icon: "📝" },
  ]},
  { label: "Sales", links: [
    { to: "/deals", label: "Deals", icon: "💰" },
    { to: "/invoices", label: "Invoices", icon: "🧾" },
  ]},
  { label: "Projects", links: [
    { to: "/projects", label: "Projects", icon: "📁" },
    { to: "/tasks", label: "Tasks", icon: "✅" },
  ]},
  { label: "HRM", links: [
    { to: "/employees", label: "Karyawan", icon: "🧑‍💼" },
    { to: "/departments", label: "Departemen", icon: "🏛" },
  ]},
  { label: "Keuangan", links: [{ to: "/accounting", label: "Accounting", icon: "📒" }] },
];
const flatLinks = computed(() => [...groups.flatMap((g) => g.links), { to: "/settings", label: "Pengaturan", icon: "⚙" }]);

const auth = useAuthStore();
const router = useRouter();
const email = computed(() => auth.email);
const initial = computed(() => (auth.email?.[0] ?? "U").toUpperCase());
function logout() {
  auth.logout();
  router.push("/login");
}
</script>
