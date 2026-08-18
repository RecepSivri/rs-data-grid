describe('rs-data-grid (React) — styling / visibility toggles', () => {
  it('hides the entire toolbar when every toolbar-producing flag is off', () => {
    cy.visit('/?showSearch=false&showAdd=false&showGridSettings=false&exportExcel=false&exportPDF=false');
    cy.wait('@moviesFetch');
    cy.get('.grid-toolbar').should('not.exist');
  });

  it('shows the toolbar for batch mode alone, even with every other toolbar flag off', () => {
    // The toolbar's own visibility check short-circuits on the first true
    // operand -- every other test with gridMode=batch also has showSearch
    // (etc) at their default `true`, so this is the only scenario that
    // actually reaches the gridMode === 'batch' operand itself.
    cy.visit('/?showSearch=false&showAdd=false&showGridSettings=false&exportExcel=false&exportPDF=false&gridMode=batch');
    cy.wait('@moviesFetch');
    cy.get('.grid-toolbar').should('exist');
  });

  it('showActions=false removes the actions column from header, filter row, and body', () => {
    cy.visit('/?showActions=false&showFilter=true');
    cy.wait('@moviesFetch');
    cy.get('.actions-header-cell').should('not.exist');
    cy.get('.column-layout > .full-row [aria-label="Edit row"]').should('not.exist');
    cy.get('.column-layout > .full-row [aria-label="Delete row"]').should('not.exist');
  });

  it('showFilter=false removes the filter row entirely', () => {
    cy.visit('/?showFilter=false');
    cy.wait('@moviesFetch');
    cy.get('.filter-row').should('not.exist');
    cy.get('[aria-label="Filter title"]').should('not.exist');
  });

  it('showSort=false removes the sort toggle buttons', () => {
    cy.visit('/?showSort=false');
    cy.wait('@moviesFetch');
    cy.get('.sort-toggle').should('not.exist');
  });

  it('tableBorder=false drops the border-header/row-style/filter-row-border classes', () => {
    cy.visit('/?tableBorder=false');
    cy.wait('@moviesFetch');
    cy.get('.row-layout-space-between-center:not(.filter-row):not(.pager-row)').should('not.have.class', 'border-header');
    cy.get('.column-layout > .full-row').first().should('not.have.class', 'row-style');
    cy.get('.filter-row').should('not.have.class', 'filter-row-border');
  });

  it('headerColumnLines=false and bodyColumnLines=false drop the border-right class from cells', () => {
    cy.visit('/?headerColumnLines=false&bodyColumnLines=false');
    cy.wait('@moviesFetch');
    cy.get('.row-layout-space-between-center:not(.filter-row):not(.pager-row) > div').each($el => {
      cy.wrap($el).should('not.have.class', 'border-right');
    });
  });

  it('bodyRowLines=false removes row-style-bottom from non-last rows', () => {
    cy.visit('/?bodyRowLines=false');
    cy.wait('@moviesFetch');
    cy.get('.column-layout > .full-row').first().should('not.have.class', 'row-style-bottom');
  });

  it('borderRadiusBottom=true adds border-area-small to the last row on the page', () => {
    cy.visit('/?borderRadiusBottom=true');
    cy.wait('@moviesFetch');
    cy.get('.column-layout > .full-row').last().should('have.class', 'border-area-small');
  });

  it('diagonalRow=false removes the alternating row-background class', () => {
    cy.visit('/?diagonalRow=false');
    cy.wait('@moviesFetch');
    cy.get('.column-layout > .full-row').eq(1).should('not.have.class', 'row-background');
  });

  it('adding a row inline renders drag/index lead cells and respects tableBorder/bodyColumnLines', () => {
    cy.visit('/?gridMode=row&dragDropRows=true&showIndex=true&tableBorder=false&bodyColumnLines=false');
    cy.wait('@moviesFetch');
    cy.get('[aria-label="Add row"]').click();
    cy.get('.column-layout > .full-row').first().find('.drag-cell').should('exist').and('not.have.class', 'border-right');
    cy.get('.column-layout > .full-row').first().find('.index-cell').should('exist').and('not.have.class', 'border-right');
    cy.get('.column-layout > .full-row').first().should('not.have.class', 'row-style');
  });

  it('adding a batch draft row renders drag/index lead cells and respects tableBorder/bodyColumnLines', () => {
    cy.visit('/?gridMode=batch&dragDropRows=true&showIndex=true&tableBorder=false&bodyColumnLines=false');
    cy.wait('@moviesFetch');
    cy.get('[aria-label="Add row"]').click();
    cy.get('.column-layout > .full-row').last().find('.drag-cell').should('exist').and('not.have.class', 'border-right');
    cy.get('.column-layout > .full-row').last().find('.index-cell').should('exist').and('not.have.class', 'border-right');
    cy.get('.column-layout > .full-row').last().should('not.have.class', 'row-style');
  });
});
