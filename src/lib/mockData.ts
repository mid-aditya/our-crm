// Mock data for the CRM Dashboard

export const platformColors: Record<string, string> = {
  whatsapp: "#25D366",
  rcs: "#00F5FF",
  email: "#D29922",
  sms: "#9966FF",
};

export const platformIcons: Record<string, string> = {
  whatsapp: "whatsapp",
  rcs: "rcs",
  email: "email",
  sms: "sms",
};

export const kpiData = {
  totalSent: 48_291,
  openRate: 34.7,
  complaints: 12,
  activeCampaigns: 7,
  trend: {
    totalSent: +12.4,
    openRate: +3.1,
    complaints: -2,
    activeCampaigns: +1,
  },
};

export const lineChartData = [
  { day: "Mon", whatsapp: 8200, rcs: 3100, email: 5500, sms: 2100 },
  { day: "Tue", whatsapp: 9500, rcs: 4200, email: 6200, sms: 2400 },
  { day: "Wed", whatsapp: 7800, rcs: 3800, email: 5100, sms: 1900 },
  { day: "Thu", whatsapp: 11200, rcs: 5600, email: 7800, sms: 3100 },
  { day: "Fri", whatsapp: 13500, rcs: 6800, email: 9200, sms: 3800 },
  { day: "Sat", whatsapp: 10200, rcs: 4900, email: 6800, sms: 2700 },
  { day: "Sun", whatsapp: 8900, rcs: 3900, email: 5600, sms: 2300 },
];

export const donutData = [
  { name: "WhatsApp", value: 38, color: "#25D366" },
  { name: "RCS", value: 22, color: "#00F5FF" },
  { name: "Email", value: 28, color: "#D29922" },
  { name: "SMS", value: 12, color: "#9966FF" },
];

export const campaigns = [
  {
    id: "c001",
    name: "Promo Lebaran 2025",
    description: "Broadcast promo diskon hingga 70% untuk semua produk unggulan",
    platforms: ["whatsapp", "rcs", "sms"],
    scheduledAt: "2025-04-18T09:00:00",
    audience: 52_400,
    status: "active",
    progress: 72,
    sent: 37_728,
    failed: 312,
    pending: 14_360,
    tags: ["promo", "seasonal"],
  },
  {
    id: "c002",
    name: "Newsletter April",
    description: "Update produk terbaru dan konten edukasi pelanggan",
    platforms: ["email"],
    scheduledAt: "2025-04-20T08:00:00",
    audience: 28_900,
    status: "scheduled",
    progress: 0,
    sent: 0,
    failed: 0,
    pending: 28_900,
    tags: ["newsletter", "education"],
  },
  {
    id: "c003",
    name: "Re-engagement Dormant Users",
    description: "Reaktivasi pengguna yang tidak aktif lebih dari 90 hari",
    platforms: ["whatsapp", "email"],
    scheduledAt: "2025-04-15T10:00:00",
    audience: 15_200,
    status: "completed",
    progress: 100,
    sent: 14_891,
    failed: 309,
    pending: 0,
    tags: ["re-engagement"],
  },
  {
    id: "c004",
    name: "Flash Sale Weekend",
    description: "Penawaran terbatas 48 jam untuk members premium",
    platforms: ["rcs", "sms", "whatsapp"],
    scheduledAt: "2025-04-22T00:00:00",
    audience: 8_700,
    status: "draft",
    progress: 0,
    sent: 0,
    failed: 0,
    pending: 0,
    tags: ["flash-sale", "premium"],
  },
  {
    id: "c005",
    name: "Survey Kepuasan Q1",
    description: "Survey NPS triwulanan kepada seluruh pelanggan aktif",
    platforms: ["email", "sms"],
    scheduledAt: "2025-04-17T11:00:00",
    audience: 31_500,
    status: "active",
    progress: 45,
    sent: 14_175,
    failed: 427,
    pending: 16_898,
    tags: ["survey", "nps"],
  },
  {
    id: "c006",
    name: "OTP Transaksional",
    description: "Pesan OTP otomatis untuk verifikasi transaksi pelanggan",
    platforms: ["sms"],
    scheduledAt: "2025-04-18T00:00:00",
    audience: 220_000,
    status: "active",
    progress: 89,
    sent: 195_800,
    failed: 1_200,
    pending: 23_000,
    tags: ["transactional", "otp"],
  },
];

