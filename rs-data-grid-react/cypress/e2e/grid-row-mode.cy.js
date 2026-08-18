describe('rs-data-grid (React) — inline "row" CRUD mode', () => {
  beforeEach(() => {
    cy.visit('/?gridMode=row');
    cy.wait('@moviesFetch');
  });

  it('edits a row inline, with a confirm step before saving', () => {
    cy.get('.column-layout > .full-row').first().find('[aria-label="Edit row"]').click();
    cy.get('.column-layout > .full-row').first().find('input.inline-edit-input').eq(1).type(' (Row Mode Edit)');
    cy.get('.column-layout > .full-row').first().find('[aria-label="Save row"]').click();
    cy.get('[role="dialog"]').should('be.visible').and('contain.text', 'Are you sure you want to save the changes to this row?');
    cy.contains('[role="dialog"] button', 'Yes').click();
    cy.contains('.column-layout > .full-row', '(Row Mode Edit)').should('be.visible');
  });

  it('cancels an inline edit without saving', () => {
    cy.get('.column-layout > .full-row').first().find('[aria-label="Edit row"]').click();
    cy.get('.column-layout > .full-row').first().find('input.inline-edit-input').eq(1).type(' SHOULD NOT PERSIST');
    cy.get('.column-layout > .full-row').first().find('[aria-label="Cancel"]').click();
    cy.contains('.column-layout > .full-row', 'SHOULD NOT PERSIST').should('not.exist');
  });

  it('adds a row inline, with a confirm step before saving', () => {
    cy.get('[aria-label="Add row"]').click();
    cy.get('.column-layout > .full-row').first().find('input.inline-edit-input').eq(1).type('Inline Added Row');
    cy.get('.column-layout > .full-row').first().find('[aria-label="Save row"]').click();
    cy.get('[role="dialog"]').should('be.visible').and('contain.text', 'Are you sure you want to add this row?');
    cy.contains('[role="dialog"] button', 'Yes').click();
    cy.contains('.column-layout > .full-row', 'Inline Added Row').should('be.visible');
  });

  it('cancels adding a row inline', () => {
    cy.get('[aria-label="Add row"]').click();
    cy.get('.column-layout > .full-row').first().find('input.inline-edit-input').eq(1).type('Should Not Be Added');
    cy.get('.column-layout > .full-row').first().find('[aria-label="Cancel"]').click();
    cy.contains('.column-layout > .full-row', 'Should Not Be Added').should('not.exist');
  });
});

describe('rs-data-grid (React) — inline "row" mode editing a null field', () => {
  it('editing a row with a null field shows a blank input, not the literal "null"', () => {
    cy.visit('/?gridMode=row&localData=true');
    // "Local Sample Two" (release_date: null) at index 1 -- visible columns
    // for local data are title, genres, release_date (no poster).
    cy.get('.column-layout > .full-row').eq(1).find('[aria-label="Edit row"]').click();
    cy.get('.column-layout > .full-row').eq(1).find('input.inline-edit-input').eq(2).should('have.value', '');
  });
});
