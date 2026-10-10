const { test, expect } = require("@playwright/test");

test.use({ locale: "uk-UA" });

test("Ukrainian visitors can reach projects, read a report and contact the owner", async ({ page, context }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await context.route(/^https?:\/\/(?!127\.0\.0\.1:8765(?:\/|$))/, route => route.abort());
  await page.goto("/");
  const projects = page.locator(".hero-stage").getByRole("link", { name: "Переглянути проєкти", exact: true });
  await expect(projects).toBeVisible();
  await page.locator("#referenzen").scrollIntoViewIfNeeded();
  await expect(page.locator(".portfolio-carousel__slide.is-active")).toBeVisible();
  await projects.click();
  await expect(page.getByRole("heading", { name: "Проєкти", exact: true })).toBeVisible();
  const contract = page.locator(".project-overview-card--vertragsgenerator");
  await expect(contract).toContainText("Django");
  await contract.getByRole("link", { name: "Детальніше", exact: true }).click();
  await expect(page.locator(".portfolio-project-decision")).toContainText("Технічне рішення");
  await expect(page.locator(".portfolio-card__implementation")).toContainText("Django");
  await page.goto("/kontakt?project=Demo");
  await expect(page.locator("#subject")).toHaveValue("Питання про Demo");
  await expect(page.getByRole("link", { name: "kontakt@beirit.digital", exact: true })).toBeVisible();
  await page.goto("/ueber-mich");
  await expect(page.locator("h1")).toBeVisible();
  expect(errors).toEqual([]);
});
