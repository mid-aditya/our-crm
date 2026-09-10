<template>
  <div class="max-w-sm mx-auto mt-24 bg-white p-6 rounded shadow">
    <h1 class="text-xl font-bold mb-4">Masuk CRM</h1>
    <form @submit.prevent="submit" class="flex flex-col gap-3">
      <input v-model="email" type="email" required placeholder="Email" class="border p-2 rounded" />
      <input v-model="password" type="password" required placeholder="Password" class="border p-2 rounded" />
      <select v-if="auth.companies.length" v-model="companyId" class="border p-2 rounded">
        <option v-for="c in auth.companies" :key="c.company_id" :value="c.company_id">{{ c.company_id }}</option>
      </select>
      <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
      <button class="bg-slate-900 text-white p-2 rounded">Masuk</button>
    </form>
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
const error = ref("");
async function submit() {
  error.value = "";
  try {
    const r = await auth.login(email.value, password.value, companyId.value || undefined);
    if (r === "choose" && auth.companies.length) companyId.value = auth.companies[0].company_id;
    else router.push("/");
  } catch (e) { error.value = (e as Error).message; }
}
</script>
