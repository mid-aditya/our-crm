"use client";

import { useState } from "react";
import { campaigns, platformColors } from "@/lib/mockData";
import { useApp } from "@/context/AppContext";
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Copy,
  Archive,
  BarChart2,
  Pause,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  Check,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dropdown } from "@/components/ui/Dropdown";

const filters = ["All", "Active", "Scheduled", "Completed", "Draft"];

const statusConfig: Record<string, { label: string; cls: string }> = {
  active: { label: "Active", cls: "badge-active" },
  scheduled: { label: "Scheduled", cls: "badge-scheduled" },
  completed: { label: "Completed", cls: "badge-completed" },
  draft: { label: "Draft", cls: "badge-draft" },
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

// Wizard steps
const steps = ["Info Kampanye", "Platform & Jadwal", "Konten Pesan", "Audience"];

function CreateCampaignModal({ onClose }: { onClose: () => void }) {
  const { addToast } = useApp();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    desc: "",
    goal: "awareness",
    tags: "",
    platforms: [] as string[],
    scheduleType: "now",
    scheduledAt: "",
    timezone: "Asia/Jakarta",
    audience: "s001",
  });

  const allPlatforms = [
    { id: "whatsapp", label: "WhatsApp", color: "#25D366" },
    { id: "rcs", label: "RCS", color: "#00F5FF" },
    { id: "email", label: "Email", color: "#D29922" },
    { id: "sms", label: "SMS", color: "#9966FF" },
  ];

  const togglePlatform = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(id)
        ? prev.platforms.filter((p) => p !== id)
        : [...prev.platforms, id],
    }));
  };

  const handleLaunch = () => {
    addToast({ type: "success", title: "Campaign Diluncurkan!", message: `${formData.name} sedang diproses` });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0D1117]/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-cyan rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#30363D]">
          <div>
            <h2 className="text-[15px] font-['Space_Mono'] font-bold text-[#E6EDF3]">
              Buat Campaign Baru
            </h2>
            <p className="text-[11px] text-[#8B949E] mt-0.5">Langkah {step + 1} dari {steps.length}</p>
          </div>
          <button onClick={onClose} className="text-[#8B949E] hover:text-[#E6EDF3] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4 flex items-center gap-0">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-mono font-bold transition-all flex-shrink-0",
                i < step ? "bg-[#3FB950] text-[#0D1117]" :
                i === step ? "bg-[#00F5FF] text-[#0D1117]" :
                "bg-[#21262D] text-[#8B949E]"
              )}>
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={cn("flex-1 h-0.5 mx-1", i < step ? "bg-[#3FB950]" : "bg-[#21262D]")} />
              )}
            </div>
          ))}
        </div>
        <div className="px-6 pt-1 flex">
          {steps.map((s, i) => (
            <div key={i} className="flex-1 text-[9px] text-[#8B949E] font-mono">{s}</div>
          ))}
        </div>

        {/* Step Content */}
        <div className="p-6 space-y-4">
          {step === 0 && (
            <>
              <div>
                <label className="text-[11px] font-mono text-[#8B949E] uppercase tracking-wider block mb-1.5">Nama Kampanye *</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Contoh: Promo Lebaran 2025"
                  className="w-full bg-[#21262D] border border-[#30363D] rounded-lg px-3 py-2.5 text-sm text-[#E6EDF3] placeholder-[#8B949E] focus:outline-none focus:border-[#00F5FF] transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] font-mono text-[#8B949E] uppercase tracking-wider block mb-1.5">Deskripsi</label>
                <textarea
                  value={formData.desc}
                  onChange={(e) => setFormData((p) => ({ ...p, desc: e.target.value }))}
                  rows={3}
                  placeholder="Deskripsi singkat kampanye..."
                  className="w-full bg-[#21262D] border border-[#30363D] rounded-lg px-3 py-2.5 text-sm text-[#E6EDF3] placeholder-[#8B949E] focus:outline-none focus:border-[#00F5FF] transition-colors resize-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-mono text-[#8B949E] uppercase tracking-wider block mb-1.5">Tujuan Kampanye</label>
                <div className="grid grid-cols-2 gap-2">
                  {["Awareness", "Promo", "Re-engagement", "Transactional"].map((g) => (
                    <button
                      key={g}
                      onClick={() => setFormData((p) => ({ ...p, goal: g.toLowerCase() }))}
                      className={cn(
                        "px-3 py-2 rounded-lg text-[12px] font-medium border transition-all",
                        formData.goal === g.toLowerCase()
                          ? "border-[#00F5FF] bg-[#00F5FF]/10 text-[#00F5FF]"
                          : "border-[#30363D] bg-[#21262D] text-[#8B949E] hover:border-[#8B949E]"
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-mono text-[#8B949E] uppercase tracking-wider block mb-1.5">Tags</label>
                <input
                  value={formData.tags}
                  onChange={(e) => setFormData((p) => ({ ...p, tags: e.target.value }))}
                  placeholder="promo, seasonal, lebaran"
                  className="w-full bg-[#21262D] border border-[#30363D] rounded-lg px-3 py-2.5 text-sm text-[#E6EDF3] placeholder-[#8B949E] focus:outline-none focus:border-[#00F5FF] transition-colors"
                />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <label className="text-[11px] font-mono text-[#8B949E] uppercase tracking-wider block mb-2">Pilih Platform</label>
                <div className="grid grid-cols-2 gap-2">
                  {allPlatforms.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => togglePlatform(p.id)}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all",
                        formData.platforms.includes(p.id)
                          ? "bg-opacity-10 text-[#E6EDF3]"
                          : "border-[#30363D] bg-[#21262D] text-[#8B949E] hover:border-[#30363D]"
                      )}
                      style={
                        formData.platforms.includes(p.id)
                          ? { borderColor: p.color, background: `${p.color}12`, color: p.color }
                          : {}
                      }
                    >
                      <div className="w-3 h-3 rounded border-2 flex items-center justify-center flex-shrink-0"
                        style={{ borderColor: formData.platforms.includes(p.id) ? p.color : "#30363D" }}>
                        {formData.platforms.includes(p.id) && <div className="w-1.5 h-1.5 rounded-sm" style={{ background: p.color }} />}
                      </div>
                      <span className="text-[12px] font-medium">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-mono text-[#8B949E] uppercase tracking-wider block mb-2">Jadwal Pengiriman</label>
                <div className="flex gap-2">
                  {["now", "scheduled", "recurring"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setFormData((p) => ({ ...p, scheduleType: t }))}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-[11px] font-mono border transition-all capitalize",
                        formData.scheduleType === t
                          ? "border-[#00F5FF] bg-[#00F5FF]/10 text-[#00F5FF]"
                          : "border-[#30363D] bg-[#21262D] text-[#8B949E]"
                      )}
                    >
                      {t === "now" ? "Sekarang" : t === "scheduled" ? "Terjadwal" : "Recurring"}
                    </button>
                  ))}
                </div>
                {formData.scheduleType === "scheduled" && (
                  <input
                    type="datetime-local"
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData((p) => ({ ...p, scheduledAt: e.target.value }))}
                    className="mt-2 w-full bg-[#21262D] border border-[#30363D] rounded-lg px-3 py-2.5 text-sm text-[#E6EDF3] focus:outline-none focus:border-[#00F5FF] transition-colors"
                  />
                )}
              </div>
              <div>
                <label className="text-[11px] font-mono text-[#8B949E] uppercase tracking-wider block mb-1.5">Timezone</label>
                <Dropdown
                  options={[
                    { value: "Asia/Jakarta", label: "WIB — Asia/Jakarta (UTC+7)" },
                    { value: "Asia/Makassar", label: "WITA — Asia/Makassar (UTC+8)" },
                    { value: "Asia/Jayapura", label: "WIT — Asia/Jayapura (UTC+9)" },
                  ]}
                  value={formData.timezone}
                  onChange={(val) => setFormData((p) => ({ ...p, timezone: val }))}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <div>
              <p className="text-sm text-[#8B949E] mb-4">
                {formData.platforms.length === 0
                  ? "⚠️ Belum ada platform dipilih di langkah 2."
                  : "Konfigurasi konten per platform:"}
              </p>
              {formData.platforms.length > 0 && (
                <div className="space-y-4">
                  {formData.platforms.map((p) => (
                    <div key={p} className="border border-[#30363D] rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full" style={{ background: platformColors[p] }} />
                        <span className="text-[12px] font-mono font-bold" style={{ color: platformColors[p] }}>
                          {p.toUpperCase()}
                        </span>
                      </div>
                      {p === "sms" && (
                        <div>
                          <textarea rows={3} placeholder="Isi pesan SMS... Gunakan {{nama}} untuk personalisasi." className="w-full bg-[#21262D] border border-[#30363D] rounded-lg px-3 py-2.5 text-sm text-[#E6EDF3] placeholder-[#8B949E] focus:outline-none focus:border-[#00F5FF] transition-colors resize-none" />
                          <p className="text-[10px] text-[#8B949E] mt-1 text-right">0/160 karakter</p>
                        </div>
                      )}
                      {p === "email" && (
                        <div className="space-y-2">
                          <input placeholder="Subject line..." className="w-full bg-[#21262D] border border-[#30363D] rounded-lg px-3 py-2.5 text-sm text-[#E6EDF3] placeholder-[#8B949E] focus:outline-none focus:border-[#00F5FF] transition-colors" />
                          <input placeholder="Preheader text..." className="w-full bg-[#21262D] border border-[#30363D] rounded-lg px-3 py-2.5 text-sm text-[#E6EDF3] placeholder-[#8B949E] focus:outline-none focus:border-[#00F5FF] transition-colors" />
                          <textarea rows={4} placeholder="Isi email..." className="w-full bg-[#21262D] border border-[#30363D] rounded-lg px-3 py-2.5 text-sm text-[#E6EDF3] placeholder-[#8B949E] focus:outline-none focus:border-[#00F5FF] transition-colors resize-none" />
                        </div>
                      )}
                      {(p === "whatsapp" || p === "rcs") && (
                        <div className="space-y-2">
                          <input placeholder="Header..." className="w-full bg-[#21262D] border border-[#30363D] rounded-lg px-3 py-2.5 text-sm text-[#E6EDF3] placeholder-[#8B949E] focus:outline-none focus:border-[#00F5FF] transition-colors" />
                          <textarea rows={3} placeholder={`Body pesan... Gunakan {{nama}}, {{kode_promo}}`} className="w-full bg-[#21262D] border border-[#30363D] rounded-lg px-3 py-2.5 text-sm text-[#E6EDF3] placeholder-[#8B949E] focus:outline-none focus:border-[#00F5FF] transition-colors resize-none" />
                          <input placeholder="Footer (opsional)..." className="w-full bg-[#21262D] border border-[#30363D] rounded-lg px-3 py-2.5 text-sm text-[#E6EDF3] placeholder-[#8B949E] focus:outline-none focus:border-[#00F5FF] transition-colors" />
                          <div className="flex gap-2">
                            <input placeholder="Tombol CTA 1" className="flex-1 bg-[#21262D] border border-[#30363D] rounded-lg px-3 py-2 text-sm text-[#E6EDF3] placeholder-[#8B949E] focus:outline-none focus:border-[#00F5FF] transition-colors" />
                            <input placeholder="Tombol CTA 2" className="flex-1 bg-[#21262D] border border-[#30363D] rounded-lg px-3 py-2 text-sm text-[#E6EDF3] placeholder-[#8B949E] focus:outline-none focus:border-[#00F5FF] transition-colors" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-mono text-[#8B949E] uppercase tracking-wider block mb-2">Pilih Segment</label>
                {[
                  { id: "s001", name: "All Active Users", count: 48291 },
                  { id: "s002", name: "Premium Members", count: 8700 },
                  { id: "s003", name: "Dormant 90+ Days", count: 15200 },
                  { id: "s004", name: "New Registrations", count: 3420 },
                ].map((seg) => (
                  <button
                    key={seg.id}
                    onClick={() => setFormData((p) => ({ ...p, audience: seg.id }))}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-lg border mb-2 transition-all",
                      formData.audience === seg.id
                        ? "border-[#00F5FF] bg-[#00F5FF]/10"
                        : "border-[#30363D] bg-[#21262D] hover:border-[#8B949E]"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded-full border-2", formData.audience === seg.id ? "border-[#00F5FF] bg-[#00F5FF]" : "border-[#30363D]")} />
                      <span className="text-[12px] text-[#E6EDF3]">{seg.name}</span>
                    </div>
                    <span className="text-[11px] font-mono text-[#8B949E]">{seg.count.toLocaleString()} kontak</span>
                  </button>
                ))}
              </div>
              <div className="glass-cyan rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-[12px]">
                  <span className="text-[#8B949E]">Total Penerima</span>
                  <span className="font-mono font-bold text-[#00F5FF]">48,291</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-[#8B949E]">Platform</span>
                  <span className="font-mono text-[#E6EDF3]">{formData.platforms.length} dipilih</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-[#8B949E]">Est. Biaya</span>
                  <span className="font-mono font-bold text-[#3FB950]">Rp 2.41jt</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-[#30363D]">
          <button
            onClick={step > 0 ? () => setStep((s) => s - 1) : onClose}
            className="px-4 py-2 rounded-lg text-sm text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#21262D] transition-all border border-[#30363D]"
          >
            {step > 0 ? "← Kembali" : "Batal"}
          </button>
          <div className="flex gap-2">
            {step === steps.length - 1 && (
              <button
                onClick={() => { addToast({ type: "info", title: "Draft Disimpan" }); onClose(); }}
                className="px-4 py-2 rounded-lg text-sm text-[#8B949E] border border-[#30363D] hover:border-[#8B949E] transition-all"
              >
                Simpan Draft
              </button>
            )}
            <button
              onClick={step < steps.length - 1 ? () => setStep((s) => s + 1) : handleLaunch}
              className="fab px-5 py-2 rounded-lg text-sm font-bold text-[#0D1117] flex items-center gap-2"
            >
              {step < steps.length - 1 ? <>Lanjut <ArrowRight className="w-3.5 h-3.5" /></> : "🚀 Launch Campaign"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const { addToast } = useApp();
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  const filtered = campaigns.filter((c) => {
    const matchFilter =
      activeFilter === "All" ||
      c.status === activeFilter.toLowerCase();
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    const matchPlatform =
      platformFilter === "all" || c.platforms.includes(platformFilter);
    return matchFilter && matchSearch && matchPlatform;
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-['Space_Mono'] font-bold text-[#E6EDF3]">Campaigns</h1>
          <p className="text-[12px] text-[#8B949E] mt-0.5">{campaigns.length} total kampanye</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-[#161B22] border border-[#30363D] rounded-xl p-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all",
                activeFilter === f
                  ? "bg-[#00F5FF] text-[#0D1117] font-bold"
                  : "text-[#8B949E] hover:text-[#E6EDF3]"
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex-1 relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B949E]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kampanye..."
            className="w-full bg-[#21262D] border border-[#30363D] rounded-xl pl-9 pr-3 py-2 text-sm text-[#E6EDF3] placeholder-[#8B949E] focus:outline-none focus:border-[#00F5FF] transition-colors"
          />
        </div>
        <div className="w-44">
          <Dropdown
            options={[
              { value: "all", label: "Semua Platform" },
              { value: "whatsapp", label: "WhatsApp" },
              { value: "rcs", label: "RCS" },
              { value: "email", label: "Email" },
              { value: "sms", label: "SMS" },
            ]}
            value={platformFilter}
            onChange={setPlatformFilter}
            className="h-[38px] rounded-xl"
          />
        </div>
      </div>

      {/* Campaign Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <div key={c.id} className="glass card-hover rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden corner-bracket">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-[13px] font-bold text-[#E6EDF3] truncate">{c.name}</h3>
                <p className="text-[11px] text-[#8B949E] mt-0.5 line-clamp-2">{c.description}</p>
              </div>
              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${statusConfig[c.status]?.cls}`}>
                {statusConfig[c.status]?.label}
              </span>
            </div>

            <div className="flex gap-1 flex-wrap">
              {c.platforms.map((p) => (
                <PlatformBadge key={p} platform={p} />
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-[#8B949E]">
                <Calendar className="w-3 h-3 flex-shrink-0" />
                <span>{new Date(c.scheduledAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#8B949E]">
                <Users className="w-3 h-3 flex-shrink-0" />
                <span>{c.audience.toLocaleString()}</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-[#8B949E] mb-1">
                <span>Progress</span>
                <span className="font-mono">{c.progress}%</span>
              </div>
              <div className="bg-[#21262D] rounded-full h-1.5 overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all duration-1000 relative overflow-hidden"
                  style={{
                    width: `${c.progress}%`,
                    background: c.progress === 100 ? "#3FB950" : "linear-gradient(90deg, #00F5FF, #0099CC)",
                  }}
                />
              </div>
              <div className="flex gap-3 mt-1 text-[10px] font-mono">
                <span className="text-[#3FB950]">{c.sent.toLocaleString()} terkirim</span>
                {c.failed > 0 && <span className="text-[#FF4C4C]">{c.failed.toLocaleString()} gagal</span>}
              </div>
            </div>

            <div className="flex gap-1 pt-2 border-t border-[#30363D]">
              <button onClick={() => addToast({ type: "info", title: "Edit Campaign", message: c.name })} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] text-[#8B949E] hover:text-[#00F5FF] hover:bg-[#00F5FF]/10 transition-all border border-[#30363D] hover:border-[#00F5FF]/30">
                <Edit2 className="w-3 h-3" /> Edit
              </button>
              <button onClick={() => addToast({ type: "success", title: "Campaign Diduplikasi" })} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] text-[#8B949E] hover:text-[#D29922] hover:bg-[#D29922]/10 transition-all border border-[#30363D]">
                <Copy className="w-3 h-3" /> Duplikat
              </button>
              <button onClick={() => addToast({ type: "warning", title: "Campaign Diarsipkan" })} className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] text-[#8B949E] hover:text-[#FF4C4C] hover:bg-[#FF4C4C]/10 transition-all border border-[#30363D]">
                <Archive className="w-3 h-3" />
              </button>
              <button className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] text-[#8B949E] hover:text-[#9966FF] hover:bg-[#9966FF]/10 transition-all border border-[#30363D]">
                <BarChart2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-8 right-8 fab w-14 h-14 rounded-full flex items-center justify-center shadow-2xl"
      >
        <Plus className="w-6 h-6 text-[#0D1117]" />
      </button>

      {showCreate && <CreateCampaignModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
