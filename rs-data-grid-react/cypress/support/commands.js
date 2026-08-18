// The grid's row/column reorder and Grid-Settings chip reorder all use the
// native HTML5 drag-and-drop events (dragstart/dragover/drop), read via
// React state (setDraggedRow/setDraggedField/etc), never the DataTransfer
// payload itself.
//
// Unlike vanilla's port of this same command, firing all four events inside
// one synchronous window.dispatchEvent block does NOT work here: React 18
// batches the state update from dragstart, so if dragover/drop fire in the
// same synchronous block, their handlers still close over the *previous*
// render's state (draggedRow still null) and silently no-op. Issuing each
// event as its own separate Cypress command via cy.trigger() instead makes
// Cypress's own command queue yield back to the browser between each one,
// giving React a chance to actually commit each state update (and hand the
// next handler a fresh closure) before the next event fires.
Cypress.Commands.add('dragAndDrop', (sourceSelector, targetSelector) => {
  const trigger = (selector, type) => cy.get(selector).trigger(type, { eventConstructor: 'DragEvent', dataTransfer: new DataTransfer() });
  trigger(sourceSelector, 'dragstart');
  trigger(targetSelector, 'dragover');
  trigger(targetSelector, 'drop');
  trigger(sourceSelector, 'dragend');
});
