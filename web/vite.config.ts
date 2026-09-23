import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		proxy: {
			// Backend Go default: API_PORT 3001 (lihat internal/config)
			'/api': { target: 'http://localhost:3001', changeOrigin: true }
		}
	}
});