export const complaints = [
  {
    id: "TKT-0091",
    contact: { name: "Budi Santoso", phone: "+62812-3456-7890", avatar: "BS" },
    subject: "Pesan promo tidak dapat dibuka di HP saya",
    platform: "whatsapp",
    priority: "urgent",
    status: "open",
    assignedTo: "Rina Agustin",
    createdAt: "2025-04-18T08:23:00",
    slaDeadline: "2025-04-18T12:23:00",
    messages: [
      { from: "contact", text: "Halo, saya dapat pesan promo tapi tidak bisa dibuka. Mohon bantuannya.", time: "08:23" },
      { from: "agent", text: "Selamat pagi Pak Budi, terima kasih sudah menghubungi kami. Bisa diberitahu HP apa yang Bapak gunakan?", time: "08:45" },
      { from: "contact", text: "Samsung Galaxy A52 android 12", time: "08:47" },
    ],
  },
  {
    id: "TKT-0092",
    contact: { name: "Dewi Rahayu", phone: "+62821-9876-5432", avatar: "DR" },
    subject: "Tidak menerima kode OTP padahal sudah transaksi",
    platform: "sms",
    priority: "urgent",
    status: "in_progress",
    assignedTo: "Ahmad Fauzi",
    createdAt: "2025-04-18T09:10:00",
    slaDeadline: "2025-04-18T11:10:00",
    messages: [
      { from: "contact", text: "Saya sudah bayar tapi OTP tidak datang. Transaksi saya gimana?", time: "09:10" },
      { from: "agent", text: "Kami sedang memeriksa sistem pengiriman OTP. Mohon tunggu sebentar.", time: "09:15" },
    ],
  },
  {
    id: "TKT-0093",
    contact: { name: "Siti Nuraini", phone: "+62857-1234-5678", avatar: "SN" },
    subject: "Email newsletter masuk spam terus",
    platform: "email",
    priority: "medium",
    status: "open",
    assignedTo: null,
    createdAt: "2025-04-18T10:05:00",
    slaDeadline: "2025-04-19T10:05:00",
    messages: [
      { from: "contact", text: "Newsletter kalian selalu masuk folder spam. Sudah saya tandai bukan spam tapi tetap begitu.", time: "10:05" },
    ],
  },
  {
    id: "TKT-0094",
    contact: { name: "Joko Purnomo", phone: "+62813-6789-0123", avatar: "JP" },
    subject: "Dapat pesan promo berulang 5x dalam 1 jam",
    platform: "rcs",
    priority: "medium",
    status: "resolved",
    assignedTo: "Rina Agustin",
    createdAt: "2025-04-17T15:30:00",
    slaDeadline: "2025-04-18T15:30:00",
    messages: [
      { from: "contact", text: "Saya dapat pesan yang sama berkali-kali. Tolong dihentikan.", time: "15:30" },
      { from: "agent", text: "Mohon maaf atas ketidaknyamanannya. Kami telah menghentikan pengiriman duplikat.", time: "15:45" },
      { from: "contact", text: "Baik, terima kasih.", time: "15:50" },
    ],
  },
  {
    id: "TKT-0095",
    contact: { name: "Maya Sari", phone: "+62878-5555-4444", avatar: "MS" },
    subject: "Ingin unsubscribe dari semua notifikasi",
    platform: "whatsapp",
    priority: "low",
    status: "open",
    assignedTo: null,
    createdAt: "2025-04-18T11:20:00",
    slaDeadline: "2025-04-20T11:20:00",
    messages: [
      { from: "contact", text: "Tolong hapus nomor saya dari daftar pengiriman pesan.", time: "11:20" },
    ],
  },
];

