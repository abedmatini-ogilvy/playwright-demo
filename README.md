# Playwright registration form demo

This app shows a simple registration form and an end-to-end test suite with Playwright. Below are common commands and what you should expect from each.

## What this demonstrates
- Realistic user interactions (type, click, submit)
- Client-side validation (password mismatch)
- Server handling of a POST `/api/register` and UI success message
- Cross-device testing (Desktop Chrome + iPhone 13 profile)
- Videos and optional traces/reports

## Setup

Install dependencies and browsers (first time only):

```bash
npm i
npx playwright install --with-deps
```

Start the app locally (Playwright also auto-starts it during tests):

```bash
npm start
```

The server listens at http://localhost:3000.

## Test commands and expected results

1) Run the full test suite (headless, default)

```bash
npx playwright test
```

Expected:
- Console shows a summary like “6 passed”.
- Tests run in two projects: `chromium-desktop` and `chromium-mobile` (iPhone 13).
- Videos are saved per test under `test-results/**/video.webm`.

2) Run a single spec

```bash
npx playwright test tests/register.spec.ts
```

Expected:
- Only `register.spec.ts` runs (still across both device profiles by default).

3) Run headed (visible browser window)

```bash
# In GUI-less containers, wrap with Xvfb:
xvfb-run -a npx playwright test --headed
```

Expected:
- A real browser is launched. In headless containers you won’t “see” it without a display, but tests still run with a UI under the virtual display.

4) UI mode (interactive test explorer)

```bash
# In GUI-less containers, wrap with Xvfb:
xvfb-run -a npx playwright test --ui
```

Expected:
- Opens Playwright’s UI (test list, watch mode, trace viewer). In a headless container you need a display server (Xvfb) to run it.

5) Always record a trace for inspection

```bash
npx playwright test --trace=on
```

Expected:
- Each test produces a `trace.zip` under `test-results/**/`. Open it with:

```bash
npx playwright show-trace path/to/trace.zip
```

6) Generate an HTML report

```bash
npx playwright test --reporter=html
npx playwright show-report
```

Expected:
- A browsable report under `playwright-report/` showing passes/failures and test timings. Use `show-report` to open it.

7) See verbose step logs (API debugging)

```bash
DEBUG=pw:api npx playwright test
```

Expected:
- The console includes detailed Playwright action logs (locators, timings, etc.).

## What the tests cover

- Fills and submits the registration form: asserts the “Welcome, user@example.com!” success message.
- Shows validation if passwords mismatch: asserts “Passwords do not match.”
- Responds to mobile vs desktop layout: asserts the page indicates “Desktop” vs “Mobile” based on device profile.

## Files
- `public/register.html` — registration form HTML and simple responsive styles
- `public/register.js` — client logic (validation + POST `/api/register`)
- `server.mjs` — minimal Node HTTP server + REST endpoint
- `tests/register.spec.ts` — Playwright tests (desktop + mobile projects)
- `playwright.config.ts` — baseURL, webServer, device projects, video settings

## Tips
- Videos are configured “on” locally and “retain-on-failure” in CI.
- To target only desktop or only mobile, use the `-g` grep flag or project filter, e.g.:

```bash
npx playwright test --project=chromium-desktop
npx playwright test --project=chromium-mobile
```

- To slow actions for demos, add `launchOptions: { slowMo: 200 }` temporarily or step through with `page.pause()` in a test.
