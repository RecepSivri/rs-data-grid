import { describe, expect, it, vi } from 'vitest';
import { openGridSettings } from '../../src/rsDataGrid/dialogs/gridSettingsDialog.js';

// Module-level singleton <dialog>, same pattern as the other two dialogs.
const getDialog = () => document.querySelector('dialog.grid-settings-dialog');
const trigger = () => getDialog().querySelector('.grid-settings-select-trigger');
const dropdownPanel = () => getDialog().querySelector('.grid-settings-dropdown-panel');
const checkboxes = () => Array.from(getDialog().querySelectorAll('.filter-option input[type="checkbox"]'));
const dragChips = () => Array.from(getDialog().querySelectorAll('.grid-settings-drag-chip'));
const button = text => Array.from(getDialog().querySelectorAll('.rs-dialog-actions button')).find(b => b.textContent === text);

const columns = [
  { caption: 'Title', dataField: 'title' },
  { caption: 'Year', dataField: 'year' },
  { caption: 'Genre', dataField: 'genre' },
];

describe('openGridSettings', () => {
  it('shows the "All columns" placeholder and no order/Clear section when nothing is selected', () => {
    const onChange = vi.fn();
    openGridSettings({ columns, selected: [], onChange });
    expect(trigger().textContent).toContain('All columns');
    expect(getDialog().querySelector('.grid-settings-drag-chip')).toBeNull();
    expect(button('Clear')).toBeUndefined();
    expect(button('Close')).toBeDefined();
  });

  it('shows trigger chips, an order section, and a Clear button when columns are selected', () => {
    const onChange = vi.fn();
    openGridSettings({ columns, selected: ['title', 'year'], onChange });
    expect(trigger().querySelectorAll('.grid-settings-trigger-chip').length).toBe(2);
    expect(dragChips().length).toBe(2);
    expect(button('Clear')).toBeDefined();
  });

  it('falls back to the raw field name when a selected field has no matching column', () => {
    openGridSettings({ columns, selected: ['unknown_field'], onChange: vi.fn() });
    expect(trigger().textContent).toContain('unknown_field');
  });

  it('defaults the theme to light and accepts an explicit theme', () => {
    openGridSettings({ columns, selected: [], theme: undefined, onChange: vi.fn() });
    expect(getDialog().getAttribute('data-rg-theme')).toBe('light');
    openGridSettings({ columns, selected: [], theme: 'dark', onChange: vi.fn() });
    expect(getDialog().getAttribute('data-rg-theme')).toBe('dark');
  });

  it('tolerates a missing onChange callback (no-op notification)', () => {
    openGridSettings({ columns, selected: [], onChange: undefined });
    expect(() => trigger().click()).not.toThrow();
    expect(() => checkboxes()[0].dispatchEvent(new Event('change', { bubbles: true }))).not.toThrow();
  });

  it('reuses the same singleton dialog element across calls', () => {
    openGridSettings({ columns, selected: [], onChange: vi.fn() });
    openGridSettings({ columns, selected: [], onChange: vi.fn() });
    expect(document.querySelectorAll('dialog.grid-settings-dialog').length).toBe(1);
  });

  describe('dropdown', () => {
    it('opens on trigger click (without bubbling to the document close-listener) and closes on a second click', () => {
      openGridSettings({ columns, selected: [], onChange: vi.fn() });
      expect(dropdownPanel()).toBeNull();
      trigger().dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(dropdownPanel()).not.toBeNull();
      expect(trigger().querySelector('.filter-caret-open')).not.toBeNull();
      trigger().dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(dropdownPanel()).toBeNull();
    });

    it('shows "No columns" when the columns list is empty', () => {
      openGridSettings({ columns: [], selected: [], onChange: vi.fn() });
      trigger().click();
      expect(dropdownPanel().textContent).toContain('No columns');
    });

    it('renders one checkbox per column, checked according to selection', () => {
      openGridSettings({ columns, selected: ['year'], onChange: vi.fn() });
      trigger().click();
      const boxes = checkboxes();
      expect(boxes.length).toBe(3);
      expect(boxes.map(b => b.checked)).toEqual([false, true, false]);
    });

    it('checking a box adds the field and calls onChange, without closing the dropdown', () => {
      const onChange = vi.fn();
      openGridSettings({ columns, selected: [], onChange });
      trigger().click();
      checkboxes()[0].dispatchEvent(new Event('change', { bubbles: true }));
      expect(onChange).toHaveBeenCalledWith(['title']);
      expect(dropdownPanel()).not.toBeNull();
    });

    it('unchecking a box removes the field and calls onChange', () => {
      const onChange = vi.fn();
      openGridSettings({ columns, selected: ['title', 'year'], onChange });
      trigger().click();
      checkboxes()[0].dispatchEvent(new Event('change', { bubbles: true }));
      expect(onChange).toHaveBeenCalledWith(['year']);
    });

    it('a click inside the dropdown panel does not bubble to the document close-listener', () => {
      openGridSettings({ columns, selected: [], onChange: vi.fn() });
      trigger().click();
      dropdownPanel().dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(dropdownPanel()).not.toBeNull();
    });

    it('a click outside the dialog closes an open dropdown', () => {
      openGridSettings({ columns, selected: [], onChange: vi.fn() });
      trigger().click();
      expect(dropdownPanel()).not.toBeNull();
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(dropdownPanel()).toBeNull();
    });

    it('a click outside the dialog when the dropdown is already closed is a harmless no-op', () => {
      openGridSettings({ columns, selected: [], onChange: vi.fn() });
      expect(dropdownPanel()).toBeNull();
      expect(() => document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))).not.toThrow();
      expect(dropdownPanel()).toBeNull();
    });
  });

  describe('order section', () => {
    it('removing a chip via its remove button calls onChange and re-renders without it', () => {
      const onChange = vi.fn();
      openGridSettings({ columns, selected: ['title', 'year'], onChange });
      dragChips()[0].querySelector('.grid-settings-chip-remove').click();
      expect(onChange).toHaveBeenCalledWith(['year']);
      expect(dragChips().length).toBe(1);
    });

    it('Clear removes every selected column and hides the order section/Clear button', () => {
      const onChange = vi.fn();
      openGridSettings({ columns, selected: ['title', 'year'], onChange });
      button('Clear').click();
      expect(onChange).toHaveBeenCalledWith([]);
      expect(dragChips().length).toBe(0);
      expect(button('Clear')).toBeUndefined();
    });

    it('Close closes the dialog', () => {
      openGridSettings({ columns, selected: [], onChange: vi.fn() });
      expect(getDialog().open).toBe(true);
      button('Close').click();
      expect(getDialog().open).toBe(false);
    });

    it('clicking the backdrop closes the dialog', () => {
      openGridSettings({ columns, selected: [], onChange: vi.fn() });
      getDialog().dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(getDialog().open).toBe(false);
    });

    it('reordering: dropping a chip on itself is a no-op', () => {
      const onChange = vi.fn();
      openGridSettings({ columns, selected: ['title', 'year', 'genre'], onChange });
      const chip = dragChips()[0];
      chip.dispatchEvent(new Event('dragstart'));
      chip.dispatchEvent(new Event('drop'));
      expect(onChange).not.toHaveBeenCalled();
    });

    it('reordering: dragging a chip forward lands it after the drop target', () => {
      const onChange = vi.fn();
      openGridSettings({ columns, selected: ['title', 'year', 'genre'], onChange });
      const [chipA, , chipC] = dragChips();
      chipA.dispatchEvent(new Event('dragstart'));
      chipC.dispatchEvent(new Event('dragover'));
      expect(chipC.classList.contains('grid-settings-drag-chip-over')).toBe(true);
      chipC.dispatchEvent(new Event('dragleave'));
      expect(chipC.classList.contains('grid-settings-drag-chip-over')).toBe(false);
      chipC.dispatchEvent(new Event('drop'));
      expect(onChange).toHaveBeenCalledWith(['year', 'genre', 'title']);
    });

    it('reordering: dragging a chip backward lands it before the drop target', () => {
      const onChange = vi.fn();
      openGridSettings({ columns, selected: ['title', 'year', 'genre'], onChange });
      const [chipA, , chipC] = dragChips();
      chipC.dispatchEvent(new Event('dragstart'));
      chipA.dispatchEvent(new Event('drop'));
      expect(onChange).toHaveBeenCalledWith(['genre', 'title', 'year']);
    });

    it('dragend clears the dragged field and the hover class', () => {
      openGridSettings({ columns, selected: ['title', 'year'], onChange: vi.fn() });
      const [chipA, chipB] = dragChips();
      chipA.dispatchEvent(new Event('dragstart'));
      chipB.dispatchEvent(new Event('dragover'));
      chipB.dispatchEvent(new Event('dragend'));
      expect(chipB.classList.contains('grid-settings-drag-chip-over')).toBe(false);
      // With draggedField now cleared, a drop is a no-op (the `if (from)` guard).
      const onChange = vi.fn();
      openGridSettings({ columns, selected: ['title', 'year'], onChange });
      dragChips()[1].dispatchEvent(new Event('drop'));
      expect(onChange).not.toHaveBeenCalled();
    });

    it('reordering: a drop is a no-op once the dragged field has been removed from selection first', () => {
      const onChange = vi.fn();
      openGridSettings({ columns, selected: ['title', 'year'], onChange });
      const [chipA, chipB] = dragChips();
      chipA.dispatchEvent(new Event('dragstart'));
      // Removing the dragged chip re-renders the order section without it,
      // but the module still remembers it as the in-flight draggedField.
      chipA.querySelector('.grid-settings-chip-remove').click();
      expect(onChange).toHaveBeenLastCalledWith(['year']);
      dragChips()[0].dispatchEvent(new Event('drop'));
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('reordering: a drop onto a chip that was removed after dragstart is a no-op', () => {
      const onChange = vi.fn();
      openGridSettings({ columns, selected: ['title', 'year'], onChange });
      const [chipA, chipB] = dragChips();
      chipA.dispatchEvent(new Event('dragstart'));
      // chipB is a stale reference to a chip removed from the live DOM by the
      // time drop fires -- its closure's own field is no longer in `selected`.
      chipB.querySelector('.grid-settings-chip-remove').click();
      expect(onChange).toHaveBeenLastCalledWith(['title']);
      chipB.dispatchEvent(new Event('drop'));
      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });
});
