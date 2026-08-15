import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { VDialog } from 'vuetify/components';
import EditRowDialog from './EditRowDialog.vue';
import { createTestVuetify } from '../../../test/vuetifyTestPlugin';

const columns = [
  { caption: 'Title', dataField: 'title' },
  { caption: 'Year', dataField: 'year' },
];

let activeWrapper: VueWrapper | null = null;

async function mountDialog(props: Partial<InstanceType<typeof EditRowDialog>['$props']> = {}) {
  activeWrapper = mount(EditRowDialog, {
    props: { open: true, ...props },
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

const inputs = () => Array.from(document.body.querySelectorAll<HTMLInputElement>('.edit-input'));
const labels = () => Array.from(document.body.querySelectorAll('.edit-label')).map(l => l.textContent);
const button = (text: string) => Array.from(document.body.querySelectorAll('.v-card-actions button')).find(b => b.textContent?.trim() === text) as HTMLElement;

describe('EditRowDialog', () => {
  it('add mode: builds one empty input per declared column, titled "Add row"', async () => {
    await mountDialog({ columns });
    expect(document.body.textContent).toContain('Add row');
    expect(labels()).toEqual(['title', 'year']);
    expect(inputs().map(i => i.value)).toEqual(['', '']);
  });

  it('add mode: defaults to no fields when columns is omitted', async () => {
    await mountDialog({});
    expect(labels()).toEqual([]);
  });

  it('edit mode: builds one input per the row\'s own keys, titled "Edit row"', async () => {
    await mountDialog({ row: { title: 'Movie A', year: 2020 } });
    expect(document.body.textContent).toContain('Edit row');
    expect(labels()).toEqual(['title', 'year']);
    expect(inputs().map(i => i.value)).toEqual(['Movie A', '2020']);
  });

  it('edit mode: stringifies null/undefined row values as empty strings', async () => {
    await mountDialog({ row: { a: null, b: undefined, c: 0 } });
    expect(inputs().map(i => i.value)).toEqual(['', '', '0']);
  });

  it('defaults the theme to light and accepts an explicit theme', async () => {
    await mountDialog({ row: { a: 1 } });
    expect(document.body.querySelector('[data-rg-theme]')?.getAttribute('data-rg-theme')).toBe('light');
  });

  it('accepts an explicit dark theme', async () => {
    await mountDialog({ row: { a: 1 }, theme: 'dark' });
    expect(document.body.querySelector('[data-rg-theme]')?.getAttribute('data-rg-theme')).toBe('dark');
  });

  it('emits cancel on Cancel click', async () => {
    const wrapper = await mountDialog({ row: { a: 1 } });
    button('Cancel').click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });

  it('emits cancel when the dialog is dismissed (backdrop/Escape)', async () => {
    const wrapper = await mountDialog({ row: { a: 1 } });
    const dialog = wrapper.findComponent(VDialog);
    await dialog.vm.$emit('update:modelValue', false);
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });

  it('emits save with the row spread and edited field values on Save', async () => {
    const row = { title: 'Old', year: 2000, extra: 'kept' };
    const wrapper = await mountDialog({ row });
    const titleInput = inputs()[0];
    titleInput.value = 'New title';
    titleInput.dispatchEvent(new Event('input'));
    await wrapper.vm.$nextTick();
    button('Save').click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('save')?.[0]).toEqual([{ title: 'New title', year: '2000', extra: 'kept' }]);
  });

  it('add mode Save emits an object built from declared columns only', async () => {
    const wrapper = await mountDialog({ columns: [{ caption: 'Title', dataField: 'title' }] });
    const input = inputs()[0];
    input.value = 'Brand new';
    input.dispatchEvent(new Event('input'));
    await wrapper.vm.$nextTick();
    button('Save').click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('save')?.[0]).toEqual([{ title: 'Brand new' }]);
  });

  it('rebuilds the form (clearing prior fields) when row/columns/open change', async () => {
    const wrapper = await mountDialog({ row: { onlyHere: 1 } });
    expect(labels()).toEqual(['onlyHere']);
    await wrapper.setProps({ row: undefined, columns: [{ caption: 'X', dataField: 'x' }] });
    expect(labels()).toEqual(['x']);
  });

  it('does not rebuild fields while closed', async () => {
    const wrapper = await mountDialog({ open: false, row: { a: 1 } });
    await wrapper.setProps({ row: { b: 2 } });
    // The watcher's guard (`if (!props.open) return;`) means fields never
    // got built in the first place since open started false.
    expect(labels()).toEqual([]);
  });
});
