import { randomUUID } from "crypto";
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
import { db } from "../../lib/db";
import { employees, skills, tracks, integrations, invites } from "../../drizzle/schema";

const PASSWORD = "secret123";
const APP_LOAD_TIMEOUT = 90000;

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
  await page.waitForURL(/\/app(\/.*)?$/, { timeout: APP_LOAD_TIMEOUT });
  await expect(page.getByRole("heading", { name: "Обзор компании" })).toBeVisible({ timeout: APP_LOAD_TIMEOUT });
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
    await expect(invitePage.getByRole("link", { name: "Зарегистрироваться" })).toBeVisible({ timeout: APP_LOAD_TIMEOUT });
    await invitePage.getByRole("link", { name: "Зарегистрироваться" }).click();
    await invitePage.waitForURL(/\/auth\/register/, { timeout: APP_LOAD_TIMEOUT });
    await invitePage.getByLabel("Имя").fill("Invited User");
    await invitePage.getByLabel("Пароль").fill(PASSWORD);
    await invitePage.getByRole("button", { name: "Продолжить" }).click();
    await invitePage.waitForURL(/\/app(\/.*)?$/, { timeout: APP_LOAD_TIMEOUT });
    await expect(invitePage.getByRole("heading", { name: "Обзор компании" })).toBeVisible({ timeout: APP_LOAD_TIMEOUT });
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

  test("landing demo CTA authenticates demo workspace", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Посмотреть демо" }).first().click();
    await page.waitForURL(/\/app(\/.*)?$/, { timeout: APP_LOAD_TIMEOUT });
    await expect(page.getByRole("heading", { name: "Обзор компании" })).toBeVisible({ timeout: APP_LOAD_TIMEOUT });
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

  test("onboarding checklist updates after filling workspace data", async ({ page }) => {
    const account = await registerWorkspace(page);
    const panel = page.getByTestId("onboarding-panel");
    await expect(panel).toBeVisible({ timeout: APP_LOAD_TIMEOUT });
    await expect(page.getByTestId("onboarding-step-createdEmployee")).toHaveAttribute("data-complete", "false");
    await expect(page.getByTestId("onboarding-step-connectedIntegration")).toHaveAttribute("data-complete", "false");

    const snapshot = await waitForWorkspaceSnapshotByOwnerEmail(account.email);
    await seedWorkspaceForOnboarding(snapshot.workspace.id);

    await page.goto("/app");
    await expect(page.getByTestId("onboarding-panel")).toHaveCount(0);
  });
});

async function seedWorkspaceForOnboarding(workspaceId: string) {
  const timestamp = new Date().toISOString();
  await db
    .insert(employees)
    .values({
      id: randomUUID(),
      workspaceId,
      name: "Checklist Employee",
      position: "Engineer",
      level: "Middle",
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();
  await db
    .insert(skills)
    .values({
      id: randomUUID(),
      workspaceId,
      name: "Коммуникация",
      type: "soft",
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();
  await db
    .insert(tracks)
    .values({
      id: randomUUID(),
      workspaceId,
      name: "Engineering Track",
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();
  await db
    .insert(integrations)
    .values({
      id: randomUUID(),
      workspaceId,
      type: "github",
      status: "connected",
      config: "{}",
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();
  await db
    .insert(invites)
    .values({
      id: randomUUID(),
      workspaceId,
      email: `checklist-${Date.now()}@example.com`,
      role: "member",
      token: randomUUID(),
      status: "pending",
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();
}