export const conversations = [
  {
    id: "conv001",
    contact: { name: "Arief Wibowo", avatar: "AW", phone: "+62812-0001-0001" },
    platform: "whatsapp",
    lastMessage: "Kapan promo flash sale mulai?",
    lastTime: "10 min",
    unread: 3,
    status: "active",
    messages: [
      { from: "contact", text: "Halo, saya mau tanya", time: "14:20" },
      { from: "agent", text: "Halo Pak Arief, ada yang bisa dibantu?", time: "14:22" },
      { from: "contact", text: "Kapan promo flash sale mulai?", time: "14:25" },
    ],
  },
  {
    id: "conv002",
    contact: { name: "Putri Ayu", avatar: "PA", phone: "+62821-0002-0002" },
    platform: "rcs",
    lastMessage: "Terima kasih infonya 😊",
    lastTime: "30 min",
    unread: 0,
    status: "active",
    messages: [
      { from: "contact", text: "Info promo lengkap dong", time: "13:50" },
      { from: "agent", text: "Silakan lihat katalog terlampir ya Bu Putri", time: "13:55" },
      { from: "contact", text: "Terima kasih infonya 😊", time: "13:56" },
    ],
  },
  {
    id: "conv003",
    contact: { name: "Bambang Susilo", avatar: "BS", phone: "+62857-0003-0003" },
    platform: "email",
    lastMessage: "Re: Newsletter - Terima kasih sudah berlangganan",
    lastTime: "1h",
    unread: 1,
    status: "active",
    messages: [
      { from: "contact", text: "Saya ingin berlangganan newsletter bulanan.", time: "13:00" },
      { from: "agent", text: "Terima kasih sudah berlangganan! Email konfirmasi sudah dikirim.", time: "13:05" },
    ],
  },
  {
    id: "conv004",
    contact: { name: "Lestari Handayani", avatar: "LH", phone: "+62878-0004-0004" },
    platform: "sms",
    lastMessage: "OK siap",
    lastTime: "2h",
    unread: 0,
    status: "resolved",
    messages: [
      { from: "contact", text: "Saya tidak bisa lihat promo di SMS", time: "12:00" },
      { from: "agent", text: "Link sudah kami perbaiki, silakan coba kembali", time: "12:15" },
      { from: "contact", text: "OK siap", time: "12:16" },
    ],
  },
  {
    id: "conv005",
    contact: { name: "Fajar Nugroho", avatar: "FN", phone: "+62813-0005-0005" },
    platform: "whatsapp",
    lastMessage: "Ada masalah dengan pembayaran saya",
    lastTime: "3h",
    unread: 2,
    status: "escalated",
    messages: [
      { from: "contact", text: "Ada masalah dengan pembayaran saya", time: "11:00" },
    ],
  },
];

export const analyticsData = {
  lineData: lineChartData,
  barData: [
    { name: "Lebaran 2025", delivery: 96, open: 45, click: 23, reply: 12, complaint: 0.3 },
    { name: "Newsletter Apr", delivery: 92, open: 38, click: 18, reply: 8, complaint: 0.5 },
    { name: "Re-engagement", delivery: 98, open: 52, click: 31, reply: 22, complaint: 0.1 },
    { name: "Flash Sale", delivery: 94, open: 67, click: 48, reply: 35, complaint: 0.2 },
    { name: "Survey Q1", delivery: 89, open: 42, click: 19, reply: 31, complaint: 0.4 },
  ],
  heatmapData: Array.from({ length: 7 }, (_, day) =>
    Array.from({ length: 24 }, (_, hour) => ({
      day,
      hour,
      value: Math.floor(Math.random() * 100),
    }))
  ).flat(),
  topCampaigns: [
    { name: "Re-engagement Dormant", sent: 14891, openRate: 52.1, clickRate: 31.4, revenue: "Rp 42.3jt" },
    { name: "Flash Sale Weekend", sent: 8700, openRate: 67.3, clickRate: 48.2, revenue: "Rp 89.1jt" },
    { name: "Promo Lebaran 2025", sent: 37728, openRate: 45.2, clickRate: 23.1, revenue: "Rp 127.8jt" },
    { name: "OTP Transaksional", sent: 195800, openRate: 99.8, clickRate: 95.2, revenue: "Rp 0" },
    { name: "Survey Kepuasan Q1", sent: 14175, openRate: 42.0, clickRate: 19.3, revenue: "Rp 0" },
  ],
};

export const agents = [
  "Rina Agustin",
  "Ahmad Fauzi",
  "Dewi Kartika",
  "Bima Pratama",
  "Sari Indah",
];

export const segments = [
  { id: "s001", name: "All Active Users", count: 48291 },
  { id: "s002", name: "Premium Members", count: 8700 },
  { id: "s003", name: "Dormant 90+ Days", count: 15200 },
  { id: "s004", name: "New Registrations", count: 3420 },
  { id: "s005", name: "High Value Customers", count: 1890 },
];
