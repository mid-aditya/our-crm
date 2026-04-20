"use client";

import { useState } from "react";
import { conversations, platformColors } from "@/lib/mockData";
import { useApp } from "@/context/AppContext";
import {
  Search,
  Send,
  Paperclip,
  Smile,
  UserCheck,
  CheckCheck,
  AlertTriangle,
  ChevronRight,
  Phone,
  Mail,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const filters = ["All", "WhatsApp", "RCS", "Email", "SMS"];

function PlatformIcon({ platform, size = "sm" }: { platform: string; size?: "sm" | "xs" }) {
  const labels: Record<string, string> = { whatsapp: "WA", rcs: "RCS", email: "EM", sms: "SMS" };
  const s = size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-[9px] px-1 py-0.5";
  return (
    <span
      className={`font-bold rounded font-mono ${s}`}
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

export default function InboxPage() {
  const { addToast } = useApp();
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedConv, setSelectedConv] = useState(conversations[0]);
  const [reply, setReply] = useState("");
  const [showContactPanel, setShowContactPanel] = useState(true);
  const [localConvs, setLocalConvs] = useState(conversations);

  const filtered = localConvs.filter((c) => {
    const matchFilter = activeFilter === "All" || c.platform === activeFilter.toLowerCase();
    const matchSearch = c.contact.name.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const sendReply = () => {
    if (!reply.trim()) return;
    const updated = localConvs.map((c) =>
      c.id === selectedConv.id
        ? {
            ...c,
            messages: [...c.messages, { from: "agent" as const, text: reply, time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) }],
            lastMessage: reply,
            unread: 0,
          }
        : c
    );
    setLocalConvs(updated);
    setSelectedConv((sc) => ({
      ...sc,
      messages: [...sc.messages, { from: "agent", text: reply, time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) }],
    }));
    setReply("");
    addToast({ type: "success", title: "Pesan Terkirim" });
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Conversation List */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-[#30363D] bg-[#0D1117]">
        <div className="p-4 border-b border-[#30363D] space-y-3">
          <h1 className="text-[14px] font-['Space_Mono'] font-bold text-[#E6EDF3]">Inbox</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B949E]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari percakapan..."
              className="w-full bg-[#21262D] border border-[#30363D] rounded-xl pl-9 pr-3 py-2 text-[12px] text-[#E6EDF3] placeholder-[#8B949E] focus:outline-none focus:border-[#00F5FF] transition-colors"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={cn(
                  "flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all",
                  activeFilter === f
                    ? "bg-[#00F5FF] text-[#0D1117] font-bold"
                    : "text-[#8B949E] hover:bg-[#21262D]"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedConv(c);
                setLocalConvs((prev) => prev.map((p) => p.id === c.id ? { ...p, unread: 0 } : p));
              }}
              className={cn(
                "w-full text-left p-3.5 border-b border-[#30363D]/50 hover:bg-[#21262D]/60 transition-colors",
                selectedConv.id === c.id && "bg-[#21262D] border-l-2 border-l-[#00F5FF]"
              )}
            >
              <div className="flex items-start gap-2.5">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#21262D] to-[#30363D] flex items-center justify-center text-[11px] font-bold text-[#8B949E] flex-shrink-0">
                    {c.contact.avatar}
                  </div>
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border border-[#0D1117] flex items-center justify-center"
                    style={{ background: platformColors[c.platform] }}
                  >
                    <span className="text-[6px] font-bold text-[#0D1117]">
                      {c.platform === "whatsapp" ? "W" : c.platform === "rcs" ? "R" : c.platform === "email" ? "E" : "S"}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-[12px] font-semibold text-[#E6EDF3] truncate">{c.contact.name}</p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-[10px] text-[#8B949E]">{c.lastTime}</span>
                      {c.unread > 0 && (
                        <span className="w-4 h-4 rounded-full bg-[#00F5FF] text-[#0D1117] text-[9px] font-bold flex items-center justify-center">
                          {c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-[#8B949E] truncate">{c.lastMessage}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0D1117]">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#30363D] bg-[#161B22] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#21262D] to-[#30363D] flex items-center justify-center text-[11px] font-bold text-[#8B949E]">
              {selectedConv.contact.avatar}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[#E6EDF3]">{selectedConv.contact.name}</p>
              <div className="flex items-center gap-1.5">
                <PlatformIcon platform={selectedConv.platform} size="xs" />
                <span className="text-[10px] text-[#8B949E]">{selectedConv.contact.phone}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => addToast({ type: "success", title: "Agent Ditugaskan" })} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-[#8B949E] hover:text-[#00F5FF] hover:bg-[#00F5FF]/10 border border-[#30363D] transition-all">
              <UserCheck className="w-3.5 h-3.5" /> Assign
            </button>
            <button onClick={() => addToast({ type: "success", title: "Chat Ditandai Selesai" })} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-[#8B949E] hover:text-[#3FB950] hover:bg-[#3FB950]/10 border border-[#30363D] transition-all">
              <CheckCheck className="w-3.5 h-3.5" /> Selesai
            </button>
            <button onClick={() => addToast({ type: "warning", title: "Dieskalasi ke Complaints" })} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-[#8B949E] hover:text-[#FF4C4C] hover:bg-[#FF4C4C]/10 border border-[#30363D] transition-all">
              <AlertTriangle className="w-3.5 h-3.5" /> Eskalasi
            </button>
            <button
              onClick={() => setShowContactPanel(!showContactPanel)}
              className={cn("p-2 rounded-lg border border-[#30363D] transition-all", showContactPanel ? "text-[#00F5FF] bg-[#00F5FF]/10" : "text-[#8B949E] hover:text-[#E6EDF3]")}
            >
              <ChevronRight className={cn("w-4 h-4 transition-transform", showContactPanel && "rotate-180")} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {selectedConv.messages.map((msg, i) => (
            <div key={i} className={cn("flex", msg.from === "agent" ? "justify-end" : "justify-start")}>
              {msg.from === "contact" && (
                <div className="w-7 h-7 rounded-full bg-[#21262D] flex items-center justify-center text-[9px] font-bold text-[#8B949E] mr-2 flex-shrink-0 mt-1">
                  {selectedConv.contact.avatar}
                </div>
              )}
              <div className={cn("max-w-[65%] px-4 py-2.5", msg.from === "agent" ? "bubble-outgoing" : "bubble-incoming")}>
                <p className="text-[13px] text-[#E6EDF3] leading-relaxed">{msg.text}</p>
                <p className={cn("text-[10px] mt-1", msg.from === "agent" ? "text-[#00F5FF]/60 text-right" : "text-[#8B949E]")}>{msg.time}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Reply Input */}
        <div className="p-4 border-t border-[#30363D] bg-[#161B22] flex-shrink-0">
          <div className="flex items-end gap-2">
            <div className="flex-1 bg-[#21262D] border border-[#30363D] rounded-xl px-4 py-2.5 focus-within:border-[#00F5FF] transition-colors">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); }
                }}
                rows={2}
                placeholder="Ketik balasan... (Enter untuk kirim, Shift+Enter untuk baris baru)"
                className="w-full bg-transparent text-[13px] text-[#E6EDF3] placeholder-[#8B949E] focus:outline-none resize-none"
              />
              <div className="flex items-center gap-2 mt-1.5">
                <button className="text-[#8B949E] hover:text-[#00F5FF] transition-colors"><Paperclip className="w-3.5 h-3.5" /></button>
                <button className="text-[#8B949E] hover:text-[#D29922] transition-colors"><Smile className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <button
              onClick={sendReply}
              className="fab w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            >
              <Send className="w-4 h-4 text-[#0D1117]" />
            </button>
          </div>
        </div>
      </div>

      {/* Contact Info Panel */}
      {showContactPanel && (
        <div className="w-64 flex-shrink-0 border-l border-[#30363D] bg-[#161B22] overflow-y-auto">
          <div className="p-4 border-b border-[#30363D]">
            <h3 className="text-[11px] font-['Space_Mono'] font-bold text-[#8B949E] uppercase tracking-wider mb-3">Info Kontak</h3>
            <div className="text-center mb-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#00F5FF]/20 to-[#0099CC]/10 border border-[#00F5FF]/20 flex items-center justify-center text-[16px] font-bold text-[#00F5FF] mx-auto mb-2">
                {selectedConv.contact.avatar}
              </div>
              <p className="text-[13px] font-semibold text-[#E6EDF3]">{selectedConv.contact.name}</p>
            </div>
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center gap-2 text-[#8B949E]">
                <Phone className="w-3 h-3 flex-shrink-0" />
                <span>{selectedConv.contact.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-[#8B949E]">
                <Mail className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">user@email.com</span>
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-[#30363D]">
            <h3 className="text-[11px] font-['Space_Mono'] font-bold text-[#8B949E] uppercase tracking-wider mb-2">Riwayat Campaign</h3>
            <div className="space-y-1.5">
              {["Promo Lebaran 2025", "Newsletter April", "Re-engagement"].map((name, i) => (
                <div key={i} className="flex items-center justify-between text-[10px]">
                  <span className="text-[#8B949E] truncate flex-1 mr-2">{name}</span>
                  <span className="text-[#3FB950] font-mono flex-shrink-0">✓</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4">
            <h3 className="text-[11px] font-['Space_Mono'] font-bold text-[#8B949E] uppercase tracking-wider mb-2">Riwayat Komplain</h3>
            <div className="space-y-1.5">
              <div className="text-[10px] text-[#8B949E]">Belum ada komplain tercatat</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
