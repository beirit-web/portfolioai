const { test, expect } = require('@playwright/test');
const { blockExternalRequests } = require('./helpers/network.cjs');

for (const [locale, copy] of Object.entries({
  ru: { register: 'Регистрация', email: 'Электронная почта', password: 'Пароль', repeat: 'Повторите пароль', consent: 'Подтвердите согласие', code: 'Код активации', activate: 'Активировать аккаунт', success: 'Аккаунт активирован.', show: 'Показать пароль', hide: 'Скрыть пароль', empty: 'Файл не выбран', reset: 'Сбросить пароль' },
  uk: { register: 'Реєстрація', email: 'Електронна пошта', password: 'Пароль', repeat: 'Повторіть пароль', consent: 'Підтвердьте згоду', code: 'Код активації', activate: 'Активувати обліковий запис', success: 'Обліковий запис активовано.', show: 'Показати пароль', hide: 'Приховати пароль', empty: 'Файл не вибрано', reset: 'Скинути пароль' },
})) {
  test.describe(locale, () => {
    test.use({ locale });
    test.setTimeout(90000);
    test('account forms keep labels, errors and activation messages in the browser language', async ({ page, context, baseURL }, testInfo) => {
      await blockExternalRequests(context, baseURL);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('/register/');
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.getByRole('heading', { name: copy.register, exact: true })).toBeVisible();
      await expect(page.locator('[data-file-name-target]')).toHaveText(copy.empty);
      const email = `translation-${locale}-${testInfo.project.name}@example.test`;
      await page.getByLabel(copy.email, { exact: true }).fill(email);
      await page.getByLabel(copy.password, { exact: true }).fill('Fictional-translated-account-42!');
      await page.getByLabel(copy.repeat, { exact: true }).fill('Fictional-translated-account-42!');
      await page.getByRole('button', { name: copy.show }).first().click();
      await expect(page.getByRole('button', { name: copy.hide })).toBeVisible();
      await page.locator('main form').evaluate(form => form.noValidate = true);
      await page.locator('main button[type=submit]').click();
      await expect(page.locator('.form-error')).toContainText(copy.consent);
      await page.locator('#id_privacy_consent').check();
      await page.getByLabel(copy.password, { exact: true }).fill('Fictional-translated-account-42!');
      await page.getByLabel(copy.repeat, { exact: true }).fill('Fictional-translated-account-42!');
      await page.locator('main button[type=submit]').click();
      await expect(page).toHaveURL(/\/login\//);
      await expect(page.locator('#id_username')).toBeDisabled();
      await expect(page.getByLabel(copy.code, { exact: true })).toBeVisible();
      const mailbox = await context.newPage();
      await mailbox.goto('/examplemail');
      const code = await mailbox.locator('#local-activation-code').textContent();
      await page.getByLabel(copy.code, { exact: true }).fill(code.trim());
      await page.getByRole('button', { name: copy.activate, exact: true }).click();
      await expect(page.locator('main [role=status]')).toContainText(copy.success);
      await expect(page.locator('#id_username')).toBeEnabled();
      await page.goto('/password-reset/');
      await expect(page.getByRole('heading', { name: copy.reset, exact: true })).toBeVisible();
      await page.goto('/kontakt');
      const contact = page.locator('.portfolio-contact-form');
      await contact.locator('#name').fill('Demo Translation');
      await contact.locator('#email').fill(email);
      await contact.locator('#subject').fill('Demo');
      await contact.locator('#message').fill('Fictional translation check.');
      await contact.locator('#privacy_consent').check();
      let attempt = 0;
      await page.route('**/api/contact/', async route => {
        attempt++;
        if (attempt === 1) return route.fulfill({ status: 400, json: { ok: false, message: 'Bitte prüfen Sie die markierten Formularfelder.', errors: { email: [{ code: 'invalid', message: 'Bitte eine gültige E-Mail eingeben.' }] } } });
        if (attempt === 2) return route.fulfill({ status: 429, json: { ok: false, message: 'Bitte warten Sie kurz.' } });
        return route.fulfill({ json: { ok: true, message: 'Ihre Nachricht wurde gespeichert.' } });
      });
      await contact.locator('button[type=submit]').click();
      await expect(contact.locator('#email-error')).toContainText(locale === 'uk' ? 'дійсну адресу' : 'корректный e-mail');
      await contact.locator('#email').fill(`another-${email}`);
      await contact.locator('button[type=submit]').click();
      await expect(contact.getByRole('alert')).toContainText(locale === 'uk' ? 'Зачекайте трохи' : 'Подождите немного');
      await contact.locator('button[type=submit]').click();
      await expect(contact.locator('#contact-form-status')).toContainText(locale === 'uk' ? 'Повідомлення збережено.' : 'Сообщение сохранено.');
      await expect(contact.locator('#contact-form-status')).not.toContainText('Ihre Nachricht');
      expect(errors).toEqual([]);
      await mailbox.close();
    });
  });
}
