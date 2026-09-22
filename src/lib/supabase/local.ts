/**
 * LOCAL MOCK MODE — dev only.
 * Aktif ketika env Supabase tidak tersedia (NEXT_PUBLIC_SUPABASE_URL kosong).
 * Menyediakan data dummy in-memory sehingga seluruh UI bisa di-preview
 * tanpa backend. Tidak dipakai di production build dengan env Supabase.
 */
import type { Database } from "@/types/database";

/* ─── Konfigurasi mock ─── */

export const MOCK_TEAM_ID = "team_local_01";
export const MOCK_USER_ID = "user_local_01";

export const mockProfile: Database["public"]["Tables"]["profiles"]["Row"] = {
  id: MOCK_USER_ID,
  full_name: "Andi Pratama",
  phone: "+628123450001",
  role: "owner",
  team_id: MOCK_TEAM_ID,
  avatar_url: null,
  created_at: "2026-08-01T03:00:00.000Z",
};

type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];
type DealRow = Database["public"]["Tables"]["deals"]["Row"];
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type ActivityRow = Database["public"]["Tables"]["activity_logs"]["Row"];
type SettingRow = Database["public"]["Tables"]["settings"]["Row"];

const seedContacts: ContactRow[] = [
  {
    id: "c-01",
    team_id: MOCK_TEAM_ID,
    name: "Ahmad Zaki",
    whatsapp_number: "+628123450011",
    email: "ahmad.zaki@gmail.com",
    label: ["Hot"],
    source: "whatsapp",
    notes: "Tanya paket enterprise, minta demo ulang minggu depan.",
    last_activity_at: "2026-09-21T09:12:00.000Z",
    created_at: "2026-08-14T03:00:00.000Z",
  },
  {
    id: "c-02",
    team_id: MOCK_TEAM_ID,
    name: "Sari Wulandari",
    whatsapp_number: "+628123450012",
    email: "sari@tokomerdeka.id",
    label: ["Customer"],
    source: "referral",
    notes: "Pelanggan setia, renew kontrak tiap kuartal.",
    last_activity_at: "2026-09-20T14:40:00.000Z",
    created_at: "2026-07-02T03:00:00.000Z",
  },
  {
    id: "c-03",
    team_id: MOCK_TEAM_ID,
    name: "Budi Santoso",
    whatsapp_number: "+628123450013",
    email: null,
    label: ["Follow Up"],
    source: "landing_page",
    notes: "Minta penawaran harga reseller.",
    last_activity_at: "2026-09-19T08:05:00.000Z",
    created_at: "2026-09-01T03:00:00.000Z",
  },
  {
    id: "c-04",
    team_id: MOCK_TEAM_ID,
    name: "Dewi Lestari",
    whatsapp_number: "+628123450014",
    email: "dewi.lestari@corp.co.id",
    label: ["VIP"],
    source: "event",
    notes: "Direktur operasional, tertarik integrasi API.",
    last_activity_at: "2026-09-21T02:30:00.000Z",
    created_at: "2026-06-21T03:00:00.000Z",
  },
  {
    id: "c-05",
    team_id: MOCK_TEAM_ID,
    name: "Rizky Hidayat",
    whatsapp_number: "+628123450015",
    email: "rizky.h@startup.io",
    label: ["New"],
    source: "instagram",
    notes: null,
    last_activity_at: null,
    created_at: "2026-09-18T03:00:00.000Z",
  },
  {
    id: "c-06",
    team_id: MOCK_TEAM_ID,
    name: "Maya Puspita",
    whatsapp_number: "+628123450016",
    email: "maya@butikmaya.com",
    label: ["Warm"],
    source: "whatsapp",
    notes: "Negosiasi langganan 12 bulan.",
    last_activity_at: "2026-09-17T11:20:00.000Z",
    created_at: "2026-08-27T03:00:00.000Z",
  },
  {
    id: "c-07",
    team_id: MOCK_TEAM_ID,
    name: "Hendra Gunawan",
    whatsapp_number: null,
    email: "hendra.g@gmail.com",
    label: ["Cold"],
    source: "cold_outreach",
    notes: "Belum respons sejak awal September.",
    last_activity_at: null,
    created_at: "2026-08-05T03:00:00.000Z",
  },
  {
    id: "c-08",
    team_id: MOCK_TEAM_ID,
    name: "Nadia Rahma",
    whatsapp_number: "+628123450017",
    email: "nadia@kopiraya.id",
    label: ["Hot"],
    source: "referral",
    notes: "Referral dari Sari — butuh POS + CRM, budget sudah ada.",
    last_activity_at: "2026-09-21T06:50:00.000Z",
    created_at: "2026-09-16T03:00:00.000Z",
  },
  {
    id: "c-09",
    team_id: MOCK_TEAM_ID,
    name: "Fajar Nugroho",
    whatsapp_number: "+628123450018",
    email: "fajar@soundworks.co",
    label: ["Warm"],
    source: "instagram",
    notes: "Studio audio, tanya paket tim 5 orang.",
    last_activity_at: "2026-09-20T10:15:00.000Z",
    created_at: "2026-09-12T03:00:00.000Z",
  },
];

