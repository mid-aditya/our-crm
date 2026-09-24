import * as api from './agent-api';
import type { LivechatSession, LivechatMessage, Agent } from './agent-api';

class AgentLivechatStore {
	queue = $state<LivechatSession[]>([]);
	activeSession = $state<LivechatSession | null>(null);
	messages = $state<LivechatMessage[]>([]);
	agents = $state<Agent[]>([]);
	connected = $state(false);
	sseSource = $state<EventSource | null>(null);
	wsSource = $state<WebSocket | null>(null);
	companyId = $state('');
	token = $state('');
	distributionMode = $state<'manual' | 'auto'>('manual');
	visitorTyping = $state(false);

	private typingTimer: ReturnType<typeof setTimeout> | null = null;

	async init(companyId: string, token: string) {
		this.companyId = companyId;
		this.token = token;
		await Promise.all([this.loadQueue(), this.loadAgents(), this.loadDistribution()]);
		this.connectSSE();
	}

	async loadQueue() {
		if (!this.companyId) return;
		try {
			this.queue = await api.getQueue(this.companyId);
		} catch {
			// silent fail, UI will show empty queue
		}
	}

	async loadAgents() {
		if (!this.companyId) return;
		try {
			this.agents = await api.getAgents(this.companyId);
		} catch {
			// silent fail
		}
	}

	async loadDistribution() {
		if (!this.companyId) return;
		try {
			const dist = await api.getDistribution(this.companyId);
			this.distributionMode = dist.mode;
		} catch {
			// silent fail
		}
	}

	connectSSE() {
		if (!this.companyId || !this.token) return;
		this.disconnectSSE();

		const source = new EventSource(
			`/api/v1/livechat/sse?company_id=${this.companyId}`,
			{ withCredentials: true }
		);

		source.onmessage = (e) => {
			try {
				const sev = JSON.parse(e.data);
				if (sev.type === 'queue_update') {
					this.queue = sev.payload ?? [];
				} else if (sev.type === 'agent_update') {
					this.agents = sev.payload ?? [];
				} else if (sev.type === 'new_message') {
					// update session in queue with new last_message
					const { session_id, message } = sev.payload ?? {};
					if (session_id) {
						const idx = this.queue.findIndex((s) => s.id === session_id);
						if (idx >= 0) {
							this.queue = this.queue.map((s, i) =>
								i === idx ? { ...s, last_message: (message as any)?.body ?? s.last_message } : s
							);
					}
					}
				}
			} catch {
				// ignore malformed
			}
		};

		source.onerror = () => {
			this.connected = false;
		};

		source.onopen = () => {
			this.connected = true;
		};

		this.sseSource = source;
	}

	disconnectSSE() {
		this.sseSource?.close();
		this.sseSource = null;
		this.connected = false;
	}

	async selectSession(session: LivechatSession) {
		this.activeSession = session;
		this.visitorTyping = false;
		await this.loadMessages(session.id);
		this.connectWS(session.id);
	}

	connectWS(sessionId: string) {
		this.wsSource?.close();

		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		const host = window.location.host;
		const wsUrl = `${protocol}//${host}/ws/livechat?session_id=${sessionId}&company_id=${this.companyId}&role=agent`;

		const ws = new WebSocket(wsUrl);

		ws.onmessage = (e) => {
			try {
				const msg = JSON.parse(e.data);
				if (msg.type === 'visitor_message') {
					const msgData: LivechatMessage = {
						id: msg.id ?? crypto.randomUUID(),
						direction: 'inbound',
						sender_id: msg.sender_id ?? null,
						sender_name: msg.sender_name ?? this.activeSession?.visitor_name ?? 'Visitor',
						body: msg.body,
						created_at: new Date().toISOString()
					};
					this.messages = [...this.messages, msgData];
					this.visitorTyping = false;
				} else if (msg.type === 'typing') {
					this.visitorTyping = true;
					if (this.typingTimer) clearTimeout(this.typingTimer);
					this.typingTimer = setTimeout(() => {
						this.visitorTyping = false;
					}, 3000);
				} else if (msg.type === 'session_update') {
					this.activeSession = msg.data;
					const idx = this.queue.findIndex((s) => s.id === msg.data.id);
					if (idx >= 0) {
						this.queue = [
							...this.queue.slice(0, idx),
							msg.data,
							...this.queue.slice(idx + 1)
						];
					}
				}
			} catch {
				// ignore malformed
			}
		};

		ws.onclose = () => {
			// reconnect logic could go here
		};

		this.wsSource = ws;
	}

	async loadMessages(sessionId: string) {
		try {
			this.messages = await api.getMessages(sessionId);
		} catch {
			this.messages = [];
		}
	}

	async takeSession(sessionId: string) {
		try {
			const updated = await api.takeSession(sessionId);
			const idx = this.queue.findIndex((s) => s.id === sessionId);
			if (idx >= 0) {
				this.queue = [
					...this.queue.slice(0, idx),
					updated,
					...this.queue.slice(idx + 1)
				];
			}
			await this.selectSession(updated);
		} catch {
			// fail silently
		}
	}

	async assignSession(sessionId: string, agentId: string) {
		try {
			const updated = await api.assignSession(sessionId, agentId);
			const idx = this.queue.findIndex((s) => s.id === sessionId);
			if (idx >= 0) {
				this.queue = [
					...this.queue.slice(0, idx),
					updated,
					...this.queue.slice(idx + 1)
				];
			}
			if (this.activeSession?.id === sessionId) {
				this.activeSession = updated;
			}
		} catch {
			// fail silently
		}
	}

	async resolveSession(sessionId: string) {
		try {
			const updated = await api.resolveSession(sessionId);
			const idx = this.queue.findIndex((s) => s.id === sessionId);
			if (idx >= 0) {
				this.queue = [
					...this.queue.slice(0, idx),
					updated,
					...this.queue.slice(idx + 1)
				];
			}
			if (this.activeSession?.id === sessionId) {
				this.activeSession = null;
				this.messages = [];
			}
		} catch {
			// fail silently
		}
	}

	async sendMessage(sessionId: string, body: string) {
		if (!body.trim()) return;
		try {
			const msg = await api.sendMessage(sessionId, body);
			this.messages = [...this.messages, msg];
		} catch {
			// fail silently
		}
	}

	async setDistributionMode(mode: 'manual' | 'auto') {
		if (!this.companyId) return;
		try {
			const updated = await api.setDistribution(this.companyId, mode);
			this.distributionMode = updated.mode;
		} catch {
			// fail silently
		}
	}

	destroy() {
		this.disconnectSSE();
		this.wsSource?.close();
		this.wsSource = null;
		this.queue = [];
		this.activeSession = null;
		this.messages = [];
		this.agents = [];
	}
}

export const agentStore = new AgentLivechatStore();
