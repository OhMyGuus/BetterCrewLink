import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
	main: {
		plugins: [externalizeDepsPlugin()],
		build: {
			rollupOptions: {
				input: {
					index: resolve(__dirname, 'src/main/index.ts'),
				},
			},
		},
	},
	preload: {
		plugins: [externalizeDepsPlugin()],
		build: {
			rollupOptions: {
				input: {
					index: resolve(__dirname, 'src/preload/index.ts'),
				},
			},
		},
	},
	renderer: {
		resolve: {
			alias: {
				'@': resolve(__dirname, 'src'),
				path: 'path-browserify',
				buffer: 'buffer',
				process: 'process',
				events: 'events',
			},
		},
		define: {
			global: 'globalThis',
		},
		plugins: [react()],
	},
});
