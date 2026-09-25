import type { Component } from 'svelte';
	import {
		BarChart3,
		Building2,
		LayoutDashboard,
		Megaphone,
		MessagesSquare,
		MessageSquareText,
		Settings,
		Ticket,
		Users
	} from '@lucide/svelte';

	export const navItems: Array<{
		href: string;
		key: string;
		icon: Component<any>;
	}> = [
		{ href: '/dashboard', key: 'nav.dashboard', icon: LayoutDashboard },
		{ href: '/livechat', key: 'nav.livechat', icon: MessageSquareText },
		{ href: '/companies', key: 'nav.companies', icon: Building2 },
		{ href: '/conversations', key: 'nav.conversations', icon: MessagesSquare },
		{ href: '/campaigns', key: 'nav.campaigns', icon: Megaphone },
		{ href: '/tickets', key: 'nav.tickets', icon: Ticket },
		{ href: '/contacts', key: 'nav.contacts', icon: Users },
		{ href: '/reports', key: 'nav.reports', icon: BarChart3 },
		{ href: '/settings', key: 'nav.settings', icon: Settings }
	];
