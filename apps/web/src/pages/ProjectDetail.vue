<template>
  <RouterLink to="/projects" class="text-sm text-slate-500 hover:text-slate-800">← Kembali</RouterLink>
  <h1 class="page-title mt-1">{{ project?.name ?? "Project" }}</h1>
  <p v-if="error" class="error-box mt-4">{{ error }}</p>
  <div class="flex gap-2 mt-4 border-b">
    <button v-for="t in tabs" :key="t" @click="tab = t" :class="tab === t ? 'border-b-2 border-slate-900 font-semibold' : 'text-slate-500'" class="px-3 py-2 text-sm capitalize">{{ t }}</button>
  </div>

  <div v-if="tab === 'tasks'" class="mt-4">
    <div class="toolbar"><button @click="modalTask = true" class="btn-primary btn-sm">+ Tambah task</button></div>
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Task</th><th>Prioritas</th><th>Status</th><th></th></tr></thead>
      <tbody>
        <tr v-for="t in tasks" :key="t.id">
          <td class="font-medium">{{ t.title }}</td>
          <td><span class="badge-amber">{{ t.priority }}</span></td>
          <td>
            <select :value="t.status" @change="setTaskStatus(t, ($event.target as HTMLSelectElement).value)" class="input !py-1 !text-xs !w-auto">
              <option value="todo">todo</option><option value="in_progress">in_progress</option>
              <option value="done">done</option><option value="cancelled">cancelled</option>
            </select>
          </td>
          <td></td>
        </tr>
      </tbody>
    </table>
    <p v-if="!tasks.length" class="empty">Belum ada task.</p></div>
  </div>

  <div v-if="tab === 'budgets'" class="mt-4">
    <div class="card-pad mb-4 text-sm">
      Rencana: <strong>{{ fmt(meta.planned) }}</strong> · Realisasi: <strong>{{ fmt(meta.actual) }}</strong> · Sisa: <strong>{{ fmt(meta.remaining) }}</strong>
    </div>
    <div class="toolbar"><button @click="modalBudget = true" class="btn-primary btn-sm">+ Tambah budget</button></div>
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Kategori</th><th>Rencana</th><th>Realisasi</th></tr></thead>
      <tbody>
        <tr v-for="b in budgets" :key="b.id">
          <td>{{ b.category }}</td><td>{{ fmt(b.plannedAmount) }}</td><td>{{ fmt(b.actualAmount) }}</td>
        </tr>
      </tbody>
    </table>
    <p v-if="!budgets.length" class="empty">Belum ada budget.</p></div>
  </div>

  <div v-if="tab === 'members'" class="mt-4">
    <form @submit.prevent="addMember" class="flex gap-2 mb-4">
      <input v-model="memberId" required placeholder="User ID" class="input max-w-xs" />
      <button class="btn-primary btn-sm">+ Tambah member</button>
    </form>
    <p class="text-xs text-slate-400">Ambil User ID dari halaman Pengaturan → Users.</p>
  </div>

  <Modal :open="modalTask" title="Tambah task" @close="modalTask = false">
    <form @submit.prevent="saveTask" class="space-y-3">
      <div><label class="label">Judul *</label><input v-model="taskForm.title" required class="input" /></div>
      <div><label class="label">Prioritas</label>
        <select v-model="taskForm.priority" class="input"><option value="low">low</option><option value="medium">medium</option><option value="urgent">urgent</option></select>
      </div>
      <p v-if="formError" class="text-red-600 text-sm">{{ formError }}</p>
      <button class="btn-primary w-full">Simpan</button>
    </form>
  </Modal>
  <Modal :open="modalBudget" title="Tambah budget" @close="modalBudget = false">
    <form @submit.prevent="saveBudget" class="space-y-3">
      <div><label class="label">Kategori *</label><input v-model="budgetForm.category" required class="input" /></div>
      <div><label class="label">Rencana (Rp) *</label><input v-model="budgetForm.planned_amount" required class="input" placeholder="10000000" /></div>
      <p v-if="formError" class="text-red-600 text-sm">{{ formError }}</p>
      <button class="btn-primary w-full">Simpan</button>
    </form>
  </Modal>
</template>
<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useRoute } from "vue-router";
import { api } from "../api/client";
import Modal from "../components/Modal.vue";

const route = useRoute();
const id = route.params.id as string;
const project = ref<{ name: string } | null>(null);
const tasks = ref<{ id: string; title: string; priority: string; status: string }[]>([]);
const budgets = ref<{ id: string; category: string; plannedAmount: string; actualAmount: string }[]>([]);
const meta = ref<{ planned?: number; actual?: number; remaining?: number }>({});
const error = ref("");
const formError = ref("");
const tab = ref("tasks");
const tabs = ["tasks", "budgets", "members"];
const modalTask = ref(false);
const modalBudget = ref(false);
const taskForm = reactive({ title: "", priority: "medium" });
const budgetForm = reactive({ category: "", planned_amount: "" });
const memberId = ref("");

function fmt(v: unknown) { return Number(v ?? 0).toLocaleString("id-ID"); }
async function load() {
  error.value = "";
  try {
    const [plist, t, b] = await Promise.all([
      api.projects() as Promise<{ id: string; name: string }[]>,
      api.projectTasks(id),
      api.projectBudgets(id),
    ]);
    project.value = plist.find((p) => p.id === id) ?? null;
    tasks.value = t as typeof tasks.value;
    budgets.value = b.list as typeof budgets.value;
    meta.value = (b.meta ?? {}) as typeof meta.value;
  } catch (e) { error.value = (e as Error).message; }
}
async function saveTask() {
  formError.value = "";
  try {
    await api.createProjectTask(id, { title: taskForm.title, priority: taskForm.priority });
    taskForm.title = "";
    taskForm.priority = "medium";
    modalTask.value = false;
    await load();
  } catch (e) { formError.value = (e as Error).message; }
}
async function setTaskStatus(t: { id: string }, status: string) {
  try {
    await api.updateProjectTask(t.id, { status });
    await load();
  } catch (e) { error.value = (e as Error).message; }
}
async function saveBudget() {
  formError.value = "";
  try {
    await api.createBudget(id, { category: budgetForm.category, planned_amount: budgetForm.planned_amount });
    budgetForm.category = "";
    budgetForm.planned_amount = "";
    modalBudget.value = false;
    await load();
  } catch (e) { formError.value = (e as Error).message; }
}
async function addMember() {
  error.value = "";
  try {
    await api.addMember(id, { user_id: memberId.value });
    memberId.value = "";
  } catch (e) { error.value = (e as Error).message; }
}
onMounted(load);
</script>
