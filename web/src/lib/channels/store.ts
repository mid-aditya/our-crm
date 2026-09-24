import { browser } from '$app/environment';
import { channelDefs, type ChannelDef } from './definitions';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type ChannelState = {
	id: string;
	config: Record<string, string>;
	status: ConnectionStatus;
	lastSync: string | null; // ISO date or null
	error: string | null;
	enabled: boolean;
};

type ChannelStore = {
	channels: Record<string, ChannelState>;
};

const STORAGE_KEY = 'crm.channels';
const DEFAULT_STATE = (): Record<string, ChannelState> => {
	const init: Record<string, ChannelState> = {};
	for (const def of channelDefs) {
		init[def.id] = { id: def.id, config: {}, status: 'disconnected', lastSync: null, error: null, enabled: false };
	}
	return init;
};

function load(): Record<string, ChannelState> {
	if (!browser) return DEFAULT_STATE();
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return DEFAULT_STATE();
		const parsed = JSON.parse(raw) as Record<string, ChannelState>;
		// Merge with defaults so new channels get initialized
		const defaults = DEFAULT_STATE();
		const merged: Record<string, ChannelState> = {};
		for (const def of channelDefs) {
			merged[def.id] = { ...defaults[def.id], ...(parsed[def.id] ?? {}) };
		}
		return merged;
	} catch {
		return DEFAULT_STATE();
	}
}

function save(state: Record<string, ChannelState>) {
	if (!browser) return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

class ChannelStoreClass {
	channels = $state<Record<string, ChannelState>>(load());

	private notify() {
		save(this.channels);
	}

	get(id: string): ChannelState {
		return this.channels[id] ?? { id, config: {}, status: 'disconnected', lastSync: null, error: null, enabled: false };
	}

	updateConfig(id: string, config: Record<string, string>) {
		this.channels[id] = { ...this.get(id), config };
		this.notify();
	}

	async connect(id: string): Promise<void> {
		const ch = this.get(id);
		if (!ch.enabled) {
			// Save enabled first
			this.channels[id] = { ...ch, enabled: true };
		}
		this.channels[id] = { ...this.get(id), status: 'connecting', error: null };
		this.notify();

		// TODO: swap with POST /api/v1/wa-channels/{id}/connect
		// Simulasi 1.5 detik
		await new Promise((r) => setTimeout(r, 1500));
		const success = Math.random() > 0.15; // 85% success rate demo
		this.channels[id] = {
			...this.get(id),
			status: success ? 'connected' : 'error',
			lastSync: success ? new Date().toISOString() : null,
			error: success ? null : 'Connection timeout. Check credentials.'
		};
		this.notify();
	}

	async disconnect(id: string): Promise<void> {
		this.channels[id] = { ...this.get(id), status: 'disconnected', lastSync: null, error: null };
		this.notify();
		// TODO: swap with POST /api/v1/wa-channels/{id}/disconnect
	}

	toggleEnabled(id: string) {
		const ch = this.get(id);
		this.channels[id] = { ...ch, enabled: !ch.enabled };
		if (!this.channels[id].enabled) {
			this.channels[id].status = 'disconnected';
			this.channels[id].lastSync = null;
			this.channels[id].error = null;
		}
		this.notify();
	}
}

export const channelStore = new ChannelStoreClass();
