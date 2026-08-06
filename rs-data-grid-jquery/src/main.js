// Standalone dev entry (`npm run dev`), outside single-spa entirely.
import { createApp } from './app.js';
import { defaultGridConfig } from './defaultGridConfig.js';

const container = document.getElementById('single-spa-application');
const app = createApp();
app.mount(container, { gridConfig: defaultGridConfig });
