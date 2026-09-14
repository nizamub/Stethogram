import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'worklets/audio-capture-processor.js',
      ],
      manifest: {
        name: 'Stethogram Digital Stethoscope',
        short_name: 'Stethogram',
        description: 'AI-powered heart sound analysis — real-time auscultation and classification',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache app shell — excludes large model files
        globPatterns: ['**/*.{js,css,html,png,svg}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB max for precache entries

        // Runtime caching for ML model files (54 MB — too large for precache)
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.endsWith('.tflite') ||
              url.pathname.endsWith('.bin') ||
              url.pathname.includes('/models/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'stethogram-ml-models-v1',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache WASM binaries for TFLite runtime
            urlPattern: ({ url }) => url.pathname.endsWith('.wasm'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'stethogram-wasm-v1',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tensorflow/tfjs-tflite': path.resolve(__dirname, './node_modules/@tensorflow/tfjs-tflite/dist/tf-tflite.fesm.js'),
    },
  },
  server: {
    headers: {
      // Required for SharedArrayBuffer (WASM multithreading in TFLite)
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
