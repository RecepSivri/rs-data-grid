describe('rs-data-grid (React) — pager edge cases', () => {
  it('the previous-page arrow navigates backward', () => {
    cy.visit('/');
    cy.wait('@moviesFetch');
    cy.contains('.page-numbers', '>').click();
    cy.contains('.column-layout > .full-row', 'Ariel').should('not.exist');
    cy.contains('.page-numbers', '<').click();
    cy.contains('.column-layout > .full-row', 'Ariel').should('be.visible');
  });

  it('clicking a page number jumps straight to that page', () => {
    cy.visit('/?currentPagingSize=3');
    cy.wait('@moviesFetch');
    cy.contains('.page-numbers', '2').click();
    cy.contains('.column-layout > .full-row', 'Ariel').should('not.exist');
  });

  it('a jump-to-last-page control appears once there are more pages than the visible window, and works', () => {
    cy.visit('/?currentPagingSize=3');
    cy.wait('@moviesFetch');
    // 25 rows / 3 per page = 9 pages, pageListSize is 5 -- the window
    // (1..5) can't reach page 9 on its own, so a dedicated "9" button
    // (distinct from the sliding page-number list) shows up to jump there.
    cy.contains('.page-numbers', '9').click();
    cy.get('.page-numbers.page-numbers-selected').should('contain.text', '9');
  });

  it('a custom pagingSizes list drives which page-size buttons render', () => {
    cy.visit('/?pagingSizes=5,15');
    cy.wait('@moviesFetch');
    cy.get('.pager-size').should('have.length', 2);
    cy.contains('.pager-size', '5').should('be.visible');
    cy.contains('.pager-size', '15').should('be.visible');
    cy.contains('.pager-size', '15').click();
    cy.get('.column-layout > .full-row').should('have.length', 15);
  });

  it('disabling pagination removes the pager entirely', () => {
    cy.visit('/?pagination=false');
    cy.wait('@moviesFetch');
    cy.get('.pager-row').should('not.exist');
    cy.get('.page-numbers').should('not.exist');
  });

  it('repeated next-page clicks slide the page-number window forward', () => {
    cy.visit('/?currentPagingSize=3');
    cy.wait('@moviesFetch');
    for (let i = 0; i < 7; i++) {
      cy.contains('.page-numbers', '>').click();
    }
    cy.get('.page-numbers.page-numbers-selected').should('contain.text', '8');
  });

  it('repeated previous-page clicks slide the page-number window backward, all the way to page 1', () => {
    cy.visit('/?currentPagingSize=3');
    cy.wait('@moviesFetch');
    for (let i = 0; i < 7; i++) {
      cy.contains('.page-numbers', '>').click();
    }
    for (let i = 0; i < 7; i++) {
      cy.contains('.page-numbers', '<').click();
    }
    cy.get('.page-numbers.page-numbers-selected').should('contain.text', '1');
  });

  it('a previous-page click far from the start slides the window back without clamping to page 1', () => {
    // 1 row per page -> 25 pages, deep enough that stepping back one page
    // from page 16 shifts the window while comfortably staying above 0.
    cy.visit('/?currentPagingSize=1');
    cy.wait('@moviesFetch');
    for (let i = 0; i < 15; i++) {
      cy.contains('.page-numbers', '>').click();
    }
    cy.get('.page-numbers.page-numbers-selected').should('contain.text', '16');
    cy.contains('.page-numbers', '<').click();
    cy.get('.page-numbers.page-numbers-selected').should('contain.text', '15');
  });

  it('a single previous-page click after reaching a late page also slides the window backward', () => {
    cy.visit('/?currentPagingSize=3');
    cy.wait('@moviesFetch');
    for (let i = 0; i < 7; i++) {
      cy.contains('.page-numbers', '>').click();
    }
    cy.get('.page-numbers.page-numbers-selected').should('contain.text', '8');
    cy.contains('.page-numbers', '<').click();
    cy.get('.page-numbers.page-numbers-selected').should('contain.text', '7');
  });

  it('clicking next while already on the last page is a no-op, not an out-of-bounds jump', () => {
    cy.visit('/?currentPagingSize=3');
    cy.wait('@moviesFetch');
    cy.contains('.page-numbers', '9').click();
    cy.get('.page-numbers.page-numbers-selected').should('contain.text', '9');
    cy.contains('.page-numbers', '>').click();
    cy.get('.page-numbers.page-numbers-selected').should('contain.text', '9');
  });

  it('clicking previous while already on the first page is a no-op', () => {
    cy.visit('/');
    cy.wait('@moviesFetch');
    cy.contains('.page-numbers', '<').click();
    cy.contains('.column-layout > .full-row', 'Ariel').should('be.visible');
  });
});
