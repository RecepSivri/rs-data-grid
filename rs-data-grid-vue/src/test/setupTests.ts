// Global test setup for Vitest + jsdom.
// jsdom does not implement several browser APIs that Vuetify's overlay/dialog
// components rely on (ResizeObserver, matchMedia, IntersectionObserver, scrollTo).
// Without these, mounting <v-dialog>/<v-overlay> throws "not implemented" errors.

class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
// @ts-expect-error -- jsdom polyfill
globalThis.ResizeObserver = globalThis.ResizeObserver ?? ResizeObserverMock;

class IntersectionObserverMock {
  root = null;
  rootMargin = '';
  thresholds: number[] = [];
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
// @ts-expect-error -- jsdom polyfill
globalThis.IntersectionObserver = globalThis.IntersectionObserver ?? IntersectionObserverMock;

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

if (!window.scrollTo) {
  // @ts-expect-error -- jsdom polyfill
  window.scrollTo = () => {};
}

if (!window.visualViewport) {
  const target = new EventTarget();
  // @ts-expect-error -- jsdom polyfill (used by Vuetify's overlay location strategies)
  window.visualViewport = Object.assign(target, {
    width: window.innerWidth,
    height: window.innerHeight,
    offsetLeft: 0,
    offsetTop: 0,
    pageLeft: 0,
    pageTop: 0,
    scale: 1,
  });
}
