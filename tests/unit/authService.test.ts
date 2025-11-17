import { beforeEach, describe, expect, it } from "vitest";
import { registerUser, validateUser } from "@/services/auth/authService";
import { db } from "@/lib/db";
import { ensureDefaultTestPlan } from "@/tests/utils/planTestHelper";
import {
  employeeSkills,
  employees,
  artifacts,
  artifactSkills,
  integrations,
  invites,
  members,
  skills,
  tracks,
  trackLevels,
  workspaces,
  users,
} from "@/drizzle/schema";

beforeEach(async () => {
  await db.delete(artifactSkills).run();
  await db.delete(artifacts).run();
  await db.delete(integrations).run();
  await db.delete(employeeSkills).run();
  await db.delete(employees).run();
  await db.delete(invites).run();
  await db.delete(members).run();
  await db.delete(trackLevels).run();
  await db.delete(tracks).run();
  await db.delete(skills).run();
  await db.delete(workspaces).run();
  await db.delete(users).run();
  await ensureDefaultTestPlan();
});

describe("authService", () => {
  it("registers and validates user", async () => {
    const { userId } = await registerUser({ email: "user@example.com", password: "secret123", companyName: "Demo" });
    expect(userId).toBeTruthy();
    const valid = await validateUser("user@example.com", "secret123");
    expect(valid?.user.email).toBe("user@example.com");
    expect(valid?.workspace?.name).toBe("Demo");
  });

  it("fails with duplicate email", async () => {
    await registerUser({ email: "user@example.com", password: "secret123", companyName: "Demo" });
    await expect(registerUser({ email: "user@example.com", password: "secret123", companyName: "Demo" })).rejects.toThrow(
      "EMAIL_TAKEN",
    );
  });

  it("rejects invalid password on login", async () => {
    await registerUser({ email: "user@example.com", password: "secret123", companyName: "Demo" });
    const invalid = await validateUser("user@example.com", "wrong-pass");
    expect(invalid).toBeNull();
  });
});
