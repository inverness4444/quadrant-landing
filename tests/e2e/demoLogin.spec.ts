import { test, expect } from "@playwright/test";

const DEMO_BUTTON = "Войти как демо-компания";

test.describe("demo login flow", () => {
  test("shows demo data without hitting plan limits", async ({ page }) => {
    await page.goto("/");
    const demoLink = page.getByRole("link", { name: DEMO_BUTTON }).first();
    await expect(demoLink).toBeVisible();
    await demoLink.click();
    await page.waitForURL(/\/app(\/.*)?$/);
    await expect(page.getByRole("heading", { name: "Обзор компании" })).toBeVisible();
    await expect(page.getByTestId("dashboard-overview")).toBeVisible();
    await expect(page.getByTestId("top-skills")).toBeVisible();
    await expect(page.getByTestId("weak-skills")).toBeVisible();
    await expect(page.getByTestId("dashboard-risk-employees")).toBeVisible();

    const planLimitBanner = page.getByText("Откройте вкладку «Тариф и биллинг»");
    await expect(planLimitBanner).toHaveCount(0);
  });
});
