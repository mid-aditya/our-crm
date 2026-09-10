<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <header class="border-b bg-white px-6 py-3 flex items-center justify-between">
      <strong>CRM</strong>
      <nav class="flex gap-4 text-sm">
        <RouterLink to="/">Dashboard</RouterLink>
        <RouterLink to="/contacts">Kontak</RouterLink>
        <RouterLink to="/deals">Deals</RouterLink>
        <RouterLink to="/activities">Aktivitas</RouterLink>
        <button @click="logout">Keluar</button>
      </nav>
    </header>
    <main class="p-6"><RouterView /></main>
  </div>
</template>
<script setup lang="ts">
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
const auth = useAuthStore();
const router = useRouter();
function logout() { auth.logout(); router.push("/login"); }
</script>
