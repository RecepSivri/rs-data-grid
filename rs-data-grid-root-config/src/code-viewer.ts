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
  return `// npm install @rs-data-grid/react
import { RsDataGrid } from '@rs-data-grid/react';

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
      const attr = toKebabCase(name);
      return typeof value === 'string' ? `    ${attr}="${value}"` : `    :${attr}="${jsLiteral(value)}"`;
    })
    .join('\n');
  return `<script setup lang="ts">
// npm install @rs-data-grid/vue
import { RsDataGrid } from '@rs-data-grid/vue';
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
  return `// npm install @rs-data-grid/angular
import { Component } from '@angular/core';
import { RsivriGridComponent } from '@rs-data-grid/angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RsivriGridComponent],
  template: \`
    <rsivri-grid
${props}
    ></rsivri-grid>
  \`,
})
export class AppComponent {}
`;
}

function vanillaSnippet(entries: Entry[]): string {
  const props = entries.map(([name, value]) => `  ${name}: ${jsLiteral(value)},`).join('\n');
  return `// npm install @rs-data-grid/vanilla
import { createGrid } from '@rs-data-grid/vanilla';

const grid = createGrid();
grid.render(document.getElementById('app'), {
${props}
});
`;
}

function jquerySnippet(entries: Entry[]): string {
  const props = entries.map(([name, value]) => `  ${name}: ${jsLiteral(value)},`).join('\n');
  return `// npm install @rs-data-grid/jquery
import { createGrid } from '@rs-data-grid/jquery';

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

export function renderCodeViewer(container: HTMLElement, tabHash: string): void {
  const generator = GENERATORS[tabHash];
  container.innerHTML = '';
  if (!generator) {
    return;
  }

  const code = generator.generate(relevantEntries(gridConfig));

  const wrapper = document.createElement('div');
  wrapper.className = 'code-viewer-inner';
  const pre = document.createElement('pre');
  pre.className = 'code-block';
  const codeEl = document.createElement('code');
  codeEl.className = 'hljs language-' + generator.language;
  codeEl.innerHTML = hljs.highlight(code, { language: generator.language }).value;
  pre.appendChild(codeEl);
  wrapper.appendChild(pre);
  container.appendChild(wrapper);
}
