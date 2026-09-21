<template>
  <div class="min-h-screen flex bg-white">
    <!-- Brand panel -->
    <div class="hidden lg:flex w-[46%] bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 text-white p-12 flex-col justify-between relative overflow-hidden">
      <div class="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10" />
      <div class="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-white/10" />
      <div class="relative">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center font-extrabold text-xl backdrop-blur">C</div>
          <div class="font-extrabold text-xl tracking-tight">CRM Suite</div>
        </div>
        <h1 class="text-4xl font-extrabold tracking-tight mt-14 leading-tight">Satu platform untuk seluruh bisnismu.</h1>
        <p class="text-indigo-100 mt-3 max-w-md">CRM, sales pipeline, projects, invoicing, accounting & HRM — dalam satu login, data terisolasi per perusahaan.</p>
        <ul class="mt-8 space-y-2 text-sm">
          <li v-for="f in features" :key="f" class="flex items-center gap-3">
            <span class="w-6 h-6 rounded-full bg-emerald-400/90 text-indigo-900 font-bold flex items-center justify-center text-xs">✓</span>{{ f }}
          </li>
        </ul>
      </div>
      <div class="relative text-xs text-indigo-200">DB-per-tenant · RBAC custom · Audit log · Auto backup</div>
    </div>
    <!-- Form -->
    <div class="flex-1 flex items-center justify-center p-6 bg-slate-50">
      <div class="w-full max-w-sm">
        <div class="lg:hidden flex items-center gap-2 mb-6">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center font-extrabold">C</div>
          <strong>CRM Suite</strong>
        </div>
        <h2 class="text-2xl font-extrabold tracking-tight">Selamat datang 👋</h2>
        <p class="text-sm text-slate-500 mb-6">Masuk untuk mengelola perusahaanmu.</p>
        <form @submit.prevent="submit" class="space-y-4 card-pad !p-6">
          <div>
            <label class="label">Email</label>
            <input v-model="email" type="email" required class="input" placeholder="nama@perusahaan.co.id" />
          </div>
          <div>
            <label class="label">Password</label>
            <input v-model="password" type="password" required class="input" placeholder="••••••••" />
          </div>
          <div v-if="companies.length">
            <label class="label">Email ini terdaftar di beberapa perusahaan</label>
            <select v-model="companyId" class="input">
              <option v-for="c in companies" :key="c.company_id" :value="c.company_id">{{ c.company_id }}</option>
            </select>
          </div>
          <p v-if="error" class="text-rose-600 text-sm bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{{ error }}</p>
          <button class="btn-primary w-full !py-2.5" :disabled="loading">{{ loading ? "Memproses..." : "Masuk →" }}</button>
        </form>
        <div class="card mt-3 p-4 text-xs text-slate-500">
          <div class="font-semibold text-slate-700 mb-1">🔑 Akun demo (klik untuk isi otomatis)</div>
          <button @click="fillDemo" class="text-left hover:text-indigo-700 font-mono bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 w-full">
            owner@demo.co.id / password123
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const features = [
  "Pipeline deals + invoicing + pembayaran",
  "Project, task & budgeting dalam satu tempat",
  "Karyawan, absensi clock-in/out & payroll-ready data",
  "Role & permission custom per perusahaan",
];

const auth = useAuthStore();
const router = useRouter();
const email = ref("");
const password = ref("");
const companyId = ref("");
const companies = ref<{ company_id: string }[]>([]);
const error = ref("");
const loading = ref(false);

function fillDemo() {
  email.value = "owner@demo.co.id";
  password.value = "password123";
}

async function submit() {
  error.value = "";
  loading.value = true;
  try {
    const r = await auth.login(email.value, password.value, companyId.value || undefined);
    if (r === "choose") {
      companies.value = auth.companies;
      companyId.value = auth.companies[0]?.company_id ?? "";
      error.value = "Pilih perusahaan lalu tekan Masuk lagi.";
    } else {
      router.push("/");
    }
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}
</script>
