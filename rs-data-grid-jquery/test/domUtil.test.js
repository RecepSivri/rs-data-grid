import { describe, it, expect, vi } from 'vitest';
import { el, clear, svgIcon } from '../src/rsDataGrid/domUtil.js';

describe('domUtil', () => {
  describe('el()', () => {
    it('creates a plain element with defaults', () => {
      const node = el('div');
      expect(node.tagName).toBe('DIV');
      expect(node.className).toBe('');
    });

    it('sets className', () => {
      const node = el('div', { className: 'foo bar' });
      expect(node.className).toBe('foo bar');
    });

    it('sets textContent via text', () => {
      const node = el('span', { text: 'hello' });
      expect(node.textContent).toBe('hello');
    });

    it('sets innerHTML via html', () => {
      const node = el('div', { html: '<b>bold</b>' });
      expect(node.innerHTML).toBe('<b>bold</b>');
    });

    it('sets attributes via attrs', () => {
      const node = el('input', { attrs: { type: 'text', 'data-field': 'name' } });
      expect(node.getAttribute('type')).toBe('text');
      expect(node.getAttribute('data-field')).toBe('name');
    });

    it('sets properties via props', () => {
      const node = el('input', { props: { value: 'abc' } });
      expect(node.value).toBe('abc');
    });

    it('wires event listeners via on', () => {
      const handler = vi.fn();
      const node = el('button', { on: { click: handler } });
      node.click();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('appends children, filtering falsy entries', () => {
      const child1 = el('span', { text: 'a' });
      const child2 = el('span', { text: 'b' });
      const node = el('div', { children: [child1, null, child2, undefined, false] });
      expect(node.children.length).toBe(2);
      expect(node.children[0]).toBe(child1);
      expect(node.children[1]).toBe(child2);
    });

    it('combines every option kind at once', () => {
      const handler = vi.fn();
      const child = el('span', { text: 'child' });
      const node = el('div', {
        className: 'combo',
        text: 'ignored-by-html', // html below should not be set since not provided; text should apply
        attrs: { id: 'combo-id' },
        props: { title: 'tt' },
        on: { click: handler },
        children: [child],
      });
      expect(node.className).toBe('combo');
      expect(node.getAttribute('id')).toBe('combo-id');
      expect(node.title).toBe('tt');
      expect(node.children[0]).toBe(child);
      node.click();
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('clear()', () => {
    it('empties a container with multiple children', () => {
      const node = el('div', { children: [el('span'), el('span'), el('span')] });
      expect(node.childNodes.length).toBe(3);
      clear(node);
      expect(node.childNodes.length).toBe(0);
    });

    it('is a no-op on an already-empty container', () => {
      const node = el('div');
      expect(() => clear(node)).not.toThrow();
      expect(node.childNodes.length).toBe(0);
    });
  });

  describe('svgIcon()', () => {
    it('parses raw svg markup into an element', () => {
      const svg = svgIcon('<svg viewBox="0 0 24 24"><path d="M1 2"/></svg>');
      expect(svg.tagName.toLowerCase()).toBe('svg');
      expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    });

    it('trims surrounding whitespace before parsing', () => {
      const svg = svgIcon('\n  <svg><circle r="1"/></svg>\n  ');
      expect(svg.tagName.toLowerCase()).toBe('svg');
    });
  });
});
