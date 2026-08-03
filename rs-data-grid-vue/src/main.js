import { createApp, h } from 'vue';
import singleSpaVue from 'single-spa-vue';
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import './style.css';
import App from './App.vue';

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
  },
  theme: {
    defaultTheme: 'light',
  },
});

function createAppWithVuetify(options) {
  const app = createApp(options);
  app.use(vuetify);
  return app;
}

const vueLifecycles = singleSpaVue({
  createApp: createAppWithVuetify,
  appOptions: {
    el: '#single-spa-application',
    render() {
      return h(App);
    },
  },
});

export const bootstrap = vueLifecycles.bootstrap;
export const mount = vueLifecycles.mount;
export const unmount = vueLifecycles.unmount;
