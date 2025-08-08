import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function analyzeForm({ url }) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const summary = await page.evaluate(() => {
    const form = document.querySelector('form');
    if (!form) return { forms: [], note: 'No form found' };
    const controls = Array.from(form.querySelectorAll('input, textarea, select'));
    const visible = (el) => {
      const st = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return st.visibility !== 'hidden' && st.display !== 'none' && rect.width > 0 && rect.height > 0;
    };
    const fields = controls
      .filter((el) => visible(el))
      .map((el) => {
        const tag = el.tagName.toLowerCase();
        const type = (el.getAttribute('type') || 'text').toLowerCase();
        const id = el.id || null;
        const name = el.getAttribute('name') || null;
        const label = id ? (document.querySelector(`label[for="${id}"]`)?.textContent || null) : (el.closest('label')?.textContent || null);
        return {
          tag,
          type,
          id,
          name,
          label: label ? label.trim() : null,
          required: el.hasAttribute('required'),
          minLength: el.getAttribute('minlength') ? Number(el.getAttribute('minlength')) : null,
          maxLength: el.getAttribute('maxlength') ? Number(el.getAttribute('maxlength')) : null,
          pattern: el.getAttribute('pattern') || null,
        };
      });
    return { forms: [{ index: 0, fields }], note: 'First form only (MVP)' };
  });

  await browser.close();
  return { url, ...summary };
}

export async function runFormTests({ url, outDir, options = {} }) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // trace always for MVP
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

  const summary = await page.evaluate(() => {
    const form = document.querySelector('form');
    if (!form) return { ok: false, reason: 'No form found', fields: [] };
    const controls = Array.from(form.querySelectorAll('input, textarea, select'));
    const visible = (el) => {
      const st = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return st.visibility !== 'hidden' && st.display !== 'none' && rect.width > 0 && rect.height > 0;
    };
    const fields = controls
      .filter((el) => visible(el))
      .map((el) => {
        const tag = el.tagName.toLowerCase();
        const type = (el.getAttribute('type') || 'text').toLowerCase();
        const id = el.id || null;
        const name = el.getAttribute('name') || null;
        const label = id ? (document.querySelector(`label[for="${id}"]`)?.textContent || null) : (el.closest('label')?.textContent || null);
        return {
          tag,
          type,
          id,
          name,
          label: label ? label.trim() : null,
          required: el.hasAttribute('required'),
          minLength: el.getAttribute('minlength') ? Number(el.getAttribute('minlength')) : null,
          maxLength: el.getAttribute('maxlength') ? Number(el.getAttribute('maxlength')) : null,
          pattern: el.getAttribute('pattern') || null,
        };
      });
    return { ok: true, fields };
  });

  // Consider common field types for MVP: text, email, password
  const fields = (summary.fields || []).filter((f) => f.tag === 'input' && ['text','email','password'].includes(f.type));

  // Create a baseline of valid values
  const validValueFor = (f) => {
    const min = f.minLength ?? 1;
    const len = Math.max(min, 6);
    if (f.type === 'email') return `user${Date.now().toString().slice(-4)}@example.com`;
    if (f.type === 'password') return 'P@ssw0rd!'.padEnd(Math.min(16, Math.max(len, 8)), '1');
    const base = 'x'.repeat(Math.min(len, (f.maxLength ?? len)));
    return base;
  };

  const results = [];

  // helper to fill all text inputs with valid values
  async function fillAllValid() {
    for (const f of fields) {
      const sel = f.id ? `#${f.id}` : (f.name ? `[name="${f.name}"]` : null);
      if (!sel) continue;
      const locator = page.locator(sel);
      if (await locator.count() === 0) continue;
      await locator.fill(validValueFor(f));
    }
  }

  // Validation case: required empty per field
  for (const f of fields) {
    if (!f.required) continue;
    await page.reload({ waitUntil: 'domcontentloaded' });
    await fillAllValid();
    const sel = f.id ? `#${f.id}` : (f.name ? `[name="${f.name}"]` : null);
    if (sel) {
      const locator = page.locator(sel);
      if (await locator.count() > 0) await locator.fill('');
    }

    let postRequest = false;
    const reqHandler = (r) => { if (r.method() === 'POST') postRequest = true; };
    page.on('request', reqHandler);

    // Try to submit the form
    const submitLocator = page.locator('form :is(button[type="submit"], input[type="submit"])');
    if (await submitLocator.count() > 0) await submitLocator.first().click();
    else await page.keyboard.press('Enter');

    // Check validity and that no POST request went out
    const isValidAfter = await page.evaluate(() => {
      const form = document.querySelector('form');
      return form ? form.checkValidity() : false;
    });
    await page.waitForTimeout(300);
    page.off('request', reqHandler);

    results.push({ field: f.name || f.id || '(unknown)', case: 'required-empty', pass: !isValidAfter && !postRequest });
  }

  // Submission case: all valid
  await page.reload({ waitUntil: 'domcontentloaded' });
  await fillAllValid();

  let networkMatched = false;
  page.on('response', async (res) => {
    try {
      const urlStr = res.url();
      const ok = res.status() >= 200 && res.status() < 300;
      const sameOrigin = new URL(url).origin === new URL(urlStr).origin;
      if (ok && sameOrigin) networkMatched = true;
    } catch {}
  });

  const submitLocator = page.locator('form :is(button[type="submit"], input[type="submit"])');
  if (await submitLocator.count() > 0) await submitLocator.first().click();
  else await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);

  // Fallbacks (MVP): check URL change or UI status
  const navigated = page.url() !== url;
  const hasStatus = await page.locator('[role="status"]').count().then(c => c > 0);

  const submissionPass = networkMatched || navigated || hasStatus;
  results.push({ field: '*all*', case: 'valid-submission', pass: submissionPass, notes: { networkMatched, navigated, hasStatus } });

  // save trace
  const tracePath = join(outDir, 'trace.zip');
  await context.tracing.stop({ path: tracePath });

  await browser.close();

  return { url, results, trace: tracePath };
}
