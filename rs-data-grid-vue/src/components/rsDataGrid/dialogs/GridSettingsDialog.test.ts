import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import GridSettingsDialog from './GridSettingsDialog.vue';
import { createTestVuetify } from '../../../test/vuetifyTestPlugin';

const columns = [
  { caption: 'Title', dataField: 'title' },
  { caption: 'Year', dataField: 'year' },
  { caption: 'Genre', dataField: 'genre' },
];

let activeWrapper: VueWrapper | null = null;

async function mountDialog(props: Partial<InstanceType<typeof GridSettingsDialog>['$props']> = {}) {
  activeWrapper = mount(GridSettingsDialog, {
    props: { open: true, columns, selected: [], ...props },
    global: { plugins: [createTestVuetify()] },
    attachTo: document.body,
  });
  await activeWrapper.vm.$nextTick();
  return activeWrapper;
}

afterEach(() => {
  activeWrapper?.unmount();
  activeWrapper = null;
  document.body.innerHTML = '';
});

const button = (text: string) => Array.from(document.body.querySelectorAll('.v-card-actions button')).find(b => b.textContent?.trim() === text) as HTMLElement | undefined;
const chips = () => Array.from(document.body.querySelectorAll('.grid-settings-drag-chip'));

describe('GridSettingsDialog', () => {
  it('shows no order section and no Clear button when nothing is selected', async () => {
    await mountDialog({ selected: [] });
    expect(chips().length).toBe(0);
    expect(button('Clear')).toBeUndefined();
    expect(button('Close')).toBeDefined();
  });

  it('shows an order section with a chip per selected column, and a Clear button', async () => {
    await mountDialog({ selected: ['title', 'year'] });
    expect(chips().length).toBe(2);
    expect(document.body.textContent).toContain('Title');
    expect(document.body.textContent).toContain('Year');
    expect(button('Clear')).toBeDefined();
  });

  it('falls back to the raw field name when a selected field has no matching column', async () => {
    await mountDialog({ selected: ['unknown_field'] });
    expect(document.body.textContent).toContain('unknown_field');
  });

  it('defaults the theme to light and accepts an explicit theme', async () => {
    await mountDialog({});
    expect(document.body.querySelector('[data-rg-theme]')?.getAttribute('data-rg-theme')).toBe('light');
  });

  it('accepts an explicit dark theme', async () => {
    await mountDialog({ theme: 'dark' });
    expect(document.body.querySelector('[data-rg-theme]')?.getAttribute('data-rg-theme')).toBe('dark');
  });

  it('the v-select drives update:selected directly', async () => {
    const wrapper = await mountDialog({ selected: [] });
    const select = wrapper.findComponent({ name: 'VSelect' });
    await select.vm.$emit('update:modelValue', ['title']);
    expect(wrapper.emitted('update:selected')?.[0]).toEqual([['title']]);
  });

  it('removing a chip via its close icon emits update:selected without that field', async () => {
    const wrapper = await mountDialog({ selected: ['title', 'year'] });
    // findAllComponents({name:'VChip'}) also matches the v-select's own
    // internal chips (its `chips` prop) -- go through the actual rendered
    // .grid-settings-drag-chip element (the order section) instead.
    const closeBtn = chips()[0].querySelector('.v-chip__close') as HTMLElement;
    closeBtn.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:selected')?.[0]).toEqual([['year']]);
  });

  it('Clear emits update:selected with an empty array', async () => {
    const wrapper = await mountDialog({ selected: ['title', 'year'] });
    button('Clear')!.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:selected')?.[0]).toEqual([[]]);
  });

  it('Close emits close', async () => {
    const wrapper = await mountDialog({});
    button('Close')!.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('dismissing the dialog (backdrop/Escape) emits close', async () => {
    const wrapper = await mountDialog({});
    const dialog = wrapper.findComponent({ name: 'VDialog' });
    await dialog.vm.$emit('update:modelValue', false);
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  describe('drag-to-reorder chips', () => {
    it('dropping a chip on itself is a no-op', async () => {
      const wrapper = await mountDialog({ selected: ['title', 'year', 'genre'] });
      const chip = chips()[0];
      chip.dispatchEvent(new Event('dragstart'));
      chip.dispatchEvent(new Event('drop'));
      expect(wrapper.emitted('update:selected')).toBeUndefined();
    });

    it('dragging a chip forward lands it after the drop target', async () => {
      const wrapper = await mountDialog({ selected: ['title', 'year', 'genre'] });
      const [chipA, , chipC] = chips();
      chipA.dispatchEvent(new Event('dragstart'));
      chipC.dispatchEvent(new Event('dragover'));
      await wrapper.vm.$nextTick();
      expect(chipC.className).toContain('grid-settings-drag-chip-over');
      chipC.dispatchEvent(new Event('dragleave'));
      await wrapper.vm.$nextTick();
      expect(chipC.className).not.toContain('grid-settings-drag-chip-over');
      chipC.dispatchEvent(new Event('drop'));
      expect(wrapper.emitted('update:selected')?.[0]).toEqual([['year', 'genre', 'title']]);
    });

    it('dragleave on a chip that is not the current dragOverField is a no-op', async () => {
      const wrapper = await mountDialog({ selected: ['title', 'year', 'genre'] });
      const [chipA, chipB, chipC] = chips();
      chipA.dispatchEvent(new Event('dragstart'));
      chipB.dispatchEvent(new Event('dragover'));
      await wrapper.vm.$nextTick();
      chipC.dispatchEvent(new Event('dragleave'));
      await wrapper.vm.$nextTick();
      expect(chipB.className).toContain('grid-settings-drag-chip-over');
    });

    it('dragging a chip backward lands it before the drop target', async () => {
      const wrapper = await mountDialog({ selected: ['title', 'year', 'genre'] });
      const [chipA, , chipC] = chips();
      chipC.dispatchEvent(new Event('dragstart'));
      chipA.dispatchEvent(new Event('drop'));
      expect(wrapper.emitted('update:selected')?.[0]).toEqual([['genre', 'title', 'year']]);
    });

    it('dragend clears the dragged field and the hover class', async () => {
      const wrapper = await mountDialog({ selected: ['title', 'year'] });
      const [chipA, chipB] = chips();
      chipA.dispatchEvent(new Event('dragstart'));
      chipB.dispatchEvent(new Event('dragover'));
      chipB.dispatchEvent(new Event('dragend'));
      await wrapper.vm.$nextTick();
      expect(chipB.className).not.toContain('grid-settings-drag-chip-over');
      chipB.dispatchEvent(new Event('drop'));
      expect(wrapper.emitted('update:selected')).toBeUndefined();
    });

    it('a drop is a no-op once the dragged field is no longer in selection', async () => {
      const wrapper = await mountDialog({ selected: ['title', 'year'] });
      const [chipA, chipB] = chips();
      chipA.dispatchEvent(new Event('dragstart'));
      await wrapper.setProps({ selected: ['year'] });
      const [newChipB] = chips();
      newChipB.dispatchEvent(new Event('drop'));
      expect(wrapper.emitted('update:selected')).toBeUndefined();
    });

    it('a drop onto a field no longer in selection is a no-op', async () => {
      const wrapper = await mountDialog({ selected: ['title', 'year'] });
      const [chipA, chipB] = chips();
      chipA.dispatchEvent(new Event('dragstart'));
      await wrapper.setProps({ selected: ['title'] });
      chipB.dispatchEvent(new Event('drop'));
      expect(wrapper.emitted('update:selected')).toBeUndefined();
    });
  });
});
