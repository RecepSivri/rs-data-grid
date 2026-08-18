import '@cypress/code-coverage/support';
import './commands.js';

// Runs before every spec. The standalone demo (npm run dev) always points
// at the real movies-lite gist, which is exactly the kind of external
// dependency E2E tests shouldn't rely on -- every spec intercepts that
// fetch and serves the local fixture instead, so runs are fast, offline,
// and deterministic regardless of what that gist contains today.
beforeEach(() => {
  cy.intercept('GET', 'https://gist.githubusercontent.com/**/movies-lite.json', {
    fixture: 'movies.json',
  }).as('moviesFetch');
});

// Opt-in: one screenshot of the final state of every single test, pass or
// fail -- on top of Cypress's own automatic on-failure screenshots. Off by
// default (adds real time + a lot of PNGs to every run); turn on with
// `npm run e2e:screenshots`. Named after the spec/describe/it title by
// default (no name passed), so every one of them lands in its own file with
// no collisions.
afterEach(() => {
  if (Cypress.env('SCREENSHOTS')) {
    cy.screenshot({ capture: 'viewport' });
  }
});
