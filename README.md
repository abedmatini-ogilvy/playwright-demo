# Playwright registration form demo

This tiny app shows a simple registration form and an end-to-end test using Playwright that fills the form and submits it.

## What this demonstrates
- Realistic user interactions (type, click, submit)
- Client-side validation (password mismatch)
- Server handling of a POST `/api/register` and UI success message

## Run locally

1. Install dependencies (Playwright + browsers):

```bash
npm i
npx playwright install --with-deps
```

2. Start the demo server (serves `public/` and an API):

```bash
npm start
```

The server listens at http://localhost:3000.

3. In another terminal, run the tests:

```bash
npx playwright test
```

Optional: UI mode

```bash
npx playwright test --ui
```

## Files
- `public/register.html` — registration form HTML
- `public/register.js` — client logic to validate and submit
- `server.mjs` — minimal Node HTTP server + `/api/register` endpoint
- `tests/register.spec.ts` — Playwright tests
- `playwright.config.ts` — test config (baseURL, browser)

## Notes
- Keep labels associated with inputs and use roles where possible to make tests robust and accessible.
- The test assumes the server is running before tests start.
