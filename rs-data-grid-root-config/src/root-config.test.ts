import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// root-config.ts calls single-spa's mountRootParcel at import time (to mount
// the initially-active tab) and again on every hashchange. We fully mock it
// so tests control exactly what a "mount" looks like (a MountedTab-shaped
// object) instead of depending on single-spa's real parcel machinery.
//
// sidebar.ts is mocked out too: it's covered independently in
// sidebar.test.ts, and root-config.ts <-> sidebar.ts is a real circular
// import in the app (sidebar imports getActiveTabLabel back from here) that
// we don't need exercised for these tests.
const { mountRootParcelMock, renderSidebarMock } = vi.hoisted(() => ({
  mountRootParcelMock: vi.fn(),
  renderSidebarMock: vi.fn(),
}));

vi.mock('single-spa', () => ({ mountRootParcel: mountRootParcelMock }));
vi.mock('./sidebar', () => ({ renderSidebar: renderSidebarMock }));

// Mirrors the `tabs` array in root-config.ts (not exported, so re-declared
// here for assertions). `iconMarker` is a color code unique to each tab's
// inline SVG, used to confirm the right icon markup landed in the right
// button without depending on exact serialization of the SVG string.
const TAB_DEFS = [
  {
    label: 'React',
    hash: '#/react',
    globalName: 'rs-data-grid-react',
    scriptUrl: 'http://localhost:3000/rs-data-grid-react.js',
    iconMarker: '#61DAFB',
  },
  {
    label: 'Angular',
    hash: '#/angular',
    globalName: 'rsivri-data-grid',
    scriptUrl: 'http://localhost:4200/main.js',
    iconMarker: '#DD0031',
  },
  {
    label: 'Vue',
    hash: '#/vue',
    globalName: 'rs-data-grid-vue',
    scriptUrl: 'http://localhost:5173/rs-data-grid-vue.js',
    iconMarker: '#41B883',
  },
  {
    label: 'Vanilla JS',
    hash: '#/vanilla',
    globalName: 'rs-data-grid-vanilla',
    scriptUrl: 'http://localhost:3001/rs-data-grid-vanilla.js',
    iconMarker: '#F0DB4F',
  },
  {
    label: 'jQuery',
    hash: '#/jquery',
    globalName: 'rs-data-grid-jquery',
    scriptUrl: 'http://localhost:3002/rs-data-grid-jquery.js',
    iconMarker: '#0868AC',
  },
];

let rootConfigMod: typeof import('./root-config');

// A deliberately-rejected promise used as a mock return value: attaching a
// throwaway .catch immediately marks it "handled" so Node doesn't report an
// unhandledRejection in the window between creating it here and the code
// under test attaching its own (possibly much later, across a flush()).
function rejectedPromise<T = unknown>(err: unknown): Promise<T> {
  const p = Promise.reject(err) as Promise<T>;
  p.catch(() => {});
  return p;
}

