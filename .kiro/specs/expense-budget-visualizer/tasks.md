# Implementation Plan: Expense_Budget_Visualizer

## Overview

The implementation builds a client-side web application with no backend and no external libraries. All application logic lives in a single Vanilla JavaScript file (`js/app.js`) organized into object-literal modules: `StateManager`, `Storage`, `Validator`, `ListRenderer`, `BalanceRenderer`, `ChartRenderer`, `FormController`, and `App`. Static structure lives in `index.html` (four non-overlapping regions) and styling in `css/style.css`.

A centralized `StateManager` holds the transaction array and uses an observer (publish-subscribe) pattern to notify the list, balance, and chart renderers on every mutation. Validation, summation, formatting, and chart math are extracted as pure functions so they can be covered by property-based tests. `Storage` wraps Local Storage access and degrades to in-memory storage when persistence is unavailable or the quota is exceeded. Transactions are stored in insertion order but displayed newest-first.

Because the entire application is a single JS file, every implementation sub-task that adds a module to `js/app.js` edits that same file; those tasks are serialized across consecutive waves in the dependency graph to prevent write conflicts. Test tasks write to separate files under `test/` and are interleaved in parallel with the next implementation step wherever their target code is already complete.

## Tasks

- [ ] 1. Set up project structure, HTML, CSS, and test harness
  - [ ] 1.1 Create `index.html` with four non-overlapping regions (Total_Balance, Input_Form, Transaction_List, Pie_Chart) referencing `css/style.css` and `js/app.js`
    - Add the Input_Form with an Item_Name input (`maxlength="100"`), an Amount input, and a Category `<select>` offering Food, Transport, and Fun, plus a Validation_Message element
    - Add a scrollable Transaction_List container, a Total_Balance display element, and a `<canvas>` for the Pie_Chart
    - _Requirements: 1.1, 1.2, 7.1, 7.5, 10.1_
  - [ ] 1.2 Create `css/style.css` laying out the four regions with no overlap and adjacent regions separated by at least a 16px gap or a visible border, plus base theming
    - Set a scrollable Transaction_List (`overflow-y: auto`), a minimum text size of 16px for all text, and a text-to-background contrast ratio of at least 4.5:1
    - _Requirements: 2.1, 7.3, 10.1, 10.2, 10.3_
  - [ ] 1.3 Set up the test harness with Vitest, jsdom, fast-check, and Playwright
    - Add `package.json`, `vitest.config.js` (jsdom environment), a Playwright config, and the `test/` directory structure (`properties/`, `unit/`, `integration/`, `smoke/`)
    - _Requirements: 7.1_

- [ ] 2. Implement pure data helpers (Transaction factory, summation, formatting, chart math)
  - [ ] 2.1 Implement the Transaction factory and the `sumAmounts` / `formatBalance` pure helpers in `js/app.js`
    - Transaction factory generates a unique `id` (`crypto.randomUUID()` with a `Date.now()` + `Math.random()` fallback) and a `createdAt` timestamp; `sumAmounts` sums all transaction amounts; `formatBalance` formats a number to exactly 2 decimal places
    - _Requirements: 4.1_
  - [ ]* 2.2 Write property test for balance summation and formatting (`test/properties/balance.test.js`)
    - **Property 7: Total balance equals the sum of all amounts and is formatted to two decimal places**
    - **Validates: Requirements 4.1, 4.2, 4.3**
  - [ ] 2.3 Implement the `calculateCategoryTotals` and `calculateSliceAngles` pure helpers in `js/app.js`
    - `calculateCategoryTotals` sums amounts per category; `calculateSliceAngles` produces one angle span per active category equal to `(categoryTotal / grandTotal) × 2π`, starting from -π/2, skipping zero-total categories
    - _Requirements: 5.1, 5.5_
  - [ ]* 2.4 Write property test for chart proportions and segment count (`test/properties/chart.test.js`)
    - **Property 8: Pie chart segments are proportional, limited to active categories, and labeled**
    - **Validates: Requirements 5.1, 5.5**

