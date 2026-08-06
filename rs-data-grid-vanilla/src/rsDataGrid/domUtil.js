// Minimal, dependency-free DOM-building helpers used across this app.
// Render strategy (see the approved plan): rebuild a region's DOM subtree
// wholesale on every store notify()/update() call -- never on keystrokes
// (those only mutate a closure-held draft object). This keeps input focus
// stable without any keyed-diffing machinery, so no such machinery exists
// here on purpose.

/**
 * @param {string} tag
 * @param {{
 *   className?: string,
 *   text?: string,
 *   html?: string,
 *   attrs?: Record<string, string>,
 *   props?: Record<string, any>,
 *   on?: Record<string, (event: Event) => void>,
 *   children?: (Node|null|undefined|false)[],
 * }} [opts]
 * @returns {HTMLElement}
 */
export function el(tag, opts = {}) {
  const node = document.createElement(tag);
  if (opts.className) node.className = opts.className;
  if (opts.text !== undefined) node.textContent = opts.text;
  if (opts.html !== undefined) node.innerHTML = opts.html;
  if (opts.attrs) {
    for (const [key, value] of Object.entries(opts.attrs)) {
      node.setAttribute(key, value);
    }
  }
  if (opts.props) {
    for (const [key, value] of Object.entries(opts.props)) {
      node[key] = value;
    }
  }
  if (opts.on) {
    for (const [event, handler] of Object.entries(opts.on)) {
      node.addEventListener(event, handler);
    }
  }
  if (opts.children) {
    node.append(...opts.children.filter(Boolean));
  }
  return node;
}

/** Empties a container in place. */
export function clear(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

/**
 * Builds an inline SVG icon from a raw markup string (all callers pass
 * static, hardcoded markup defined in this codebase -- never user input).
 * @param {string} svgMarkup
 * @returns {SVGSVGElement}
 */
export function svgIcon(svgMarkup) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = svgMarkup.trim();
  return wrapper.firstElementChild;
}
