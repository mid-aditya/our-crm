<template>
  <div class="flex items-center justify-between">
    <div>
      <h1 class="page-title">Dashboard</h1>
      <p class="page-sub">Ringkasan bisnis perusahaan dalam sekali lihat.</p>
    </div>
    <RouterLink to="/contacts" class="btn-primary btn-sm">+ Tambah kontak</RouterLink>
  </div>
  <p v-if="error" class="error-box mt-4">{{ error }}</p>

  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
    <div v-for="s in stats" :key="s.label" class="card-pad card-hover flex items-center gap-3">
      <div class="stat-icon" :class="s.bg">{{ s.icon }}</div>
      <div>
        <div class="text-xs text-slate-500 font-medium">{{ s.label }}</div>
        <div class="text-2xl font-extrabold tracking-tight">{{ s.value }}</div>
        <div class="text-[11px] text-slate-400">{{ s.hint }}</div>
      </div>
    </div>
  </div>

  <div class="grid lg:grid-cols-3 gap-4 mt-4">
    <div class="card-pad lg:col-span-2">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-bold">Pipeline deals</h2>
        <RouterLink to="/deals" class="text-xs text-indigo-600 font-semibold hover:underline">Lihat kanban →</RouterLink>
      </div>
      <div v-if="pipeline.length" class="space-y-3">
        <div v-for="d in pipeline" :key="d.stage">
          <div class="flex justify-between text-sm mb-1">
            <span class="font-medium">{{ d.stage }}</span>
            <span class="text-slate-500">{{ d.count }} deal · Rp{{ fmt(d.total) }}</span>
          </div>
          <div class="bar-track"><div class="bar-fill" :style="{ width: d.pct + '%' }" /></div>
        </div>
      </div>
      <p v-else class="empty">Belum ada deal. <RouterLink to="/deals" class="text-indigo-600 font-semibold">Buat deal pertama →</RouterLink></p>
    </div>
    <div class="card-pad">
      <h2 class="font-bold mb-1">Keuangan</h2>
      <p class="text-xs text-slate-400 mb-3">Ringkasan invoice</p>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between"><span class="text-slate-500">Piutang (belum lunas)</span><strong class="text-amber-600">Rp{{ fmt(money.outstanding) }}</strong></div>
        <div class="flex justify-between"><span class="text-slate-500">Sudah dibayar</span><strong class="text-emerald-600">Rp{{ fmt(money.paid) }}</strong></div>
        <div class="flex justify-between"><span class="text-slate-500">Invoice aktif</span><strong>{{ money.count }}</strong></div>
      </div>
      <RouterLink to="/invoices" class="btn-secondary btn-sm w-full mt-4">Kelola invoices</RouterLink>
    </div>
  </div>

  <div class="grid lg:grid-cols-2 gap-4 mt-4">
    <div class="card-pad">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-bold">Perlu perhatian ⚡</h2>
      </div>
      <ul v-if="attention.length" class="space-y-2 text-sm">
        <li v-for="a in attention" :key="a.id" class="flex gap-2 items-start bg-amber-50/60 border border-amber-100 rounded-xl px-3 py-2">
          <span class="badge-amber shrink-0">{{ a.kind }}</span><span>{{ a.text }}</span>
        </li>
      </ul>
      <p v-else class="empty !py-4">Semua beres. Tidak ada yang overdue. 🎉</p>
    </div>
    <div class="card-pad">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-bold">Aktivitas terbaru</h2>
        <RouterLink to="/activities" class="text-xs text-indigo-600 font-semibold hover:underline">Semua →</RouterLink>
      </div>
      <ul v-if="recent.length" class="space-y-2 text-sm">
        <li v-for="a in recent" :key="a.id" class="flex gap-2 items-center border-b border-slate-100 pb-2">
          <span class="badge-slate">{{ a.type }}</span><span class="truncate">{{ a.subject }}</span>
        </li>
      </ul>
      <p v-else class="empty !py-4">Belum ada aktivitas.</p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../api/client";

