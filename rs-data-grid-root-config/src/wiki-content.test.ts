import { describe, expect, it } from 'vitest';
import { FRAMEWORK_WIKI_META, WIKI_SECTIONS, propSyntax } from './wiki-content';

describe('WIKI_SECTIONS / FRAMEWORK_WIKI_META shape', () => {
  it('has one section per sidebar accordion group, each with a title/intro/props', () => {
    expect(WIKI_SECTIONS.map(s => s.title)).toEqual(['Data Management', 'Grid Mode', 'Appearance', 'Pagination', 'Toolbar Features']);
    for (const section of WIKI_SECTIONS) {
      expect(section.intro.length).toBeGreaterThan(0);
      expect(section.props.length).toBeGreaterThan(0);
    }
  });

  it('has metadata for all five frameworks', () => {
    expect(Object.keys(FRAMEWORK_WIKI_META).sort()).toEqual(['angular', 'jquery', 'react', 'vanilla', 'vue']);
  });
});

describe('propSyntax', () => {
  it('renders multi-name documentation labels (containing "/") as-is, for every framework', () => {
    const label = 'onRowAdd / onRowEdit / onRowDelete / onBatchSave';
    for (const framework of ['react', 'angular', 'vue', 'vanilla', 'jquery'] as const) {
      expect(propSyntax(framework, label)).toBe(label);
    }
  });

  it('react: renders {key}={...}', () => {
    expect(propSyntax('react', 'tableBorder')).toBe('tableBorder={...}');
  });

  it('angular: renders [key]="..." for a plain prop, and (event)="..." for an "on"-prefixed one', () => {
    expect(propSyntax('angular', 'tableBorder')).toBe('[tableBorder]="..."');
    expect(propSyntax('angular', 'onRowAdd')).toBe('(rowAdd)="..."');
  });

  it('vue: renders :kebab-case="..." for a plain prop, keeps exportPDF camelCase, and @event="..." for an "on"-prefixed one', () => {
    expect(propSyntax('vue', 'tableBorder')).toBe(':table-border="..."');
    expect(propSyntax('vue', 'exportPDF')).toBe(':exportPDF="..."');
    expect(propSyntax('vue', 'onRowAdd')).toBe('@row-add="..."');
  });

  it('vanilla and jquery: render key: ...', () => {
    expect(propSyntax('vanilla', 'tableBorder')).toBe('tableBorder: ...');
    expect(propSyntax('jquery', 'tableBorder')).toBe('tableBorder: ...');
  });
});
