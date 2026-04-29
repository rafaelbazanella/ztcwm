import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    root: '.',
    resolve: {
        alias: {
            '@': resolve(__dirname, '.'),
        },
    },
    server: {
        port: 3001,
        open: false,
        proxy: {
            '/api': 'http://localhost:3000',
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
    },
});
