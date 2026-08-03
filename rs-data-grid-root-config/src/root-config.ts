import { registerApplication, start } from 'single-spa';

interface TabDef {
  name: string;
  label: string;
  hash: string;
  globalName: string;
  scriptUrl: string;
}

const tabs: TabDef[] = [
  {
    name: '@rs-data-grid/angular',
    label: 'Angular',
    hash: '#/angular',
    globalName: 'rsivri-data-grid',
    scriptUrl: 'http://localhost:4200/main.js',
  },
  {
    name: '@rs-data-grid/react',
    label: 'React',
    hash: '#/react',
    globalName: 'rs-data-grid-react',
    scriptUrl: 'http://localhost:3000/rs-data-grid-react.js',
  },
  {
    name: '@rs-data-grid/vue',
    label: 'Vue',
    hash: '#/vue',
    globalName: 'rs-data-grid-vue',
    scriptUrl: 'http://localhost:5173/rs-data-grid-vue.js',
  },
];

// Each app builds to a UMD bundle that assigns itself to a global variable
// (window[globalName] = { bootstrap, mount, unmount }). Loading it with a
// plain <script> tag and reading that global sidesteps SystemJS's UMD
// interop, which doesn't reliably unwrap named exports from these bundles.
function loadUmdApp(tab: TabDef): Promise<any> {
  const existing = (window as any)[tab.globalName];
  if (existing) {
    return Promise.resolve(existing);
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = tab.scriptUrl;
    script.onload = () => {
      const app = (window as any)[tab.globalName];
      if (app) {
        resolve(app);
      } else {
        reject(new Error(`Loaded ${tab.scriptUrl} but window['${tab.globalName}'] was not set`));
      }
    };
    script.onerror = () => reject(new Error(`Failed to load ${tab.scriptUrl}`));
    document.head.appendChild(script);
  });
}

if (!tabs.some(tab => tab.hash === location.hash)) {
  location.hash = tabs[0].hash;
}

for (const tab of tabs) {
  registerApplication({
    name: tab.name,
    app: () => loadUmdApp(tab),
    activeWhen: () => location.hash === tab.hash,
  });
}

start();

function renderTabs(): void {
  const container = document.getElementById('app-tabs')!;
  container.innerHTML = '';
  for (const tab of tabs) {
    const button = document.createElement('button');
    button.textContent = tab.label;
    button.className = 'app-tab' + (location.hash === tab.hash ? ' app-tab-active' : '');
    button.addEventListener('click', () => {
      location.hash = tab.hash;
    });
    container.appendChild(button);
  }
}

window.addEventListener('hashchange', renderTabs);
renderTabs();