const stats = ref([
  { label: "Kontak", value: "…", hint: "total pelanggan", icon: "👥", bg: "bg-indigo-100" },
  { label: "Deals terbuka", value: "…", hint: "di pipeline", icon: "💰", bg: "bg-emerald-100" },
  { label: "Projects aktif", value: "…", hint: "berjalan", icon: "📁", bg: "bg-violet-100" },
  { label: "Karyawan", value: "…", hint: "terdaftar", icon: "🧑‍💼", bg: "bg-amber-100" },
]);
const pipeline = ref<{ stage: string; count: number; total: number; pct: number }[]>([]);
const money = ref({ outstanding: 0, paid: 0, count: 0 });
const attention = ref<{ id: string; kind: string; text: string }[]>([]);
const recent = ref<{ id: string; type: string; subject: string }[]>([]);
const error = ref("");

function fmt(v: number) { return Math.round(v).toLocaleString("id-ID"); }

onMounted(async () => {
  try {
    const [contacts, deals, projects, invoices, acts, stages, employees] = await Promise.all([
      api.contacts({ limit: 100 }).then((r) => r.list.length).catch(() => 0),
      api.deals() as Promise<{ id: string; title: string; value: string; stageId?: string; status: string }[]>,
      api.projects() as Promise<{ status: string }[]>,
      api.invoices() as Promise<{ id: string; number: string; status: string }[]>,
      api.activities() as Promise<{ id: string; type: string; subject: string; dueAt?: string; completedAt?: string }[]>,
      api.stages().catch(() => [] as { id: string; name: string }[]),
      api.employees().catch(() => [] as unknown[]),
    ]);
    const open = deals.filter((x) => x.status === "open");
    stats.value = [
      { label: "Kontak", value: String(contacts), hint: "total pelanggan", icon: "👥", bg: "bg-indigo-100" },
      { label: "Deals terbuka", value: String(open.length), hint: "Rp" + fmt(open.reduce((s, x) => s + Number(x.value || 0), 0)), icon: "💰", bg: "bg-emerald-100" },
      { label: "Projects aktif", value: String(projects.filter((x) => x.status === "active").length), hint: "berjalan", icon: "📁", bg: "bg-violet-100" },
      { label: "Karyawan", value: String(employees.length), hint: "terdaftar", icon: "🧑‍💼", bg: "bg-amber-100" },
    ];
    const names = new Map(stages.map((s) => [s.id, s.name]));
    const byStage = new Map<string, { count: number; total: number }>();
    for (const d of open) {
      const k = (d.stageId && names.get(d.stageId)) || "Tanpa stage";
      const cur = byStage.get(k) ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total += Number(d.value || 0);
      byStage.set(k, cur);
    }
    const max = Math.max(1, ...[...byStage.values()].map((v) => v.total));
    pipeline.value = [...byStage.entries()].map(([stage, v]) => ({ stage, ...v, pct: Math.max(4, Math.round((v.total / max) * 100)) }));

    let outstanding = 0, paid = 0, count = 0;
    for (const inv of invoices) {
      if (["sent", "partial", "overdue"].includes(inv.status)) {
        count += 1;
        try {
          const det = await api.invoiceDetail(inv.id);
          outstanding += Number(det.meta?.balance ?? 0);
          paid += Number(det.meta?.paid ?? 0);
        } catch { /* lewati */ }
      }
    }
    money.value = { outstanding, paid, count };

    const now = new Date();
    const attn: typeof attention.value = [];
    for (const a of acts) {
      if (!a.completedAt && a.dueAt && new Date(a.dueAt) < now) {
        attn.push({ id: a.id, kind: a.type, text: `${a.subject} — overdue` });
      }
    }
    for (const inv of invoices.filter((i) => i.status === "overdue").slice(0, 3)) {
      attn.push({ id: inv.id, kind: "invoice", text: `${inv.number} overdue — segera follow-up` });
    }
    attention.value = attn.slice(0, 6);
    recent.value = acts.slice(0, 7);
  } catch (e) {
    error.value = (e as Error).message;
  }
});
</script>
