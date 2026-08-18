// Cypress E2E pass for the React grid, ported 1:1 from the vanilla JS
// project's grid.cy.js. Selectors are identical except where MUI's real
// <Dialog> component behaves differently from vanilla's hand-rolled
// <dialog>: a closed MUI Dialog unmounts entirely (`.should('not.exist')`,
// not `.should('not.be.visible')`), and its Yes/No/Save/Cancel buttons have
// no aria-label or `.rs-dialog-button` class -- only text content.
describe('rs-data-grid (React) — demo page', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.wait('@moviesFetch');
  });

  it('loads the fixture data and renders the default (Grid-Settings-seeded) columns', () => {
    cy.get('.header-caption').should('have.length', 4);
    cy.get('.header-caption').then($captions => {
      const text = [...$captions].map(el => el.textContent);
      expect(text).to.deep.equal(['Poster', 'Title', 'Genres', 'Release_date']);
    });

    // First page, default page size (10).
    cy.get('.column-layout > .full-row').should('have.length', 10);
    cy.contains('.column-layout > .full-row', 'Ariel').should('be.visible');
    cy.contains('.column-layout > .full-row', 'The Dark').should('be.visible');
    cy.contains('.column-layout > .full-row', 'The Fifth Element').should('not.exist'); // page 2 only
  });

  it('renders the poster column as image thumbnails, not raw URLs', () => {
    cy.get('.column-layout > .full-row').first().find('img.cell-thumbnail').should('have.attr', 'src').and('include', 'image.tmdb.org');
  });

  it('paginates: page-size switch and next-page navigation both change the visible rows', () => {
    cy.contains('.pager-size', '20').click();
    cy.get('.column-layout > .full-row').should('have.length', 20);
    cy.contains('.column-layout > .full-row', 'The Fifth Element').should('be.visible');

    cy.contains('.pager-size', '10').click();
    cy.get('.column-layout > .full-row').should('have.length', 10);

    cy.get('.page-numbers').contains('>').click();
    cy.contains('.column-layout > .full-row', 'Ariel').should('not.exist');
    cy.contains('.column-layout > .full-row', 'The Fifth Element').should('be.visible');
  });

  it('global search narrows the rows to whatever matches, across pages', () => {
    cy.get('.global-search-input').type('Star Wars');
    cy.get('.column-layout > .full-row').should('have.length', 1);
    cy.contains('.column-layout > .full-row', 'Star Wars').should('be.visible');
  });

  it('a column filter narrows to the checked value(s) only', () => {
    cy.get('[aria-label="Filter title"]').click();
    cy.get('.filter-panel').contains('.filter-option', 'Forrest Gump').find('input[type="checkbox"]').check();
    cy.get('.column-layout > .full-row').should('have.length', 1);
    cy.contains('.column-layout > .full-row', 'Forrest Gump').should('be.visible');

    // Clearing it via the badge restores every row.
    cy.get('.filter-count').click();
    cy.get('.column-layout > .full-row').should('have.length', 10);
  });

  it('unchecking a filter checkbox removes just that value from the selection', () => {
    cy.get('[aria-label="Filter title"]').click();
    cy.get('.filter-panel').contains('.filter-option', 'Forrest Gump').find('input[type="checkbox"]').check();
    cy.get('.column-layout > .full-row').should('have.length', 1);
    cy.get('.filter-panel').contains('.filter-option', 'Forrest Gump').find('input[type="checkbox"]').uncheck();
    cy.get('.column-layout > .full-row').should('have.length', 10);
  });

  it('the "Clear selection" button inside an open filter panel clears it without closing the panel', () => {
    cy.get('[aria-label="Filter title"]').click();
    cy.get('.filter-panel').contains('.filter-option', 'Forrest Gump').find('input[type="checkbox"]').check();
    cy.get('.column-layout > .full-row').should('have.length', 1);
    cy.get('.filter-clear').contains('Clear selection').click();
    cy.get('.column-layout > .full-row').should('have.length', 10);
    cy.get('.filter-panel').should('be.visible');
  });

  it('clicking an open filter toggle again closes it', () => {
    cy.get('[aria-label="Filter title"]').click();
    cy.get('.filter-panel').should('be.visible');
    cy.get('[aria-label="Filter title"]').click();
    cy.get('.filter-panel').should('not.exist');
  });

  it('clicking outside an open filter dropdown closes it', () => {
    cy.get('[aria-label="Filter title"]').click();
    cy.get('.filter-panel').should('be.visible');
    cy.get('.global-search-input').click();
    cy.get('.filter-panel').should('not.exist');
  });

  it('sorting by title toggles descending, then ascending, across the whole dataset (not just the current page)', () => {
    cy.get('[aria-label="Sort title"]').click();
    // Descending: alphabetically-last title in the 25-row fixture leads.
    cy.get('.column-layout > .full-row').first().should('contain.text', 'Unforgiven');

    cy.get('[aria-label="Sort title"]').click();
    // Ascending: alphabetically-first title leads.
    cy.get('.column-layout > .full-row').first().should('contain.text', '9 Songs');

    // A third click toggles back to descending on the same column.
    cy.get('[aria-label="Sort title"]').click();
    cy.get('.column-layout > .full-row').first().should('contain.text', 'Unforgiven');
  });

  it('adds a row through the popup dialog', () => {
    cy.get('[aria-label="Add row"]').click();
    cy.get('[role="dialog"]').should('be.visible').and('contain.text', 'Add row');
    cy.contains('.edit-row', 'title').find('input').type('Cypress: A New Hope');
    cy.contains('button', 'Save').click();
    cy.get('[role="dialog"]').should('not.exist');
    cy.get('.global-search-input').type('Cypress: A New Hope');
    cy.get('.column-layout > .full-row').should('have.length', 1);
  });

  it('edits a row through the popup dialog', () => {
    cy.contains('.column-layout > .full-row', 'Ariel').find('[aria-label="Edit row"]').click();
    cy.get('[role="dialog"]').should('contain.text', 'Edit row');
    cy.contains('.edit-row', 'title').find('input').clear().type('Ariel (Edited)');
    cy.contains('button', 'Save').click();
    cy.contains('.column-layout > .full-row', 'Ariel (Edited)').should('be.visible');
  });

  it('deletes a row after confirming, and keeps it when declining', () => {
    cy.contains('.column-layout > .full-row', 'Four Rooms').find('[aria-label="Delete row"]').click();
    cy.get('.confirm-message').should('contain.text', 'Are you sure you want to delete this row?');
    cy.contains('[role="dialog"] button', 'No').click();
    cy.contains('.column-layout > .full-row', 'Four Rooms').should('be.visible');

    cy.contains('.column-layout > .full-row', 'Four Rooms').find('[aria-label="Delete row"]').click();
    cy.contains('[role="dialog"] button', 'Yes').click();
    cy.contains('.column-layout > .full-row', 'Four Rooms').should('not.exist');
  });

  it('Grid Settings changes which columns are visible, and it persists across a reload', () => {
    cy.get('[aria-label="Grid settings"]').click();
    cy.get('[aria-labelledby="grid-settings-columns-label"]').click();
    cy.get('ul[role="listbox"]').contains('[role="option"]', 'overview').click();
    cy.get('body').type('{esc}'); // close the Select's own listbox popover
    cy.contains('[role="dialog"] button', 'Close').click();

    cy.get('.header-caption').should('have.length', 5);
    cy.get('.header-caption').should('contain.text', 'Overview');

    cy.reload();
    cy.wait('@moviesFetch');
    cy.get('.header-caption').should('have.length', 5);
    cy.get('.header-caption').should('contain.text', 'Overview');
  });

  it('export buttons are present and clickable', () => {
    cy.get('[aria-label="Export to Excel"]').should('be.visible').click();
    cy.get('[aria-label="Export to PDF"]').should('be.visible').click();
  });
});
