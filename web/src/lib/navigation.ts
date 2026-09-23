import type { Component } from 'svelte';
import {
	BarChart3,
	LayoutDashboard,
	Megaphone,
	MessagesSquare,
	Settings,
	Ticket,
	Users
} from '@lucide/svelte';

export const navItems: Array<{
	href: string;
	key: string;
	icon: Component<any>;
}> = [
	{ href: '/', key: 'nav.dashboard', icon: LayoutDashboard },
	{ href: '/conversations', key: 'nav.conversations', icon: MessagesSquare },
	{ href: '/campaigns', key: 'nav.campaigns', icon: Megaphone },
	{ href: '/tickets', key: 'nav.tickets', icon: Ticket },
	{ href: '/contacts', key: 'nav.contacts', icon: Users },
	{ href: '/reports', key: 'nav.reports', icon: BarChart3 },
	{ href: '/settings', key: 'nav.settings', icon: Settings }
];
