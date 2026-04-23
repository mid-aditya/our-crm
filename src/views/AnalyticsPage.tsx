"use client";

import { useState } from "react";
import { analyticsData, platformColors } from "@/lib/mockData";
import { useApp } from "@/context/AppContext";
import { Dropdown } from "@/components/ui/Dropdown";
import {
  Download,
  TrendingUp,
  BarChart2,
  Activity,
  Target,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";

const customTooltipStyle = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  color: "var(--foreground)",
};

// Heatmap
const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const HOURS = Array.from({ length: 24 }, (_, i) => `${i}`.padStart(2, "0"));

function getColor(value: number): string {
  if (value > 75) return "var(--primary)";
  if (value > 50) return "#4338CA";
  if (value > 25) return "#312E81";
  if (value > 5) return "#1E1B4B";
  return "var(--secondary)";
}

const metricCards = [
  { label: "Delivery Rate", value: "96.2%", sub: "+1.4% vs kemarin", color: "#3FB950", icon: Target },
  { label: "Open Rate", value: "34.7%", sub: "+3.1% vs kemarin", color: "#00F5FF", icon: Activity },
  { label: "Click Rate", value: "18.3%", sub: "+0.8% vs kemarin", color: "#D29922", icon: BarChart2 },
  { label: "Reply Rate", value: "12.1%", sub: "-0.5% vs kemarin", color: "#9966FF", icon: TrendingUp },
  { label: "Complaint Rate", value: "0.3%", sub: "-0.1% vs kemarin", color: "#FF4C4C", icon: Activity },
];

