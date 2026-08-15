import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { VDialog } from 'vuetify/components';
import ConfirmDialog from './ConfirmDialog.vue';
import { createTestVuetify } from '../../../test/vuetifyTestPlugin';

let activeWrapper: VueWrapper | null = null;

async function mountDialog(props: Partial<InstanceType<typeof ConfirmDialog>['$props']> = {}) {
  activeWrapper = mount(ConfirmDialog, {
    props: { open: true, message: 'Are you sure?', ...props },
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

describe('ConfirmDialog', () => {
  it('defaults the title to "Confirm" when none is given', async () => {
    await mountDialog();
    expect(document.body.textContent).toContain('Confirm');
  });

  it('shows a custom title and the message', async () => {
    await mountDialog({ title: 'Delete row?', message: 'This cannot be undone.' });
    expect(document.body.textContent).toContain('Delete row?');
    expect(document.body.querySelector('.confirm-message')?.textContent).toBe('This cannot be undone.');
  });

  it('defaults the theme to light', async () => {
    await mountDialog();
    expect(document.body.querySelector('[data-rg-theme]')?.getAttribute('data-rg-theme')).toBe('light');
  });

  it('accepts an explicit theme', async () => {
    await mountDialog({ theme: 'dark' });
    expect(document.body.querySelector('[data-rg-theme]')?.getAttribute('data-rg-theme')).toBe('dark');
  });

  it('emits cancel when "No" is clicked', async () => {
    const wrapper = await mountDialog();
    const buttons = document.body.querySelectorAll('.v-card-actions button');
    const noBtn = Array.from(buttons).find(b => b.textContent?.trim() === 'No') as HTMLElement;
    expect(noBtn).toBeDefined();
    noBtn.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('cancel')).toHaveLength(1);
    expect(wrapper.emitted('confirm')).toBeUndefined();
  });

  it('emits confirm when "Yes" is clicked', async () => {
    const wrapper = await mountDialog();
    const buttons = document.body.querySelectorAll('.v-card-actions button');
    const yesBtn = Array.from(buttons).find(b => b.textContent?.trim() === 'Yes') as HTMLElement;
    expect(yesBtn).toBeDefined();
    yesBtn.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('confirm')).toHaveLength(1);
  });

  it('emits cancel when the dialog is dismissed (e.g. Escape/backdrop), not confirm', async () => {
    const wrapper = await mountDialog();
    const dialog = wrapper.findComponent(VDialog);
    await dialog.vm.$emit('update:modelValue', false);
    expect(wrapper.emitted('cancel')).toHaveLength(1);
    expect(wrapper.emitted('confirm')).toBeUndefined();
  });

  it('does not emit cancel when the dialog opens (model-value becomes true)', async () => {
    const wrapper = await mountDialog({ open: false });
    const dialog = wrapper.findComponent(VDialog);
    await dialog.vm.$emit('update:modelValue', true);
    expect(wrapper.emitted('cancel')).toBeUndefined();
  });
});
