describe('rs-data-grid (React) — header cell-border toggle combinations', () => {
  it('borderRadiusTop=false removes border-area-small from the caption row', () => {
    cy.visit('/?borderRadiusTop=false');
    cy.wait('@moviesFetch');
    cy.get('.row-layout-space-between-center:not(.filter-row):not(.pager-row)').should('not.have.class', 'border-area-small');
  });

  it('dragDropRows + headerColumnLines=false + bodyColumnLines=false drops border-right from the drag/filter lead cells', () => {
    cy.visit('/?dragDropRows=true&headerColumnLines=false&bodyColumnLines=false&showFilter=true');
    cy.wait('@moviesFetch');
    cy.get('.drag-header-cell').each($el => cy.wrap($el).should('not.have.class', 'border-right'));
  });

  it('showIndex + headerColumnLines=false + bodyColumnLines=false drops border-right from the index lead cells', () => {
    cy.visit('/?showIndex=true&headerColumnLines=false&bodyColumnLines=false&showFilter=true');
    cy.wait('@moviesFetch');
    cy.get('.index-header-cell').each($el => cy.wrap($el).should('not.have.class', 'border-right'));
  });
});

describe('rs-data-grid (React) — column-drag dragleave', () => {
  it('dragleave clears the column-drag-over highlight without moving anything', () => {
    cy.visit('/?dragDropColumns=true');
    cy.wait('@moviesFetch');
    cy.get('[aria-label="Grid settings"]').click();
    cy.contains('[role="dialog"] button', 'Clear').click();
    cy.contains('[role="dialog"] button', 'Close').click();

    const captionRow = '.row-layout-space-between-center:not(.filter-row):not(.pager-row)';
    const trigger = (selector, type) => cy.get(selector).trigger(type, { eventConstructor: 'DragEvent', dataTransfer: new DataTransfer() });
    trigger(`${captionRow} > div:nth-child(1) .drag-handle`, 'dragstart');
    trigger(`${captionRow} > div:nth-child(2)`, 'dragover');
    // The highlight really was applied -- not just "nothing moved", which
    // would trivially be true even if dragover's handler never ran at all.
    cy.get(`${captionRow} > div:nth-child(2)`).should('have.class', 'column-drag-over');
    trigger(`${captionRow} > div:nth-child(2)`, 'dragleave');
    cy.get(`${captionRow} > div:nth-child(2)`).should('not.have.class', 'column-drag-over');
    trigger(`${captionRow} > div:nth-child(1) .drag-handle`, 'dragend');
    cy.get('.header-caption').eq(0).should('have.text', 'Id');
    cy.get('.header-caption').eq(1).should('have.text', 'Title');
  });

  it('a dragleave on a column other than the currently-highlighted one leaves the highlight alone', () => {
    cy.visit('/?dragDropColumns=true');
    cy.wait('@moviesFetch');
    cy.get('[aria-label="Grid settings"]').click();
    cy.contains('[role="dialog"] button', 'Clear').click();
    cy.contains('[role="dialog"] button', 'Close').click();

    const captionRow = '.row-layout-space-between-center:not(.filter-row):not(.pager-row)';
    const trigger = (selector, type) => cy.get(selector).trigger(type, { eventConstructor: 'DragEvent', dataTransfer: new DataTransfer() });
    trigger(`${captionRow} > div:nth-child(1) .drag-handle`, 'dragstart');
    trigger(`${captionRow} > div:nth-child(2)`, 'dragover');
    cy.get(`${captionRow} > div:nth-child(2)`).should('have.class', 'column-drag-over');
    trigger(`${captionRow} > div:nth-child(3)`, 'dragleave');
    cy.get(`${captionRow} > div:nth-child(2)`).should('have.class', 'column-drag-over');
    trigger(`${captionRow} > div:nth-child(1) .drag-handle`, 'dragend');
  });
});

describe('rs-data-grid (React) — filter dropdown with no available values', () => {
  it('shows "No values" when every row has a blank value for that column', () => {
    cy.visit('/?blankFieldData=true');
    cy.get('[aria-label="Filter tags"]').click();
    cy.get('.filter-panel').should('contain.text', 'No values');
  });
});
