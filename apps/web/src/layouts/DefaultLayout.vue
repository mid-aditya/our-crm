<template>
  <div class="min-h-screen bg-slate-100 text-slate-900 flex">
    <aside class="w-60 shrink-0 bg-slate-900 text-slate-200 flex-col hidden md:flex">
      <div class="px-5 py-4 border-b border-slate-800">
        <div class="font-bold text-white text-lg">CRM Suite</div>
        <div class="text-xs text-slate-400">ERP · CRM · HRM · PM</div>
      </div>
      <nav class="flex-1 overflow-auto p-3 space-y-5 text-sm">
        <div v-for="g in groups" :key="g.label">
          <div class="px-2 mb-1 text-[11px] uppercase tracking-wide text-slate-500">{{ g.label }}</div>
          <RouterLink
            v-for="l in g.links"
            :key="l.to"
            :to="l.to"
            class="block px-3 py-2 rounded-lg hover:bg-slate-800"
            active-class="bg-slate-800 text-white"
          >{{ l.label }}</RouterLink>
        </div>
      </nav>
      <div class="p-3 border-t border-slate-800">
        <RouterLink to="/settings" class="block px-3 py-2 rounded-lg hover:bg-slate-800 text-sm" active-class="bg-slate-800 text-white">Pengaturan</RouterLink>
        <button @click="logout" class="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-sm text-red-300">Keluar</button>
      </div>
    </aside>
    <div class="flex-1 min-w-0 flex flex-col">
      <header class="bg-white border-b px-5 py-3 flex items-center gap-3 md:hidden">
        <details class="relative">
          <summary class="cursor-pointer btn-secondary btn-sm list-none">Menu</summary>
          <nav class="absolute z-40 mt-2 w-52 bg-white border rounded-xl shadow-lg p-2 space-y-1 text-sm">
            <RouterLink v-for="l in flatLinks" :key="l.to" :to="l.to" class="block px-3 py-2 rounded-lg hover:bg-slate-100">{{ l.label }}</RouterLink>
          </nav>
        </details>
        <strong>CRM Suite</strong>
      </header>
      <main class="p-4 md:p-6 max-w-6xl w-full mx-auto">
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
  { label: "Utama", links: [{ to: "/", label: "Dashboard" }] },
  { label: "CRM", links: [
    { to: "/contacts", label: "Kontak" },
    { to: "/clients", label: "Klien" },
    { to: "/activities", label: "Aktivitas" },
  ]},
  { label: "Sales", links: [
    { to: "/deals", label: "Deals" },
    { to: "/invoices", label: "Invoices" },
  ]},
  { label: "Projects", links: [
    { to: "/projects", label: "Projects" },
    { to: "/tasks", label: "Tasks" },
  ]},
  { label: "HRM", links: [
    { to: "/employees", label: "Karyawan" },
    { to: "/departments", label: "Departemen" },
  ]},
  { label: "Keuangan", links: [{ to: "/accounting", label: "Accounting" }] },
];
const flatLinks = computed(() => [...groups.flatMap((g) => g.links), { to: "/settings", label: "Pengaturan" }]);

const auth = useAuthStore();
const router = useRouter();
function logout() {
  auth.logout();
  router.push("/login");
}
</script>
