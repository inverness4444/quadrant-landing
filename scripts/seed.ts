import bcrypt from "bcryptjs";
import { findUserByEmail, createUser } from "@/repositories/userRepository";
import { createWorkspace } from "@/repositories/workspaceRepository";
import { createMember } from "@/repositories/memberRepository";
import { seedWorkspaceDemoData } from "@/services/workspaceSeed";

async function runSeed() {
  const demoEmail = process.env.DEMO_EMAIL ?? "demo@quadrant.app";
  const demoPassword = process.env.DEMO_PASSWORD ?? "demo12345";
  const existing = await findUserByEmail(demoEmail);
  if (existing) {
    console.log("Demo user already exists");
    process.exit(0);
  }
  const user = await createUser({
    email: demoEmail,
    passwordHash: await bcrypt.hash(demoPassword, 10),
    name: "Demo User",
  });
  const workspace = await createWorkspace({
    name: "Demo Company",
    size: "20-100",
    ownerUserId: user.id,
  });
  await createMember({
    userId: user.id,
    workspaceId: workspace.id,
    role: "owner",
  });
  await seedWorkspaceDemoData(workspace.id);
  console.log(`Seed completed. Demo credentials: ${demoEmail} / ${demoPassword}`);
  process.exit(0);
}

runSeed().catch((error) => {
  console.error("Failed to seed database", error);
  process.exit(1);
});
