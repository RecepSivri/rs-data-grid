import { defineConfig } from 'cypress';
import codeCoverageTask from '@cypress/code-coverage/task';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.js',
    // The grid renders every row up front (no virtualization), and the demo
    // fixture is intentionally small (25 rows) -- default timeouts are
    // plenty, no need to loosen them.
    setupNodeEvents(on, config) {
      codeCoverageTask(on, config);
      return config;
    },
  },
});
