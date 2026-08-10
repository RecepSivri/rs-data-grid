import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import dts from 'vite-plugin-dts'

// npm library build, entirely separate from the app build (vite.config.ts)
// and the single-spa UMD build (vite.single-spa.config.ts). Produces an ESM
// + CJS package from src/lib.ts. `vue` is external (peer dep, so a
// consumer's own copy is used). `vuetify` is ALSO external/peer here (unlike
// React's @mui/material, which the React package bundles) -- Vuetify is an
// app-level plugin (`app.use(createVuetify())`) that registers components
// globally and wires theme state through Vue's provide/inject; RsDataGrid's
// own `useTheme()` call must resolve to the SAME vuetify instance the
// consumer's app installs, or the injection key won't match (two separate
// copies = broken inject). CSS is injected via JS so no separate stylesheet
// import is needed, and .d.ts files are rolled up from the TS/Vue source by
// vite-plugin-dts.
export default defineConfig({
  plugins: [
    vue(),
    nodePolyfills(),
    cssInjectedByJsPlugin(),
    dts({
      tsconfigPath: './tsconfig.app.json',
      include: ['src/lib.ts', 'src/components/rsDataGrid/**/*.ts', 'src/components/rsDataGrid/**/*.vue'],
      exclude: ['**/*.test.ts', '**/*.spec.ts'],
      rollupTypes: true,
      insertTypesEntry: true,
    }),
  ],
  publicDir: false,
  build: {
    outDir: 'dist-lib',
    lib: {
      entry: 'src/lib.ts',
      name: 'RsDataGridVue',
      formats: ['es', 'cjs'],
      fileName: format => `rs-data-grid-vue.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['vue', 'vuetify'],
    },
  },
})
