import { describe, expect, it, vi } from 'vitest';
import { clear, el, svgIcon } from './domUtil';

describe('el', () => {
  it('creates a plain element with just a tag name', () => {
    const node = el('div');
    expect(node.tagName).toBe('DIV');
    expect(node.className).toBe('');
  });

  it('sets className', () => {
    const node = el('div', { className: 'foo' });
    expect(node.className).toBe('foo');
  });

  it('sets textContent', () => {
    const node = el('span', { text: 'hello' });
    expect(node.textContent).toBe('hello');
  });

  it('sets innerHTML', () => {
    const node = el('div', { html: '<b>hi</b>' });
    expect(node.innerHTML).toBe('<b>hi</b>');
  });

  it('sets attributes', () => {
    const node = el('input', { attrs: { type: 'text', 'data-foo': 'bar' } });
    expect(node.getAttribute('type')).toBe('text');
    expect(node.getAttribute('data-foo')).toBe('bar');
  });

  it('sets properties', () => {
    const node = el('input', { props: { value: 'abc', disabled: true } });
    expect(node.value).toBe('abc');
    expect(node.disabled).toBe(true);
  });

  it('attaches event listeners', () => {
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

  it('combines every option together', () => {
    const handler = vi.fn();
    const child = el('span', { text: 'child' });
    const node = el('div', {
      className: 'wrap',
      attrs: { role: 'group' },
      props: { title: 'tip' },
      on: { click: handler },
      children: [child],
    });
    expect(node.className).toBe('wrap');
    expect(node.getAttribute('role')).toBe('group');
    expect(node.title).toBe('tip');
    expect(node.children[0]).toBe(child);
    node.click();
    expect(handler).toHaveBeenCalled();
  });
});

describe('clear', () => {
  it('removes all children from a node', () => {
    const node = el('div', { children: [el('span'), el('span'), el('span')] });
    expect(node.childNodes.length).toBe(3);
    clear(node);
    expect(node.childNodes.length).toBe(0);
  });

  it('is a no-op on an already-empty node', () => {
    const node = el('div');
    expect(() => clear(node)).not.toThrow();
    expect(node.childNodes.length).toBe(0);
  });
});

describe('svgIcon', () => {
  it('builds an SVG element from a markup string', () => {
    const icon = svgIcon('<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>');
    expect(icon.tagName.toLowerCase()).toBe('svg');
    expect(icon.getAttribute('viewBox')).toBe('0 0 24 24');
  });

  it('trims surrounding whitespace before parsing', () => {
    const icon = svgIcon('  \n  <svg><circle r="1"/></svg>  \n  ');
    expect(icon.tagName.toLowerCase()).toBe('svg');
  });
});
