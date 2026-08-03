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
});

export const bootstrap = lifecycles.bootstrap;
export const mount = lifecycles.mount;
export const unmount = lifecycles.unmount;

// When this bundle is served directly (`ng serve`, not loaded through the
// single-spa root-config), nothing ever calls bootstrap/mount, so the page
// stays blank. single-spa sets `window.singleSpaNavigate` once it's managing
// the page — if that's absent, self-mount for standalone local development.
if (!(window as any).singleSpaNavigate) {
  const runBootstrap = bootstrap as (props: unknown) => Promise<unknown>;
  const runMount = mount as (props: unknown) => Promise<unknown>;
  runBootstrap({}).then(() => runMount({}));
}
