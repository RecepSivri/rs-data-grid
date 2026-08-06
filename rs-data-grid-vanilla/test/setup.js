// Vitest setup file — polyfills and global test environment tweaks live here.
//
// jsdom (as of the version pinned in this project, see package-lock.json)
// implements the <dialog> element itself -- including the `open` IDL
// attribute reflecting the `open` content attribute -- but does NOT
// implement HTMLDialogElement.prototype.showModal()/close(), nor the
// `returnValue` property (confirmed via a throwaway probe test against the
// installed jsdom version: `typeof dialog.showModal === 'function'` was
// `false`). src/rsDataGrid/dialogs/confirmDialog.js and editRowDialog.js
// depend on both, so we polyfill the minimal subset of native <dialog>
// behavior those two modules actually use:
//   - showModal(): reflects the `open` attribute (used for "is a dialog
//     currently shown" checks elsewhere in the DOM, not by our app code,
//     but kept for fidelity).
//   - close(returnValue?): optionally sets `returnValue`, clears `open`,
//     and synchronously dispatches a non-cancelable 'close' event -- the
//     single hook confirmDialog.js/editRowDialog.js use to resolve their
//     pending promise.
// `returnValue` itself needs no polyfill: it isn't defined on
// HTMLDialogElement.prototype in jsdom, so a plain `dialogEl.returnValue =
// 'confirm'` assignment (which both dialog modules already do before
// calling close()) simply creates a normal own property that reads back
// correctly -- exactly like the native behavior our app code relies on.
if (typeof HTMLDialogElement !== 'undefined' && typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.show = function show() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(returnValue) {
    if (returnValue !== undefined) {
      this.returnValue = returnValue;
    }
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}
