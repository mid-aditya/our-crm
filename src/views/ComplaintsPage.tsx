"use client";

import { useState } from "react";
import { complaints, agents, platformColors } from "@/lib/mockData";
import { useApp } from "@/context/AppContext";
import {
  Search,
  Filter,
  X,
  Send,
  ChevronDown,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dropdown } from "@/components/ui/Dropdown";

const tabs = ["All", "Open", "In Progress", "Resolved", "Escalated"];

const priorityConfig: Record<string, { label: string; cls: string }> = {
  urgent: { label: "URGENT", cls: "badge-urgent" },
  medium: { label: "MEDIUM", cls: "badge-medium" },
  low: { label: "LOW", cls: "badge-low" },
};

const statusConfig: Record<string, { label: string; cls: string }> = {
  open: { label: "Open", cls: "text-[#FF4C4C]" },
  in_progress: { label: "In Progress", cls: "text-[#00F5FF]" },
  resolved: { label: "Resolved", cls: "text-[#3FB950]" },
  escalated: { label: "Escalated", cls: "text-[#D29922]" },
};

function SLATimer({ deadline }: { deadline: string }) {
  const diff = new Date(deadline).getTime() - Date.now();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const remaining = hours > 0 ? `${hours}h ${mins % 60}m` : `${Math.max(mins, 0)}m`;
  const isUrgent = mins < 60;
  return (
    <span className={cn("text-[10px] font-mono flex items-center gap-1", isUrgent ? "sla-urgent text-[#FF4C4C]" : "text-[#8B949E]")}>
      <Clock className="w-3 h-3" />
      {mins < 0 ? "OVERDUE" : remaining}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const labels: Record<string, string> = { whatsapp: "WA", rcs: "RCS", email: "EM", sms: "SMS" };
  return (
    <span
      className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono"
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

interface ComplaintDetailProps {
  complaint: typeof complaints[0];
  onClose: () => void;
}

function ComplaintDetail({ complaint: c, onClose }: ComplaintDetailProps) {
  const { addToast } = useApp();
  const [note, setNote] = useState("");
  const [customerReply, setCustomerReply] = useState("");
  const [assignedAgent, setAssignedAgent] = useState(c.assignedTo || "");

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-[#0D1117]/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full w-full max-w-xl bg-[#161B22] border-l border-[#30363D] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#30363D] flex-shrink-0">
          <div>
            <p className="text-[10px] font-mono text-[#8B949E]">{c.id}</p>
            <h2 className="text-[14px] font-['Space_Mono'] font-bold text-[#E6EDF3] mt-0.5">{c.subject}</h2>
          </div>
          <button onClick={onClose} className="text-[#8B949E] hover:text-[#E6EDF3] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass rounded-lg p-3">
              <p className="text-[10px] text-[#8B949E] mb-1">Kontak</p>
              <p className="text-[12px] font-semibold text-[#E6EDF3]">{c.contact.name}</p>
              <p className="text-[10px] text-[#8B949E]">{c.contact.phone}</p>
            </div>
            <div className="glass rounded-lg p-3">
              <p className="text-[10px] text-[#8B949E] mb-1">SLA</p>
              <SLATimer deadline={c.slaDeadline} />
              <p className="text-[10px] text-[#8B949E] mt-0.5">Deadline</p>
            </div>
            <div className="glass rounded-lg p-3">
              <p className="text-[10px] text-[#8B949E] mb-1">Prioritas</p>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${priorityConfig[c.priority]?.cls}`}>
                {priorityConfig[c.priority]?.label}
              </span>
            </div>
            <div className="glass rounded-lg p-3">
              <p className="text-[10px] text-[#8B949E] mb-1">Status</p>
              <p className={`text-[12px] font-semibold ${statusConfig[c.status]?.cls}`}>
                {statusConfig[c.status]?.label}
              </p>
            </div>
          </div>

          {/* Conversation History */}
          <div>
            <h3 className="text-[11px] font-['Space_Mono'] font-bold text-[#8B949E] uppercase tracking-wider mb-3">Histori Percakapan</h3>
            <div className="space-y-3">
              {c.messages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.from === "agent" ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[80%] px-4 py-2.5", msg.from === "agent" ? "bubble-outgoing" : "bubble-incoming")}>
                    <p className="text-[12px] text-[#E6EDF3]">{msg.text}</p>
                    <p className={cn("text-[10px] mt-1", msg.from === "agent" ? "text-[#00F5FF]/60 text-right" : "text-[#8B949E]")}>{msg.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Internal Notes */}
          <div>
            <h3 className="text-[11px] font-['Space_Mono'] font-bold text-[#8B949E] uppercase tracking-wider mb-2">Catatan Internal</h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Tambah catatan untuk agent lain (tidak dikirim ke pelanggan)..."
              className="w-full bg-[#21262D] border border-[#30363D] rounded-xl px-3 py-2.5 text-[12px] text-[#E6EDF3] placeholder-[#8B949E] focus:outline-none focus:border-[#D29922] transition-colors resize-none"
            />
            <button
              onClick={() => { addToast({ type: "success", title: "Catatan Disimpan" }); setNote(""); }}
              className="mt-1.5 text-[11px] text-[#D29922] hover:text-[#D29922]/80 transition-colors"
            >
              + Simpan Catatan
            </button>
          </div>

          {/* Assign */}
          <div>
            <h3 className="text-[11px] font-['Space_Mono'] font-bold text-[#8B949E] uppercase tracking-wider mb-2">Assign Agent</h3>
            <Dropdown
              options={[
                { value: "", label: "-- Pilih Agent --" },
                ...agents.map(a => ({ value: a, label: a }))
              ]}
              value={assignedAgent}
              onChange={setAssignedAgent}
            />
          </div>

          {/* Reply to Customer */}
          <div>
            <h3 className="text-[11px] font-['Space_Mono'] font-bold text-[#8B949E] uppercase tracking-wider mb-2">Kirim Balasan ke Pelanggan</h3>
            <textarea
              value={customerReply}
              onChange={(e) => setCustomerReply(e.target.value)}
              rows={3}
              placeholder="Tulis pesan balasan..."
              className="w-full bg-[#21262D] border border-[#30363D] rounded-xl px-3 py-2.5 text-[12px] text-[#E6EDF3] placeholder-[#8B949E] focus:outline-none focus:border-[#00F5FF] transition-colors resize-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#30363D] flex-shrink-0 space-y-2">
          <button
            onClick={() => { addToast({ type: "success", title: "Balasan Terkirim!" }); setCustomerReply(""); }}
            className="w-full fab py-2.5 rounded-xl text-[#0D1117] font-bold text-sm flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" /> Kirim Balasan
          </button>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => addToast({ type: "success", title: "Komplain Resolve" })} className="py-2 rounded-lg text-[11px] text-[#3FB950] border border-[#3FB950]/30 hover:bg-[#3FB950]/10 transition-all flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
            </button>
            <button onClick={() => addToast({ type: "warning", title: "Prioritas Diubah" })} className="py-2 rounded-lg text-[11px] text-[#D29922] border border-[#D29922]/30 hover:bg-[#D29922]/10 transition-all flex items-center justify-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Prioritas
            </button>
            <button onClick={() => addToast({ type: "error", title: "Dieskalasi" })} className="py-2 rounded-lg text-[11px] text-[#FF4C4C] border border-[#FF4C4C]/30 hover:bg-[#FF4C4C]/10 transition-all flex items-center justify-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" /> Eskalasi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ComplaintsPage() {
  const { addToast } = useApp();
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState<typeof complaints[0] | null>(null);
  
  const [platformFilter, setPlatformFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");

  const filtered = complaints.filter((c) => {
    const matchTab = activeTab === "All" || c.status.replace("_", " ") === activeTab.toLowerCase() || (activeTab === "In Progress" && c.status === "in_progress") || (activeTab === "Open" && c.status === "open") || (activeTab === "Resolved" && c.status === "resolved") || (activeTab === "Escalated" && c.status === "escalated");
    const matchSearch = c.contact.name.toLowerCase().includes(search.toLowerCase()) || c.subject.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase());
    
    const matchPlatform = platformFilter === "all" || c.platform.toLowerCase() === platformFilter.toLowerCase();
    const matchPriority = priorityFilter === "all" || c.priority.toLowerCase() === priorityFilter.toLowerCase();
    const matchAgent = agentFilter === "all" || (c.assignedTo && c.assignedTo === agentFilter);

    return matchTab && matchSearch && matchPlatform && matchPriority && matchAgent;
  }).filter((c) => {
    if (activeTab === "All") return true;
    if (activeTab === "In Progress") return c.status === "in_progress";
    return c.status === activeTab.toLowerCase();
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-['Space_Mono'] font-bold text-[#E6EDF3]">Complaints</h1>
          <p className="text-[12px] text-[#8B949E] mt-0.5">{complaints.filter(c => c.status === "open").length} komplain belum ditangani</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#161B22] border border-[#30363D] rounded-xl p-1 w-fit flex-wrap">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-[11px] font-mono transition-all",
              activeTab === t
                ? "bg-[#00F5FF] text-[#0D1117] font-bold"
                : "text-[#8B949E] hover:text-[#E6EDF3]"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B949E]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari komplain..."
            className="w-full bg-[#21262D] border border-[#30363D] rounded-xl pl-9 pr-3 py-2 text-sm text-[#E6EDF3] placeholder-[#8B949E] focus:outline-none focus:border-[#00F5FF] transition-colors h-[38px]"
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
            className="h-[38px]"
          />
        </div>

        <div className="w-40">
          <Dropdown
            options={[
              { value: "all", label: "Semua Prioritas" },
              { value: "urgent", label: "Urgent" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
            ]}
            value={priorityFilter}
            onChange={setPriorityFilter}
            className="h-[38px]"
          />
        </div>

        <div className="w-48">
          <Dropdown
            options={[
              { value: "all", label: "Semua Agent" },
              ...agents.map(a => ({ value: a, label: a }))
            ]}
            value={agentFilter}
            onChange={setAgentFilter}
            className="h-[38px]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#30363D]">
                {["ID", "Kontak", "Subjek", "Platform", "Prioritas", "Status", "Assigned", "SLA", "Aksi"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-mono uppercase text-[#8B949E] tracking-wider px-4 py-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-[#30363D]/50 hover:bg-[#21262D]/40 transition-colors cursor-pointer"
                  onClick={() => setSelectedComplaint(c)}
                >
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-mono text-[#00F5FF]">{c.id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#21262D] flex items-center justify-center text-[9px] font-bold text-[#8B949E] flex-shrink-0">
                        {c.contact.avatar}
                      </div>
                      <span className="text-[12px] text-[#E6EDF3] whitespace-nowrap">{c.contact.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="text-[12px] text-[#8B949E] truncate">{c.subject}</p>
                  </td>
                  <td className="px-4 py-3">
                    <PlatformBadge platform={c.platform} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${priorityConfig[c.priority]?.cls}`}>
                      {priorityConfig[c.priority]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[12px] font-semibold ${statusConfig[c.status]?.cls}`}>
                      {statusConfig[c.status]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] text-[#8B949E]">{c.assignedTo || "—"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <SLATimer deadline={c.slaDeadline} />
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedComplaint(c); }} className="p-1.5 rounded text-[#8B949E] hover:text-[#00F5FF] hover:bg-[#00F5FF]/10 transition-colors">
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); addToast({ type: "success", title: "Agent Ditugaskan" }); }} className="p-1.5 rounded text-[#8B949E] hover:text-[#3FB950] hover:bg-[#3FB950]/10 transition-colors">
                        <UserCheck className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); addToast({ type: "success", title: "Komplain Diselesaikan" }); }} className="p-1.5 rounded text-[#8B949E] hover:text-[#D29922] hover:bg-[#D29922]/10 transition-colors">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-[#8B949E] text-[12px]">
            Tidak ada komplain ditemukan
          </div>
        )}
      </div>

      {selectedComplaint && (
        <ComplaintDetail complaint={selectedComplaint} onClose={() => setSelectedComplaint(null)} />
      )}
    </div>
  );
}
