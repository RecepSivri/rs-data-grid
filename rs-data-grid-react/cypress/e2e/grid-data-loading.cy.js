describe('rs-data-grid (React) — data loading paths', () => {
  it('loads rows directly from a provided dataSource, bypassing fetch entirely', () => {
    cy.visit('/?localData=true');
    cy.contains('.column-layout > .full-row', 'Local Sample One').should('be.visible');
    cy.contains('.column-layout > .full-row', 'Local Sample Two').should('be.visible');
    cy.contains('.column-layout > .full-row', 'Local Sample Three').should('be.visible');
  });

  it('resolves a nested envelope via entrySection (a dot-path into the response body)', () => {
    cy.intercept('GET', 'https://gist.githubusercontent.com/**/movies-lite.json', {
      body: {
        meta: { count: 1 },
        results: [{ id: 101, title: 'Nested Envelope Movie', genres: 'Drama', release_date: 1000000000 }],
      },
    }).as('nestedFetch');
    cy.visit('/?entrySection=results');
    cy.wait('@nestedFetch');
    cy.contains('.column-layout > .full-row', 'Nested Envelope Movie').should('be.visible');
  });

  it('shows the built-in error state when the fetch fails', () => {
    cy.intercept('GET', 'https://gist.githubusercontent.com/**/movies-lite.json', {
      statusCode: 500,
      body: 'Internal Server Error',
    }).as('failedFetch');
    cy.visit('/');
    cy.wait('@failedFetch');
    cy.get('.grid-state-error').should('be.visible').and('contain.text', 'Request failed with status 500');
  });

  it('shows the empty state when neither dataSource nor fetchUrl is configured', () => {
    cy.visit('/?fetchUrl=');
    cy.get('.grid-state-empty').should('be.visible').and('contain.text', 'No data to display.');
  });

  it('falls back to a GET request when apiMethod is blank', () => {
    cy.intercept('GET', 'https://gist.githubusercontent.com/**/movies-lite.json', { fixture: 'movies.json' }).as('getFallback');
    cy.visit('/?apiMethod=');
    cy.wait('@getFallback');
    cy.get('.column-layout > .full-row').should('have.length', 10);
  });

  it('sends an authToken as a Bearer Authorization header', () => {
    cy.intercept('GET', 'https://gist.githubusercontent.com/**/movies-lite.json', req => {
      expect(req.headers.authorization).to.equal('Bearer test-token-123');
      req.reply({ fixture: 'movies.json' });
    }).as('authedFetch');
    cy.visit('/?authToken=test-token-123');
    cy.wait('@authedFetch');
    cy.get('.column-layout > .full-row').should('have.length', 10);
  });

  it('exports to PDF even when a row has a null value in a displayed column', () => {
    cy.visit('/?localData=true');
    cy.contains('.column-layout > .full-row', 'Local Sample Two').should('be.visible');
    cy.get('[aria-label="Export to PDF"]').click();
  });

  it('editing a row with a null field shows a blank input, not the literal "null"', () => {
    cy.visit('/?localData=true');
    cy.contains('.column-layout > .full-row', 'Local Sample Two').find('[aria-label="Edit row"]').click();
    cy.contains('.edit-row', 'release_date').find('input').should('have.value', '');
  });

  it('resolveDataPath resolves to nothing for a path that does not exist in the response', () => {
    cy.visit('/?entrySection=nested.nonexistent.path');
    cy.wait('@moviesFetch');
    cy.get('.grid-state-empty').should('be.visible');
  });

  it('filtering, searching, and sorting all handle a null value in the touched column', () => {
    cy.visit('/?localData=true');

    // Filter by release_date: selecting a real value excludes the null row.
    cy.get('[aria-label="Filter release_date"]').click();
    cy.get('.filter-panel').contains('.filter-option', '1000000000').find('input[type="checkbox"]').check();
    cy.contains('.column-layout > .full-row', 'Local Sample One').should('be.visible');
    cy.contains('.column-layout > .full-row', 'Local Sample Two').should('not.exist');
    cy.get('.filter-count').click();

    // A search matching nothing forces every field of every row -- including
    // the null release_date -- to actually be compared (some() can't
    // short-circuit on an earlier match), without crashing.
    cy.get('.global-search-input').type('zzz-no-match-zzz');
    cy.get('.column-layout > .full-row').should('have.length', 0);
    cy.get('.global-search-input').clear();
    cy.get('.column-layout > .full-row').should('have.length', 3);

    // Sorting the null-containing column falls back to string comparison
    // and doesn't crash.
    cy.get('[aria-label="Sort release_date"]').click();
    cy.get('.column-layout > .full-row').should('have.length', 3);
  });

  it('sorts a numeric column (Release_date) using genuine numeric comparison, not string order', () => {
    cy.visit('/');
    cy.wait('@moviesFetch');
    cy.get('[aria-label="Sort release_date"]').click();
    cy.get('.column-layout > .full-row').first().should('contain.text', 'The Simpsons Movie');
    cy.get('[aria-label="Sort release_date"]').click();
    cy.get('.column-layout > .full-row').first().should('contain.text', 'Metropolis');
  });
});
