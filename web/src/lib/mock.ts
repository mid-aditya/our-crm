// Data contoh untuk pratinjau UI.
// Ganti dengan panggilan api() dari $lib/api saat integrasi backend.

export type ContactGroup = 'customer' | 'prospect' | 'vip';

export type Contact = {
	id: string;
	name: string;
	phone: string;
	email: string;
	group: ContactGroup;
	lastChat: string | null; // ISO date
};

export type Conversation = {
	id: string;
	name: string;
	message: string;
	time: string;
	unread: boolean;
};

export type CampaignStatus = 'sent' | 'scheduled' | 'draft' | 'running';

export type Campaign = {
	id: string;
	name: string;
	status: CampaignStatus;
	audience: 'all' | 'customers' | 'prospects';
	channel: 'official' | 'gateway';
	schedule: string | null;
	progress: number; // 0-100
};

export type ChannelStatus = 'connected' | 'attention';

export type Channel = {
	id: 'official' | 'gateway';
	status: ChannelStatus;
	detail: string;
};

export type Stat = {
	key: 'activeChats' | 'delivered' | 'openTickets' | 'replyRate';
	value: number;
	suffix?: string;
	delta: string;
	trend: 'up' | 'down';
	good: boolean;
	spark: number[];
};

export const currentUser = { name: 'Galih Saputra', role: 'Owner' };

export const mockContacts: Contact[] = [
	{ id: 'c1', name: 'Rina Kusuma', phone: '+62 812-3456-7890', email: 'rina@tokokita.id', group: 'customer', lastChat: '2026-09-22' },
	{ id: 'c2', name: 'Bagas Pratama', phone: '+62 813-9921-4477', email: 'bagas.pratama@gmail.com', group: 'prospect', lastChat: '2026-09-21' },
	{ id: 'c3', name: 'Siti Halimah', phone: '+62 878-2211-9080', email: 'siti.halimah@koperasi.id', group: 'vip', lastChat: '2026-09-22' },
	{ id: 'c4', name: 'Dimas Anggara', phone: '+62 811-7788-2210', email: 'dimas.anggara@outlook.com', group: 'customer', lastChat: '2026-09-19' },
	{ id: 'c5', name: 'Maya Lestari', phone: '+62 856-4410-3322', email: 'maya.lestari@studio.co', group: 'prospect', lastChat: null },
	{ id: 'c6', name: 'Hendra Wijaya', phone: '+62 812-9090-1212', email: 'hendra.wijaya@corp.co.id', group: 'vip', lastChat: '2026-09-20' },
	{ id: 'c7', name: 'Ayu Kartika', phone: '+62 838-6655-7788', email: 'ayu.kartika@gmail.com', group: 'customer', lastChat: '2026-09-18' },
	{ id: 'c8', name: 'Rizky Fadillah', phone: '+62 821-3344-5566', email: 'rizky.f@gmail.com', group: 'prospect', lastChat: '2026-09-22' }
];

export const mockConversations: Conversation[] = [
	{ id: 'v1', name: 'Siti Halimah', message: 'Kak, pesanan #10231 sudah dikirim?', time: '09:42', unread: true },
	{ id: 'v2', name: 'Bagas Pratama', message: 'Ada stok ukuran L?', time: '09:15', unread: true },
	{ id: 'v3', name: 'Dimas Anggara', message: 'Terima kasih, barangnya sudah diterima.', time: 'Kemarin', unread: false },
	{ id: 'v4', name: 'Maya Lestari', message: 'Boleh dikirim katalog terbaru?', time: 'Kemarin', unread: false },
	{ id: 'v5', name: 'Hendra Wijaya', message: 'Invoice untuk pembayaran bulan ini kapan terbit?', time: 'Senin', unread: false }
];

export const mockCampaigns: Campaign[] = [
	{ id: 'k1', name: 'Promo Merdeka', status: 'sent', audience: 'customers', channel: 'official', schedule: null, progress: 100 },
	{ id: 'k2', name: 'Flash Sale 9.9', status: 'scheduled', audience: 'all', channel: 'official', schedule: '29 Sep 2026, 10:00', progress: 0 },
	{ id: 'k3', name: 'Katalog September', status: 'draft', audience: 'prospects', channel: 'gateway', schedule: null, progress: 0 }
];

export const mockChannels: Channel[] = [
	{ id: 'official', status: 'connected', detail: 'Sinkron 2 menit lalu' },
	{ id: 'gateway', status: 'attention', detail: 'Sesi kedaluwarsa' }
];

export const mockStats: Stat[] = [
	{ key: 'activeChats', value: 128, delta: '+12', trend: 'up', good: true, spark: [52, 58, 55, 64, 70, 66, 78, 82, 88, 96, 110, 128] },
	{ key: 'delivered', value: 2418, delta: '+6', trend: 'up', good: true, spark: [180, 210, 190, 240, 260, 250, 300, 320, 310, 360, 390, 420] },
	{ key: 'openTickets', value: 14, delta: '-3', trend: 'down', good: true, spark: [22, 24, 21, 25, 23, 20, 19, 18, 20, 17, 15, 14] },
	{ key: 'replyRate', value: 87, suffix: '%', delta: '+2', trend: 'up', good: true, spark: [74, 76, 75, 79, 80, 82, 81, 83, 84, 85, 86, 87] }
];
