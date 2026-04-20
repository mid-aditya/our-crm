"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import {
  Bell,
  Shield,
  Globe,
  Palette,
  Key,
  Users,
  Webhook,
  Mail,
  Save,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dropdown } from "@/components/ui/Dropdown";

const settingsTabs = [
  { id: "general", label: "General", icon: Globe },
  { id: "notifications", label: "Notifikasi", icon: Bell },
  { id: "platforms", label: "Platform API", icon: Webhook },
  { id: "team", label: "Tim & Akses", icon: Users },
  { id: "security", label: "Keamanan", icon: Shield },
];

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={cn(
        "relative inline-flex h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none",
        enabled ? "bg-[#00F5FF]" : "bg-[#30363D]"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 my-1",
          enabled ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}

function SettingRow({
  label,
  desc,
  children,
}: {
  label: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-[#30363D]/60">
      <div className="flex-1 mr-8">
        <p className="text-[13px] font-semibold text-[#E6EDF3]">{label}</p>
        {desc && <p className="text-[11px] text-[#8B949E] mt-0.5">{desc}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

const platformApis = [
  {
    id: "whatsapp",
    name: "WhatsApp Business API",
    color: "#25D366",
    fields: ["Business Account ID", "Phone Number ID", "Access Token"],
    connected: true,
  },
  {
    id: "rcs",
    name: "RCS Business Messaging",
    color: "#00F5FF",
    fields: ["Agent ID", "Service Account Key", "Project ID"],
    connected: true,
  },
  {
    id: "email",
    name: "Email / SMTP",
    color: "#D29922",
    fields: ["SMTP Host", "SMTP Port", "Username", "Password"],
    connected: true,
  },
  {
    id: "sms",
    name: "SMS Gateway",
    color: "#9966FF",
    fields: ["API Key", "Sender ID", "Gateway URL"],
    connected: false,
  },
];

const teamMembers = [
  { name: "Aditya Pratama", email: "aditya@company.com", role: "Super Admin", status: "active" },
  { name: "Rina Agustin", email: "rina@company.com", role: "Agent", status: "active" },
  { name: "Ahmad Fauzi", email: "ahmad@company.com", role: "Agent", status: "active" },
  { name: "Dewi Kartika", email: "dewi@company.com", role: "Supervisor", status: "active" },
  { name: "Bima Pratama", email: "bima@company.com", role: "Agent", status: "inactive" },
];

export default function SettingsPage() {
  const { addToast } = useApp();
  const [activeTab, setActiveTab] = useState("general");
  const [notifs, setNotifs] = useState({
    newComplaint: true,
    broadcastDone: true,
    campaignScheduled: false,
    agentAssigned: true,
    slaBreached: true,
    emailDigest: false,
  });
  const [general, setGeneral] = useState({
    brandName: "BroadcastCRM",
    timezone: "Asia/Jakarta",
    language: "id",
    autoAssign: true,
    slaHours: "4",
  });
  const [sessionTimeout, setSessionTimeout] = useState("30");

  const toggleNotif = (key: keyof typeof notifs) => {
    setNotifs((p) => ({ ...p, [key]: !p[key] }));
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-['Space_Mono'] font-bold text-[#E6EDF3]">Settings</h1>
        <p className="text-[12px] text-[#8B949E] mt-0.5">Konfigurasi sistem dan preferensi</p>
      </div>

      <div className="flex gap-5">
        {/* Sidebar Tabs */}
        <div className="w-44 flex-shrink-0">
          <nav className="space-y-0.5">
            {settingsTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[12px] font-medium transition-all",
                  activeTab === t.id
                    ? "bg-[#00F5FF]/10 text-[#00F5FF] border border-[#00F5FF]/20"
                    : "text-[#8B949E] hover:bg-[#21262D] hover:text-[#E6EDF3]"
                )}
              >
                <t.icon className="w-3.5 h-3.5 flex-shrink-0" />
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* General */}
          {activeTab === "general" && (
            <div className="glass rounded-xl p-6">
              <h2 className="text-[14px] font-['Space_Mono'] font-bold text-[#E6EDF3] mb-1">General Settings</h2>
              <p className="text-[11px] text-[#8B949E] mb-5">Pengaturan umum sistem</p>

              <SettingRow label="Nama Brand" desc="Nama yang ditampilkan di header dan notifikasi">
                <input
                  value={general.brandName}
                  onChange={(e) => setGeneral((p) => ({ ...p, brandName: e.target.value }))}
                  className="bg-[#21262D] border border-[#30363D] rounded-lg px-3 py-2 text-sm text-[#E6EDF3] focus:outline-none focus:border-[#00F5FF] transition-colors w-48"
                />
              </SettingRow>

              <SettingRow label="Timezone Default" desc="Digunakan untuk jadwal pengiriman campaign">
                <div className="w-48">
                  <Dropdown
                    options={[
                      { value: "Asia/Jakarta", label: "WIB (UTC+7)" },
                      { value: "Asia/Makassar", label: "WITA (UTC+8)" },
                      { value: "Asia/Jayapura", label: "WIT (UTC+9)" },
                    ]}
                    value={general.timezone}
                    onChange={(val) => setGeneral((p) => ({ ...p, timezone: val }))}
                  />
                </div>
              </SettingRow>

              <SettingRow label="Bahasa Antarmuka" desc="Bahasa tampilan dashboard">
                <div className="w-48">
                  <Dropdown
                    options={[
                      { value: "id", label: "Bahasa Indonesia" },
                      { value: "en", label: "English" },
                    ]}
                    value={general.language}
                    onChange={(val) => setGeneral((p) => ({ ...p, language: val }))}
                  />
                </div>
              </SettingRow>

              <SettingRow label="Auto-assign Komplain" desc="Otomatis tugaskan komplain ke agent yang tersedia">
                <Toggle enabled={general.autoAssign} onChange={() => setGeneral((p) => ({ ...p, autoAssign: !p.autoAssign }))} />
              </SettingRow>

              <SettingRow label="SLA Default (jam)" desc="Waktu respons maksimum untuk komplain">
                <input
                  type="number"
                  value={general.slaHours}
                  onChange={(e) => setGeneral((p) => ({ ...p, slaHours: e.target.value }))}
                  min={1}
                  max={72}
                  className="bg-[#21262D] border border-[#30363D] rounded-lg px-3 py-2 text-sm text-[#E6EDF3] focus:outline-none focus:border-[#00F5FF] transition-colors w-24 text-center"
                />
              </SettingRow>

              <div className="mt-6">
                <button
                  onClick={() => addToast({ type: "success", title: "Pengaturan Disimpan", message: "Perubahan berhasil diterapkan" })}
                  className="fab flex items-center gap-2 px-5 py-2.5 rounded-xl text-[#0D1117] font-bold text-sm"
                >
                  <Save className="w-3.5 h-3.5" /> Simpan Perubahan
                </button>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === "notifications" && (
            <div className="glass rounded-xl p-6">
              <h2 className="text-[14px] font-['Space_Mono'] font-bold text-[#E6EDF3] mb-1">Notifikasi</h2>
              <p className="text-[11px] text-[#8B949E] mb-5">Atur kapan dan bagaimana kamu menerima notifikasi</p>

              <SettingRow label="Komplain Baru Masuk" desc="Notifikasi saat ada komplain baru dari semua platform">
                <Toggle enabled={notifs.newComplaint} onChange={() => toggleNotif("newComplaint")} />
              </SettingRow>
              <SettingRow label="Broadcast Selesai" desc="Notifikasi saat proses broadcast campaign selesai">
                <Toggle enabled={notifs.broadcastDone} onChange={() => toggleNotif("broadcastDone")} />
              </SettingRow>
              <SettingRow label="Campaign Terjadwal Dimulai" desc="Pengingat 30 menit sebelum campaign terjadwal">
                <Toggle enabled={notifs.campaignScheduled} onChange={() => toggleNotif("campaignScheduled")} />
              </SettingRow>
              <SettingRow label="Agent Ditugaskan" desc="Notifikasi saat kamu di-assign ke sebuah komplain">
                <Toggle enabled={notifs.agentAssigned} onChange={() => toggleNotif("agentAssigned")} />
              </SettingRow>
              <SettingRow label="SLA Terlewati" desc="Peringatan darurat saat SLA hampir atau sudah terlewati">
                <Toggle enabled={notifs.slaBreached} onChange={() => toggleNotif("slaBreached")} />
              </SettingRow>
              <SettingRow label="Digest Email Harian" desc="Ringkasan performa harian dikirim ke email setiap pukul 08:00">
                <Toggle enabled={notifs.emailDigest} onChange={() => toggleNotif("emailDigest")} />
              </SettingRow>

              <div className="mt-6">
                <button
                  onClick={() => addToast({ type: "success", title: "Notifikasi Diperbarui" })}
                  className="fab flex items-center gap-2 px-5 py-2.5 rounded-xl text-[#0D1117] font-bold text-sm"
                >
                  <Save className="w-3.5 h-3.5" /> Simpan
                </button>
              </div>
            </div>
          )}

          {/* Platform API */}
          {activeTab === "platforms" && (
            <div className="space-y-4">
              {platformApis.map((p) => (
                <div key={p.id} className="glass rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold font-mono"
                        style={{ background: `${p.color}20`, color: p.color, border: `1px solid ${p.color}30` }}
                      >
                        {p.id === "whatsapp" ? "WA" : p.id === "rcs" ? "RCS" : p.id === "email" ? "EM" : "SMS"}
                      </div>
                      <div>
                        <h3 className="text-[13px] font-semibold text-[#E6EDF3]">{p.name}</h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          <div className={cn("w-1.5 h-1.5 rounded-full", p.connected ? "bg-[#3FB950]" : "bg-[#8B949E]")} />
                          <span className="text-[10px] font-mono" style={{ color: p.connected ? "#3FB950" : "#8B949E" }}>
                            {p.connected ? "CONNECTED" : "DISCONNECTED"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => addToast({ type: p.connected ? "warning" : "success", title: p.connected ? "Platform Diputus" : "Platform Terhubung" })}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all",
                        p.connected
                          ? "border-[#FF4C4C]/30 text-[#FF4C4C] hover:bg-[#FF4C4C]/10"
                          : "border-[#3FB950]/30 text-[#3FB950] hover:bg-[#3FB950]/10"
                      )}
                    >
                      {p.connected ? "Disconnect" : "Connect"}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {p.fields.map((field) => (
                      <div key={field}>
                        <label className="text-[10px] font-mono text-[#8B949E] uppercase tracking-wider block mb-1">{field}</label>
                        <input
                          type={field.toLowerCase().includes("token") || field.toLowerCase().includes("key") || field.toLowerCase().includes("password") ? "password" : "text"}
                          placeholder={`Masukkan ${field}...`}
                          defaultValue={p.connected ? "••••••••••••••••" : ""}
                          className="w-full bg-[#21262D] border border-[#30363D] rounded-lg px-3 py-2 text-sm text-[#E6EDF3] placeholder-[#8B949E] focus:outline-none focus:border-[#00F5FF] transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => addToast({ type: "success", title: `${p.name} Disimpan` })}
                    className="mt-4 px-4 py-2 rounded-lg text-[11px] font-medium border border-[#30363D] text-[#8B949E] hover:text-[#00F5FF] hover:border-[#00F5FF]/30 hover:bg-[#00F5FF]/10 transition-all flex items-center gap-1.5"
                  >
                    <Save className="w-3 h-3" /> Simpan Kredensial
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Team */}
          {activeTab === "team" && (
            <div className="glass rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-[#30363D]">
                <div>
                  <h2 className="text-[13px] font-['Space_Mono'] font-bold text-[#E6EDF3]">Tim & Akses</h2>
                  <p className="text-[11px] text-[#8B949E] mt-0.5">{teamMembers.length} anggota terdaftar</p>
                </div>
                <button
                  onClick={() => addToast({ type: "info", title: "Undangan Terkirim", message: "Email undangan dikirim ke anggota baru" })}
                  className="fab flex items-center gap-2 px-4 py-2 rounded-xl text-[#0D1117] font-bold text-[12px]"
                >
                  <Mail className="w-3.5 h-3.5" /> Undang Anggota
                </button>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#30363D]">
                    {["Nama", "Email", "Role", "Status", "Aksi"].map((h) => (
                      <th key={h} className="text-left text-[10px] font-mono uppercase text-[#8B949E] tracking-wider px-5 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((m, i) => (
                    <tr key={i} className="border-b border-[#30363D]/50 hover:bg-[#21262D]/40 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#00F5FF]/20 to-[#0099CC]/10 flex items-center justify-center text-[10px] font-bold text-[#00F5FF]">
                            {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                          <span className="text-[12px] font-semibold text-[#E6EDF3]">{m.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-[11px] text-[#8B949E]">{m.email}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="w-[130px]">
                          <Dropdown
                            options={[
                              { value: "Super Admin", label: "Super Admin" },
                              { value: "Supervisor", label: "Supervisor" },
                              { value: "Agent", label: "Agent" },
                              { value: "Viewer", label: "Viewer" },
                            ]}
                            value={m.role}
                            onChange={() => {}}
                            className="h-[32px]"
                          />
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${m.status === "active" ? "badge-active" : "badge-draft"}`}>
                          {m.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => addToast({ type: "warning", title: "Akun Dinonaktifkan" })}
                          className="text-[11px] text-[#FF4C4C] hover:text-[#FF4C4C]/80 transition-colors"
                          disabled={m.role === "Super Admin"}
                        >
                          {m.role !== "Super Admin" ? "Nonaktifkan" : "—"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Security */}
          {activeTab === "security" && (
            <div className="glass rounded-xl p-6">
              <h2 className="text-[14px] font-['Space_Mono'] font-bold text-[#E6EDF3] mb-1">Keamanan</h2>
              <p className="text-[11px] text-[#8B949E] mb-5">Pengaturan keamanan akun dan sesi</p>

              <SettingRow label="Two-Factor Authentication" desc="Tambahkan lapisan keamanan ekstra saat login">
                <button
                  onClick={() => addToast({ type: "success", title: "2FA Diaktifkan" })}
                  className="px-4 py-1.5 rounded-lg text-[12px] font-medium border border-[#3FB950]/30 text-[#3FB950] hover:bg-[#3FB950]/10 transition-all"
                >
                  Aktifkan 2FA
                </button>
              </SettingRow>

              <SettingRow label="Ganti Password" desc="Ubah kata sandi akun kamu">
                <button
                  onClick={() => addToast({ type: "info", title: "Form Ganti Password Dibuka" })}
                  className="px-4 py-1.5 rounded-lg text-[12px] font-medium border border-[#30363D] text-[#8B949E] hover:text-[#E6EDF3] hover:border-[#8B949E] transition-all"
                >
                  Ubah Password
                </button>
              </SettingRow>

              <SettingRow label="API Keys" desc="Kelola kunci API untuk integrasi eksternal">
                <button
                  onClick={() => addToast({ type: "info", title: "API Keys Dibuka" })}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-medium border border-[#30363D] text-[#8B949E] hover:text-[#E6EDF3] hover:border-[#8B949E] transition-all"
                >
                  <Key className="w-3.5 h-3.5" /> Kelola Keys
                </button>
              </SettingRow>

              <SettingRow label="Session Timeout" desc="Logout otomatis setelah tidak aktif">
                <div className="w-48">
                  <Dropdown
                    options={[
                      { value: "30", label: "30 menit" },
                      { value: "60", label: "1 jam" },
                      { value: "240", label: "4 jam" },
                      { value: "480", label: "8 jam" },
                      { value: "never", label: "Tidak pernah" },
                    ]}
                    value={sessionTimeout}
                    onChange={setSessionTimeout}
                  />
                </div>
              </SettingRow>

              <SettingRow label="Whitelist IP" desc="Batasi akses hanya dari IP tertentu">
                <input
                  placeholder="192.168.1.1, 10.0.0.1"
                  className="bg-[#21262D] border border-[#30363D] rounded-lg px-3 py-2 text-sm text-[#E6EDF3] placeholder-[#8B949E] focus:outline-none focus:border-[#00F5FF] transition-colors w-48"
                />
              </SettingRow>

              <div className="mt-6">
                <button
                  onClick={() => addToast({ type: "success", title: "Pengaturan Keamanan Disimpan" })}
                  className="fab flex items-center gap-2 px-5 py-2.5 rounded-xl text-[#0D1117] font-bold text-sm"
                >
                  <Save className="w-3.5 h-3.5" /> Simpan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