function makeParcel(overrides: Partial<{ mountPromise: Promise<unknown>; unmount: () => Promise<unknown>; update: (props: unknown) => Promise<unknown> }> = {}) {
  return {
    mountPromise: Promise.resolve(),
    unmount: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function setHash(hash: string): void {
  window.history.pushState(null, '', hash);
}

function fireHashChange(): void {
  window.dispatchEvent(new Event('hashchange'));
}

// Drains the microtask queue. Everything switchToActiveTab awaits internally
// (Promise.resolve()/mockResolvedValue chains) is microtask-based, so a
// single macrotask flush is enough regardless of how many .then/await hops
// are chained, as long as nothing under test schedules its own macrotask.
function flush(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

async function importRootConfig(hash: string): Promise<typeof import('./root-config')> {
  setHash(hash);
  document.body.innerHTML = `
    <div id="app-tabs"></div>
    <div id="app-sidebar"></div>
    <div id="view-mode-tabs"></div>
    <div id="single-spa-application"></div>
    <div id="code-viewer"></div>
  `;
  rootConfigMod = await import('./root-config');
  return rootConfigMod;
}

// root-config.ts registers `window.addEventListener('hashchange', ...)` at
// module scope with no teardown hook. jsdom's `window` persists for the
// whole test file (only the module registry is reset between tests), so
// without this bookkeeping every fresh `import('./root-config')` would pile
// another pair of listeners onto the same window, and any subsequent
// hashchange (including the one jsdom fires for the module's own
// self-correcting `location.hash = tabs[0].hash` assignment) would wake up
// every prior test's still-attached, now-"zombie" listeners too.
let addedListeners: Array<[string, EventListenerOrEventListenerObject]>;
let originalAddEventListener: typeof window.addEventListener;

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = '';
  for (const tab of TAB_DEFS) {
    delete (window as any)[tab.globalName];
  }
  // restoreMocks:true (vitest.config.ts) does not reliably clear call
  // history for vi.fn()s created via vi.hoisted() at module scope, so clear
  // and re-establish sane defaults for both mocks explicitly here.
  mountRootParcelMock.mockReset().mockImplementation(() => makeParcel());
  renderSidebarMock.mockReset().mockImplementation(() => {});

  addedListeners = [];
  originalAddEventListener = window.addEventListener.bind(window);
  window.addEventListener = ((type: string, listener: any, options?: any) => {
    addedListeners.push([type, listener]);
    originalAddEventListener(type, listener, options);
  }) as typeof window.addEventListener;
});

afterEach(() => {
  window.addEventListener = originalAddEventListener;
  for (const [type, listener] of addedListeners) {
    window.removeEventListener(type, listener);
  }
  vi.restoreAllMocks();
});

describe('currentTab / getActiveTabLabel', () => {
  it('resolves the active tab from a matching location.hash', async () => {
    await importRootConfig(TAB_DEFS[2].hash);
    await flush();
    expect(rootConfigMod.getActiveTabLabel()).toBe('Vue');
  });

  it('defaults location.hash to the first tab when the initial hash matches no tab', async () => {
    await importRootConfig('#/does-not-exist');
    await flush();
    expect(window.location.hash).toBe(TAB_DEFS[0].hash);
    expect(rootConfigMod.getActiveTabLabel()).toBe(TAB_DEFS[0].label);
  });

  it('does not touch location.hash when it already matches a tab', async () => {
    await importRootConfig(TAB_DEFS[3].hash);
    await flush();
    expect(window.location.hash).toBe(TAB_DEFS[3].hash);
  });

  it('falls back to the first tab if the hash is changed to something unmatched after load', async () => {
    await importRootConfig(TAB_DEFS[1].hash);
    await flush();
    setHash('#/nonexistent-tab');
    expect(rootConfigMod.getActiveTabLabel()).toBe(TAB_DEFS[0].label);
  });
});

describe('switchToActiveTab - initial mount', () => {
  it('mounts the active tab as a root parcel with the DOM element and current custom props', async () => {
    const gridSettingsMod = await import('./grid-settings');
    await importRootConfig(TAB_DEFS[1].hash);
    await flush();

    expect(mountRootParcelMock).toHaveBeenCalledTimes(1);
    const [loader, props] = mountRootParcelMock.mock.calls[0];
    expect(typeof loader).toBe('function');
    expect(props.domElement).toBe(document.getElementById('single-spa-application'));
    const { domElement, ...customProps } = props;
    expect(customProps).toEqual(gridSettingsMod.getCustomProps());
  });

  it('calls renderSidebar with the #app-sidebar element', async () => {
    await importRootConfig(TAB_DEFS[0].hash);
    await flush();
    expect(renderSidebarMock).toHaveBeenCalledWith(document.getElementById('app-sidebar'));
  });
});

describe('switchToActiveTab - hashchange guard and tab switching', () => {
  it('does not re-mount when hashchange fires with the hash unchanged', async () => {
    await importRootConfig(TAB_DEFS[1].hash);
    await flush();
    expect(mountRootParcelMock).toHaveBeenCalledTimes(1);

    fireHashChange();
    await flush();

    expect(mountRootParcelMock).toHaveBeenCalledTimes(1);
  });

  it('unmounts the outgoing parcel before mounting the new one on a real tab switch', async () => {
    const order: string[] = [];
    mountRootParcelMock
      .mockImplementationOnce(() => {
        order.push('mount1');
        return makeParcel({
          unmount: vi.fn(() => {
            order.push('unmount1');
            return Promise.resolve();
          }),
        });
      })
      .mockImplementationOnce(() => {
        order.push('mount2');
        return makeParcel();
      });

    await importRootConfig(TAB_DEFS[0].hash);
    await flush();
    expect(mountRootParcelMock).toHaveBeenCalledTimes(1);

    setHash(TAB_DEFS[1].hash);
    fireHashChange();
    await flush();

    expect(mountRootParcelMock).toHaveBeenCalledTimes(2);
    expect(order).toEqual(['mount1', 'unmount1', 'mount2']);
  });

  it('coalesces hashchanges dispatched before the switchChain has run: both queued turns read the live (final) hash', async () => {
    // currentTab() is evaluated lazily inside each switchChain turn, not at
    // dispatch time. Firing both hashchange events synchronously (before
    // either queued turn executes as a microtask) means both turns observe
    // the same final location.hash: the first turn does the real switch,
    // and the second hits the same-hash guard and no-ops.
    await importRootConfig(TAB_DEFS[0].hash);
    await flush();

    setHash(TAB_DEFS[1].hash);
    fireHashChange();
    setHash(TAB_DEFS[2].hash);
    fireHashChange();
    await flush();

    expect(mountRootParcelMock).toHaveBeenCalledTimes(2);
    expect(rootConfigMod.getActiveTabLabel()).toBe('Vue');
  });

  it('performs a real second switch when the hashchange is dispatched after the first switch settles', async () => {
    await importRootConfig(TAB_DEFS[0].hash);
    await flush();

    setHash(TAB_DEFS[1].hash);
    fireHashChange();
    await flush();
    expect(mountRootParcelMock).toHaveBeenCalledTimes(2);

    setHash(TAB_DEFS[2].hash);
    fireHashChange();
    await flush();

    expect(mountRootParcelMock).toHaveBeenCalledTimes(3);
    expect(rootConfigMod.getActiveTabLabel()).toBe('Vue');
  });
});

describe('switchToActiveTab - error handling', () => {
  it("swallows a rejection from the outgoing parcel's mountPromise and still unmounts it", async () => {
    const unmountFn = vi.fn().mockResolvedValue(undefined);
    mountRootParcelMock.mockImplementationOnce(() =>
      makeParcel({ mountPromise: rejectedPromise(new Error('never mounted')), unmount: unmountFn })
    );

    await importRootConfig(TAB_DEFS[0].hash);
    await flush();

    setHash(TAB_DEFS[1].hash);
    fireHashChange();
    await flush();

    expect(unmountFn).toHaveBeenCalledTimes(1);
  });

  it('logs via console.error when the outgoing parcel fails to unmount, without throwing', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const unmountError = new Error('boom');
    mountRootParcelMock.mockImplementationOnce(() =>
      makeParcel({ unmount: vi.fn().mockImplementation(() => rejectedPromise(unmountError)) })
    );

    await importRootConfig(TAB_DEFS[0].hash);
    await flush();

    expect(() => {
      setHash(TAB_DEFS[1].hash);
      fireHashChange();
    }).not.toThrow();
    await flush();

    expect(errorSpy).toHaveBeenCalledWith('Failed to unmount previous tab', unmountError);
  });

  it('logs via console.error when the new parcel fails to mount, without throwing', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mountError = new Error('mount failed');
    mountRootParcelMock.mockImplementationOnce(() => makeParcel({ mountPromise: rejectedPromise(mountError) }));

    await importRootConfig(TAB_DEFS[0].hash);
    await flush();

    expect(errorSpy).toHaveBeenCalledWith(`Failed to mount ${TAB_DEFS[0].label}`, mountError);
  });

  it('leaves activeParcel null while an outgoing unmount is still in flight, without the update hook throwing', async () => {
    const gridSettingsMod = await import('./grid-settings');
    let resolveOutgoingUnmount!: () => void;
    mountRootParcelMock.mockImplementationOnce(() =>
      makeParcel({
        unmount: vi.fn(
          () =>
            new Promise<void>(resolve => {
              resolveOutgoingUnmount = resolve;
            })
        ),
      })
    );

    await importRootConfig(TAB_DEFS[0].hash);
    await flush();
    expect(mountRootParcelMock).toHaveBeenCalledTimes(1);

    mountRootParcelMock.mockImplementationOnce(() => makeParcel());
    setHash(TAB_DEFS[1].hash);
    fireHashChange();
    await flush(); // chain is now suspended awaiting the pending outgoing.unmount()

    // A settings change firing right now exercises `activeParcel?.update?.(...)`
    // with activeParcel === null (it was cleared synchronously before the
    // outgoing unmount await). Must not throw.
    expect(() => gridSettingsMod.setSetting('showFilter', false)).not.toThrow();

    resolveOutgoingUnmount();
    await flush();
    expect(mountRootParcelMock).toHaveBeenCalledTimes(2);
  });
});