const seedDeals: DealRow[] = [
  {
    id: "d-01",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-01",
    title: "Paket Enterprise — PT Zaki Teknologi",
    value: 48_000_000,
    currency: "IDR",
    stage: "ditawar",
    assigned_to: MOCK_USER_ID,
    reminder_at: "2026-09-24T09:00:00.000Z",
    closed_at: null,
    created_at: "2026-09-10T03:00:00.000Z",
  },
  {
    id: "d-02",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-02",
    title: "Renewal Toko Merdeka (Q4)",
    value: 18_500_000,
    currency: "IDR",
    stage: "deal",
    assigned_to: MOCK_USER_ID,
    reminder_at: null,
    closed_at: "2026-09-15T03:00:00.000Z",
    created_at: "2026-08-20T03:00:00.000Z",
  },
  {
    id: "d-03",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-04",
    title: "Integrasi API Corp Group",
    value: 75_000_000,
    currency: "IDR",
    stage: "tertarik",
    assigned_to: MOCK_USER_ID,
    reminder_at: "2026-09-23T13:30:00.000Z",
    closed_at: null,
    created_at: "2026-09-14T03:00:00.000Z",
  },
  {
    id: "d-04",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-03",
    title: "Reseller 10 Slot — Budi Store",
    value: 12_000_000,
    currency: "IDR",
    stage: "chat_masuk",
    assigned_to: null,
    reminder_at: null,
    closed_at: null,
    created_at: "2026-09-19T03:00:00.000Z",
  },
  {
    id: "d-05",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-06",
    title: "Langganan 12 Bulan Butik Maya",
    value: 24_000_000,
    currency: "IDR",
    stage: "ditawar",
    assigned_to: MOCK_USER_ID,
    reminder_at: "2026-09-22T10:00:00.000Z",
    closed_at: null,
    created_at: "2026-09-08T03:00:00.000Z",
  },
  {
    id: "d-06",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-05",
    title: "Trial→Paid Startup Rizky",
    value: 6_500_000,
    currency: "IDR",
    stage: "chat_masuk",
    assigned_to: null,
    reminder_at: null,
    closed_at: null,
    created_at: "2026-09-20T03:00:00.000Z",
  },
  {
    id: "d-07",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-07",
    title: "Cold Outreach Hendra",
    value: 9_000_000,
    currency: "IDR",
    stage: "batal",
    assigned_to: MOCK_USER_ID,
    reminder_at: null,
    closed_at: "2026-09-12T03:00:00.000Z",
    created_at: "2026-08-11T03:00:00.000Z",
  },
  {
    id: "d-08",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-08",
    title: "POS + CRM Kopi Raya",
    value: 15_500_000,
    currency: "IDR",
    stage: "tertarik",
    assigned_to: MOCK_USER_ID,
    reminder_at: "2026-09-25T09:00:00.000Z",
    closed_at: null,
    created_at: "2026-09-17T03:00:00.000Z",
  },
  {
    id: "d-09",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-09",
    title: "Paket Tim 5 Seat SoundWorks",
    value: 21_000_000,
    currency: "IDR",
    stage: "ditawar",
    assigned_to: MOCK_USER_ID,
    reminder_at: "2026-09-23T14:00:00.000Z",
    closed_at: null,
    created_at: "2026-09-13T03:00:00.000Z",
  },
  {
    id: "d-10",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-02",
    title: "Add-on Broadcast Toko Merdeka",
    value: 7_200_000,
    currency: "IDR",
    stage: "deal",
    assigned_to: MOCK_USER_ID,
    reminder_at: null,
    closed_at: "2026-09-19T03:00:00.000Z",
    created_at: "2026-09-05T03:00:00.000Z",
  },
  {
    id: "d-11",
    team_id: MOCK_TEAM_ID,
    contact_id: null,
    title: "Inbound Iklan Meta — Seminar B2B",
    value: 4_800_000,
    currency: "IDR",
    stage: "chat_masuk",
    assigned_to: null,
    reminder_at: null,
    closed_at: null,
    created_at: "2026-09-21T04:30:00.000Z",
  },
  {
    id: "d-12",
    team_id: MOCK_TEAM_ID,
    contact_id: null,
    title: "Inquiry Website — Freight Forwarder",
    value: 32_000_000,
    currency: "IDR",
    stage: "chat_masuk",
    assigned_to: null,
    reminder_at: null,
    closed_at: null,
    created_at: "2026-09-21T08:10:00.000Z",
  },
  {
    id: "d-13",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-06",
    title: "Upgrade Storage Butik Maya",
    value: 3_600_000,
    currency: "IDR",
    stage: "tertarik",
    assigned_to: MOCK_USER_ID,
    reminder_at: null,
    closed_at: null,
    created_at: "2026-09-19T03:00:00.000Z",
  },
  {
    id: "d-14",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-05",
    title: "Annual Plan Startup Rizky",
    value: 6_500_000,
    currency: "IDR",
    stage: "deal",
    assigned_to: MOCK_USER_ID,
    reminder_at: null,
    closed_at: "2026-09-20T03:00:00.000Z",
    created_at: "2026-09-02T03:00:00.000Z",
  },
  {
    id: "d-15",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-03",
    title: "Paket Lite Budi Store (retry)",
    value: 5_000_000,
    currency: "IDR",
    stage: "batal",
    assigned_to: MOCK_USER_ID,
    reminder_at: null,
    closed_at: "2026-09-17T03:00:00.000Z",
    created_at: "2026-09-06T03:00:00.000Z",
  },
  {
    id: "d-16",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-07",
    title: "Re-engage Hendra — Paket Starter",
    value: 4_500_000,
    currency: "IDR",
    stage: "chat_masuk",
    assigned_to: null,
    reminder_at: null,
    closed_at: null,
    created_at: "2026-09-21T09:40:00.000Z",
  },
  {
    id: "d-17",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-04",
    title: "Add-on Integrasi WhatsApp Corp Group",
    value: 8_000_000,
    currency: "IDR",
    stage: "chat_masuk",
    assigned_to: MOCK_USER_ID,
    reminder_at: null,
    closed_at: null,
    created_at: "2026-09-21T11:05:00.000Z",
  },
  {
    id: "d-18",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-09",
    title: "Upgrade 10 Seat SoundWorks Studio",
    value: 39_000_000,
    currency: "IDR",
    stage: "tertarik",
    assigned_to: MOCK_USER_ID,
    reminder_at: "2026-09-26T10:00:00.000Z",
    closed_at: null,
    created_at: "2026-09-18T03:00:00.000Z",
  },
  {
    id: "d-19",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-02",
    title: "Paket Loyalty Toko Merdeka 2027",
    value: 27_000_000,
    currency: "IDR",
    stage: "tertarik",
    assigned_to: MOCK_USER_ID,
    reminder_at: null,
    closed_at: null,
    created_at: "2026-09-19T03:00:00.000Z",
  },
  {
    id: "d-20",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-08",
    title: "Franchise 3 Outlet Kopi Raya",
    value: 58_000_000,
    currency: "IDR",
    stage: "ditawar",
    assigned_to: MOCK_USER_ID,
    reminder_at: "2026-09-25T09:30:00.000Z",
    closed_at: null,
    created_at: "2026-09-16T03:00:00.000Z",
  },
  {
    id: "d-21",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-04",
    title: "Kontrak Tahunan Corp Group + SLA",
    value: 92_000_000,
    currency: "IDR",
    stage: "ditawar",
    assigned_to: MOCK_USER_ID,
    reminder_at: "2026-09-24T14:00:00.000Z",
    closed_at: null,
    created_at: "2026-09-11T03:00:00.000Z",
  },
  {
    id: "d-22",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-06",
    title: "Add-on Loyalty Points Butik Maya",
    value: 5_400_000,
    currency: "IDR",
    stage: "deal",
    assigned_to: MOCK_USER_ID,
    reminder_at: null,
    closed_at: "2026-09-21T03:00:00.000Z",
    created_at: "2026-09-09T03:00:00.000Z",
  },
  {
    id: "d-23",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-09",
    title: "Trial Studio SoundWorks (batal)",
    value: 3_000_000,
    currency: "IDR",
    stage: "batal",
    assigned_to: MOCK_USER_ID,
    reminder_at: null,
    closed_at: "2026-09-10T03:00:00.000Z",
    created_at: "2026-08-29T03:00:00.000Z",
  },
];