- [ ] 3. Implement the Validator
  - [ ] 3.1 Implement the Validator (`validateItemName`, `validateAmount`, `validateCategory`, composite `validate`) in `js/app.js`
    - Item_Name must be non-empty after trimming; Amount must parse to a finite number in [0.01, 999,999,999.99]; Category must be Food, Transport, or Fun; `validate` returns either a validated transaction payload or `{ valid: false, field, message }`
    - _Requirements: 1.3, 1.4, 1.5_
  - [ ]* 3.2 Write property tests for validation (`test/properties/validation.test.js`)
    - **Property 1: Validation rejects incomplete or whitespace-only inputs**
    - **Validates: Requirements 1.3, 1.4**
    - **Property 2: Amount range validation**
    - **Validates: Requirements 1.5**

- [ ] 4. Implement the Storage module
  - [ ] 4.1 Implement the Storage module (`isAvailable`, `save`, `load`) in `js/app.js`
    - Probe Local Storage availability once at startup (try/catch test key); `save` JSON-stringifies and calls `setItem`, catching `QuotaExceededError`; `load` parses and validates each entry (non-empty `id`, non-empty `itemName`, `amount` in range, valid `category`), dropping invalid entries; fall back to an in-memory array when Local Storage is unavailable
    - _Requirements: 6.1, 6.2, 6.4, 6.5, 6.6, 6.7_
  - [ ]* 4.2 Write property tests for storage (`test/properties/storage.test.js`)
    - **Property 9: Storage round-trip preserves transaction data**
    - **Validates: Requirements 6.4**
    - **Property 10: Loading excludes invalid stored data**
    - **Validates: Requirements 6.6**
  - [ ]* 4.3 Write unit tests for storage fallback and quota errors
    - `test/unit/storage-fallback.test.js`: mock unavailable Local Storage, verify the error message and in-memory operation; `test/unit/quota-error.test.js`: mock `QuotaExceededError` on `setItem`, verify a message is shown and the transaction is retained in memory
    - _Requirements: 6.5, 6.7_

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement the StateManager
  - [ ] 6.1 Implement the StateManager (`init`, `add`, `delete`, `getAll`, `subscribe`, `notify`) in `js/app.js`
    - Store transactions in insertion order; `add` appends, persists via Storage, and notifies listeners; `delete` removes by id, persists, and notifies; `getAll` returns a newest-first copy for display; `subscribe` registers renderers
    - _Requirements: 1.6, 2.3, 2.4, 6.1, 6.2_
  - [ ]* 6.2 Write property tests for state add/delete behavior (`test/properties/state.test.js`)
    - **Property 3: Adding a valid transaction grows the list and places it at the top**
    - **Validates: Requirements 1.6, 2.3**
    - **Property 6: Delete removes exactly the target and preserves all others**
    - **Validates: Requirements 2.4, 3.2, 3.3**

- [ ] 7. Implement the renderers
  - [ ] 7.1 Implement the ListRenderer in `js/app.js`
    - Clear and rebuild the list with `createElement` / `textContent` (no `innerHTML`), newest-first, each row showing Item_Name, formatted Amount, Category, and a delete control; show an empty-state message when there are no transactions; use event delegation on the container to route delete clicks to `StateManager.delete(id)`
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 3.1_
  - [ ]* 7.2 Write property test for rendered rows (`test/properties/render.test.js`)
    - **Property 5: Rendered rows display required fields and a delete control**
    - **Validates: Requirements 2.2, 3.1**
  - [ ] 7.3 Implement the BalanceRenderer in `js/app.js`
    - Render `formatBalance(sumAmounts(transactions))` into the Total_Balance element on every notification
    - _Requirements: 4.1, 4.2, 4.3_
  - [ ] 7.4 Implement the ChartRenderer in `js/app.js`
    - Clear the canvas, compute category totals and slice angles via the pure helpers, draw one filled arc per active category labeled with its name, and show a centered empty-state message when there are no transactions or the grand total is zero; degrade to the empty-state message if the 2D context is unavailable
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ]* 7.5 Write unit tests for the renderers
    - `test/unit/list-renderer.test.js`: list scrollability and delete-without-confirmation; `test/unit/chart-renderer.test.js`: canvas cleared and redrawn on add/delete; `test/unit/empty-states.test.js`: list "no transactions" and chart "no spending data" messages when empty
    - _Requirements: 2.1, 2.5, 3.2, 5.2, 5.3, 5.4_

