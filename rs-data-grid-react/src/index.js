import React from 'react';
import ReactDOMClient from 'react-dom/client';
import singleSpaReact from 'single-spa-react';
import App from './App';

const lifecycles = singleSpaReact({
  React,
  ReactDOMClient,
  rootComponent: App,
  domElementGetter: () => document.getElementById('single-spa-application'),
  errorBoundary(err, info, props) {
    return React.createElement('div', null, 'React Micro Frontend Error');
  },
});

export const { bootstrap, mount, unmount } = lifecycles;