const seedTasks: TaskRow[] = [
  {
    id: "t-01",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-01",
    deal_id: "d-01",
    title: "Kirim revisi penawaran enterprise",
    description: "Sesuaikan diskon volume 15% sesuai pembicaraan terakhir.",
    priority: "urgent",
    status: "todo",
    due_date: "2026-09-23",
    assigned_to: MOCK_USER_ID,
    completed_at: null,
    created_at: "2026-09-20T03:00:00.000Z",
  },
  {
    id: "t-02",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-04",
    deal_id: "d-03",
    title: "Siapkan deck demo integrasi API",
    description: null,
    priority: "medium",
    status: "in_progress",
    due_date: "2026-09-24",
    assigned_to: MOCK_USER_ID,
    completed_at: null,
    created_at: "2026-09-18T03:00:00.000Z",
  },
  {
    id: "t-03",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-02",
    deal_id: "d-02",
    title: "Follow-up onboarding renewal",
    description: "Pastikan tim toko merdeka sudah onboarding penuh.",
    priority: "low",
    status: "done",
    due_date: "2026-09-16",
    assigned_to: MOCK_USER_ID,
    completed_at: "2026-09-16T08:00:00.000Z",
    created_at: "2026-09-12T03:00:00.000Z",
  },
  {
    id: "t-04",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-06",
    deal_id: "d-05",
    title: "Telepon konfirmasi kontrak Maya",
    description: "Konfirmasi jadwal tanda tangan dan invoice.",
    priority: "urgent",
    status: "todo",
    due_date: "2026-09-22",
    assigned_to: MOCK_USER_ID,
    completed_at: null,
    created_at: "2026-09-19T03:00:00.000Z",
  },
  {
    id: "t-05",
    team_id: MOCK_TEAM_ID,
    contact_id: null,
    deal_id: null,
    title: "Rapikan pipeline bulan September",
    description: "Bersihkan deal stale, update stage.",
    priority: "low",
    status: "done",
    due_date: "2026-09-15",
    assigned_to: MOCK_USER_ID,
    completed_at: "2026-09-15T04:00:00.000Z",
    created_at: "2026-09-11T03:00:00.000Z",
  },
  {
    id: "t-06",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-08",
    deal_id: "d-08",
    title: "Demo POS + CRM ke Kopi Raya",
    description: "Walkthrough alamat kasir sampai laporan harian, bawa unit tablet.",
    priority: "urgent",
    status: "todo",
    due_date: "2026-09-23",
    assigned_to: MOCK_USER_ID,
    completed_at: null,
    created_at: "2026-09-20T06:00:00.000Z",
  },
  {
    id: "t-07",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-09",
    deal_id: "d-09",
    title: "Susun pricing 5 seat SoundWorks",
    description: "Bandingkan tier paket tim vs per-seat, siapkan opsi bundling.",
    priority: "medium",
    status: "in_progress",
    due_date: "2026-09-24",
    assigned_to: MOCK_USER_ID,
    completed_at: null,
    created_at: "2026-09-19T09:30:00.000Z",
  },
  {
    id: "t-08",
    team_id: MOCK_TEAM_ID,
    contact_id: null,
    deal_id: "d-12",
    title: "Balas inquiry freight forwarder",
    description: "Minta brief kebutuhan modul & jumlah user sebelum buat proposal.",
    priority: "medium",
    status: "todo",
    due_date: "2026-09-22",
    assigned_to: MOCK_USER_ID,
    completed_at: null,
    created_at: "2026-09-21T08:20:00.000Z",
  },
  {
    id: "t-09",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-02",
    deal_id: "d-10",
    title: "Kirim invoice add-on broadcast",
    description: null,
    priority: "low",
    status: "done",
    due_date: "2026-09-21",
    assigned_to: MOCK_USER_ID,
    completed_at: "2026-09-21T02:40:00.000Z",
    created_at: "2026-09-18T03:00:00.000Z",
  },
  {
    id: "t-10",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-08",
    deal_id: "d-20",
    title: "Susun proposal franchise 3 outlet",
    description: "Termasuk proyeksi revenue per outlet & skema pembayaran.",
    priority: "urgent",
    status: "todo",
    due_date: "2026-09-25",
    assigned_to: MOCK_USER_ID,
    completed_at: null,
    created_at: "2026-09-21T07:00:00.000Z",
  },
  {
    id: "t-11",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-04",
    deal_id: "d-21",
    title: "Kaji ulang draft kontrak tahunan",
    description: "Cek klausul SLA 99,5% dan penalti downtime bersama legal.",
    priority: "medium",
    status: "todo",
    due_date: "2026-09-26",
    assigned_to: MOCK_USER_ID,
    completed_at: null,
    created_at: "2026-09-20T10:00:00.000Z",
  },
  {
    id: "t-12",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-09",
    deal_id: "d-18",
    title: "Hitung margin bundling 10 seat",
    description: null,
    priority: "medium",
    status: "in_progress",
    due_date: "2026-09-25",
    assigned_to: MOCK_USER_ID,
    completed_at: null,
    created_at: "2026-09-19T03:00:00.000Z",
  },
  {
    id: "t-13",
    team_id: MOCK_TEAM_ID,
    contact_id: null,
    deal_id: null,
    title: "Arsip ulang chat masuk minggu ini",
    description: "Pilah inquiry serius dari spam sebelum laporan mingguan.",
    priority: "low",
    status: "todo",
    due_date: "2026-09-24",
    assigned_to: MOCK_USER_ID,
    completed_at: null,
    created_at: "2026-09-21T05:30:00.000Z",
  },
  {
    id: "t-14",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-07",
    deal_id: "d-16",
    title: "Telepon ulang Hendra setelah 2 minggu",
    description: null,
    priority: "medium",
    status: "done",
    due_date: "2026-09-19",
    assigned_to: MOCK_USER_ID,
    completed_at: "2026-09-19T09:00:00.000Z",
    created_at: "2026-09-15T03:00:00.000Z",
  },
  {
    id: "t-15",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-06",
    deal_id: "d-22",
    title: "Finalisasi invoice add-on loyalty",
    description: null,
    priority: "urgent",
    status: "done",
    due_date: "2026-09-21",
    assigned_to: MOCK_USER_ID,
    completed_at: "2026-09-21T04:15:00.000Z",
    created_at: "2026-09-18T03:00:00.000Z",
  },
  {
    id: "t-16",
    team_id: MOCK_TEAM_ID,
    contact_id: "c-02",
    deal_id: "d-19",
    title: "Kumpulkan data sales 2026 untuk proposal loyalty",
    description: "Minta export transaksi Q1–Q3 dari tim toko merdeka.",
    priority: "low",
    status: "in_progress",
    due_date: "2026-09-28",
    assigned_to: MOCK_USER_ID,
    completed_at: null,
    created_at: "2026-09-20T03:00:00.000Z",
  },
];

