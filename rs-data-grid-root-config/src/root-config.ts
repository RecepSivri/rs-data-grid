import { mountRootParcel } from 'single-spa';
import { getCustomProps, setUpdateHook } from './grid-settings';
import { renderSidebar } from './sidebar';

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
// (window[globalName] = { bootstrap, mount, unmount, update }). Loading it with
// a plain <script> tag and reading that global sidesteps SystemJS's UMD
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

// single-spa's `registerApplication`/`triggerAppChange` combo never calls a
// mounted (and still-active) top-level application's `update` lifecycle --
// that hook only exists on the Parcels API. Since the sidebar needs to push
// live settings changes into whichever framework tab is currently mounted
// (without a route/hash change), each tab is mounted as a root parcel here
// instead, and the sidebar's "notifyChange" calls `.update()` on it directly.
interface MountedTab {
  mountPromise: Promise<unknown>;
  unmount: () => Promise<unknown>;
  update?: (props: unknown) => Promise<unknown>;
}

let activeParcel: MountedTab | null = null;
let activeHash: string | null = null;
let switchChain: Promise<void> = Promise.resolve();

function currentTab(): TabDef {
  return tabs.find(tab => tab.hash === location.hash) ?? tabs[0];
}

function switchToActiveTab(): void {
  switchChain = switchChain.then(async () => {
    const tab = currentTab();
    if (activeHash === tab.hash) {
      return;
    }
    activeHash = tab.hash;

    const outgoing = activeParcel;
    activeParcel = null;
    if (outgoing) {
      await outgoing.mountPromise.catch(() => {});
      await outgoing.unmount().catch(err => console.error(`Failed to unmount previous tab`, err));
    }

    const domElement = document.getElementById('single-spa-application')!;
    const parcel = mountRootParcel(() => loadUmdApp(tab), { domElement, ...getCustomProps() }) as MountedTab;
    activeParcel = parcel;
    await parcel.mountPromise.catch(err => console.error(`Failed to mount ${tab.label}`, err));
  });
}

setUpdateHook(() => {
  activeParcel?.update?.(getCustomProps())?.catch(err => console.error('Failed to push settings update', err));
});

if (!tabs.some(tab => tab.hash === location.hash)) {
  location.hash = tabs[0].hash;
}

window.addEventListener('hashchange', switchToActiveTab);
switchToActiveTab();

renderSidebar(document.getElementById('app-sidebar')!);

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
