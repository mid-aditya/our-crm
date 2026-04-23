"use client";

import { useApp } from "@/context/AppContext";
import {
  kpiData,
  lineChartData,
  donutData,
  campaigns,
  complaints,
  platformColors,
} from "@/lib/mockData";
import {
  Send,
  Eye,
  AlertTriangle,
  Megaphone,
  TrendingUp,
  TrendingDown,
  Pause,
  Square,
  BarChart2,
  MessageSquareReply,
  Plus,
  ChevronRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

const kpis = [
  {
    label: "Total Pesan Terkirim",
    value: "48,291",
    subLabel: "Hari ini",
    trend: +12.4,
    icon: Send,
    color: "var(--primary)",
    bg: "from-primary/10 to-transparent",
  },
  {
    label: "Tingkat Open Rate",
    value: "34.7%",
    subLabel: "Rata-rata semua channel",
    trend: +3.1,
    icon: Eye,
    color: "var(--success)",
    bg: "from-success/10 to-transparent",
  },
  {
    label: "Komplain Masuk",
    value: "12",
    subLabel: "Belum direspons",
    trend: -2,
    icon: AlertTriangle,
    color: "var(--destructive)",
    bg: "from-destructive/10 to-transparent",
  },
  {
    label: "Campaign Aktif",
    value: "7",
    subLabel: "Sedang berjalan",
    trend: +1,
    icon: Megaphone,
    color: "var(--warning)",
    bg: "from-warning/10 to-transparent",
  },
];

const statusConfig: Record<string, { label: string; cls: string }> = {
  active: { label: "Active", cls: "badge-active" },
  scheduled: { label: "Scheduled", cls: "badge-scheduled" },
  completed: { label: "Completed", cls: "badge-completed" },
  draft: { label: "Draft", cls: "badge-draft" },
};

const priorityConfig: Record<string, { cls: string }> = {
  urgent: { cls: "badge-urgent" },
  medium: { cls: "badge-medium" },
  low: { cls: "badge-low" },
};

function PlatformBadge({ platform }: { platform: string }) {
  const labels: Record<string, string> = {
    whatsapp: "WA",
    rcs: "RCS",
    email: "EM",
    sms: "SMS",
  };
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded font-mono"
      style={{
        color: platformColors[platform],
        background: `${platformColors[platform]}18`,
        border: `1px solid ${platformColors[platform]}40`,
      }}
    >
      {labels[platform] || platform.toUpperCase()}
    </span>
  );
}

const customTooltipStyle = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  color: "var(--foreground)",
};