const seedActivity: ActivityRow[] = [
  {
    id: "a-01",
    team_id: MOCK_TEAM_ID,
    actor_id: MOCK_USER_ID,
    action: "memindahkan \"Integrasi API Corp Group\" ke Tertarik",
    entity_type: "deal",
    entity_id: "d-03",
    details: null,
    created_at: "2026-09-21T07:45:00.000Z",
  },
  {
    id: "a-02",
    team_id: MOCK_TEAM_ID,
    actor_id: MOCK_USER_ID,
    action: "menandai \"Follow-up onboarding renewal\" selesai",
    entity_type: "task",
    entity_id: "t-03",
    details: null,
    created_at: "2026-09-16T08:01:00.000Z",
  },
  {
    id: "a-03",
    team_id: MOCK_TEAM_ID,
    actor_id: MOCK_USER_ID,
    action: "menutup deal \"Renewal Toko Merdeka (Q4)\"",
    entity_type: "deal",
    entity_id: "d-02",
    details: null,
    created_at: "2026-09-15T03:05:00.000Z",
  },
  {
    id: "a-04",
    team_id: MOCK_TEAM_ID,
    actor_id: MOCK_USER_ID,
    action: "menambahkan kontak Rizky Hidayat",
    entity_type: "contact",
    entity_id: "c-05",
    details: null,
    created_at: "2026-09-18T03:10:00.000Z",
  },
];

