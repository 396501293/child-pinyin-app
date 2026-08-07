import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/child-pinyin-app/',
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '拼音星球',
        short_name: '拼音星球',
        lang: 'zh-CN',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#EAF6FF',
        theme_color: '#4FA8F0',
        start_url: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          // maskable：安全区留白由 icon 背景铺满整块，可作 any + maskable。
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // 预缓存壳 + 音频 + 图标，实现离线可用。
      // mp3 必须在列：拼音发音是预生成音频，漏了断网即无声。
      workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2,mp3}'] },
    }),
  ],
});
