<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Widget from '$lib/livechat/Widget.svelte';
	import {
		Bot,
		Hash,
		LayoutDashboard,
		LineChart,
		MessageCircle,
		MessageSquare,
		Phone,
		ShoppingBag,
		Star,
		User,
		Zap
	} from '@lucide/svelte';

	// Set company ID for the livechat widget (public landing page)
	if (typeof window !== 'undefined') {
		(window as any).__LIVECHAT_COMPANY_ID__ = 'demo-company';
	}

	const channels = [
		{ icon: Phone, name: 'WhatsApp Official', color: '#25D366' },
		{ icon: MessageCircle, name: 'WhatsApp Unofficial', color: '#128C7E' },
		{ icon: MessageSquare, name: 'Live Chat', color: '#6366F1' },
		{ icon: MessageCircle, name: 'Facebook', color: '#1877F2' },
		{ icon: User, name: 'Instagram', color: '#E1306C' },
		{ icon: Hash, name: 'LINE', color: '#00B900' },
		{ icon: ShoppingBag, name: 'Shopee', color: '#EE4D2D' },
		{ icon: Bot, name: 'Telegram', color: '#0088CC' }
	];

	const features = [
		{ icon: MessageSquare, title: 'Multi-Channel Inbox', desc: 'Satu inbox untuk WhatsApp, Live Chat, Facebook, Instagram, LINE, dan Telegram.' },
		{ icon: Zap, title: 'Blast Campaign', desc: 'Kirim pesan massal terjadwal ke ribuan kontak dalam hitungan menit.' },
		{ icon: LayoutDashboard, title: 'CRM Terintegrasi', desc: 'Kelola kontak, pipeline, dan tiket dukungan dalam satu platform.' },
		{ icon: LineChart, title: 'Laporan Real-time', desc: 'Lacak performa kampanye, reply rate, dan resolusi tiket secara live.' },
		{ icon: Bot, title: 'Distribusi Otomatis', desc: 'Round-robin atau manual — distribute percakapan ke agen secara cerdas.' },
		{ icon: Star, title: 'Modern & Ringan', desc: 'UI yang bersih dan responsif, cepat di semua perangkat.' }
	];

	const testimonials = [
		{ name: 'Rina Wijaya', role: 'Head of CS, TokoSeru', quote: 'Semua chat pelanggan sekarang di satu tempat. Tim kami 2x lebih cepat respons.' },
		{ name: 'Ahmad Pratama', role: 'Marketing Lead, GreenLife', quote: 'Blast campaign ke 5.000+ kontak dalam 10 menit. ROI naik 40% bulan pertama.' },
		{ name: 'Sari Dewi', role: 'Founder, BeautyBox ID', quote: 'Live chat-nya seamless. Pelanggan suka karena dapat respons instan.' }
	];
</script>

<Widget />

<!-- Nav -->
<header class="fixed top-0 z-40 w-full border-b border-white/10 bg-bg/80 backdrop-blur-md">
	<div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
		<div class="flex items-center gap-2">
			<div class="flex size-8 items-center justify-center rounded-lg bg-neon">
				<MessageSquare size={16} class="text-on-neon" />
			</div>
			<span class="font-display text-lg font-semibold">OurCRM</span>
		</div>
		<nav class="hidden items-center gap-6 md:flex">
			<a href="#features" class="text-sm text-muted hover:text-ink transition-colors">Fitur</a>
			<a href="#channels" class="text-sm text-muted hover:text-ink transition-colors">Channel</a>
		</nav>
		<div class="flex items-center gap-3">
			<Button variant="ghost" onclick={() => goto('/login')}>Masuk</Button>
			<Button onclick={() => goto('/signup')}>Daftar Gratis</Button>
		</div>
	</div>
</header>

