// The Grid Settings dialog is the one part of this app that's structurally
// different from vanilla's port: it uses a real MUI <Select multiple> +
// <Menu>/<MenuItem> column picker instead of a hand-rolled dropdown, so
// every interaction below targets MUI's own DOM shape (role="combobox"/
// role="listbox"/role="option", MuiChip-deleteIcon, MuiBackdrop-root)
// rather than reusing vanilla's custom class names for the picker itself.
// The chip-based "Visible order" section, however, uses the same
// `.grid-settings-drag-chip` class and drag mechanism as vanilla.
describe('rs-data-grid (React) — Grid Settings dialog, advanced interactions', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.wait('@moviesFetch');
  });

  it('checking then unchecking a column toggles it on and back off', () => {
    cy.get('[aria-label="Grid settings"]').click();
    cy.get('[aria-labelledby="grid-settings-columns-label"]').click();
    cy.get('ul[role="listbox"]').contains('[role="option"]', 'overview').click();
    cy.get('.header-caption').should('have.length', 5);
    cy.get('ul[role="listbox"]').contains('[role="option"]', 'overview').click();
    cy.get('.header-caption').should('have.length', 4);
  });

  it("removes a selected column via its chip's remove button", () => {
    // The dialog opens with the 4 defaultVisibleColumns already selected
    // (that's the whole point of defaultVisibleColumns) -- checking
    // "overview" adds a 5th chip, it doesn't start a selection of one.
    cy.get('[aria-label="Grid settings"]').click();
    cy.get('[aria-labelledby="grid-settings-columns-label"]').click();
    cy.get('ul[role="listbox"]').contains('[role="option"]', 'overview').click();
    cy.get('body').type('{esc}'); // close the listbox so the chip row is unobstructed
    cy.get('.grid-settings-drag-chip').should('have.length', 5);
    cy.contains('.grid-settings-drag-chip', 'overview').find('.MuiChip-deleteIcon').click();
    cy.get('.grid-settings-drag-chip').should('have.length', 4);
    cy.get('.grid-settings-drag-chip').should('not.contain.text', 'overview');
  });

  it('reorders selected columns by dragging their chips, and the grid itself follows', () => {
    cy.get('[aria-label="Grid settings"]').click();
    // Clear the 4 defaults first so the two boxes checked below are the
    // *entire* selection, making the resulting chip order unambiguous.
    cy.contains('[role="dialog"] button', 'Clear').click();
    cy.get('[aria-labelledby="grid-settings-columns-label"]').click();
    cy.get('ul[role="listbox"]').contains('[role="option"]', 'title').click();
    cy.get('ul[role="listbox"]').contains('[role="option"]', 'genres').click();
    cy.get('body').type('{esc}');
    cy.get('.grid-settings-drag-chip').should('have.length', 2);
    cy.get('.grid-settings-drag-chip').eq(0).should('contain.text', 'title');
    cy.get('.grid-settings-drag-chip').eq(1).should('contain.text', 'genres');

    cy.dragAndDrop('.grid-settings-drag-chip:nth-child(1)', '.grid-settings-drag-chip:nth-child(2)');

    cy.get('.grid-settings-drag-chip').eq(0).should('contain.text', 'genres');
    cy.get('.grid-settings-drag-chip').eq(1).should('contain.text', 'title');

    // A dragleave clears the highlight without moving anything.
    const trigger = (selector, type) => cy.get(selector).trigger(type, { eventConstructor: 'DragEvent', dataTransfer: new DataTransfer() });
    trigger('.grid-settings-drag-chip:nth-child(1)', 'dragstart');
    trigger('.grid-settings-drag-chip:nth-child(2)', 'dragover');
    // The highlight really was applied -- not just "nothing moved", which
    // would trivially be true even if dragover's handler never ran at all.
    cy.get('.grid-settings-drag-chip:nth-child(2)').should('have.class', 'grid-settings-drag-chip-over');
    trigger('.grid-settings-drag-chip:nth-child(2)', 'dragleave');
    cy.get('.grid-settings-drag-chip:nth-child(2)').should('not.have.class', 'grid-settings-drag-chip-over');
    trigger('.grid-settings-drag-chip:nth-child(1)', 'dragend');
    cy.get('.grid-settings-drag-chip').eq(0).should('contain.text', 'genres');
    cy.get('.grid-settings-drag-chip').eq(1).should('contain.text', 'title');

    // Dragging a chip onto itself is a no-op, not a crash.
    cy.dragAndDrop('.grid-settings-drag-chip:nth-child(1)', '.grid-settings-drag-chip:nth-child(1)');
    cy.get('.grid-settings-drag-chip').eq(0).should('contain.text', 'genres');
    cy.get('.grid-settings-drag-chip').eq(1).should('contain.text', 'title');

    cy.contains('[role="dialog"] button', 'Close').click();
    cy.get('.header-caption').eq(0).should('have.text', 'Genres');
    cy.get('.header-caption').eq(1).should('have.text', 'Title');
  });

  it('a chip dragleave on a chip other than the currently-highlighted one leaves the highlight alone', () => {
    cy.get('[aria-label="Grid settings"]').click();
    cy.get('.grid-settings-drag-chip').should('have.length', 4);
    const trigger = (selector, type) => cy.get(selector).trigger(type, { eventConstructor: 'DragEvent', dataTransfer: new DataTransfer() });
    trigger('.grid-settings-drag-chip:nth-child(1)', 'dragstart');
    trigger('.grid-settings-drag-chip:nth-child(2)', 'dragover');
    cy.get('.grid-settings-drag-chip:nth-child(2)').should('have.class', 'grid-settings-drag-chip-over');
    trigger('.grid-settings-drag-chip:nth-child(3)', 'dragleave');
    cy.get('.grid-settings-drag-chip:nth-child(2)').should('have.class', 'grid-settings-drag-chip-over');
    trigger('.grid-settings-drag-chip:nth-child(1)', 'dragend');
  });

  it('the Clear button resets the selection to "show everything"', () => {
    cy.get('[aria-label="Grid settings"]').click();
    cy.get('[aria-labelledby="grid-settings-columns-label"]').click();
    cy.get('ul[role="listbox"]').contains('[role="option"]', 'overview').click();
    cy.get('body').type('{esc}');
    cy.contains('[role="dialog"] button', 'Clear').click();
    cy.get('.grid-settings-drag-chip').should('have.length', 0);
    cy.contains('[role="dialog"] button', 'Close').click();
    // Empty selection means "show everything" -- all 6 raw fields (id,
    // title, overview, genres, poster, release_date), not just the 4
    // defaultVisibleColumns seeded on first load.
    cy.get('.header-caption').should('have.length', 6);
  });

  it('pressing Escape closes the open column-picker listbox without closing the whole dialog', () => {
    cy.get('[aria-label="Grid settings"]').click();
    cy.get('[aria-labelledby="grid-settings-columns-label"]').click();
    cy.get('ul[role="listbox"]').should('be.visible');
    cy.get('body').type('{esc}');
    cy.get('ul[role="listbox"]').should('not.exist');
    cy.get('[role="dialog"]').should('exist');
  });

  it('reopening the dialog for a different action shows the right title each time', () => {
    cy.get('[aria-label="Grid settings"]').click();
    cy.contains('[role="dialog"] button', 'Close').click();
    cy.get('[aria-label="Grid settings"]').click();
    cy.get('.MuiDialogTitle-root').should('contain.text', 'Grid Settings');
  });

  it('clicking the dialog backdrop closes it', () => {
    cy.get('[aria-label="Grid settings"]').click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.get('.MuiBackdrop-root').click({ force: true });
    cy.get('[role="dialog"]').should('not.exist');
  });
});