describe('setUpdateHook callback - pushing live settings to the active parcel', () => {
  it("calls activeParcel.update with fresh getCustomProps() output on a settings change", async () => {
    const updateFn = vi.fn().mockResolvedValue(undefined);
    mountRootParcelMock.mockImplementationOnce(() => makeParcel({ update: updateFn }));

    const gridSettingsMod = await import('./grid-settings');
    await importRootConfig(TAB_DEFS[0].hash);
    await flush();

    gridSettingsMod.setSetting('showFilter', false);

    expect(updateFn).toHaveBeenCalledTimes(1);
    expect(updateFn).toHaveBeenCalledWith(gridSettingsMod.getCustomProps());
  });

  it('does not throw when the active parcel has no update method', async () => {
    mountRootParcelMock.mockImplementationOnce(() => {
      const parcel = makeParcel();
      delete (parcel as any).update;
      return parcel;
    });

    const gridSettingsMod = await import('./grid-settings');
    await importRootConfig(TAB_DEFS[0].hash);
    await flush();

    expect(() => gridSettingsMod.setSetting('showFilter', false)).not.toThrow();
  });

  it('logs via console.error when pushing a settings update to the active parcel fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const updateError = new Error('update failed');
    const updateFn = vi.fn().mockImplementation(() => rejectedPromise(updateError));
    mountRootParcelMock.mockImplementationOnce(() => makeParcel({ update: updateFn }));

    const gridSettingsMod = await import('./grid-settings');
    await importRootConfig(TAB_DEFS[0].hash);
    await flush();

    gridSettingsMod.setSetting('showFilter', false);
    await flush();

    expect(errorSpy).toHaveBeenCalledWith('Failed to push settings update', updateError);
  });
});

