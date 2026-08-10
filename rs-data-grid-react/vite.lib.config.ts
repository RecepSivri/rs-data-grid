import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import dts from 'vite-plugin-dts'

// npm library build, entirely separate from the app build (vite.config.ts)
// and the single-spa UMD build (vite.single-spa.config.ts). Produces an ESM
// + CJS package from src/lib.ts: react/react-dom are external (peer deps,
// so a consumer's own copy is used instead of bundling a second one), CSS
// is injected via JS so `import { RsDataGrid } from 'rs-data-grid-react'`
// is the only import a consumer needs, and .d.ts files are rolled up from
// the TS source by vite-plugin-dts.
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills(),
    cssInjectedByJsPlugin(),
    dts({
      tsconfigPath: './tsconfig.json',
      include: ['src/lib.ts', 'src/components/rsDataGrid/**/*.ts', 'src/components/rsDataGrid/**/*.tsx'],
      exclude: ['**/*.test.ts', '**/*.test.tsx'],
      rollupTypes: true,
      insertTypesEntry: true,
    }),
  ],
  publicDir: false,
  build: {
    outDir: 'dist-lib',
    lib: {
      entry: 'src/lib.ts',
      name: 'RsDataGridReact',
      formats: ['es', 'cjs'],
      fileName: format => `rs-data-grid-react.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
    },
  },
})
