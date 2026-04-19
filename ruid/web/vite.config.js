var _a;
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
export default defineConfig({
    plugins: [react(), tailwindcss()],
    build: {
        rollupOptions: {
            output: {
                manualChunks: function (id) {
                    if (!id.includes('node_modules')) {
                        return undefined;
                    }
                    if (id.includes('/react/') ||
                        id.includes('/react-dom/') ||
                        id.includes('/react-router/') ||
                        id.includes('/react-router-dom/')) {
                        return 'vendor-react';
                    }
                    if (id.includes('/@tanstack/') ||
                        id.includes('/axios/') ||
                        id.includes('/zod/')) {
                        return 'vendor-data';
                    }
                    if (id.includes('/i18next/') || id.includes('/react-i18next/')) {
                        return 'vendor-i18n';
                    }
                    if (id.includes('/@radix-ui/') ||
                        id.includes('/lucide-react/') ||
                        id.includes('/class-variance-authority/') ||
                        id.includes('/clsx/') ||
                        id.includes('/tailwind-merge/')) {
                        return 'vendor-ui';
                    }
                    return undefined;
                },
            },
        },
    },
    server: {
        proxy: {
            '/api': {
                target: (_a = process.env.VITE_DEV_API_PROXY_TARGET) !== null && _a !== void 0 ? _a : 'http://localhost:8100',
                changeOrigin: true,
            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    test: {
        environment: 'jsdom',
        globals: false,
        setupFiles: ['./src/test/setup-tests.ts'],
        css: true,
        restoreMocks: true,
        clearMocks: true,
    },
});
