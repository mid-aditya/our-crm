<template>
  <h1 class="page-title">Tasks</h1>
  <p class="page-sub">Task lintas project + ringkasan produktivitas tim.</p>
  <p v-if="error" class="error-box mt-4">{{ error }}</p>
  <div class="grid lg:grid-cols-2 gap-4 mt-4">
    <div class="card-pad">
      <h2 class="font-semibold mb-3">Task terbuka per project</h2>
      <div v-for="p in projects" :key="p.id" class="mb-3">
        <div class="text-sm font-medium">{{ p.name }}</div>
        <ul class="text-sm text-slate-600 ml-3 list-disc">
          <li v-for="t in p.tasks" :key="t.id">{{ t.title }} <span class="badge-slate ml-1">{{ t.status }}</span></li>
        </ul>
        <p v-if="!p.tasks.length" class="text-xs text-slate-400 ml-3">Tidak ada task terbuka.</p>
      </div>
    </div>
    <div class="card-pad">
      <h2 class="font-semibold mb-3">Produktivitas</h2>
      <pre class="text-xs bg-slate-50 rounded-lg p-3 overflow-auto max-h-96">{{ prodText }}</pre>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../api/client";

const projects = ref<{ id: string; name: string; tasks: { id: string; title: string; status: string }[] }[]>([]);
const prodText = ref("memuat...");
const error = ref("");

onMounted(async () => {
  try {
    const [plist, prod] = await Promise.all([
      api.projects() as Promise<{ id: string; name: string }[]>,
      api.productivity().catch(() => null),
    ]);
    prodText.value = prod ? JSON.stringify(prod, null, 2) : "Tidak ada data.";
    const out = [];
    for (const p of plist) {
      const tasks = ((await api.projectTasks(p.id).catch(() => [])) as { id: string; title: string; status: string }[])
        .filter((t) => t.status !== "done");
      out.push({ ...p, tasks });
    }
    projects.value = out;
  } catch (e) { error.value = (e as Error).message; }
});
</script>
