// "Code" view for the Demo/Code tab strip above the mounted grid. Shows how
// a consumer would install and use this framework's grid package -- import
// + the component tag with today's actual parameter values, nothing about
// rs-grid's own internals. Regenerated on every sidebar change so the
// snippet always matches what's on screen in the Demo tab.
import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import javascript from 'highlight.js/lib/languages/javascript';
import xml from 'highlight.js/lib/languages/xml';
import 'highlight.js/styles/atom-one-dark.css';
import { gridConfig } from './grid-settings';

hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('xml', xml);

type Entry = [propName: string, value: unknown];

// Sidebar gridConfig key -> the grid component's actual prop/input name,
// wherever it differs (only apiMethod/apiHeaders are renamed at the App
// entry-point layer today -- see each app's own toGridProps()/prop bindings).
const PROP_NAME: Record<string, string> = {
  apiMethod: 'fetchMethod',
  apiHeaders: 'fetchHeaders',
};

// Order mirrors each App entry point's own prop list. Internal demo-only
// plumbing (dataSource, apiHeadersRaw, remoteModeParams) is left out
// entirely, and otherwise-empty/inactive optional fields (authToken,
// entrySection, fetchHeaders, remoteMode when off) are skipped -- a "how do
// I use this" snippet shouldn't show empty or inactive props.
const PROP_ORDER = [
  'theme', 'fetchUrl', 'apiMethod', 'apiHeaders', 'authToken', 'entrySection', 'remoteMode',
  'headerRowLines', 'headerColumnLines', 'bodyRowLines', 'bodyColumnLines',
  'tableBorder', 'borderRadiusTop', 'borderRadiusBottom', 'diagonalRow',
  'dragDropColumns', 'dragDropRows',
  'pagination', 'pagingSizes', 'currentPagingSize', 'pageListSize',
  'showFilter', 'showSort', 'showSearch', 'showActions', 'showAdd', 'showGridSettings', 'showIndex',
  'exportExcel', 'exportPDF',
  'gridMode',
];

function relevantEntries(config: Record<string, any>): Entry[] {
  const entries: Entry[] = [];
  for (const key of PROP_ORDER) {
    const value = config[key];
    if ((key === 'authToken' || key === 'entrySection') && !value) continue;
    if (key === 'apiHeaders' && (!value || Object.keys(value).length === 0)) continue;
    if (key === 'remoteMode' && !value) continue;
    entries.push([PROP_NAME[key] ?? key, value]);
  }
  return entries;
}

// Renders any prop value as a JS literal (used inside `{...}`/`"..."`
// binding expressions) -- single-quoted strings, recursively formatted
// arrays/objects, booleans/numbers as-is.
function jsLiteral(value: unknown): string {
  if (typeof value === 'string') {
    return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  }
  if (Array.isArray(value)) {
    return `[${value.map(jsLiteral).join(', ')}]`;
  }
  if (value && typeof value === 'object') {
    const inner = Object.entries(value)
      .map(([k, v]) => `${jsLiteral(k)}: ${jsLiteral(v)}`)
      .join(', ');
    return `{ ${inner} }`;
  }
  return String(value);
}

