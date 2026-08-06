import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

// Separate build target that produces a single-spa-consumable bundle from
// src/single-spa-entry.js, without touching the normal app build
// (vite.config.ts). CSS is injected via JS instead of being extracted to a
// separate file, so the root-config only needs one <script>. jQuery is a
// normal dependency, bundled into the UMD output like xlsx/jspdf already are.
export default defineConfig({
  plugins: [nodePolyfills(), cssInjectedByJsPlugin()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: 'dist-single-spa',
    lib: {
      entry: 'src/single-spa-entry.js',
      name: 'rs-data-grid-jquery',
      formats: ['umd'],
      fileName: () => 'rs-data-grid-jquery.js',
    },
  },
})
