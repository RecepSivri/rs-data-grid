describe('rs-data-grid (React) — single-spa lifecycle (update/unmount)', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.wait('@moviesFetch');
  });

  it('an update() with a new pageListSize reshapes the pager window', () => {
    cy.window().then(win => win.__rsGridApp.update({ pageListSize: 3 }));
    // 25 rows / page size 10 = 3 pages, which now fits entirely inside a
    // 3-wide window -- so no jump-to-last button, just "<", 1, 2, 3, ">".
    cy.get('.page-numbers').should('have.length', 5);
  });

  it('an update() with a new currentPagingSize changes the page size', () => {
    cy.window().then(win => win.__rsGridApp.update({ currentPagingSize: 20 }));
    cy.get('.column-layout > .full-row').should('have.length', 20);
  });

  it('an update() with a changed fetchNonce triggers a manual refetch', () => {
    cy.window().then(win => win.__rsGridApp.update({}, Date.now()));
    cy.wait('@moviesFetch');
  });

  it('unmount() tears the grid down cleanly', () => {
    cy.window().then(win => win.__rsGridApp.unmount());
    cy.get('#root').should('be.empty');
  });

  it('an update() with a new theme switches the dark-mode background', () => {
    cy.window().then(win => win.__rsGridApp.update({ theme: 'dark' }));
    cy.get('[data-rg-theme="dark"]').should('exist');
    cy.get('#root > div').should('have.css', 'background-color', 'rgb(28, 30, 33)');
  });
});

describe('rs-data-grid (React) — mounts directly in dark theme', () => {
  it('mount() with theme=dark renders dark from the very first paint', () => {
    cy.visit('/?theme=dark');
    cy.wait('@moviesFetch');
    cy.get('[data-rg-theme="dark"]').should('exist');
    cy.get('#root > div').should('have.css', 'background-color', 'rgb(28, 30, 33)');
  });
});

describe('rs-data-grid (React) — dataSource reference changes after mount', () => {
  it('treats the first post-mount reference change as spurious, and genuinely reloads on the second', () => {
    cy.visit('/?localData=true');
    cy.contains('.column-layout > .full-row', 'Local Sample One').should('be.visible');

    // First reference change: skipped (isFirstDataSource guards against a
    // spurious first "change" some hosts produce even when nothing really
    // changed) -- the grid keeps showing exactly what it already had.
    cy.window().then(win =>
      win.__rsGridApp.update({
        dataSource: [
          { id: 1, title: 'Local Sample One', genres: 'Drama', release_date: 1000000000 },
          { id: 2, title: 'Local Sample Two', genres: 'Comedy', release_date: null },
          { id: 3, title: 'Local Sample Three', genres: 'Action', release_date: 1200000000 },
        ],
      })
    );
    cy.contains('.column-layout > .full-row', 'Local Sample One').should('be.visible');

    // Second reference change: genuinely reloads.
    cy.window().then(win => win.__rsGridApp.update({ dataSource: [{ id: 9, title: 'Genuinely New Row', genres: 'Horror', release_date: 500 }] }));
    cy.contains('.column-layout > .full-row', 'Genuinely New Row').should('be.visible');
    cy.contains('.column-layout > .full-row', 'Local Sample One').should('not.exist');
  });

  it('a stale drag-reordered column order still shows a brand-new field, appended at the end', () => {
    cy.visit('/?localData=true&dragDropColumns=true');
    cy.get('[aria-label="Grid settings"]').click();
    cy.contains('[role="dialog"] button', 'Clear').click();
    cy.contains('[role="dialog"] button', 'Close').click();

    const captionRow = '.row-layout-space-between-center:not(.filter-row):not(.pager-row)';
    cy.dragAndDrop(`${captionRow} > div:nth-child(1) .drag-handle`, `${captionRow} > div:nth-child(2)`);

    // Burn through the spurious first reference change (see the test above).
    cy.window().then(win => win.__rsGridApp.update({ dataSource: [{ id: 1, title: 'Local Sample One', genres: 'Drama', release_date: 1000000000 }] }));
    // This one actually introduces a field ("extra_field") that was never
    // part of the drag-reordered columnOrder.
    cy.window().then(win =>
      win.__rsGridApp.update({ dataSource: [{ id: 1, title: 'Local Sample One', genres: 'Drama', release_date: 1000000000, extra_field: 'z' }] })
    );
    cy.get('.header-caption').last().should('have.text', 'Extra_field');
  });
});
