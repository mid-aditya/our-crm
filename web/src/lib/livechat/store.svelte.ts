import * as api from './api';
import { wsUrl } from './api';
import type { VisitorSession } from './api';

const COMPANY_ID = (typeof window !== 'undefined'
	? (window as any).__LIVECHAT_COMPANY_ID__
	: null) ?? '00000000-0000-0000-0000-000000000001';

class LivechatStore {
	session = $state<VisitorSession | null>(null);
	messages = $state<Array<{ id: string; direction: 'inbound' | 'outbound'; body: string; sender_name?: string; created_at: string }>>([]);
	open = $state(false);
	connected = $state(false);
	agentTyping = $state(false);
	status = $state<'idle' | 'connecting' | 'waiting' | 'chatting' | 'resolved'>('idle');

	private ws: WebSocket | null = null;
	private visitorId = '';
	private typingTimer?: ReturnType<typeof setTimeout>;

	get visitorId_(): string {
		return this.visitorId;
	}

	init() {
		if (typeof window === 'undefined') return;
		this.visitorId = localStorage.getItem('lc_visitor_id') ?? crypto.randomUUID();
		localStorage.setItem('lc_visitor_id', this.visitorId);
	}

	async openChat(name?: string) {
		this.open = true;
		if (this.session) return; // already have a session

		this.status = 'connecting';
		try {
			this.session = await api.createSession(COMPANY_ID, this.visitorId, name);
			this.status = 'waiting';
			this.connectWS();
		} catch {
			this.status = 'idle';
		}
	}

	closeChat() {
		this.open = false;
	}

	toggleChat() {
		if (this.open) {
			this.closeChat();
		} else {
			this.openChat();
		}
	}

	private connectWS() {
		if (!this.session) return;
		this.ws?.close();

		const url = wsUrl(this.session.id, COMPANY_ID);
		const ws = new WebSocket(url);

		ws.onopen = () => {
			this.connected = true;
		};

		ws.onmessage = (e) => {
			try {
				const msg = JSON.parse(e.data);
				if (msg.type === 'visitor_message') {
					this.messages = [...this.messages, {
						id: msg.id ?? crypto.randomUUID(),
						direction: 'inbound',
						body: msg.body,
						sender_name: msg.sender_name,
						created_at: new Date().toISOString()
					}];
					this.agentTyping = false;
					if (this.status === 'waiting') {
						this.status = 'chatting';
					}
				} else if (msg.type === 'agent_message') {
					this.messages = [...this.messages, {
						id: msg.id ?? crypto.randomUUID(),
						direction: 'outbound',
						body: msg.body,
						sender_name: msg.sender_name,
						created_at: new Date().toISOString()
					}];
				} else if (msg.type === 'typing') {
					this.agentTyping = true;
					if (this.typingTimer) clearTimeout(this.typingTimer);
					this.typingTimer = setTimeout(() => (this.agentTyping = false), 3000);
				} else if (msg.type === 'assigned') {
					this.session = this.session
						? { ...this.session, assigned_agent_name: msg.sender_name }
						: null;
					this.status = 'chatting';
				}
			} catch {
				// ignore malformed
			}
		};

		ws.onclose = () => {
			this.connected = false;
		};

		ws.onerror = () => {
			this.connected = false;
		};

		this.ws = ws;
	}

	sendMessage(body: string) {
		if (!body.trim() || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

		const msg = {
			type: 'visitor_message',
			body: body.trim(),
			sender_name: 'Guest'
		};

		// Optimistic update
		this.messages = [...this.messages, {
			id: crypto.randomUUID(),
			direction: 'outbound',
			body: body.trim(),
			sender_name: 'Guest',
			created_at: new Date().toISOString()
		}];

		this.ws.send(JSON.stringify(msg));

		// Send typing stop
		this.ws.send(JSON.stringify({ type: 'typing', body: '' }));
	}

	sendTyping() {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
		this.ws.send(JSON.stringify({ type: 'typing', body: '...' }));
	}

	destroy() {
		this.ws?.close();
		this.ws = null;
	}
}

export const livechatStore = new LivechatStore();