describe('rs-data-grid (React) — corrupted persisted column selection', () => {
  it('falls back to defaultVisibleColumns when localStorage holds non-array JSON', () => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('rs-data-grid-selected-columns', JSON.stringify({ not: 'an array' }));
      },
    });
    cy.wait('@moviesFetch');
    cy.get('.header-caption').should('have.length', 4);
    cy.get('.header-caption').eq(0).should('have.text', 'Poster');
  });

  it('falls back to defaultVisibleColumns when localStorage holds unparseable JSON', () => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('rs-data-grid-selected-columns', 'not valid json{');
      },
    });
    cy.wait('@moviesFetch');
    cy.get('.header-caption').should('have.length', 4);
    cy.get('.header-caption').eq(0).should('have.text', 'Poster');
  });
});

describe('rs-data-grid (React) — Grid Settings with a columnless dataset', () => {
  it('shows an empty column-picker listbox when the rows have no fields at all', () => {
    cy.visit('/?emptyColumnsData=true');
    cy.get('[aria-label="Grid settings"]').click();
    cy.get('[aria-labelledby="grid-settings-columns-label"]').click();
    cy.get('ul[role="listbox"]').should('be.visible');
    cy.get('ul[role="listbox"] [role="option"]').should('have.length', 0);
  });
});

describe('rs-data-grid (React) — showIndex column', () => {
  it('renders a running row-index column when showIndex is enabled', () => {
    cy.visit('/?showIndex=true');
    cy.wait('@moviesFetch');
    cy.get('.index-header-cell').should('contain.text', '#');
    cy.get('.column-layout > .full-row').first().find('.index-cell').should('contain.text', '1');
  });
});
