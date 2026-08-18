describe('rs-data-grid (React) — drag & drop reordering', () => {
  it('reorders rows via the drag handle, both forward and backward', () => {
    cy.visit('/?dragDropRows=true');
    cy.wait('@moviesFetch');
    // Unsorted natural fixture order: "Ariel" first, "Four Rooms" second.
    cy.get('.column-layout > .full-row').eq(0).should('contain.text', 'Ariel');
    cy.get('.column-layout > .full-row').eq(1).should('contain.text', 'Four Rooms');

    cy.dragAndDrop('.column-layout > .full-row:nth-child(1) .drag-handle', '.column-layout > .full-row:nth-child(2)');
    cy.get('.column-layout > .full-row').eq(0).should('contain.text', 'Four Rooms');

    // Drag it back -- the row now sitting at index 1 (the item that used to
    // be first) moves back up onto index 0, exercising moveItem's other
    // splice-index branch (backward instead of forward).
    cy.dragAndDrop('.column-layout > .full-row:nth-child(2) .drag-handle', '.column-layout > .full-row:nth-child(1)');
    cy.get('.column-layout > .full-row').eq(0).should('contain.text', 'Ariel');

    // Dragging a row onto itself is a no-op, not a crash.
    cy.dragAndDrop('.column-layout > .full-row:nth-child(1) .drag-handle', '.column-layout > .full-row:nth-child(1)');
    cy.get('.column-layout > .full-row').eq(0).should('contain.text', 'Ariel');
  });

  it('a row dragleave clears the highlight without moving anything', () => {
    cy.visit('/?dragDropRows=true');
    cy.wait('@moviesFetch');
    const trigger = (selector, type) => cy.get(selector).trigger(type, { eventConstructor: 'DragEvent', dataTransfer: new DataTransfer() });
    trigger('.column-layout > .full-row:nth-child(1) .drag-handle', 'dragstart');
    trigger('.column-layout > .full-row:nth-child(2)', 'dragover');
    // The highlight really was applied -- not just "nothing moved", which
    // would trivially be true even if dragover's handler never ran at all.
    cy.get('.column-layout > .full-row:nth-child(2)').should('have.class', 'row-drag-over');
    trigger('.column-layout > .full-row:nth-child(2)', 'dragleave');
    cy.get('.column-layout > .full-row:nth-child(2)').should('not.have.class', 'row-drag-over');
    trigger('.column-layout > .full-row:nth-child(1) .drag-handle', 'dragend');
    cy.get('.column-layout > .full-row').eq(0).should('contain.text', 'Ariel');
    cy.get('.column-layout > .full-row').eq(1).should('contain.text', 'Four Rooms');
  });

  it('a dragleave on a row other than the currently-highlighted one leaves the highlight alone', () => {
    // A fast pointer move can fire dragleave on a row that was hovered
    // *before* the current one, after the highlight has already moved on --
    // that mismatched dragleave shouldn't clear the real (different) one.
    cy.visit('/?dragDropRows=true');
    cy.wait('@moviesFetch');
    const trigger = (selector, type) => cy.get(selector).trigger(type, { eventConstructor: 'DragEvent', dataTransfer: new DataTransfer() });
    trigger('.column-layout > .full-row:nth-child(1) .drag-handle', 'dragstart');
    trigger('.column-layout > .full-row:nth-child(2)', 'dragover');
    cy.get('.column-layout > .full-row:nth-child(2)').should('have.class', 'row-drag-over');
    trigger('.column-layout > .full-row:nth-child(3)', 'dragleave');
    cy.get('.column-layout > .full-row:nth-child(2)').should('have.class', 'row-drag-over');
    trigger('.column-layout > .full-row:nth-child(1) .drag-handle', 'dragend');
  });

  it('reorders columns via the header drag handle', () => {
    cy.visit('/?dragDropColumns=true');
    cy.wait('@moviesFetch');
    const captionRow = '.row-layout-space-between-center:not(.filter-row):not(.pager-row)';

    // Header drag-reorder only has a visible effect once Grid Settings'
    // own column selection is empty ("show everything") -- the visible
    // column order otherwise always follows the *selection's* order, not
    // the header drag's columnOrder. Clear it first, same as a real user
    // would have to.
    cy.get('[aria-label="Grid settings"]').click();
    cy.contains('[role="dialog"] button', 'Clear').click();
    cy.contains('[role="dialog"] button', 'Close').click();

    cy.get('.header-caption').eq(0).should('have.text', 'Id');
    cy.get('.header-caption').eq(1).should('have.text', 'Title');

    cy.dragAndDrop(`${captionRow} > div:nth-child(1) .drag-handle`, `${captionRow} > div:nth-child(2)`);

    cy.get('.header-caption').eq(0).should('have.text', 'Title');
    cy.get('.header-caption').eq(1).should('have.text', 'Id');

    // Dragging a column onto itself is a no-op, not a crash.
    cy.dragAndDrop(`${captionRow} > div:nth-child(1) .drag-handle`, `${captionRow} > div:nth-child(1)`);
    cy.get('.header-caption').eq(0).should('have.text', 'Title');
    cy.get('.header-caption').eq(1).should('have.text', 'Id');
  });
});
