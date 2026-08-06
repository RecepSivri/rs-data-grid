// jQuery port of rsDataGridHeader.tsx. Same behavior as the vanilla version,
// but interactive elements are wired via ONE delegated jQuery handler per
// event type, bound once on the header container, instead of per-node
// listeners re-attached on every rebuild. The outside-click-close listener
// uses a namespaced $(document).on('click.rsGridFilterHeader', ...) handler,
// cleanly removable via its namespace on destroy() -- no manual function
// reference tracking needed.
import $ from 'jquery';
import { el, clear } from '../domUtil.js';
import { applyFilters } from '../store/dataGridStore.js';
import { titleCase } from '../titleCase.js';
import './rsDataGridHeader.css';

export function createHeader() {
  let openDataField = null;
  let selectedValues = {};
  let $container = null;
  let lastProps = null;
  let delegationBound = false;

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

  function bindDelegation($c) {
    if (delegationBound) {
      return;
    }
    delegationBound = true;

    $c.on('click', '.sort-toggle', function (event) {
      event.stopPropagation();
      lastProps.onSortToggle($(this).data('field'));
    });

    $c.on('click', '.filter-toggle', function (event) {
      event.stopPropagation();
      const field = $(this).data('field');
      openDataField = openDataField === field ? null : field;
      renderCurrent();
    });

    $c.on('click', '.filter-dropdown', function (event) {
      event.stopPropagation();
    });

    $c.on('change', '.filter-option input[type="checkbox"]', function (event) {
      event.stopPropagation();
      const $input = $(this);
      const dataField = $input.data('field');
      // .attr(), not .data(): jQuery's .data() auto-casts data-value into a
      // Number/Boolean/JSON when it looks like one (e.g. a numeric "age"
      // column's option value "30"), but getOptions()/applyFilters() always
      // compare via String(row[field]) -- a stray Number here would silently
      // never match, breaking the filter for any numeric-looking value.
      const value = $input.attr('data-value');
      const current = selectedValues[dataField] ?? [];
      const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      selectedValues = { ...selectedValues, [dataField]: next };
      lastProps.onFilterChange({ dataField, values: next });
      renderCurrent();
    });

    $c.on('click', '.filter-clear', function (event) {
      event.stopPropagation();
      const dataField = $(this).data('field');
      selectedValues = { ...selectedValues, [dataField]: [] };
      lastProps.onFilterChange({ dataField, values: [] });
      renderCurrent();
    });

    $(document).on('click.rsGridFilterHeader', closeDropdown);
  }

  function buildCaptionRow(props) {
    const { columns, headerColumnLines, tableBorder, borderRadiusTop, showSort, showActions, showIndex, sort } = props;
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
            attrs: { type: 'button', 'aria-label': 'Sort ' + column.caption, 'data-field': column.dataField },
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
    const { columns, data, bodyColumnLines, tableBorder, showActions, showIndex } = props;
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
        attrs: { type: 'button', 'aria-label': 'Filter ' + column.caption, 'data-field': column.dataField },
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
            attrs: { type: 'checkbox', 'data-field': column.dataField, 'data-value': option },
            props: { checked: selected },
          });
          panelChildren.push(
            el('label', { className: 'filter-option' + (selected ? ' filter-option-selected' : ''), children: [checkbox, el('span', { text: option })] })
          );
        }
        if (count > 0) {
          panelChildren.push(el('div', { className: 'filter-panel-divider' }));
          panelChildren.push(
            el('button', { className: 'filter-clear', text: 'Clear selection', attrs: { type: 'button', 'data-field': column.dataField } })
          );
        }
        dropdownChildren.push(el('div', { className: 'filter-panel', children: panelChildren }));
      }

      children.push(
        el('div', {
          className: 'full-row filter-cell row-layout-center-center' + (bodyColumnLines && (i < columns.length - 1 || showActions) ? ' border-right' : ''),
          children: [el('div', { className: 'filter-dropdown', children: dropdownChildren })],
        })
      );
    });
    if (showActions) {
      children.push(el('div', { className: 'actions-header-cell filter-cell row-layout-center-center' }));
    }
    return el('div', { className: rowClass, children });
  }

  function renderCurrent() {
    if ($container && lastProps) {
      render($container[0], lastProps);
    }
  }

  function render(container, props) {
    $container = $(container);
    lastProps = props;
    // Delegation binds to a stable ancestor (see rsDataGrid.js), NOT to
    // `container` itself -- container is a fresh <div> rebuilt on every
    // render, so listeners bound to it would vanish the moment it's replaced.
    bindDelegation($(props.delegationRoot ?? container));

    clear(container);
    const wrapper = el('div', { children: [buildCaptionRow(props), props.showFilter ? buildFilterRow(props) : null] });
    container.appendChild(wrapper);
  }

  function destroy() {
    $(document).off('click.rsGridFilterHeader');
  }

  return { render, destroy };
}
