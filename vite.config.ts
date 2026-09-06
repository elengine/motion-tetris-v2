import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { VitePWA } from 'vite-plugin-pwa';
import wasm from 'vite-plugin-wasm';
import topAwait from 'vite-plugin-top-level-await';

export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '1.4.0'),
  },
  base: './',
  resolve: {
    alias: {
      '@wasm': fileURLToPath(new URL('./wasm/pkg', import.meta.url)),
    },
  },
  build: { target: 'es2022', sourcemap: false },
  server: { host: true },
  plugins: [
    wasm(),
    topAwait(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'NEON TETRIS v2',
        short_name: 'NEONテトリス',
        description: 'Wasmコア×ガイドライン完全準拠の本格テトリス',
        start_url: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0a0e27',
        theme_color: '#0a0e27',
        lang: 'ja',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
}));
