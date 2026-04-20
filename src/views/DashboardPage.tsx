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
    color: "#00F5FF",
    bg: "from-[#00F5FF]/10 to-transparent",
  },
  {
    label: "Tingkat Open Rate",
    value: "34.7%",
    subLabel: "Rata-rata semua channel",
    trend: +3.1,
    icon: Eye,
    color: "#3FB950",
    bg: "from-[#3FB950]/10 to-transparent",
  },
  {
    label: "Komplain Masuk",
    value: "12",
    subLabel: "Belum direspons",
    trend: -2,
    icon: AlertTriangle,
    color: "#FF4C4C",
    bg: "from-[#FF4C4C]/10 to-transparent",
  },
  {
    label: "Campaign Aktif",
    value: "7",
    subLabel: "Sedang berjalan",
    trend: +1,
    icon: Megaphone,
    color: "#D29922",
    bg: "from-[#D29922]/10 to-transparent",
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
  backgroundColor: "#161B22",
  border: "1px solid #30363D",
  borderRadius: "8px",
  color: "#E6EDF3",
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
          <h1 className="text-xl font-['Space_Mono'] font-bold text-[#E6EDF3]">
            {greeting},{" "}
            <span className="gradient-text text-glow-cyan">Aditya</span> 👋
          </h1>
          <p className="text-[13px] text-[#8B949E] mt-1 font-['IBM_Plex_Sans']">
            {dateStr}
          </p>
        </div>
        <button
          onClick={() => navigate("campaigns")}
          className="fab flex items-center gap-2 px-4 py-2.5 rounded-xl text-[#0D1117] font-semibold text-sm font-['IBM_Plex_Sans']"
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
              className="text-2xl font-['Space_Mono'] font-bold"
              style={{ color: kpi.color }}
            >
              {kpi.value}
            </p>
            <p className="text-[12px] font-semibold text-[#E6EDF3] mt-1">
              {kpi.label}
            </p>
            <p className="text-[11px] text-[#8B949E] mt-0.5">{kpi.subLabel}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Line Chart */}
        <div className="xl:col-span-2 glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-['Space_Mono'] font-bold text-[#E6EDF3]">
              Performa Pengiriman 7 Hari
            </h2>
            <span className="text-[10px] text-[#8B949E] font-mono">Per Platform</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
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
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-['Space_Mono'] font-bold text-[#E6EDF3]">
              Distribusi Channel
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={140}>
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
        {/* Campaign Table */}
        <div className="xl:col-span-2 glass rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#30363D]">
            <h2 className="text-[13px] font-['Space_Mono'] font-bold text-[#E6EDF3]">
              Campaign Terbaru
            </h2>
            <button
              onClick={() => navigate("campaigns")}
              className="flex items-center gap-1 text-[11px] text-[#00F5FF] hover:text-[#00F5FF]/80 transition-colors"
            >
              Lihat semua <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#30363D]">
                  {["Nama", "Platform", "Status", "Progress", "Aksi"].map((h) => (
                    <th key={h} className="text-left text-[10px] font-mono uppercase text-[#8B949E] tracking-wider px-4 py-2.5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.slice(0, 4).map((c) => (
                  <tr key={c.id} className="border-b border-[#30363D]/50 hover:bg-[#21262D]/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-[12px] font-semibold text-[#E6EDF3]">{c.name}</p>
                      <p className="text-[10px] text-[#8B949E] mt-0.5">{c.audience.toLocaleString()} penerima</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {c.platforms.map((p) => (
                          <PlatformBadge key={p} platform={p} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${statusConfig[c.status]?.cls}`}>
                        {statusConfig[c.status]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 min-w-[100px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-[#21262D] rounded-full h-1.5 overflow-hidden relative">
                          <div
                            className="h-full rounded-full transition-all duration-1000 progress-bar-animated"
                            style={{
                              width: `${c.progress}%`,
                              background: c.progress === 100 ? "#3FB950" : "linear-gradient(90deg, #00F5FF, #0099CC)",
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-[#8B949E] w-8 text-right">{c.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button className="p-1 rounded text-[#8B949E] hover:text-[#D29922] hover:bg-[#D29922]/10 transition-colors" title="Pause">
                          <Pause className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1 rounded text-[#8B949E] hover:text-[#FF4C4C] hover:bg-[#FF4C4C]/10 transition-colors" title="Stop">
                          <Square className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => navigate("analytics")}
                          className="p-1 rounded text-[#8B949E] hover:text-[#00F5FF] hover:bg-[#00F5FF]/10 transition-colors"
                          title="Report"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Complaint Feed */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#30363D]">
            <h2 className="text-[13px] font-['Space_Mono'] font-bold text-[#E6EDF3]">
              Komplain Terbaru
            </h2>
            <button
              onClick={() => navigate("complaints")}
              className="flex items-center gap-1 text-[11px] text-[#00F5FF] hover:text-[#00F5FF]/80 transition-colors"
            >
              Semua <ChevronRight className="w-3 h-3" />
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
                    className="flex items-center gap-1 text-[10px] text-[#00F5FF] hover:text-[#00F5FF]/80 transition-colors"
                  >
                    <MessageSquareReply className="w-3 h-3" />
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