const seedSettings: SettingRow[] = [
  {
    id: "s-01",
    key: "pipeline_stages",
    value: ["chat_masuk", "tertarik", "ditawar", "deal", "batal"],
    updated_at: "2026-08-01T03:00:00.000Z",
  },
  {
    id: "s-02",
    key: "contact_labels",
    value: ["Hot", "Warm", "Cold", "VIP", "Customer", "Follow Up", "New"],
    updated_at: "2026-08-01T03:00:00.000Z",
  },
];

/* ─── State in-memory (bertahan selama sesi dev, termasuk mutasi) ─── */

const db = {
  contacts: [...seedContacts],
  deals: [...seedDeals],
  tasks: [...seedTasks],
  activity_logs: [...seedActivity],
  settings: [...seedSettings],
};

type Row = { id: string } & Record<string, unknown>;
type Table = keyof typeof db;

const uid = () => Math.random().toString(36).slice(2, 10);

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), 120));
}

/* Filter PostgREST-lite: eq / ilike / contains / or(...), order, limit, single */
type Filters = {
  eq: Array<[string, unknown]>;
  ilike?: Array<[string, string]>;
  contains?: Array<[string, unknown[]]>;
  or?: { terms: Array<{ col: string; pattern: string }> };
};

/** Sisipkan relasi sederhana sesuai pola select "relasi:fk(kolom)". */
function embedRelations(
  table: Table,
  select: string,
  row: Record<string, unknown>,
): Record<string, unknown> {
  if (!select || !select.includes(":")) return row;
  if (table === "deals") {
    const contact = db.contacts.find((c) => c.id === row.contact_id) ?? null;
    return { ...row, contact };
  }
  if (table === "tasks") {
    const contact = db.contacts.find((c) => c.id === row.contact_id) ?? null;
    const deal = db.deals.find((d) => d.id === row.deal_id) ?? null;
    return {
      ...row,
      contact: contact ? { name: contact.name } : null,
      deal: deal ? { title: deal.title } : null,
    };
  }
  if (table === "activity_logs") {
    return { ...row, actor: { full_name: mockProfile.full_name } };
  }
  return row;
}

