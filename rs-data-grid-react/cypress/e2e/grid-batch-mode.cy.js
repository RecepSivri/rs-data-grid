describe('rs-data-grid (React) — "batch" CRUD mode', () => {
  beforeEach(() => {
    cy.visit('/?gridMode=batch');
    cy.wait('@moviesFetch');
  });

  // Batch mode's cells are always <input>s, never static text, even after a
  // save -- so assertions here read input .val(), not cy.contains(text)
  // (which only ever matches text NODES, and would silently "pass" a
  // never-actually-checked assertion against input values).

  it('edits a cell inline and commits it via Save batch changes, without a confirm step', () => {
    cy.get('.column-layout > .full-row').first().find('input.inline-edit-input').eq(1).type(' (Batch Edit)');
    cy.get('[aria-label="Save batch changes"]').click();
    cy.get('[role="dialog"]').should('not.exist');
    cy.get('.column-layout > .full-row').first().find('input.inline-edit-input').eq(1).invoke('val').should('include', '(Batch Edit)');
  });

  it('adds a new row via "Add row" and commits it on save', () => {
    cy.get('[aria-label="Add row"]').click();
    cy.get('.column-layout > .full-row').last().find('input.inline-edit-input').eq(1).type('Batch New Row');
    cy.get('[aria-label="Save batch changes"]').click();
    // addRow prepends to the store's data, so the committed row lands FIRST
    // on the page, not last where its still-uncommitted draft was.
    cy.get('.column-layout > .full-row').first().find('input.inline-edit-input').eq(1).should('have.value', 'Batch New Row');
  });

  it('removes a freshly-added draft row before it is ever saved', () => {
    cy.get('[aria-label="Add row"]').click();
    cy.get('.column-layout > .full-row').last().find('input.inline-edit-input').eq(1).type('Should Not Be Saved');
    cy.get('.column-layout > .full-row').last().find('[aria-label="Remove row"]').click();
    cy.get('.column-layout > .full-row input.inline-edit-input').each($input => {
      expect($input.val()).not.to.equal('Should Not Be Saved');
    });
  });

  it('deletes a row in batch mode through the same delete-confirm dialog as other modes', () => {
    cy.get('.column-layout > .full-row').first().find('input.inline-edit-input').eq(1).invoke('val').then(deletedTitle => {
      cy.get('.column-layout > .full-row').first().find('[aria-label="Delete row"]').click();
      cy.contains('[role="dialog"] button', 'Yes').click();
      cy.get('.column-layout > .full-row input.inline-edit-input').each($input => {
        expect($input.val()).not.to.equal(deletedTitle);
      });
    });
  });
});

describe('rs-data-grid (React) — batch save dirty-check against a null original value', () => {
  it('saves correctly when a completely untouched row has a null value in one of its columns', () => {
    cy.visit('/?localData=true&gridMode=batch');
    // "Local Sample Two" (release_date: null) is left completely
    // untouched -- editing a DIFFERENT row instead means its own
    // isDirty check (a .some() over every column) can't short-circuit on
    // an earlier dirty column and has to actually reach + compare
    // release_date, exercising the null fallback there.
    cy.get('.column-layout > .full-row').eq(0).find('input.inline-edit-input').eq(0).should('have.value', 'Local Sample One').type(' Edited');
    cy.get('[aria-label="Save batch changes"]').click();
    cy.get('.column-layout > .full-row').eq(0).find('input.inline-edit-input').eq(0).should('have.value', 'Local Sample One Edited');
    cy.get('.column-layout > .full-row').eq(1).find('input.inline-edit-input').eq(0).should('have.value', 'Local Sample Two');
  });
});