- [ ] 8. Implement the FormController
  - [ ] 8.1 Implement the FormController in `js/app.js`
    - On submit, read Item_Name / Amount / Category, call `Validator.validate`, show a Validation_Message on failure (and keep field values), or construct a Transaction and call `StateManager.add` then `clearForm` on success; ensure the Item_Name input carries `maxlength="100"`; clear the message on the next submission or when the user edits the offending field
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6_
  - [ ]* 8.2 Write property test for form clearing (`test/properties/form.test.js`)
    - **Property 4: Successful submission clears the form fields**
    - **Validates: Requirements 1.6**
  - [ ]* 8.3 Write unit tests for the FormController (`test/unit/form.test.js`)
    - Verify the form contains Item_Name / Amount / Category fields with correct input types and `maxlength="100"`; verify the Category field offers exactly Food, Transport, and Fun; verify activating a delete control removes the row with no confirmation prompt
    - _Requirements: 1.1, 1.2, 3.2_

- [ ] 9. Wire everything in the App entry point
  - [ ] 9.1 Implement `App.init` in `js/app.js`
    - On `DOMContentLoaded`, check `Storage.isAvailable()` and show an error banner if unavailable, call `Storage.load()` to retrieve validated transactions, initialize the StateManager, subscribe the three renderers, bind the FormController submit handler and the ListRenderer delete delegation, and trigger the initial render
    - _Requirements: 6.3, 6.5, 7.2_
  - [ ]* 9.2 Write integration tests (`test/integration/persistence.test.js`)
    - Seed Local Storage with known transactions, load the app, and verify the list, balance, and chart populate (round-trip end-to-end); mock Local Storage, add/delete transactions, and verify `setItem` is called with the correct serialized data
    - _Requirements: 6.1, 6.2, 6.3_
  - [ ]* 9.3 Write smoke tests
    - `test/smoke/structure.test.js`: exactly one CSS file in `css/`, one JS file in `js/`, one HTML file referencing both, no external `<script src="https://...">` or framework tags, no `fetch` / `XMLHttpRequest` / `WebSocket` to external endpoints, and four region bounding rects that do not overlap with adjacent gaps ≥ 16px or a visible border; `test/smoke/accessibility.test.js`: computed contrast ratio ≥ 4.5:1 and computed font-size ≥ 16px for text elements
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 10.1, 10.2, 10.3_
  - [ ]* 9.4 Write performance benchmark test (`test/smoke/performance.test.js`)
    - With up to 1,000 transactions stored, add and delete a transaction and assert the Transaction_List, Total_Balance, and Pie_Chart all visibly update within 200ms
    - _Requirements: 9.1_
  - [ ]* 9.5 Write cross-browser end-to-end tests (`test/integration/browser.test.js` via Playwright)
    - Run the full workflow (add, view list, check balance, view chart, delete) in the two most recent major versions of Google Chrome, Mozilla Firefox, Microsoft Edge, and Apple Safari; verify stored Transactions are retrieved and displayed after closing and reopening each browser
    - _Requirements: 8.1, 8.2_

- [ ] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; core implementation tasks (no `*`) are required and MUST be implemented.
- All application logic is a single Vanilla JavaScript file (`js/app.js`). Because every implementation sub-task edits that same file, those tasks are serialized across consecutive waves in the dependency graph to prevent write conflicts; test tasks write to separate files under `test/` and run in parallel where their target code is already complete.
- Each implementation task references the specific acceptance criteria it satisfies; property tests reference the design property number and the requirements clause they validate.
- Checkpoints ensure incremental validation before moving on to the renderers/wiring and again at the end.
- Property-based tests use fast-check with a minimum of 100 iterations; unit, integration, and smoke tests use Vitest with jsdom; cross-browser tests use Playwright.
- Contrast (Requirement 10.2) and cross-browser behavior (Requirements 8.1, 8.2) are partially verified by automated tests; full WCAG and cross-browser validation still requires manual testing with assistive technologies and the actual target browsers.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3"] },
    { "id": 3, "tasks": ["2.4", "3.1"] },
    { "id": 4, "tasks": ["3.2", "4.1"] },
    { "id": 5, "tasks": ["4.2", "4.3", "6.1"] },
    { "id": 6, "tasks": ["6.2", "7.1"] },
    { "id": 7, "tasks": ["7.2", "7.3"] },
    { "id": 8, "tasks": ["7.4"] },
    { "id": 9, "tasks": ["7.5", "8.1"] },
    { "id": 10, "tasks": ["8.2", "8.3", "9.1"] },
    { "id": 11, "tasks": ["9.2", "9.3", "9.4", "9.5"] }
  ]
}
```
