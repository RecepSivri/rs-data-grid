import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

// Separate build target that produces a single-spa-consumable bundle from
// src/index.js, without touching the normal app build (vite.config.ts).
// CSS is injected via JS (like Angular's style-loader) instead of being
// extracted to a separate file, so the root-config only needs one <script>.
export default defineConfig({
  plugins: [react(), nodePolyfills(), cssInjectedByJsPlugin()],
  // UMD lib mode doesn't get Vite's usual process.env.NODE_ENV replacement,
  // and react-dom reads it at module-load time.
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: 'dist-single-spa',
    lib: {
      entry: 'src/index.js',
      name: 'rs-data-grid-react',
      formats: ['umd'],
      fileName: () => 'rs-data-grid-react.js',
    },
  },
})