<!-- Hero -->
<section class="relative overflow-hidden pt-32 pb-24">
	<div class="absolute inset-0 -z-10">
		<div class="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,var(--neon-soft)_0%,transparent_70%)]"></div>
		<div class="absolute left-1/4 top-20 size-96 rounded-full bg-neon/5 blur-3xl"></div>
		<div class="absolute bottom-0 right-1/4 size-64 rounded-full bg-neon/5 blur-3xl"></div>
	</div>

	<div class="mx-auto max-w-6xl px-6">
		<div class="grid gap-16 lg:grid-cols-2 lg:items-center">
			<div>
				<div class="mb-6 inline-flex items-center gap-2 rounded-full border border-neon/30 bg-neon-soft px-4 py-1.5 text-sm font-medium text-neon-text">
					<Zap size={14} />
					All-in-One Customer Messaging
				</div>
				<h1 class="font-display text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
					Semua chat.<br />
					<span class="text-neon">Satu platform.</span><br />
					Nol ribet.
				</h1>
				<p class="mt-6 max-w-lg text-base text-muted md:text-lg">
					Kelola WhatsApp, Live Chat, Facebook, Instagram, LINE, dan Telegram dari satu inbox. Kirim blast campaign, distribute ke agen, dan pantau laporan — semua real-time.
				</p>
				<div class="mt-8 flex flex-wrap items-center gap-4">
					<Button size="lg" onclick={() => goto('/signup')}>
						Mulai Gratis
						<MessageSquare size={18} />
					</Button>
					<Button size="lg" variant="outline" onclick={() => goto('/dashboard')}>
						Lihat Demo
					</Button>
				</div>
				<p class="mt-4 text-xs text-faint">Tidak perlu kartu kredit. Gratis 14 hari.</p>
			</div>

			<!-- Chat preview -->
			<div class="relative mx-auto w-full max-w-sm lg:mx-0">
				<div class="overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl shadow-neon/10">
					<div class="flex items-center gap-2 border-b border-line bg-raised px-4 py-3">
						<span class="size-3 rounded-full bg-danger"></span>
						<span class="size-3 rounded-full bg-warn"></span>
						<span class="size-3 rounded-full bg-neon"></span>
						<span class="ml-3 grow rounded-md bg-surface px-3 py-1 text-xs text-faint">live.ourcrm.io</span>
					</div>
					<div class="flex h-80 flex-col bg-surface">
						<div class="border-b border-line bg-raised px-4 py-2.5">
							<p class="text-xs font-semibold text-neon-text">💬 Live Chat</p>
						</div>
						<div class="flex-1 space-y-3 overflow-hidden p-4">
							<div class="flex justify-end">
								<div class="max-w-[70%] rounded-2xl rounded-br-sm bg-neon px-3 py-2 text-sm text-on-neon">
									Halo, saya mau tanya soal produk
								</div>
							</div>
							<div class="flex gap-2">
								<div class="flex size-7 shrink-0 items-center justify-center rounded-full bg-raised text-[10px] font-semibold text-muted">AG</div>
								<div class="max-w-[70%] rounded-2xl rounded-bl-sm bg-raised px-3 py-2 text-sm text-ink">
									Selamat siang! Silakan bertanya 😊
								</div>
							</div>
							<div class="flex justify-end">
								<div class="max-w-[70%] rounded-2xl rounded-br-sm bg-neon px-3 py-2 text-sm text-on-neon">
									Produk ini ready stock ya?
								</div>
							</div>
							<div class="flex gap-2">
								<div class="flex size-7 shrink-0 items-center justify-center rounded-full bg-raised text-[10px] font-semibold text-muted">AG</div>
								<div class="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-raised px-3 py-2 text-sm text-muted">
									<div class="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:0ms]"></div>
									<div class="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:150ms]"></div>
									<div class="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:300ms]"></div>
								</div>
							</div>
						</div>
						<div class="border-t border-line p-3">
							<div class="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2">
								<span class="text-xs text-faint">Ketik pesan…</span>
								<div class="ml-auto rounded-full bg-neon p-1.5">
									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-on-neon"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 19-7z"/></svg>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div class="absolute -bottom-4 -left-8 rounded-xl border border-line bg-surface px-4 py-3 shadow-lg lg:-left-16">
					<div class="flex items-center gap-3">
						<div class="flex size-9 items-center justify-center rounded-lg bg-neon-soft">
							<Zap size={16} class="text-neon-text" />
						</div>
						<div>
							<p class="text-xs text-muted">Respon rata-rata</p>
							<p class="font-mono text-lg font-semibold text-neon-text">&lt;30det</p>
						</div>
					</div>
				</div>

				<div class="absolute -right-4 top-8 flex flex-col gap-2 lg:-right-8">
					{#each channels.slice(0, 4) as ch}
						<div class="flex size-8 items-center justify-center rounded-lg shadow-md" style="background: {ch.color}22; color: {ch.color};" title={ch.name}>
							<svelte:component this={ch.icon} size={14} />
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Social proof -->
<section class="border-y border-line bg-raised py-6">
	<div class="mx-auto flex max-w-6xl items-center justify-center gap-8 px-6 overflow-x-auto">
		<p class="shrink-0 text-sm text-faint">Trusted oleh 500+ tim di Indonesia</p>
		{#each ['TokoSeru', 'GreenLife', 'BeautyBox', 'TechGear', 'FreshFood'] as brand}
			<span class="shrink-0 font-display text-sm font-semibold text-muted">{brand}</span>
		{/each}
	</div>
</section>

<!-- Features -->
<section id="features" class="py-24">
	<div class="mx-auto max-w-6xl px-6">
		<div class="mb-16 text-center">
			<p class="mb-3 text-sm font-medium text-neon-text">Fitur Unggulan</p>
			<h2 class="font-display text-3xl font-bold md:text-4xl">Semua yang kamu butuhkan,<br />tanpa yang tidak</h2>
			<p class="mt-4 max-w-xl mx-auto text-muted">Dibuat untuk tim yang peduli dengan pengalaman pelanggan, bukan sekadar mengirim pesan.</p>
		</div>
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each features as f}
				<div class="group rounded-2xl border border-line bg-surface p-6 transition-all hover:border-neon/30 hover:shadow-lg hover:shadow-neon/5">
					<div class="mb-4 flex size-11 items-center justify-center rounded-xl bg-neon-soft text-neon-text">
						<svelte:component this={f.icon} size={20} />
					</div>
					<h3 class="font-display text-base font-semibold">{f.title}</h3>
					<p class="mt-2 text-sm text-muted leading-relaxed">{f.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Channels -->
<section id="channels" class="py-24 bg-raised">
	<div class="mx-auto max-w-6xl px-6">
		<div class="mb-16 text-center">
			<p class="mb-3 text-sm font-medium text-neon-text">8 Channel</p>
			<h2 class="font-display text-3xl font-bold md:text-4xl">Connect semua channel<br />pelangganmu</h2>
			<p class="mt-4 max-w-lg mx-auto text-muted">WhatsApp, Live Chat website, Facebook, Instagram, LINE, Shopee, dan Telegram — tinggal set API langsung jadi.</p>
		</div>
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			{#each channels as ch}
				<div class="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface p-5 text-center transition-all hover:scale-105 hover:shadow-md">
					<div class="flex size-12 items-center justify-center rounded-xl" style="background: {ch.color}22; color: {ch.color};">
						<svelte:component this={ch.icon} size={24} />
					</div>
					<p class="text-xs font-medium text-muted">{ch.name}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Testimonials -->
<section class="py-24">
	<div class="mx-auto max-w-6xl px-6">
		<div class="mb-16 text-center">
			<p class="mb-3 text-sm font-medium text-neon-text">Testimoni</p>
			<h2 class="font-display text-3xl font-bold md:text-4xl">Dipakai tim nyata,<br />hasil nyata</h2>
		</div>
		<div class="grid gap-4 md:grid-cols-3">
			{#each testimonials as t}
				<div class="rounded-2xl border border-line bg-surface p-6">
					<div class="mb-4 flex gap-1">
						{#each [1,2,3,4,5] as _}<Star size={14} class="fill-neon text-neon" />{/each}
					</div>
					<blockquote class="text-sm text-muted leading-relaxed">"{t.quote}"</blockquote>
					<div class="mt-4 flex items-center gap-3">
						<div class="flex size-9 items-center justify-center rounded-full bg-neon-soft font-semibold text-neon-text">{t.name[0]}</div>
						<div>
							<p class="text-sm font-medium">{t.name}</p>
							<p class="text-xs text-faint">{t.role}</p>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- CTA -->
<section class="py-24">
	<div class="mx-auto max-w-3xl px-6 text-center">
		<div class="rounded-3xl border border-neon/20 bg-neon-soft p-12 md:p-16">
			<h2 class="font-display text-3xl font-bold text-neon-text md:text-4xl">Siap tingkatkan<br />customer experience?</h2>
			<p class="mt-4 text-muted">Mulai gratis sekarang. Tidak perlu kartu kredit. Setup dalam 5 menit.</p>
			<div class="mt-8 flex flex-wrap justify-center gap-4">
				<Button size="lg" onclick={() => goto('/signup')}>Daftar Gratis Sekarang</Button>
				<Button size="lg" variant="outline" onclick={() => goto('/dashboard')}>Masuk</Button>
			</div>
		</div>
	</div>
</section>

<!-- Footer -->
<footer class="border-t border-line py-12">
	<div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
		<div class="flex items-center gap-2">
			<div class="flex size-7 items-center justify-center rounded-lg bg-neon">
				<MessageSquare size={14} class="text-on-neon" />
			</div>
			<span class="font-display text-sm font-semibold">OurCRM</span>
		</div>
		<p class="text-xs text-faint">© 2026 OurCRM. All rights reserved.</p>
		<div class="flex gap-6 text-xs text-faint">
			<span class="cursor-pointer hover:text-muted transition-colors">Privacy</span>
			<span class="cursor-pointer hover:text-muted transition-colors">Terms</span>
			<span class="cursor-pointer hover:text-muted transition-colors">Support</span>
		</div>
	</div>
</footer>
