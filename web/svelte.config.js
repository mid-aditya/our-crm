import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// SPA mode: hasil build dilayani sebagai file statis (fallback index.html)
		adapter: adapter({ fallback: 'index.html' })
	}
};

export default config;
