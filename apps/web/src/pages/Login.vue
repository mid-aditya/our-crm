<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-900 p-4">
    <div class="w-full max-w-sm bg-white rounded-2xl shadow-xl p-7">
      <h1 class="text-xl font-bold">CRM Suite</h1>
      <p class="text-sm text-slate-500 mb-5">Masuk ke akun perusahaan kamu</p>
      <form @submit.prevent="submit" class="space-y-3">
        <div>
          <label class="label">Email</label>
          <input v-model="email" type="email" required class="input" placeholder="nama@perusahaan.co.id" />
        </div>
        <div>
          <label class="label">Password</label>
          <input v-model="password" type="password" required class="input" />
        </div>
        <div v-if="companies.length">
          <label class="label">Pilih perusahaan</label>
          <select v-model="companyId" class="input">
            <option v-for="c in companies" :key="c.company_id" :value="c.company_id">{{ c.company_id }}</option>
          </select>
        </div>
        <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
        <button class="btn-primary w-full" :disabled="loading">{{ loading ? "Memproses..." : "Masuk" }}</button>
      </form>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const router = useRouter();
const email = ref("");
const password = ref("");
const companyId = ref("");
const companies = ref<{ company_id: string }[]>([]);
const error = ref("");
const loading = ref(false);

async function submit() {
  error.value = "";
  loading.value = true;
  try {
    const r = await auth.login(email.value, password.value, companyId.value || undefined);
    if (r === "choose") {
      companies.value = auth.companies;
      companyId.value = auth.companies[0]?.company_id ?? "";
      error.value = "Email terdaftar di beberapa perusahaan — pilih satu lalu tekan Masuk lagi.";
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
