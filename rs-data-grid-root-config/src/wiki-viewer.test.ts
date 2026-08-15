import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWiki } from './wiki-viewer';
import { FRAMEWORK_WIKI_META, WIKI_SECTIONS } from './wiki-content';

function makeContainer(): HTMLElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return container;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('renderWiki - unsupported/unknown tab', () => {
  it('clears the container and renders nothing for a hash with no matching framework', () => {
    const container = makeContainer();
    container.innerHTML = '<span>stale</span>';
    renderWiki(container, '#/does-not-exist');
    expect(container.innerHTML).toBe('');
  });
});

describe('renderWiki - per-framework page', () => {
  const cases: [string, keyof typeof FRAMEWORK_WIKI_META][] = [
    ['#/react', 'react'],
    ['#/angular', 'angular'],
    ['#/vue', 'vue'],
    ['#/vanilla', 'vanilla'],
    ['#/jquery', 'jquery'],
  ];

  it.each(cases)('renders the title, install command, npm link, and peer note for %s', (hash, key) => {
    const meta = FRAMEWORK_WIKI_META[key];
    const container = makeContainer();
    renderWiki(container, hash);

    expect(container.querySelector('.wiki-title')?.textContent).toBe(`${meta.displayName} -- rs-data-grid`);
    expect(container.querySelector('.wiki-install')?.textContent).toBe(meta.install);
    const link = container.querySelector('.wiki-npm-link') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe(meta.npmUrl);
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
    expect(link.textContent).toBe(`npm: ${meta.npmPackage}`);
    expect(container.querySelector('.wiki-peer-note')?.textContent).toBe(meta.peerNote);
  });

  it('renders one section per WIKI_SECTIONS entry, with a prop-table row per prop', () => {
    const container = makeContainer();
    renderWiki(container, '#/react');
    const sections = container.querySelectorAll('.wiki-section');
    expect(sections.length).toBe(WIKI_SECTIONS.length);
    sections.forEach((sectionEl, i) => {
      expect(sectionEl.querySelector('.wiki-section-title')?.textContent).toBe(WIKI_SECTIONS[i].title);
      expect(sectionEl.querySelector('.wiki-section-intro')?.textContent).toBe(WIKI_SECTIONS[i].intro);
      const rows = sectionEl.querySelectorAll('tbody tr');
      expect(rows.length).toBe(WIKI_SECTIONS[i].props.length);
      const firstProp = WIKI_SECTIONS[i].props[0];
      const firstRow = rows[0];
      expect(firstRow.querySelector('.wiki-prop-syntax')?.textContent).toBe(`${firstProp.key}={...}`);
      expect(firstRow.querySelector('.wiki-prop-type')?.textContent).toBe(firstProp.type);
      expect(firstRow.children[2].textContent).toBe(firstProp.description);
    });
  });

  it('each section table header renders the three expected column labels', () => {
    const container = makeContainer();
    renderWiki(container, '#/react');
    const firstTableHeaderCells = Array.from(container.querySelector('.wiki-prop-table thead')!.querySelectorAll('th')).map(th => th.textContent);
    expect(firstTableHeaderCells).toEqual(['Prop', 'Type', 'Description']);
    expect(container.querySelectorAll('.wiki-prop-table').length).toBe(WIKI_SECTIONS.length);
  });

  it('re-rendering into the same container replaces the previous content rather than appending', () => {
    const container = makeContainer();
    renderWiki(container, '#/react');
    renderWiki(container, '#/vue');
    expect(container.querySelectorAll('.wiki-inner').length).toBe(1);
    expect(container.querySelector('.wiki-title')?.textContent).toContain('Vue');
  });
});

describe('renderWiki - omits the peer note when a framework has none', () => {
  it('does not render .wiki-peer-note', async () => {
    vi.resetModules();
    vi.doMock('./wiki-content', async () => {
      const actual = await vi.importActual<typeof import('./wiki-content')>('./wiki-content');
      return {
        ...actual,
        FRAMEWORK_WIKI_META: {
          ...actual.FRAMEWORK_WIKI_META,
          react: { ...actual.FRAMEWORK_WIKI_META.react, peerNote: undefined },
        },
      };
    });
    const { renderWiki: renderWikiWithMock } = await import('./wiki-viewer');
    const container = makeContainer();
    renderWikiWithMock(container, '#/react');
    expect(container.querySelector('.wiki-peer-note')).toBeNull();
  });
});
