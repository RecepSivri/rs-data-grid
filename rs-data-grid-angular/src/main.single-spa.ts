import { enableProdMode } from '@angular/core';
import { bootstrapApplication, platformBrowser } from '@angular/platform-browser';

import { singleSpaAngular, getSingleSpaExtraProviders } from 'single-spa-angular';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { environment } from './environments/environment';
import { singleSpaPropsSubject } from './single-spa/single-spa-props';

if (environment.production) {
  enableProdMode();
}

const lifecycles = singleSpaAngular({
  bootstrapFunction: singleSpaProps => {
    singleSpaPropsSubject.next(singleSpaProps);
    const platformRef = platformBrowser(getSingleSpaExtraProviders());
    return bootstrapApplication(AppComponent, appConfig, { platformRef });
  },
  template: '<app-root />',
  NgZone: 'noop',
  domElementGetter: () => document.getElementById('single-spa-application')!,
  // Called while this app stays mounted and the root-config's customProps
  // change (e.g. a sidebar setting was toggled while this tab is active).
  updateFunction: singleSpaProps => {
    singleSpaPropsSubject.next(singleSpaProps);
    return Promise.resolve();
  },
});

export const bootstrap = lifecycles.bootstrap;
// bootstrapFunction only runs once; re-push props on every mount too, since
// switching tabs away and back unmounts/remounts without re-bootstrapping.
export const mount = (props: unknown) => {
  singleSpaPropsSubject.next(props as never);
  return (lifecycles.mount as (props: unknown) => Promise<unknown>)(props);
};
export const unmount = lifecycles.unmount;
export const update = lifecycles.update;

// When this bundle is served directly (`ng serve`, not loaded through the
// single-spa root-config), nothing ever calls bootstrap/mount, so the page
// stays blank. single-spa sets `window.singleSpaNavigate` once it's managing
// the page — if that's absent, self-mount for standalone local development.
if (!(window as any).singleSpaNavigate) {
  const runBootstrap = bootstrap as (props: unknown) => Promise<unknown>;
  const runMount = mount as (props: unknown) => Promise<unknown>;
  runBootstrap({}).then(() => runMount({}));
}
