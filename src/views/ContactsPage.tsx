"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import {
  Search,
  Plus,
  Mail,
  Phone,
  Tag,
  MapPin,
  MoreVertical,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { platformColors } from "@/lib/mockData";

import { Dropdown } from "@/components/ui/Dropdown";

const contacts = [
  { id: "ct001", name: "Budi Santoso", email: "budi@email.com", phone: "+62812-3456-7890", location: "Jakarta", tags: ["premium", "loyal"], platforms: ["whatsapp", "email"], lastActivity: "2 jam lalu", status: "active" },
  { id: "ct002", name: "Dewi Rahayu", email: "dewi@email.com", phone: "+62821-9876-5432", location: "Surabaya", tags: ["new"], platforms: ["sms"], lastActivity: "1 hari lalu", status: "active" },
  { id: "ct003", name: "Arief Wibowo", email: "arief@email.com", phone: "+62813-1111-2222", location: "Bandung", tags: ["premium"], platforms: ["whatsapp", "rcs"], lastActivity: "3 hari lalu", status: "active" },
  { id: "ct004", name: "Siti Nuraini", email: "siti@email.com", phone: "+62857-1234-5678", location: "Yogyakarta", tags: ["dormant"], platforms: ["email"], lastActivity: "45 hari lalu", status: "inactive" },
  { id: "ct005", name: "Joko Purnomo", email: "joko@email.com", phone: "+62813-6789-0123", location: "Medan", tags: ["vip", "premium"], platforms: ["whatsapp", "rcs", "sms", "email"], lastActivity: "1 jam lalu", status: "active" },
  { id: "ct006", name: "Maya Sari", email: "maya@email.com", phone: "+62878-5555-4444", location: "Bali", tags: ["new"], platforms: ["whatsapp"], lastActivity: "5 jam lalu", status: "active" },
  { id: "ct007", name: "Bambang Susilo", email: "bam@email.com", phone: "+62811-9900-1122", location: "Semarang", tags: ["loyal"], platforms: ["email", "sms"], lastActivity: "2 hari lalu", status: "active" },
  { id: "ct008", name: "Putri Ayu", email: "putri@email.com", phone: "+62858-7766-5544", location: "Makassar", tags: ["premium"], platforms: ["rcs", "whatsapp"], lastActivity: "30 menit lalu", status: "active" },
];

const PlatformBadge = ({ platform }: { platform: string }) => {
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
};

export default function ContactsPage() {
  const { addToast } = useApp();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [tagFilter, setTagFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");

  const ITEMS_PER_PAGE = 6;

  const filtered = contacts.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search);
    
    const matchTag = tagFilter === "all" || c.tags.includes(tagFilter);
    const matchRegion = regionFilter === "all" || c.location.toLowerCase() === regionFilter.toLowerCase();
    const matchPlatform = platformFilter === "all" || c.platforms.includes(platformFilter);

    return matchSearch && matchTag && matchRegion && matchPlatform;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-['Space_Mono'] font-bold text-[#E6EDF3]">Contacts</h1>
          <p className="text-[12px] text-[#8B949E] mt-0.5">{contacts.length} kontak terdaftar</p>
        </div>
        <button
          onClick={() => addToast({ type: "success", title: "Kontak Ditambahkan", message: "Form kontak baru dibuka" })}
          className="fab flex items-center gap-2 px-4 py-2.5 rounded-xl text-[#0D1117] font-semibold text-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah Kontak
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B949E]" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari nama, email, atau nomor..."
            className="w-full bg-[#21262D] border border-[#30363D] rounded-xl pl-9 pr-3 py-2 text-sm text-[#E6EDF3] placeholder-[#8B949E] focus:outline-none focus:border-[#00F5FF] transition-colors h-[38px]"
          />
        </div>
        
        <div className="w-36">
          <Dropdown
            options={[
              { value: "all", label: "Semua Tags" },
              { value: "premium", label: "Premium" },
              { value: "vip", label: "VIP" },
              { value: "new", label: "New" },
              { value: "loyal", label: "Loyal" },
              { value: "dormant", label: "Dormant" },
            ]}
            value={tagFilter}
            onChange={(val) => { setTagFilter(val); setPage(1); }}
            className="h-[38px]"
          />
        </div>

        <div className="w-40">
          <Dropdown
            options={[
              { value: "all", label: "Semua Wilayah" },
              { value: "jakarta", label: "Jakarta" },
              { value: "surabaya", label: "Surabaya" },
              { value: "bandung", label: "Bandung" },
              { value: "bali", label: "Bali" },
              { value: "medan", label: "Medan" },
              { value: "semarang", label: "Semarang" },
              { value: "makassar", label: "Makassar" },
              { value: "yogyakarta", label: "Yogyakarta" },
            ]}
            value={regionFilter}
            onChange={(val) => { setRegionFilter(val); setPage(1); }}
            className="h-[38px]"
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
            onChange={(val) => { setPlatformFilter(val); setPage(1); }}
            className="h-[38px]"
          />
        </div>
      </div>

      {/* Contact Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#30363D]">
                {["Nama", "Kontak", "Lokasi", "Platform", "Tags", "Aktivitas Terakhir", "Status", ""].map((h) => (
                  <th key={h} className="text-left text-[10px] font-mono uppercase text-[#8B949E] tracking-wider px-4 py-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((c) => (
                <tr key={c.id} className="border-b border-[#30363D]/50 hover:bg-[#21262D]/40 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00F5FF]/20 to-[#0099CC]/10 flex items-center justify-center text-[11px] font-bold text-[#00F5FF] flex-shrink-0">
                        {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <span className="text-[13px] font-semibold text-[#E6EDF3] whitespace-nowrap">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-[11px] text-[#8B949E]">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate max-w-[160px]">{c.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#8B949E]">
                        <Phone className="w-3 h-3 flex-shrink-0" />
                        <span>{c.phone}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-[#8B949E]">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {c.location}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {c.platforms.map((p) => <PlatformBadge key={p} platform={p} />)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {c.tags.map((tag) => (
                        <span key={tag} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#21262D] text-[#8B949E] border border-[#30363D]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] text-[#8B949E]">{c.lastActivity}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${c.status === "active" ? "badge-active" : "badge-draft"}`}>
                      {c.status === "active" ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => addToast({ type: "info", title: "Edit Kontak" })} className="p-1.5 rounded text-[#8B949E] hover:text-[#00F5FF] hover:bg-[#00F5FF]/10 transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => addToast({ type: "error", title: "Kontak Dihapus" })} className="p-1.5 rounded text-[#8B949E] hover:text-[#FF4C4C] hover:bg-[#FF4C4C]/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#30363D]">
          <span className="text-[11px] text-[#8B949E]">
            Menampilkan {Math.min((page - 1) * ITEMS_PER_PAGE + 1, filtered.length)}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} dari {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded text-[#8B949E] hover:text-[#E6EDF3] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => setPage(i + 1)}
                className={`w-7 h-7 rounded text-[11px] font-mono transition-all ${page === i + 1 ? "bg-[#00F5FF] text-[#0D1117] font-bold" : "text-[#8B949E] hover:bg-[#21262D]"}`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded text-[#8B949E] hover:text-[#E6EDF3] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
