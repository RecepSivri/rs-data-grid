// Port of rsDataGridHeader.tsx. Caption row + optional filter row. Owns
// openDataField/selectedValues as closure state (rebuilt on every render,
// same as React's local useState -- there are no free-text inputs here, so a
// full rebuild on every change never loses input focus).
import { el, clear } from '../domUtil.js';
import { applyFilters } from '../store/dataGridStore.js';
import { titleCase } from '../titleCase.js';
import './rsDataGridHeader.css';

export function createHeader() {
  let openDataField = null;
  let selectedValues = {};
  let containerEl = null;
  let lastProps = null;
  let listenerAttached = false;

  function closeDropdown() {
    if (openDataField === null) {
      return;
    }
    openDataField = null;
    renderCurrent();
  }

  function getOptions(dataField, data) {
    const otherFilters = { ...selectedValues };
    delete otherFilters[dataField];
    const rows = applyFilters(data, otherFilters);
    const values = new Set();
    for (const row of rows) {
      const value = row?.[dataField];
      if (value !== undefined && value !== null && value !== '') {
        values.add(String(value));
      }
    }
    return Array.from(values).sort();
  }

  function isSelected(dataField, value) {
    return (selectedValues[dataField] ?? []).includes(value);
  }

  function selectedCount(dataField) {
    return (selectedValues[dataField] ?? []).length;
  }

  function toggleValue(dataField, value, onFilterChange) {
    const current = selectedValues[dataField] ?? [];
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    selectedValues = { ...selectedValues, [dataField]: next };
    onFilterChange({ dataField, values: next });
    renderCurrent();
  }

  function clearFilter(dataField, onFilterChange) {
    selectedValues = { ...selectedValues, [dataField]: [] };
    onFilterChange({ dataField, values: [] });
    renderCurrent();
  }

  function buildCaptionRow(props) {
    const { columns, headerColumnLines, tableBorder, borderRadiusTop, showSort, showActions, showIndex, sort, onSortToggle } = props;
    const sortDirection = dataField => (sort.field === dataField ? sort.direction : null);

    const rowClass =
      'full-row row-layout-space-between-center' + (tableBorder ? ' border-header' : '') + (borderRadiusTop ? ' border-area-small' : '');

    const children = [];
    if (showIndex) {
      children.push(el('div', { className: 'index-header-cell content-style row-layout-center-center' + (headerColumnLines ? ' border-right' : ''), text: '#' }));
    }
    columns.forEach((column, i) => {
      const direction = sortDirection(column.dataField);
      const cellChildren = [el('span', { className: 'header-caption', text: titleCase(column.caption) })];
      if (showSort) {
        const iconText = direction === 'desc' ? '▼' : direction === 'asc' ? '▲' : '⇅';
        cellChildren.push(
          el('button', {
            className: 'sort-toggle' + (direction !== null ? ' sort-toggle-active' : ''),
            attrs: { type: 'button', 'aria-label': 'Sort ' + column.caption },
            on: { click: event => { event.stopPropagation(); onSortToggle(column.dataField); } },
            children: [el('span', { className: 'sort-icon' + (direction !== null ? ' sort-icon-active' : ''), text: iconText })],
          })
        );
      }
      children.push(
        el('div', {
          className: 'full-row content-style row-layout-center-center' + (headerColumnLines && (i < columns.length - 1 || showActions) ? ' border-right' : ''),
          children: cellChildren,
        })
      );
    });
    if (showActions) {
      children.push(el('div', { className: 'actions-header-cell content-style row-layout-center-center', text: 'Actions' }));
    }
    return el('div', { className: rowClass, children });
  }

  function buildFilterRow(props) {
    const { columns, data, bodyColumnLines, tableBorder, showActions, showIndex, onFilterChange } = props;
    if (columns.length === 0) {
      return null;
    }
    const rowClass = 'full-row filter-row row-layout-space-between-center' + (tableBorder ? ' filter-row-border' : '');
    const children = [];
    if (showIndex) {
      children.push(el('div', { className: 'index-header-cell filter-cell row-layout-center-center' + (bodyColumnLines ? ' border-right' : '') }));
    }
    columns.forEach((column, i) => {
      const isOpen = openDataField === column.dataField;
      const count = selectedCount(column.dataField);

      const toggleBtn = el('button', {
        className: 'filter-toggle' + (count > 0 ? ' filter-toggle-active' : '') + (isOpen ? ' filter-toggle-open' : ''),
        attrs: { type: 'button', 'aria-label': 'Filter ' + column.caption },
        on: {
          click: event => {
            event.stopPropagation();
            openDataField = isOpen ? null : column.dataField;
            renderCurrent();
          },
        },
        children: [
          el('span', { className: 'filter-toggle-label', text: titleCase(column.caption) }),
          count > 0 ? el('span', { className: 'filter-count', text: String(count) }) : null,
          el('span', { className: 'filter-caret' + (isOpen ? ' filter-caret-open' : ''), html: '&#9662;' }),
        ],
      });

      const dropdownChildren = [toggleBtn];
      if (isOpen) {
        const options = getOptions(column.dataField, data);
        const panelChildren = [];
        if (options.length === 0) {
          panelChildren.push(el('div', { className: 'filter-empty', text: 'No values' }));
        }
        for (const option of options) {
          const selected = isSelected(column.dataField, option);
          const checkbox = el('input', {
            attrs: { type: 'checkbox' },
            props: { checked: selected },
            on: { change: event => { event.stopPropagation(); toggleValue(column.dataField, option, onFilterChange); } },
          });
          panelChildren.push(
            el('label', { className: 'filter-option' + (selected ? ' filter-option-selected' : ''), children: [checkbox, el('span', { text: option })] })
          );
        }
        if (count > 0) {
          panelChildren.push(el('div', { className: 'filter-panel-divider' }));
          panelChildren.push(
            el('button', {
              className: 'filter-clear',
              text: 'Clear selection',
              attrs: { type: 'button' },
              on: { click: event => { event.stopPropagation(); clearFilter(column.dataField, onFilterChange); } },
            })
          );
        }
        dropdownChildren.push(el('div', { className: 'filter-panel', children: panelChildren }));
      }

      children.push(
        el('div', {
          className: 'full-row filter-cell row-layout-center-center' + (bodyColumnLines && (i < columns.length - 1 || showActions) ? ' border-right' : ''),
          children: [el('div', { className: 'filter-dropdown', on: { click: event => event.stopPropagation() }, children: dropdownChildren })],
        })
      );
    });
    if (showActions) {
      children.push(el('div', { className: 'actions-header-cell filter-cell row-layout-center-center' }));
    }
    return el('div', { className: rowClass, children });
  }

  function renderCurrent() {
    /* istanbul ignore else -- containerEl/lastProps are both assigned
       synchronously at the top of render(), before the document click
       listener that can trigger closeDropdown()/renderCurrent() is even
       attached (see the end of render()); every internal caller of
       renderCurrent() is itself only reachable from a DOM event on
       previously-rendered content, so the false case is unreachable via
       the public API. */
    if (containerEl && lastProps) {
      render(containerEl, lastProps);
    }
  }

  function render(container, props) {
    containerEl = container;
    lastProps = props;
    clear(container);
    const wrapper = el('div', { children: [buildCaptionRow(props), props.showFilter ? buildFilterRow(props) : null] });
    container.appendChild(wrapper);
    if (!listenerAttached) {
      document.addEventListener('click', closeDropdown);
      listenerAttached = true;
    }
  }

  function destroy() {
    if (listenerAttached) {
      document.removeEventListener('click', closeDropdown);
      listenerAttached = false;
    }
  }

  return { render, destroy };
}
