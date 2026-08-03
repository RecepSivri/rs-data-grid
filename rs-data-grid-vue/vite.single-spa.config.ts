import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

// Separate build target that produces a single-spa-consumable bundle from
// src/main.js, without touching the normal app build (vite.config.ts).
// CSS is injected via JS (like Angular's style-loader) instead of being
// extracted to a separate file, so the root-config only needs one <script>.
export default defineConfig({
  plugins: [vue(), nodePolyfills(), cssInjectedByJsPlugin()],
  // UMD lib mode doesn't get Vite's usual process.env.NODE_ENV replacement,
  // which some dependencies read at module-load time.
  define: {
    'process.env.NODE_ENV': JSON.stringify('development'),
  },
  build: {
    outDir: 'dist-single-spa',
    minify: false,
    lib: {
      entry: 'src/main.js',
      name: 'rs-data-grid-vue',
      formats: ['umd'],
      fileName: () => 'rs-data-grid-vue.js',
    },
  },
})
