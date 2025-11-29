import { test, expect } from "@playwright/test";

async function registerDemoAccount(page: import("@playwright/test").Page) {
  const email = `app-user-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
  const password = "secret123";
  await page.goto("/auth/register");
  await page.getByLabel("Имя").fill("Playwright");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Пароль").fill(password);
  await page.getByLabel("Компания / Workspace").fill("E2E Workspace");
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect(page).toHaveURL(/\/app$/, { timeout: 15000 });
}

test("team page shows демо-сотрудников", async ({ page }) => {
  await registerDemoAccount(page);
  await page.goto("/app/team");
  await expect(page.getByText("Аня Коваль").first()).toBeVisible();
});

test("можно добавить сотрудника", async ({ page }) => {
  await registerDemoAccount(page);
  await page.goto("/app/team");
  await page.getByRole("button", { name: "Добавить сотрудника" }).click();
  await page.getByLabel("Имя").fill("Тестовый Сотрудник");
  await page.getByLabel("Позиция").fill("QA Engineer");
  await page.getByLabel("Уровень").selectOption("Middle");
  await page.getByLabel("Карьерный трек").selectOption(""); // без трека
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(page.getByText("Тестовый Сотрудник")).toBeVisible();
});

test("skills и tracks страницы доступны", async ({ page }) => {
  await registerDemoAccount(page);
  await page.goto("/app/skills");
  await expect(page.getByRole("heading", { name: "Навыки" })).toBeVisible();
  await page.goto("/app/tracks");
  await expect(page.getByRole("heading", { name: "Карьерные треки" })).toBeVisible();
});