describe('loadUmdApp (via the loader function captured from mountRootParcel)', () => {
  it('resolves with the existing global and skips injecting a script if already present', async () => {
    await importRootConfig(TAB_DEFS[0].hash);
    await flush();
    const loader = mountRootParcelMock.mock.calls[0][0] as () => Promise<unknown>;

    const fakeApp = { bootstrap: vi.fn(), mount: vi.fn(), unmount: vi.fn() };
    (window as any)[TAB_DEFS[0].globalName] = fakeApp;
    const appendChildSpy = vi.spyOn(document.head, 'appendChild');

    const result = await loader();

    expect(result).toBe(fakeApp);
    expect(appendChildSpy).not.toHaveBeenCalled();
  });

  it('injects a script tag pointed at scriptUrl when no global is present yet', async () => {
    await importRootConfig(TAB_DEFS[0].hash);
    await flush();
    const loader = mountRootParcelMock.mock.calls[0][0] as () => Promise<unknown>;
    const appendChildSpy = vi.spyOn(document.head, 'appendChild');

    loader().catch(() => {});
    const script = appendChildSpy.mock.calls[0][0] as HTMLScriptElement;

    expect(script.tagName).toBe('SCRIPT');
    expect(script.src).toBe(TAB_DEFS[0].scriptUrl);
  });

  it('resolves with the global once the script onload fires and the global is set', async () => {
    await importRootConfig(TAB_DEFS[0].hash);
    await flush();
    const loader = mountRootParcelMock.mock.calls[0][0] as () => Promise<unknown>;
    const appendChildSpy = vi.spyOn(document.head, 'appendChild');

    const promise = loader();
    const script = appendChildSpy.mock.calls[0][0] as HTMLScriptElement;
    const fakeApp = {};
    (window as any)[TAB_DEFS[0].globalName] = fakeApp;
    script.onload?.(new Event('load'));

    await expect(promise).resolves.toBe(fakeApp);
  });

  it('rejects with a clear error when onload fires but the global was never set', async () => {
    await importRootConfig(TAB_DEFS[0].hash);
    await flush();
    const loader = mountRootParcelMock.mock.calls[0][0] as () => Promise<unknown>;
    const appendChildSpy = vi.spyOn(document.head, 'appendChild');

    const promise = loader();
    const script = appendChildSpy.mock.calls[0][0] as HTMLScriptElement;
    script.onload?.(new Event('load'));

    await expect(promise).rejects.toThrow(
      `Loaded ${TAB_DEFS[0].scriptUrl} but window['${TAB_DEFS[0].globalName}'] was not set`
    );
  });

  it('rejects with a clear error on script onerror', async () => {
    await importRootConfig(TAB_DEFS[0].hash);
    await flush();
    const loader = mountRootParcelMock.mock.calls[0][0] as () => Promise<unknown>;
    const appendChildSpy = vi.spyOn(document.head, 'appendChild');

    const promise = loader();
    const script = appendChildSpy.mock.calls[0][0] as HTMLScriptElement;
    script.onerror?.(new Event('error'));

    await expect(promise).rejects.toThrow(`Failed to load ${TAB_DEFS[0].scriptUrl}`);
  });
});