export default function DashboardPage() {
  const { navigate, addToast } = useApp();
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Selamat pagi" : hour < 17 ? "Selamat siang" : "Selamat malam";
  const dateStr = now.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {greeting},{" "}
            <span className="text-primary">Aditya</span> 👋
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            {dateStr}
          </p>
        </div>
        <button
          onClick={() => navigate("campaigns")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={`glass card-hover relative overflow-hidden rounded-xl p-5 bg-gradient-to-br ${kpi.bg}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: `${kpi.color}15`, border: `1px solid ${kpi.color}30` }}
              >
                <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
              </div>
              <div
                className={`flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full ${
                  kpi.trend > 0
                    ? "text-[#3FB950] bg-[#3FB950]/10"
                    : "text-[#FF4C4C] bg-[#FF4C4C]/10"
                }`}
              >
                {kpi.trend > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {kpi.trend > 0 ? "+" : ""}
                {kpi.trend}
              </div>
            </div>
            <p
              className="text-2xl font-extrabold"
              style={{ color: kpi.color }}
            >
              {kpi.value}
            </p>
            <p className="text-[13px] font-bold text-foreground mt-1">
              {kpi.label}
            </p>
            <p className="text-[11px] font-medium text-muted-foreground mt-0.5">{kpi.subLabel}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Line Chart */}
        <div className="xl:col-span-2 glass rounded-2xl p-6 border border-border/50">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[14px] font-bold text-foreground">
              Performa Pengiriman 7 Hari
            </h2>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Per Platform</span>
          </div>
          <ResponsiveContainer width="100%" height={220} debounce={100}>
            <LineChart data={lineChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262D" />
              <XAxis dataKey="day" tick={{ fill: "#8B949E", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8B949E", fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={customTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#8B949E" }} />
              <Line type="monotone" dataKey="whatsapp" stroke="#25D366" strokeWidth={2} dot={false} name="WhatsApp" />
              <Line type="monotone" dataKey="rcs" stroke="#00F5FF" strokeWidth={2} dot={false} name="RCS" />
              <Line type="monotone" dataKey="email" stroke="#D29922" strokeWidth={2} dot={false} name="Email" />
              <Line type="monotone" dataKey="sms" stroke="#9966FF" strokeWidth={2} dot={false} name="SMS" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Donut Chart */}
        <div className="glass rounded-2xl p-6 border border-border/50">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[14px] font-bold text-foreground">
              Distribusi Channel
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={140} debounce={100}>
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                {donutData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={customTooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {donutData.map((d) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  <span className="text-[12px] text-[#8B949E]">{d.name}</span>
                </div>
                <span className="text-[12px] font-mono font-bold text-[#E6EDF3]">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 glass rounded-2xl overflow-hidden border border-border/50">
          <div className="flex items-center justify-between p-5 border-b border-border/50 bg-secondary/10">
            <h2 className="text-[14px] font-bold text-foreground">
              Campaign Terbaru
            </h2>
            <button
              onClick={() => navigate("campaigns")}
              className="flex items-center gap-1 text-[12px] font-bold text-primary hover:opacity-80 transition-opacity"
            >
              Lihat semua <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50 bg-secondary/5">
                  {["Nama", "Platform", "Status", "Progress", "Aksi"].map((h) => (
                    <th key={h} className="text-left text-[10px] font-bold uppercase text-muted-foreground tracking-widest px-5 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.slice(0, 4).map((c) => (
                  <tr key={c.id} className="border-b border-border/30 hover:bg-secondary/10 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-[13px] font-bold text-foreground">{c.name}</p>
                      <p className="text-[11px] font-medium text-muted-foreground mt-0.5">{c.audience.toLocaleString()} penerima</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1.5 flex-wrap">
                        {c.platforms.map((p) => (
                          <PlatformBadge key={p} platform={p} />
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusConfig[c.status]?.cls}`}>
                        {statusConfig[c.status]?.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 min-w-[120px]">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-secondary rounded-full h-1.5 overflow-hidden relative">
                          <div
                            className="h-full rounded-full transition-all duration-1000 progress-bar-animated"
                            style={{
                              width: `${c.progress}%`,
                              background: c.progress === 100 ? "var(--success)" : "var(--primary)",
                            }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-muted-foreground w-8 text-right">{c.progress}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button className="p-1.5 rounded-lg text-muted-foreground hover:text-warning hover:bg-warning/10 transition-colors" title="Pause">
                          <Pause className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Stop">
                          <Square className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate("analytics")}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Report"
                        >
                          <BarChart2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass rounded-2xl overflow-hidden border border-border/50">
          <div className="flex items-center justify-between p-5 border-b border-border/50 bg-secondary/10">
            <h2 className="text-[14px] font-bold text-foreground">
              Komplain Terbaru
            </h2>
            <button
              onClick={() => navigate("complaints")}
              className="flex items-center gap-1 text-[12px] font-bold text-primary hover:opacity-80 transition-opacity"
            >
              Semua <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-[#30363D]/50">
            {complaints.slice(0, 5).map((c) => (
              <div key={c.id} className="p-3 hover:bg-[#21262D]/40 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-[#21262D] flex items-center justify-center text-[10px] font-bold text-[#8B949E] flex-shrink-0">
                      {c.contact.avatar}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-[#E6EDF3] truncate">{c.contact.name}</p>
                      <p className="text-[10px] text-[#8B949E] truncate">{c.subject}</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${priorityConfig[c.priority]?.cls}`}>
                    {c.priority.toUpperCase()}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <PlatformBadge platform={c.platform} />
                  <button
                    onClick={() => {
                      addToast({ type: "info", title: "Quick Reply Dibuka", message: `Membalas komplain ${c.id}` });
                    }}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-primary hover:opacity-80 transition-opacity"
                  >
                    <MessageSquareReply className="w-3.5 h-3.5" />
                    Balas
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
