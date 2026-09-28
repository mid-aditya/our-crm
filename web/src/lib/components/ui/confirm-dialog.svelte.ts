// Global styled confirm dialog (pengganti confirm() native).
// Pakai: const ok = await askConfirm({ title, description, danger? }); — perlu
// <ConfirmDialog /> terpasang sekali di layout.
import { writable } from 'svelte/store';

export type ConfirmOptions = {
	title: string;
	description?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	/** tombol aksi merah (untuk hapus / tindakan destruktif) */
	danger?: boolean;
};

type ConfirmState = ConfirmOptions & {
	open: boolean;
	resolve: ((v: boolean) => void) | null;
};

export const confirmState = writable<ConfirmState>({
	title: '',
	open: false,
	resolve: null
});

export function askConfirm(opts: ConfirmOptions): Promise<boolean> {
	return new Promise((resolve) => {
		confirmState.set({ confirmLabel: 'Ya', cancelLabel: 'Batal', danger: false, ...opts, open: true, resolve });
	});
}

export function resolveConfirm(v: boolean) {
	confirmState.update((s) => {
		s.resolve?.(v);
		return { ...s, open: false, resolve: null };
	});
}