function matches(row: Record<string, unknown>, f: Filters): boolean {
  for (const [col, val] of f.eq) {
    if (row[col] !== val) return false;
  }
  for (const [col, pattern] of f.ilike ?? []) {
    const v = row[col];
    if (typeof v !== "string") return false;
    const re = new RegExp("^" + pattern.replace(/%/g, ".*"), "i");
    if (!re.test(v)) return false;
  }
  for (const [col, values] of f.contains ?? []) {
    const v = row[col];
    if (!Array.isArray(v) || !values.every((x) => v.includes(x as never)))
      return false;
  }
  if (f.or && f.or.terms.length > 0) {
    const anyMatch = f.or.terms.some(({ col, pattern }) => {
      const v = row[col];
      if (typeof v !== "string") return false;
      return new RegExp("^" + pattern.replace(/%/g, ".*"), "i").test(v);
    });
    if (!anyMatch) return false;
  }
  return true;
}

/** Builder ringan yang menyerupai subset PostgREST yang dipakai queries.ts. */
function from(table: Table) {
  const state = {
    filters: { eq: [] } as Filters,
    _order: null as { col: string; asc: boolean } | null,
    _limit: null as number | null,
    _select: null as string | null,
    _single: false,
    _inserted: null as Array<Record<string, unknown>> | null,
  };

  function finalize(): {
    data: unknown;
    error: { message: string } | null;
  } {
    if (state._inserted) {
      const data = state._single ? state._inserted[0] : state._inserted;
      return { data, error: null };
    }
    let rows = [...(db[table] as Array<Record<string, unknown>>)];
    rows = rows.filter((r) => matches(r, state.filters));
    if (state._order) {
      const { col, asc } = state._order;
      rows.sort((a, b) => {
        const av = String(a[col] ?? "");
        const bv = String(b[col] ?? "");
        return asc ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    if (state._limit != null) rows = rows.slice(0, state._limit);
    rows = rows.map((r) => embedRelations(table, state._select ?? "", r));
    if (state._single) {
      const row = rows[0];
      return row
        ? { data: row, error: null }
        : { data: null, error: { message: "No rows found" } };
    }
    return { data: rows, error: null };
  }

  const builder: Record<string, unknown> = {
    select(cols?: string) {
      state._select = cols ?? null;
      return builder;
    },
    eq(col: string, val: unknown) {
      state.filters.eq.push([col, val]);
      return builder;
    },
    ilike(col: string, pattern: string) {
      (state.filters.ilike ??= []).push([col, pattern]);
      return builder;
    },
    contains(col: string, values: unknown[]) {
      (state.filters.contains ??= []).push([col, values]);
      return builder;
    },
    or(expr: string) {
      // format: "col.ilike.%x%,col2.ilike.%y%"
      const terms = expr
        .split(",")
        .filter(Boolean)
        .map((piece) => {
          const idx = piece.indexOf(".ilike.");
          if (idx === -1) return null;
          return {
            col: piece.slice(0, idx),
            pattern: piece.slice(idx + ".ilike.".length),
          };
        })
        .filter(Boolean) as Array<{ col: string; pattern: string }>;
      state.filters.or = { terms };
      return builder;
    },
    order(col: string, opts?: { ascending?: boolean }) {
      state._order = { col, asc: opts?.ascending ?? true };
      return builder;
    },
    limit(n: number) {
      state._limit = n;
      return builder;
    },
    single() {
      state._single = true;
      return builder;
    },
    insert(payload: Record<string, unknown> | Array<Record<string, unknown>>) {
      const items = Array.isArray(payload) ? payload : [payload];
      const created = items.map((it) => ({
        id: (it.id as string) ?? uid(),
        created_at: (it.created_at as string) ?? new Date().toISOString(),
        ...it,
      }));
      state._inserted = created;
      (db[table] as unknown[]).push(...created);
      return builder;
    },
    update(payload: Record<string, unknown>) {
      // Terapkan update saat builder dieksekusi (finalize dibaca via then/await)
      queueMicrotask(() => {
        const rows = db[table] as Array<Record<string, unknown>>;
        rows.forEach((row, i) => {
          if (matches(row, state.filters)) {
            rows[i] = { ...row, ...payload };
          }
        });
      });
      return builder;
    },
    delete() {
      queueMicrotask(() => {
        const table_ = db[table] as Array<Record<string, unknown>>;
        const keep = table_.filter((row) => !matches(row, state.filters));
        (db[table] as unknown[]).length = 0;
        (db[table] as unknown[]).push(...keep);
      });
      return builder;
    },
    // await-able: PostgrestBuilder adalah thenable
    then(
      onFulfilled?: (value: ReturnType<typeof finalize>) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
      return delay(finalize()).then(onFulfilled, onRejected);
    },
  };

  return builder;
}

function authMock() {
  return {
    async getUser() {
      return {
        data: {
          user: {
            id: MOCK_USER_ID,
            email: "andi@ourcrm.dev",
            user_metadata: { full_name: mockProfile.full_name },
          },
        },
        error: null,
      };
    },
    async getSession() {
      return { data: { session: null }, error: null };
    },
    async signInWithPassword() {
      return { data: { user: null, session: null }, error: null };
    },
    async signUp() {
      return { data: { user: null, session: null }, error: null };
    },
    async signOut() {
      return { error: null };
    },
    onAuthStateChange() {
      return {
        data: {
          subscription: {
            id: "mock",
            callback: () => {},
            unsubscribe() {},
          },
        },
      };
    },
  };
}

/** Mock client menyerupai supabase-js untuk kebutuhan queries.ts + useAuth. */
export function createLocalSupabaseClient() {
  return {
    from,
    auth: authMock(),
  };
}
