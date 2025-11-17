import { test, expect } from "@playwright/test";
import { createWorkspaceOwnerAccount } from "./helpers/db";

test("navigation works", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /живая карта/i })).toBeVisible();
  await Promise.all([
    page.waitForURL(/\/companies/),
    page.getByRole("link", { name: "Для компаний", exact: true }).click(),
  ]);
});

test("contact form success", async ({ page }) => {
  await page.goto("/contact");
  await page.getByLabel("Имя").fill("Playwright User");
  await page.getByLabel("Компания").fill("Quadrant");
  await page.getByLabel("Email").fill("user@example.com");
  await page.getByLabel("Кол-во сотрудников").selectOption("20-100");
  await page.getByLabel("Комментарий/вопрос").fill("Hello");
  await page.getByRole("button", { name: "Отправить" }).click();
  await expect(page.getByText("Спасибо! Мы свяжемся" )).toBeVisible();
});

test("contact form validation", async ({ page }) => {
  await page.goto("/contact");
  await page.getByRole("button", { name: "Отправить" }).click();
  await expect(page.getByText("Введите имя")).toBeVisible();
});

test("blog article opens", async ({ page }) => {
  await page.goto("/blog");
  const firstLink = page.locator("a[href^='/blog/']").first();
  await Promise.all([page.waitForURL(/\/blog\/.+/), firstLink.click()]);
  await expect(page).toHaveURL(/\/blog\/.+/);
});

test("demo graph interaction", async ({ page }) => {
  await page.goto("/demo");
  await page.getByRole("link", { name: "Попробовать демо", exact: true }).first().click({ force: true });
  await expect(page.locator("#graph")).toBeVisible();
});

test("registration leads to app dashboard", async ({ page }) => {
  const email = `playwright-register-${Date.now()}@example.com`;
  await page.goto("/auth/register");
  await page.getByLabel("Имя").fill("Playwright");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Пароль").fill("secret123");
  await page.getByLabel("Компания / Workspace").fill("Playwright Inc");
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { name: "Обзор" })).toBeVisible();
});

test("login flow works for existing user", async ({ page }) => {
  const timestamp = Date.now();
  const email = `playwright-login-${timestamp}@example.com`;
  const password = "secret123";
  await createWorkspaceOwnerAccount(email, password);
  await page.context().clearCookies();
  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Пароль").fill(password);
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { name: "Обзор" })).toBeVisible();
});

test("unauthorized users are redirected from /app", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/app");
  await expect(page).toHaveURL(/\/auth\/login/);
});
