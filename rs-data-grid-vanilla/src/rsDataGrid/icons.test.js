import { describe, expect, it } from 'vitest';
import * as icons from './icons';

describe('icons', () => {
  it('exports a non-empty SVG markup string for every icon', () => {
    const names = Object.keys(icons);
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(icons[name]).toContain('<svg');
      expect(icons[name]).toContain('</svg>');
    }
  });
});
