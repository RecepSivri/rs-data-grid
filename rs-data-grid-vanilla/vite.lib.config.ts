import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

// npm library build, entirely separate from the app build (vite.config.ts)
// and the single-spa UMD build (vite.single-spa.config.ts). Produces a
// framework-free ESM + CJS package from src/lib.js. No peer dependencies --
// this is plain JS/DOM, nothing to externalize. CSS is injected via JS so no
// separate stylesheet import is needed.
export default defineConfig({
  plugins: [nodePolyfills(), cssInjectedByJsPlugin()],
  publicDir: false,
  build: {
    outDir: 'dist-lib',
    lib: {
      entry: 'src/lib.js',
      name: 'RsDataGridVanilla',
      formats: ['es', 'cjs'],
      fileName: format => `rs-data-grid-vanilla.${format === 'es' ? 'js' : 'cjs'}`,
    },
  },
})
