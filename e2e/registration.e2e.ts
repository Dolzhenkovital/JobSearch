import { expect, test } from '@playwright/test';

test.use({ locale: 'en-CA' });

test('registration follows server mode, native validation and unavailable-policy protection', async ({ page }) => {
  let mode = 'promo', unavailable = false;
  const attempts: Record<string, unknown>[] = [];
  // Exercise the built UI without creating accounts or sending email on either environment.
  await page.route('https://*.supabase.co/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/rest/v1/rpc/registration_mode') {
      await route.fulfill({ status: unavailable ? 503 : 200, contentType: 'application/json',
        body: JSON.stringify(unavailable ? { message: 'Synthetic unavailable policy' } : { mode }) });
    } else if (path === '/auth/v1/signup') {
      attempts.push(route.request().postDataJSON());
      await route.fulfill({ status: 400, contentType: 'application/json',
        body: JSON.stringify({ code: 'hook_rejected', msg: 'promo_code_inactive' }) });
    } else await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });
  await page.route('**/jobs.json', route => route.fulfill({ contentType: 'application/json',
    body: JSON.stringify({ jobs: [], generatedAt: '2026-10-05T00:00:00Z' }) }));
  await page.goto('./');
  await page.locator('.sync-button').click();
  const dialog = page.getByRole('dialog');
  test.skip(await dialog.getByText('Storage connection is being completed', { exact: true }).isVisible(),
    'Build with public Supabase configuration to exercise account UI.');
  await dialog.getByRole('button', { name: 'First time? Create an account', exact: true }).click();
  const code = dialog.getByLabel('Promo code', { exact: false });
  const submit = dialog.getByRole('button', { name: 'Create account', exact: true });
  await expect(code).toBeVisible();
  await expect(code).toHaveAttribute('required', '');
  await dialog.getByLabel('Email', { exact: true }).fill('synthetic@example.invalid');
  await dialog.getByLabel('Password', { exact: true }).fill('synthetic-password');
  await submit.click();
  expect(attempts).toHaveLength(0);
  await code.fill('BETA');
  await submit.click();
  await expect(dialog).toContainText('The promo code is not active.');
  expect(attempts).toEqual([expect.objectContaining({ email: 'synthetic@example.invalid',
    password: 'synthetic-password', data: { registration_promo_code: 'BETA' } })]);

  await dialog.getByRole('button', { name: 'Already have an account? Sign in', exact: true }).click();
  mode = 'free';
  await dialog.getByRole('button', { name: 'First time? Create an account', exact: true }).click();
  await expect(submit).toBeEnabled();
  await expect(code).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Already have an account? Sign in', exact: true }).click();
  unavailable = true;
  await dialog.getByRole('button', { name: 'First time? Create an account', exact: true }).click();
  await expect(submit).toBeDisabled();
  await expect(dialog.getByRole('alert')).toContainText('Could not check registration requirements.');
  unavailable = false; mode = 'promo';
  await dialog.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(code).toBeVisible();
  await expect(submit).toBeEnabled();
  expect(attempts).toHaveLength(1);
});
