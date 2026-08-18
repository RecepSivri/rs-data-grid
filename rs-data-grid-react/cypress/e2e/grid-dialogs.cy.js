// MUI's <Dialog> unmounts entirely when closed (no "visible but closed"
// state like vanilla's native <dialog>), and its backdrop is a real,
// separate `.MuiBackdrop-root` overlay element -- not a clickable padding
// area of the dialog paper itself, so backdrop-dismissal tests click that
// element directly instead of a specific coordinate inside the dialog.
describe('rs-data-grid (React) — dialog dismissal paths', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.wait('@moviesFetch');
  });

  it('clicking the confirm-dialog backdrop cancels a delete, same as clicking No', () => {
    cy.get('.column-layout > .full-row').then($rows => {
      const before = $rows.length;
      cy.get('.column-layout > .full-row').first().find('[aria-label="Delete row"]').click();
      cy.get('[role="dialog"]').should('be.visible');
      cy.get('.MuiBackdrop-root').click({ force: true });
      cy.get('[role="dialog"]').should('not.exist');
      cy.get('.column-layout > .full-row').should('have.length', before);
    });
  });

  it('the Cancel button on the add-row dialog discards the draft', () => {
    cy.get('[aria-label="Add row"]').click();
    cy.contains('.edit-row', 'title').find('input').type('Should Not Be Added');
    cy.contains('[role="dialog"] button', 'Cancel').click();
    cy.get('.global-search-input').type('Should Not Be Added');
    cy.get('.column-layout > .full-row').should('have.length', 0);
  });

  it('clicking the edit-row-dialog backdrop discards the draft, same as Cancel', () => {
    cy.get('[aria-label="Add row"]').click();
    cy.contains('.edit-row', 'title').find('input').type('Should Not Be Added Either');
    cy.get('.MuiBackdrop-root').click({ force: true });
    cy.get('[role="dialog"]').should('not.exist');
    cy.get('.global-search-input').type('Should Not Be Added Either');
    cy.get('.column-layout > .full-row').should('have.length', 0);
  });

  it('reopening the dialog for a different action shows the right title each time', () => {
    cy.get('[aria-label="Add row"]').click();
    cy.contains('[role="dialog"] button', 'Cancel').click();
    cy.get('.column-layout > .full-row').first().find('[aria-label="Edit row"]').click();
    cy.get('.MuiDialogTitle-root').should('contain.text', 'Edit row');
  });
});
