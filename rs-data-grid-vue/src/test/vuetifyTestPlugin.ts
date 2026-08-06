// Minimal Vuetify instance for mounting components under test.
// Mirrors the setup in src/main.ts / src/main.js (icons + light theme) but
// without loading the real stylesheets, which aren't needed for behavioral tests.
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

export const createTestVuetify = () =>
  createVuetify({
    components,
    directives,
    icons: {
      defaultSet: 'mdi',
    },
    theme: {
      defaultTheme: 'light',
    },
  });
