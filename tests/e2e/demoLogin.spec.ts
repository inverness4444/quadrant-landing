import { test, expect } from "@playwright/test";

const DEMO_BUTTON = "Войти как демо-компания";
const APP_LOAD_TIMEOUT = 90000;

test.describe("demo login flow", () => {
  test("shows demo data without hitting plan limits", async ({ page }) => {
    await page.goto("/");
    const demoLink = page.getByRole("link", { name: DEMO_BUTTON }).first();
    await expect(demoLink).toBeVisible();
    await demoLink.click();
    await page.waitForURL(/\/app(\/.*)?$/, { timeout: APP_LOAD_TIMEOUT });
    await expect(page.getByRole("heading", { name: "Обзор компании" })).toBeVisible({ timeout: APP_LOAD_TIMEOUT });
    await expect(page.getByTestId("dashboard-overview")).toBeVisible({ timeout: APP_LOAD_TIMEOUT });
    await expect(page.getByTestId("top-skills")).toBeVisible({ timeout: APP_LOAD_TIMEOUT });
    await expect(page.getByTestId("weak-skills")).toBeVisible({ timeout: APP_LOAD_TIMEOUT });
    await expect(page.getByTestId("dashboard-risk-employees")).toBeVisible({ timeout: APP_LOAD_TIMEOUT });

    const planLimitBanner = page.getByText("Откройте вкладку «Тариф и биллинг»");
    await expect(planLimitBanner).toHaveCount(0);
  });
});