export default function AnalyticsPage() {
  const { addToast } = useApp();
  const [dateRange, setDateRange] = useState("7d");
  const [platform, setPlatform] = useState("all");

  const heatmapData = analyticsData.heatmapData;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Analytics</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Performa per platform dan kampanye</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Date Range */}
          <div className="flex gap-1 bg-card border border-border rounded-xl p-1">
            {["7d", "14d", "30d", "90d"].map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                  dateRange === r ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          {/* Platform Filter */}
          <div className="w-44">
            <Dropdown
              options={[
                { value: "all", label: "Semua Platform" },
                { value: "whatsapp", label: "WhatsApp" },
                { value: "rcs", label: "RCS" },
                { value: "email", label: "Email" },
                { value: "sms", label: "SMS" },
              ]}
              value={platform}
              onChange={setPlatform}
              className="h-[34px] rounded-lg"
            />
          </div>
          {/* Export */}
          <div className="flex gap-1">
            <button
              onClick={() => addToast({ type: "success", title: "CSV Diunduh", message: "analytics_export.csv" })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] text-[#8B949E] border border-[#30363D] hover:text-[#00F5FF] hover:border-[#00F5FF]/30 hover:bg-[#00F5FF]/10 transition-all"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button
              onClick={() => addToast({ type: "success", title: "PDF Diunduh", message: "analytics_report.pdf" })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] text-[#8B949E] border border-[#30363D] hover:text-[#D29922] hover:border-[#D29922]/30 hover:bg-[#D29922]/10 transition-all"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        {metricCards.map((m) => (
          <div key={m.label} className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <m.icon className="w-4.5 h-4.5" style={{ color: m.color }} />
            </div>
            <p className="text-2xl font-extrabold" style={{ color: m.color }}>{m.value}</p>
            <p className="text-[13px] font-bold text-foreground mt-1.5">{m.label}</p>
            <p className="text-[11px] font-medium text-muted-foreground mt-1">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Bar Chart */}
        <div className="bg-card border border-border/50 rounded-2xl p-6">
          <h2 className="text-[14px] font-bold text-foreground mb-6">
            Performa per Kampanye
          </h2>
          <ResponsiveContainer width="100%" height={240} debounce={100}>
            <BarChart data={analyticsData.barData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip contentStyle={customTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#8B949E" }} />
              <Bar dataKey="delivery" name="Delivery%" fill="#3FB950" radius={[0, 3, 3, 0]} barSize={6} />
              <Bar dataKey="open" name="Open%" fill="#00F5FF" radius={[0, 3, 3, 0]} barSize={6} />
              <Bar dataKey="click" name="Click%" fill="#D29922" radius={[0, 3, 3, 0]} barSize={6} />
              <Bar dataKey="reply" name="Reply%" fill="#9966FF" radius={[0, 3, 3, 0]} barSize={6} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line Chart per Platform */}
        <div className="bg-card border border-border/50 rounded-2xl p-6">
          <h2 className="text-[14px] font-bold text-foreground mb-6">
            Trend 7 Hari — Pengiriman
          </h2>
          <ResponsiveContainer width="100%" height={240} debounce={100}>
            <LineChart data={analyticsData.lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={customTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#8B949E" }} />
              <Line type="monotone" dataKey="whatsapp" stroke="#25D366" strokeWidth={2} dot={false} name="WhatsApp" />
              <Line type="monotone" dataKey="rcs" stroke="#00F5FF" strokeWidth={2} dot={false} name="RCS" />
              <Line type="monotone" dataKey="email" stroke="#D29922" strokeWidth={2} dot={false} name="Email" />
              <Line type="monotone" dataKey="sms" stroke="#9966FF" strokeWidth={2} dot={false} name="SMS" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-card border border-border/50 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[14px] font-bold text-foreground">
            Heatmap Aktivitas Audience
          </h2>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Jam × Hari</p>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Hour labels */}
            <div className="flex items-center mb-1 pl-8">
              {HOURS.filter((_, i) => i % 3 === 0).map((h) => (
                <div key={h} className="text-[9px] font-mono text-[#8B949E] flex-1 text-center">{h}:00</div>
              ))}
            </div>
            {/* Grid */}
            {DAYS.map((day, dayIdx) => (
              <div key={day} className="flex items-center gap-1 mb-1">
                <span className="text-[10px] font-mono text-[#8B949E] w-7 flex-shrink-0">{day}</span>
                <div className="flex gap-0.5 flex-1">
                  {HOURS.map((_, hourIdx) => {
                    const cell = heatmapData.find((d) => d.day === dayIdx && d.hour === hourIdx);
                    const val = cell?.value ?? 0;
                    return (
                      <div
                        key={hourIdx}
                        className="heatmap-cell flex-1 h-5"
                        style={{ background: getColor(val) }}
                        title={`${day} ${hourIdx}:00 — ${val}%`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
            {/* Legend */}
            <div className="flex items-center gap-2 mt-3 pl-8">
              <span className="text-[10px] text-[#8B949E]">Rendah</span>
              {["#21262D", "#002233", "#004466", "#0099CC", "#00F5FF"].map((c) => (
                <div key={c} className="w-5 h-3 rounded-sm" style={{ background: c }} />
              ))}
              <span className="text-[10px] text-[#8B949E]">Tinggi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Campaigns Table */}
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border/50 bg-secondary/5">
          <h2 className="text-[14px] font-bold text-foreground">
            Top Performing Campaigns
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/10">
                {["Kampanye", "Pesan Terkirim", "Open Rate", "Click Rate", "Estimasi Revenue"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase text-muted-foreground tracking-widest px-5 py-3.5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {analyticsData.topCampaigns.map((c, i) => (
                <tr key={i} className="border-b border-[#30363D]/50 hover:bg-[#21262D]/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-[#8B949E] w-4">#{i + 1}</span>
                      <span className="text-[12px] font-semibold text-[#E6EDF3]">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[12px] font-mono text-[#E6EDF3]">{c.sent.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-[#21262D] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${c.openRate}%`, background: "#00F5FF" }} />
                      </div>
                      <span className="text-[11px] font-mono text-[#00F5FF]">{c.openRate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-[#21262D] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${c.clickRate}%`, background: "#D29922" }} />
                      </div>
                      <span className="text-[11px] font-mono text-[#D29922]">{c.clickRate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[12px] font-mono text-[#3FB950]">{c.revenue}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