// Only inserts a dash at a lower/digit -> upper boundary, so a run of
// capitals (e.g. the "PDF" in exportPDF) stays together as one word instead
// of splitting into "export-p-d-f".
function toKebabCase(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

// ---- per-framework snippet generators ----

function reactSnippet(entries: Entry[]): string {
  const props = entries
    .map(([name, value]) => (typeof value === 'string' ? `      ${name}="${value}"` : `      ${name}={${jsLiteral(value)}}`))
    .join('\n');
  return `// npm install rs-data-grid-react
import { RsDataGrid } from 'rs-data-grid-react';

export function App() {
  return (
    <RsDataGrid
${props}
    />
  );
}
`;
}

function vueSnippet(entries: Entry[]): string {
  const props = entries
    .map(([name, value]) => {
      // Vue resolves a kebab-case template attribute back to its declared
      // prop by inserting a dash before EVERY uppercase letter (so
      // `exportPDF` needs `export-p-d-f`, not the more readable
      // `export-pdf` toKebabCase() produces elsewhere). Rather than emit
      // that unreadable form, bind exportPDF by its original camelCase name
      // -- Vue matches camelCase attribute names to props directly, and
      // this mirrors the same workaround already used in App.vue.
      const attr = name === 'exportPDF' ? name : toKebabCase(name);
      return typeof value === 'string' ? `    ${attr}="${value}"` : `    :${attr}="${jsLiteral(value)}"`;
    })
    .join('\n');
  return `<script setup lang="ts">
// npm install rs-data-grid-vue
import { RsDataGrid } from 'rs-data-grid-vue';
</script>

<template>
  <RsDataGrid
${props}
  />
</template>
`;
}

function angularSnippet(entries: Entry[]): string {
  const props = entries.map(([name, value]) => `      [${name}]="${jsLiteral(value)}"`).join('\n');
  return `// npm install rs-grid-angular
import { Component } from '@angular/core';
import { RsivriGridComponent } from 'rs-grid-angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RsivriGridComponent],
  template: \`
    <rs-grid-angular
${props}
    ></rs-grid-angular>
  \`,
})
export class AppComponent {}
`;
}

function vanillaSnippet(entries: Entry[]): string {
  const props = entries.map(([name, value]) => `  ${name}: ${jsLiteral(value)},`).join('\n');
  return `// npm install rs-data-grid-vanilla
import { createGrid } from 'rs-data-grid-vanilla';

const grid = createGrid();
grid.render(document.getElementById('app'), {
${props}
});
`;
}

function jquerySnippet(entries: Entry[]): string {
  const props = entries.map(([name, value]) => `  ${name}: ${jsLiteral(value)},`).join('\n');
  return `// npm install rs-data-grid-jquery
import { createGrid } from 'rs-data-grid-jquery';

const grid = createGrid();
grid.render(document.getElementById('app'), {
${props}
});
`;
}

const GENERATORS: Record<string, { language: string; generate: (entries: Entry[]) => string }> = {
  '#/react': { language: 'typescript', generate: reactSnippet },
  '#/angular': { language: 'typescript', generate: angularSnippet },
  '#/vue': { language: 'xml', generate: vueSnippet },
  '#/vanilla': { language: 'javascript', generate: vanillaSnippet },
  '#/jquery': { language: 'javascript', generate: jquerySnippet },
};

const COPY_ICON = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const CHECK_ICON = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

function buildCopyButton(code: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'code-copy-button';
  button.title = 'Copy code';
  button.setAttribute('aria-label', 'Copy code');
  button.innerHTML = COPY_ICON + '<span>Copy</span>';

  let resetTimer: ReturnType<typeof setTimeout> | null = null;
  button.addEventListener('click', () => {
    navigator.clipboard.writeText(code).then(() => {
      button.innerHTML = CHECK_ICON + '<span>Copied</span>';
      button.classList.add('code-copy-button-done');
      if (resetTimer) {
        clearTimeout(resetTimer);
      }
      resetTimer = setTimeout(() => {
        button.innerHTML = COPY_ICON + '<span>Copy</span>';
        button.classList.remove('code-copy-button-done');
      }, 1500);
    });
  });
  return button;
}

export function renderCodeViewer(container: HTMLElement, tabHash: string): void {
  const generator = GENERATORS[tabHash];
  container.innerHTML = '';
  if (!generator) {
    return;
  }

  const code = generator.generate(relevantEntries(gridConfig));

  const wrapper = document.createElement('div');
  wrapper.className = 'code-viewer-inner';
  wrapper.appendChild(buildCopyButton(code));
  const pre = document.createElement('pre');
  pre.className = 'code-block';
  const codeEl = document.createElement('code');
  codeEl.className = 'hljs language-' + generator.language;
  codeEl.innerHTML = hljs.highlight(code, { language: generator.language }).value;
  pre.appendChild(codeEl);
  wrapper.appendChild(pre);
  container.appendChild(wrapper);
}
