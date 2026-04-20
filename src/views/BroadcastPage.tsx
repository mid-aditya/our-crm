"use client";

import { useState, useEffect, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { segments, platformColors } from "@/lib/mockData";
import {
  Zap,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dropdown } from "@/components/ui/Dropdown";

interface LogEntry {
  id: string;
  phone: string;
  status: "delivered" | "failed" | "pending";
  platform: string;
  time: string;
}

const phonePool = [
  "+62812-3456-7890",
  "+62821-9876-5432",
  "+62857-1122-3344",
  "+62813-5566-7788",
  "+62878-9900-1122",
  "+62811-2233-4455",
  "+62819-3344-5566",
  "+62858-7766-5544",
];

const randomPhone = () => phonePool[Math.floor(Math.random() * phonePool.length)];
const randomStatus = (): "delivered" | "failed" | "pending" => {
  const r = Math.random();
  return r > 0.85 ? "failed" : r > 0.7 ? "pending" : "delivered";
};

export default function BroadcastPage() {
  const { addToast } = useApp();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedSegment, setSelectedSegment] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [summary, setSummary] = useState({ delivered: 0, failed: 0, pending: 0 });
  const logRef = useRef<HTMLDivElement>(null);

  const allPlatforms = [
    { id: "whatsapp", label: "WhatsApp", color: "#25D366" },
    { id: "rcs", label: "RCS", color: "#00F5FF" },
    { id: "email", label: "Email", color: "#D29922" },
    { id: "sms", label: "SMS", color: "#9966FF" },
  ];

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const handleBroadcast = () => {
    if (!message.trim()) {
      addToast({ type: "error", title: "Pesan tidak boleh kosong", message: "Isi pesan terlebih dahulu" });
      return;
    }
    if (selectedPlatforms.length === 0) {
      addToast({ type: "error", title: "Pilih platform", message: "Minimal 1 platform harus dipilih" });
      return;
    }

    setIsSending(true);
    setLogs([]);
    setSummary({ delivered: 0, failed: 0, pending: 0 });
    addToast({ type: "info", title: "Broadcast Dimulai", message: "Mengirim pesan ke semua penerima..." });

    let count = 0;
    const total = 50;
    const interval = setInterval(() => {
      if (count >= total) {
        clearInterval(interval);
        setIsSending(false);
        addToast({ type: "success", title: "Broadcast Selesai!", message: `${total} pesan berhasil diproses` });
        return;
      }
      const platform = selectedPlatforms[Math.floor(Math.random() * selectedPlatforms.length)];
      const status = randomStatus();
      const newLog: LogEntry = {
        id: Math.random().toString(36).substr(2, 6),
        phone: randomPhone(),
        status,
        platform,
        time: new Date().toLocaleTimeString("id-ID"),
      };
      setLogs((prev) => [...prev.slice(-80), newLog]);
      setSummary((prev) => ({ ...prev, [status]: prev[status] + 1 }));
      count++;
    }, 100);
  };

  const charCount = message.length;

  return (
    <div className="p-6 h-full">
      <div className="mb-5">
        <h1 className="text-xl font-['Space_Mono'] font-bold text-[#E6EDF3]">Broadcast</h1>
        <p className="text-[12px] text-[#8B949E] mt-0.5">Quick blast ke segmen pilihan</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 h-[calc(100vh-180px)]">
        {/* Left: Form */}
        <div className="glass rounded-xl p-5 space-y-5 overflow-auto">
          {/* Platform Chips */}
          <div>
            <label className="text-[11px] font-mono text-[#8B949E] uppercase tracking-wider block mb-2">
              Pilih Platform
            </label>
            <div className="flex flex-wrap gap-2">
              {allPlatforms.map((p) => {
                const active = selectedPlatforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-medium border transition-all"
                    style={
                      active
                        ? {
                            borderColor: p.color,
                            background: `${p.color}15`,
                            color: p.color,
                            boxShadow: `0 0 12px ${p.color}30`,
                          }
                        : { borderColor: "#30363D", background: "#21262D", color: "#8B949E" }
                    }
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: active ? p.color : "#30363D" }}
                    />
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Segment */}
          <div>
            <label className="text-[11px] font-mono text-[#8B949E] uppercase tracking-wider block mb-2">
              Segment / Penerima
            </label>
            <Dropdown
              options={[
                { value: "", label: "-- Pilih Segment --" },
                ...segments.map(s => ({
                  value: s.id,
                  label: `${s.name} (${s.count.toLocaleString()} kontak)`
                }))
              ]}
              value={selectedSegment}
              onChange={setSelectedSegment}
            />
          </div>

          {/* Message */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-mono text-[#8B949E] uppercase tracking-wider">
                Pesan
              </label>
              <span className="text-[10px] font-mono text-[#8B949E]">{charCount} karakter</span>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="Halo {{nama}}, kami punya penawaran spesial untuk Anda! 🎁

Gunakan kode {{kode_promo}} untuk mendapatkan diskon eksklusif.

Berlaku hingga 30 April 2025."
              className="w-full bg-[#21262D] border border-[#30363D] rounded-xl px-4 py-3 text-sm text-[#E6EDF3] placeholder-[#8B949E] focus:outline-none focus:border-[#00F5FF] transition-colors resize-none font-['IBM_Plex_Sans']"
            />
            <div className="flex gap-2 mt-2 flex-wrap">
              {["{{nama}}", "{{kode_promo}}", "{{tanggal}}", "{{link}}"].map((v) => (
                <button
                  key={v}
                  onClick={() => setMessage((m) => m + v)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono text-[#00F5FF] bg-[#00F5FF]/10 border border-[#00F5FF]/20 hover:bg-[#00F5FF]/20 transition-colors"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleBroadcast}
            disabled={isSending}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm font-['IBM_Plex_Sans'] transition-all",
              isSending
                ? "bg-[#21262D] text-[#8B949E] cursor-not-allowed"
                : "fab text-[#0D1117]"
            )}
          >
            {isSending ? (
              <>
                <div className="w-4 h-4 border-2 border-[#8B949E] border-t-transparent rounded-full animate-spin" />
                Sedang Mengirim...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Broadcast Sekarang
              </>
            )}
          </button>
        </div>

        {/* Right: Live Log + Summary */}
        <div className="flex flex-col gap-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Delivered", value: summary.delivered, icon: CheckCircle2, color: "#3FB950" },
              { label: "Failed", value: summary.failed, icon: XCircle, color: "#FF4C4C" },
              { label: "Pending", value: summary.pending, icon: Clock, color: "#D29922" },
            ].map((s) => (
              <div key={s.label} className="glass rounded-xl p-4 text-center">
                <s.icon className="w-5 h-5 mx-auto mb-1.5" style={{ color: s.color }} />
                <p className="text-xl font-['Space_Mono'] font-bold" style={{ color: s.color }}>
                  {s.value}
                </p>
                <p className="text-[10px] text-[#8B949E] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Live Log */}
          <div className="glass rounded-xl flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between p-4 border-b border-[#30363D] flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", isSending ? "bg-[#3FB950] pulse-online" : "bg-[#8B949E]")} />
                <h3 className="text-[12px] font-['Space_Mono'] font-bold text-[#E6EDF3]">
                  Live Sending Log
                </h3>
              </div>
              {isSending && (
                <span className="text-[10px] font-mono text-[#00F5FF] blink">TRANSMITTING...</span>
              )}
            </div>
            <div ref={logRef} className="flex-1 overflow-y-auto p-3 font-mono text-[11px] space-y-1">
              {logs.length === 0 && (
                <div className="flex items-center justify-center h-full text-[#30363D]">
                  <p>Tekan "Broadcast Sekarang" untuk memulai</p>
                </div>
              )}
              {logs.map((log) => (
                <div key={log.id} className="log-item flex items-center gap-2">
                  <span className="text-[#30363D]">{log.time}</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                    style={{
                      color: platformColors[log.platform],
                      background: `${platformColors[log.platform]}15`,
                    }}
                  >
                    {log.platform.toUpperCase()}
                  </span>
                  <span className="text-[#8B949E]">{log.phone}</span>
                  <span
                    className={
                      log.status === "delivered"
                        ? "text-[#3FB950]"
                        : log.status === "failed"
                        ? "text-[#FF4C4C]"
                        : "text-[#D29922]"
                    }
                  >
                    [{log.status.toUpperCase()}]
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
