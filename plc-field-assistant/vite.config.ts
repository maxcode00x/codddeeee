import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isPhone = mode === 'phone'
  const isElectron = mode === 'electron'

  return {
    base: isElectron ? './' : '/',
    plugins: [
      react(),
      tailwindcss(),
      // Electron грузит собранные файлы с file://, где service worker бесполезен (и не нужен —
      // офлайн там и так гарантирован установкой приложения), поэтому PWA-плагин для этой сборки пропускаем.
      !isElectron && VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['pwa-192.png', 'pwa-512.png'],
        manifest: isPhone
          ? {
              name: 'ПЛК Помощник Mini',
              short_name: 'ПЛК Mini',
              description: 'Урезанная офлайн-версия для телефона: журнал неисправностей, калькуляторы, справочник',
              theme_color: '#0f172a',
              background_color: '#f8fafc',
              display: 'standalone',
              start_url: '/',
              scope: '/',
              icons: [
                { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
                { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
                { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
              ],
            }
          : {
              name: 'Полевой помощник наладчика ПЛК',
              short_name: 'ПЛК-помощник',
              description: 'Офлайн-инструмент наладчика: тренажёр, журнал неисправностей, таблица I/O, калькуляторы, справочник',
              theme_color: '#0f172a',
              background_color: '#f8fafc',
              display: 'standalone',
              start_url: '/',
              scope: '/',
              icons: [
                { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
                { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
                { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
              ],
            },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
          // телефонная сборка не показывает тренажёр — не тащим его 2D-канвас в офлайн-кэш телефона
          globIgnores: isPhone ? ['trainer/**'] : [],
        },
      }),
    ],
    build: {
      outDir: isElectron ? 'dist-electron' : isPhone ? 'dist-phone' : 'dist',
    },
  }
})
