import type { Component } from 'svelte';
import {
	BarChart3,
	Building2,
	CalendarCheck,
	SquareKanban,
	LayoutDashboard,
	Handshake,
	Headphones,
	IdCard,
	Megaphone,
	MessagesSquare,
	Network,
	Settings,
	Ticket,
	Users
} from '@lucide/svelte';

export type NavItem = {
	href: string;
	/** menu_key tanpa slash awal — dipakai untuk grant admin → agent */
	key: string;
	label: string;
	icon: Component<any>;
};

export const navItems: NavItem[] = [
	{ href: '/dashboard', key: 'dashboard', label: 'nav.dashboard', icon: LayoutDashboard },
	{ href: '/companies', key: 'companies', label: 'nav.companies', icon: Building2 },
	{ href: '/livechat', key: 'livechat', label: 'nav.livechat', icon: Headphones },
	{ href: '/conversations', key: 'conversations', label: 'nav.conversations', icon: MessagesSquare },
	{ href: '/sales', key: 'sales', label: 'nav.sales', icon: Handshake },
	{ href: '/employees', key: 'employees', label: 'nav.employees', icon: IdCard },
	{ href: '/organization', key: 'organization', label: 'nav.organization', icon: Network },
	{ href: '/kanban', key: 'kanban', label: 'nav.kanban', icon: SquareKanban },
	{ href: '/campaigns', key: 'campaigns', label: 'nav.campaigns', icon: Megaphone },
	{ href: '/tickets', key: 'tickets', label: 'nav.tickets', icon: Ticket },
	{ href: '/contacts', key: 'contacts', label: 'nav.contacts', icon: Users },
	{ href: '/attendance', key: 'attendance', label: 'nav.attendance', icon: CalendarCheck },
	{ href: '/reports', key: 'reports', label: 'nav.reports', icon: BarChart3 },
	{ href: '/settings', key: 'settings', label: 'nav.settings', icon: Settings }
];
