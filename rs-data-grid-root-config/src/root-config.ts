import { mountRootParcel } from 'single-spa';
import { getCustomProps, setUpdateHook } from './grid-settings';
import { renderSidebar } from './sidebar';

interface TabDef {
  name: string;
  label: string;
  hash: string;
  globalName: string;
  scriptUrl: string;
  icon: string;
}

// Small, self-drawn brand-ish marks (not pixel-perfect trademarked logos,
// just clean recognizable shapes) so the tab bar doesn't need an icon font
// or external asset -- each is a plain inline SVG string.
const ICONS = {
  react: `<svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="2.2" fill="#61DAFB"/><g fill="none" stroke="#61DAFB" stroke-width="1.4"><ellipse cx="12" cy="12" rx="10" ry="4.2"/><ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(120 12 12)"/></g></svg>`,
  angular: `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 2 L21 5.5 L19.5 17 L12 22 L4.5 17 L3 5.5 Z" fill="#DD0031"/><path d="M12 5 L17.5 16.5 H15.2 L14.1 14 H9.8 L8.7 16.5 H6.5 Z M12 8.2 L10.4 12.2 H13.6 Z" fill="#ffffff"/></svg>`,
  vue: `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M2 3 H6.5 L12 12.5 L17.5 3 H22 L12 21 Z" fill="#41B883"/><path d="M6.5 3 H10 L12 6.5 L14 3 H17.5 L12 12.5 Z" fill="#35495E"/></svg>`,
  vanilla: `<svg viewBox="0 0 24 24" width="16" height="16"><rect x="1" y="1" width="22" height="22" rx="3" fill="#F0DB4F"/><text x="12" y="17" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#323330" text-anchor="middle">JS</text></svg>`,
  jquery: `<svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="11" fill="#0868AC"/><text x="12" y="16" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#ffffff" text-anchor="middle">jQ</text></svg>`,
};

const tabs: TabDef[] = [
  {
    name: '@rs-data-grid/react',
    label: 'React',
    hash: '#/react',
    globalName: 'rs-data-grid-react',
    scriptUrl: 'http://localhost:3000/rs-data-grid-react.js',
    icon: ICONS.react,
  },
  {
    name: '@rs-data-grid/angular',
    label: 'Angular',
    hash: '#/angular',
    globalName: 'rsivri-data-grid',
    scriptUrl: 'http://localhost:4200/main.js',
    icon: ICONS.angular,
  },
  {
    name: '@rs-data-grid/vue',
    label: 'Vue',
    hash: '#/vue',
    globalName: 'rs-data-grid-vue',
    scriptUrl: 'http://localhost:5173/rs-data-grid-vue.js',
    icon: ICONS.vue,
  },
  {
    name: '@rs-data-grid/vanilla',
    label: 'Vanilla JS',
    hash: '#/vanilla',
    globalName: 'rs-data-grid-vanilla',
    scriptUrl: 'http://localhost:3001/rs-data-grid-vanilla.js',
    icon: ICONS.vanilla,
  },
  {
    name: '@rs-data-grid/jquery',
    label: 'jQuery',
    hash: '#/jquery',
    globalName: 'rs-data-grid-jquery',
    scriptUrl: 'http://localhost:3002/rs-data-grid-jquery.js',
    icon: ICONS.jquery,
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

export function getActiveTabLabel(): string {
  return currentTab().label;
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
    button.className = 'app-tab' + (location.hash === tab.hash ? ' app-tab-active' : '');
    button.addEventListener('click', () => {
      location.hash = tab.hash;
    });

    const icon = document.createElement('span');
    icon.className = 'app-tab-icon';
    icon.innerHTML = tab.icon;
    icon.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.textContent = tab.label;

    button.append(icon, label);
    container.appendChild(button);
  }
}

window.addEventListener('hashchange', renderTabs);
renderTabs();
