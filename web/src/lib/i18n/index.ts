import { addMessages, init, locale as currentLocale } from 'svelte-i18n';
import { browser } from '$app/environment';
import en from './en.json';
import id from './id.json';

const STORAGE_KEY = 'crm.locale';

export const locales = ['id', 'en'] as const;
export type AppLocale = (typeof locales)[number];

export const localeNames: Record<AppLocale, string> = {
	id: 'Bahasa Indonesia',
	en: 'English'
};

addMessages('id', id);
addMessages('en', en);

const stored = browser ? localStorage.getItem(STORAGE_KEY) : null;
	init({
		fallbackLocale: 'en',
		initialLocale: (stored ?? 'id') as AppLocale
	});

export function setLocale(l: AppLocale) {
	currentLocale.set(l);
	if (browser) localStorage.setItem(STORAGE_KEY, l);
}

/** Locale saat ini untuk Intl (id-ID / en-US) */
export function bcp(locale: string | undefined | null): string {
	return locale === 'en' ? 'en-US' : 'id-ID';
}
