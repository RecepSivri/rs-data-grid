import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

// npm library build, entirely separate from the app build (vite.config.ts)
// and the single-spa UMD build (vite.single-spa.config.ts, which bundles
// jQuery directly since that build only serves this repo's own demo shell).
// Here jQuery is external/peer instead -- real consumers of a jQuery-flavored
// package already have jQuery loaded on their page, and bundling a second
// private copy would be unexpected bloat for this audience. Produces an ESM
// + CJS package from src/lib.js. CSS is injected via JS so no separate
// stylesheet import is needed.
export default defineConfig({
  plugins: [nodePolyfills(), cssInjectedByJsPlugin()],
  publicDir: false,
  build: {
    outDir: 'dist-lib',
    lib: {
      entry: 'src/lib.js',
      name: 'RsDataGridJquery',
      formats: ['es', 'cjs'],
      fileName: format => `rs-data-grid-jquery.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['jquery'],
    },
  },
})
