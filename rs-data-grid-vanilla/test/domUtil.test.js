import { describe, it, expect, vi } from 'vitest';
import { el, clear, svgIcon } from '../src/rsDataGrid/domUtil.js';

describe('el', () => {
  it('creates an element of the given tag with no options', () => {
    const node = el('div');
    expect(node.tagName).toBe('DIV');
    expect(node.className).toBe('');
  });

  it('sets className when provided', () => {
    const node = el('div', { className: 'foo bar' });
    expect(node.className).toBe('foo bar');
  });

  it('sets textContent when text is provided', () => {
    const node = el('span', { text: 'hello' });
    expect(node.textContent).toBe('hello');
  });

  it('allows text to be an empty string (uses !== undefined check)', () => {
    const node = el('span', { text: '' });
    expect(node.textContent).toBe('');
  });

  it('sets innerHTML when html is provided', () => {
    const node = el('div', { html: '<b>bold</b>' });
    expect(node.innerHTML).toBe('<b>bold</b>');
    expect(node.querySelector('b').textContent).toBe('bold');
  });

  it('sets attributes from attrs', () => {
    const node = el('input', { attrs: { type: 'text', 'data-x': '1' } });
    expect(node.getAttribute('type')).toBe('text');
    expect(node.getAttribute('data-x')).toBe('1');
  });

  it('sets DOM properties from props', () => {
    const node = el('input', { props: { value: 'abc', checked: true } });
    expect(node.value).toBe('abc');
    expect(node.checked).toBe(true);
  });

  it('attaches event listeners from on', () => {
    const handler = vi.fn();
    const node = el('button', { on: { click: handler } });
    node.dispatchEvent(new Event('click'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('appends children, filtering out falsy entries', () => {
    const child1 = el('span', { text: 'a' });
    const child2 = el('span', { text: 'b' });
    const node = el('div', { children: [child1, null, undefined, false, child2] });
    expect(node.children.length).toBe(2);
    expect(node.children[0]).toBe(child1);
    expect(node.children[1]).toBe(child2);
  });

  it('handles an empty children array', () => {
    const node = el('div', { children: [] });
    expect(node.children.length).toBe(0);
  });
});

describe('clear', () => {
  it('empties a container with multiple children', () => {
    const node = el('div', { children: [el('span'), el('span'), el('span')] });
    expect(node.childNodes.length).toBe(3);
    clear(node);
    expect(node.childNodes.length).toBe(0);
  });

  it('is a no-op on an already-empty container', () => {
    const node = el('div');
    clear(node);
    expect(node.childNodes.length).toBe(0);
  });
});

describe('svgIcon', () => {
  it('parses SVG markup and returns the first element child', () => {
    const svg = svgIcon('<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>');
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
  });

  it('trims surrounding whitespace/newlines before parsing', () => {
    const svg = svgIcon('\n  <svg><g></g></svg>\n  ');
    expect(svg.tagName.toLowerCase()).toBe('svg');
  });
});
