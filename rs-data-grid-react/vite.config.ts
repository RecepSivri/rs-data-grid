import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import istanbul from 'vite-plugin-istanbul'
import { fileURLToPath } from 'node:url'

const isCoverage = process.env.COVERAGE === 'true'

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    alias: isCoverage
      ? {
          // The demo normally imports the grid from the *built* npm package
          // (dist-lib), which is a static file Vite never transforms -- so
          // istanbul can't instrument it and the real grid engine shows up
          // as 0% covered. Only for the coverage run, redirect that import
          // back to the real source so it goes through Vite's (and
          // istanbul's) pipeline like everything else.
          'rs-data-grid-react': fileURLToPath(new URL('./src/lib.ts', import.meta.url)),
        }
      : {},
  },
  plugins: [
    react(),
    // Only instruments when COVERAGE=true (the E2E coverage run) -- normal
    // `npm run dev` stays uninstrumented so it isn't slower/larger for
    // everyday use.
    isCoverage &&
      istanbul({
        include: 'src/**/*.{ts,tsx}',
        exclude: ['node_modules', 'cypress', '**/*.test.{ts,tsx}'],
        requireEnv: false,
      }),
  ],
})
