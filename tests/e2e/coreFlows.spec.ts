import { test, expect } from "@playwright/test";
import {
  getWorkspaceSnapshotByOwnerEmail,
  getDemoWorkspaceSnapshot,
  waitForInvite,
  findMemberByEmail,
  ensureEmployeeCount,
  getWorkspaceArtifactCount,
  getInviteById,
  waitForWorkspaceSnapshotByOwnerEmail,
} from "./helpers/db";

const PASSWORD = "secret123";

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 10_000)}@example.com`;
}

async function registerWorkspace(page: import("@playwright/test").Page) {
  const email = uniqueEmail("register");
  const company = `E2E Company ${Date.now()}`;
  await page.goto("/auth/register");
  await page.getByLabel("Имя").fill("Playwright");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Пароль").fill(PASSWORD);
  await page.getByLabel("Компания / Workspace").fill(company);
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await page.waitForURL(/\/app(\/.*)?$/, { timeout: 15000 });
  await expect(page.getByRole("heading", { name: "Обзор" })).toBeVisible();
  return { email, company };
}

test.describe("core flows", () => {
  test.describe.configure({ mode: "serial" });

  test("registration creates workspace, owner member and default plan", async ({ page }) => {
    const account = await registerWorkspace(page);
    const snapshot = await waitForWorkspaceSnapshotByOwnerEmail(account.email);
    expect(snapshot.member?.role).toBe("owner");
    expect(snapshot.plan?.code).toBe("free");
  });

  test("invite acceptance creates member and marks invite as accepted", async ({ page, browser }) => {
    const owner = await registerWorkspace(page);
    const snapshot = await waitForWorkspaceSnapshotByOwnerEmail(owner.email);
    await page.goto("/app/settings");
    await page.getByRole("button", { name: "Участники" }).click();

    const inviteEmail = uniqueEmail("invitee");
    await page.getByLabel("Email").fill(inviteEmail);
    await page.getByLabel("Роль").selectOption("admin");
    await page.getByRole("button", { name: "Отправить приглашение" }).click();
    await expect(page.getByText("Приглашение отправлено")).toBeVisible();

    const invite = await waitForInvite(snapshot.workspace.id, inviteEmail);
    const inviteContext = await browser.newContext();
    const invitePage = await inviteContext.newPage();
    await invitePage.goto(`/auth/accept-invite?token=${invite.token}`);
    await invitePage.getByRole("link", { name: "Зарегистрироваться" }).click();
    await invitePage.getByLabel("Имя").fill("Invited User");
    await invitePage.getByLabel("Пароль").fill(PASSWORD);
    await invitePage.getByRole("button", { name: "Продолжить" }).click();
    await invitePage.waitForURL(/\/app(\/.*)?$/);
    await expect(invitePage.getByRole("heading", { name: "Обзор" })).toBeVisible();
    await inviteContext.close();

    const member = await findMemberByEmail(snapshot.workspace.id, inviteEmail);
    expect(member?.role).toBe("admin");
    const updatedInvite = await getInviteById(invite.id);
    expect(updatedInvite?.status).toBe("accepted");
  });

  test("integration sync creates new artifacts", async ({ page }) => {
    await page.goto("/auth/demo-login");
    await page.waitForURL(/\/app(\/.*)?$/);
    const demoWorkspace = await getDemoWorkspaceSnapshot();
    const before = await getWorkspaceArtifactCount(demoWorkspace.workspace.id);

    await page.goto("/app/settings");
    await page.getByRole("button", { name: "Интеграции" }).click();
    const githubCard = page.getByTestId("integration-card-github");
    await githubCard.getByRole("button", { name: "Синхронизировать" }).click();
    const syncMessage = page.getByText("Синхронизация завершена", { exact: false });
    await expect(syncMessage).toBeVisible();

    const after = await getWorkspaceArtifactCount(demoWorkspace.workspace.id);
    expect(after).toBeGreaterThan(before);
  });

  test("plan limits block adding employees beyond quota", async ({ page }) => {
    const account = await registerWorkspace(page);
    const snapshot = await getWorkspaceSnapshotByOwnerEmail(account.email);
    const planMax = snapshot.plan?.maxEmployees;
    test.skip(!planMax, "Plan does not have employee limit");
    await ensureEmployeeCount(snapshot.workspace.id, planMax!);

    await page.goto("/app/team");
    await page.getByRole("button", { name: "Добавить сотрудника" }).click();
    await page.getByLabel("Имя").fill("Перегруженный сотрудник");
    await page.getByLabel("Позиция").fill("QA Engineer");
    await page.getByLabel("Уровень").selectOption("Middle");
    await page.getByRole("button", { name: "Сохранить" }).click();

    const limitMessage = page.getByText("Откройте вкладку «Тариф и биллинг»");
    await expect(limitMessage).toBeVisible();
  });
});
