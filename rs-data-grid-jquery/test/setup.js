// Vitest setup file -- polyfills and global test environment tweaks live here.
//
// jsdom does not implement the native <dialog> element's modal behavior
// (HTMLDialogElement.prototype.showModal/close/show are simply absent --
// verified directly against the installed jsdom version before writing this
// polyfill). Both confirmDialog.js and editRowDialog.js rely on showModal(),
// close(), the 'close' event, and returnValue, so without this polyfill every
// dialog-driven test would throw "dialog.showModal is not a function".
//
// This is a minimal but behaviorally faithful polyfill: showModal()/show()
// set the `open` attribute (jsdom already reflects that to the `.open` IDL
// property on its own), close() removes it, stores the optional returnValue,
// and synchronously dispatches a non-cancelable 'close' event -- matching
// what confirmDialog.js/editRowDialog.js's `close` handler depends on.
if (typeof HTMLDialogElement !== 'undefined' && typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.returnValue = '';

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
