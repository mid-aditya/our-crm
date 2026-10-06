import { addMessages, init, locale as currentLocale } from 'svelte-i18n';
import { browser } from '$app/environment';
import en from './en.json';
import id from './id.json';
import tl from './tl.json';
import th from './th.json';

const STORAGE_KEY = 'crm.locale';

export const locales = ['id', 'en', 'tl', 'th'] as const;
export type AppLocale = (typeof locales)[number];

export const localeNames: Record<AppLocale, string> = {
	id: 'Bahasa Indonesia',
	en: 'English',
	tl: 'Tagalog',
	th: 'ภาษาไทย'
};

addMessages('id', id);
addMessages('en', en);
addMessages('tl', tl);
addMessages('th', th);

const stored = browser ? localStorage.getItem(STORAGE_KEY) : null;
	init({
		fallbackLocale: 'en',
		initialLocale: (stored ?? 'id') as AppLocale
	});

export function setLocale(l: AppLocale) {
	currentLocale.set(l);
	if (browser) localStorage.setItem(STORAGE_KEY, l);
}

/** Locale saat ini untuk Intl (id-ID / en-US / fil-PH / th-TH) */
export function bcp(locale: string | undefined | null): string {
	switch (locale) {
		case 'en':
			return 'en-US';
		case 'tl':
			return 'fil-PH';
		case 'th':
			return 'th-TH';
		default:
			return 'id-ID';
	}
}