describe('renderTabs', () => {
  it('renders one button per tab in array order, each with icon markup, a label, and the active class on the current tab', async () => {
    await importRootConfig(TAB_DEFS[2].hash); // Vue active
    await flush();

    const container = document.getElementById('app-tabs')!;
    const buttons = Array.from(container.querySelectorAll('button.app-tab'));
    expect(buttons).toHaveLength(TAB_DEFS.length);

    buttons.forEach((btn, i) => {
      const def = TAB_DEFS[i];
      const expectedActive = def.hash === TAB_DEFS[2].hash;
      const brandSlug = def.hash.slice(2);
      expect(btn.className).toBe(`app-tab app-tab-${brandSlug}` + (expectedActive ? ' app-tab-active' : ''));

      const iconSpan = btn.querySelector('.app-tab-icon')!;
      expect(iconSpan.innerHTML).toContain('<svg');
      expect(iconSpan.innerHTML).toContain(def.iconMarker);
      expect(iconSpan.getAttribute('aria-hidden')).toBe('true');

      const labelSpan = Array.from(btn.querySelectorAll('span')).find(s => s !== iconSpan)!;
      expect(labelSpan.textContent).toBe(def.label);
    });
  });

  it('rebuilds #app-tabs (fresh nodes, no duplicates) and moves the active class on hashchange', async () => {
    await importRootConfig(TAB_DEFS[0].hash);
    await flush();
    const container = document.getElementById('app-tabs')!;
    const before = container.querySelector('button');

    setHash(TAB_DEFS[3].hash);
    fireHashChange();
    await flush();

    const buttons = Array.from(container.querySelectorAll('button.app-tab'));
    expect(buttons).toHaveLength(TAB_DEFS.length);
    expect(buttons[0]).not.toBe(before);
    expect(buttons[3].className).toContain('app-tab-active');
    expect(buttons[0].className).not.toContain('app-tab-active');
  });

  it("clicking a tab button navigates to that tab's hash", async () => {
    await importRootConfig(TAB_DEFS[0].hash);
    await flush();
    const container = document.getElementById('app-tabs')!;
    const vueButton = container.querySelectorAll('button.app-tab')[2] as HTMLButtonElement;

    vueButton.click();

    expect(window.location.hash).toBe(TAB_DEFS[2].hash);
    await flush();
  });
});
