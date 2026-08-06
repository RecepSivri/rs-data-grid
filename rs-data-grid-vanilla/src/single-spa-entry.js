// Hand-rolled single-spa lifecycle (no official single-spa-vanilla package
// exists). window['rs-data-grid-vanilla'] = { bootstrap, mount, unmount, update }
// is what root-config.ts's loadUmdApp() expects to find after loading the
// UMD <script> tag.
import { createApp } from './app.js';

let appInstance = null;

export function bootstrap() {
  return Promise.resolve();
}

export function mount(props) {
  const containerEl = props.domElement ?? document.getElementById('single-spa-application');
  appInstance = createApp();
  appInstance.mount(containerEl, props);
  return Promise.resolve();
}

export function unmount() {
  appInstance?.unmount();
  appInstance = null;
  return Promise.resolve();
}

// Called while this app stays mounted and the root-config's customProps
// change (e.g. a sidebar setting was toggled while this tab is active).
export function update(props) {
  appInstance?.update(props);
  return Promise.resolve();
}
