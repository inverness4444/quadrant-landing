import { sqliteTable, text, integer, primaryKey, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const employeeLevels = ["Junior", "Middle", "Senior"] as const;
export type EmployeeLevel = (typeof employeeLevels)[number];

export const skillTypes = ["hard", "soft", "product", "data"] as const;
export type SkillType = (typeof skillTypes)[number];

export const memberRoles = ["owner", "admin", "member"] as const;
export type MemberRole = (typeof memberRoles)[number];

export const integrationStatuses = ["connected", "disconnected", "error"] as const;
export type IntegrationStatus = (typeof integrationStatuses)[number];

export const plans = sqliteTable(
  "plans",
  {
    id: text("id").notNull().primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    maxMembers: integer("max_members"),
    maxIntegrations: integer("max_integrations"),
    maxEmployees: integer("max_employees"),
    maxArtifacts: integer("max_artifacts"),
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
    pricePerMonth: integer("price_per_month").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    codeIdx: uniqueIndex("plans_code_idx").on(table.code),
    defaultIdx: index("plans_is_default_idx").on(table.isDefault),
  }),
);

export const users = sqliteTable("users", {
  id: text("id").notNull().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const workspaces = sqliteTable("workspaces", {
  id: text("id").notNull().primaryKey(),
  name: text("name").notNull(),
  size: text("size"),
  ownerUserId: text("owner_user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  planId: text("plan_id").references(() => plans.id, { onDelete: "restrict" }),
  trialEndsAt: text("trial_ends_at"),
  billingEmail: text("billing_email"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const members = sqliteTable(
  "members",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    role: text("role").$type<MemberRole>().notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.workspaceId] }),
    workspaceIdx: index("members_workspace_idx").on(table.workspaceId),
    userIdx: index("members_user_idx").on(table.userId),
  }),
);

export const inviteStatuses = ["pending", "accepted", "expired"] as const;
export type InviteStatus = (typeof inviteStatuses)[number];

export const invites = sqliteTable(
  "invites",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").$type<MemberRole>().notNull(),
    token: text("token").notNull(),
    status: text("status").$type<InviteStatus>().notNull(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    workspaceIdx: index("invites_workspace_idx").on(table.workspaceId),
    tokenIdx: uniqueIndex("invites_token_idx").on(table.token),
    emailWorkspaceIdx: index("invites_email_workspace_idx").on(table.email, table.workspaceId),
    statusIdx: index("invites_status_idx").on(table.status),
  }),
);

export const integrations = sqliteTable(
  "integrations",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    status: text("status").$type<IntegrationStatus>().notNull().default("connected"),
    config: text("config").notNull().default("{}"),
    lastSyncedAt: text("last_synced_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    workspaceIdx: index("integrations_workspace_idx").on(table.workspaceId),
    workspaceTypeIdx: uniqueIndex("integrations_workspace_type_idx").on(table.workspaceId, table.type),
  }),
);

export const tracks = sqliteTable(
  "tracks",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    workspaceNameIdx: uniqueIndex("tracks_workspace_name_idx").on(table.workspaceId, table.name),
  }),
);

export const trackLevels = sqliteTable("track_levels", {
  id: text("id").notNull().primaryKey(),
  trackId: text("track_id")
    .notNull()
    .references(() => tracks.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  order: integer("order_index").notNull(),
});

export const employees = sqliteTable(
  "employees",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: text("position").notNull(),
    level: text("level").$type<EmployeeLevel>().notNull(),
    primaryTrackId: text("primary_track_id").references(() => tracks.id, { onDelete: "set null" }),
    trackLevelId: text("track_level_id").references(() => trackLevels.id, { onDelete: "set null" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    workspaceIdx: index("employees_workspace_idx").on(table.workspaceId),
  }),
);

export const skills = sqliteTable(
  "skills",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").$type<SkillType>().notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    workspaceNameIdx: uniqueIndex("skills_workspace_name_idx").on(table.workspaceId, table.name),
    workspaceIdx: index("skills_workspace_idx").on(table.workspaceId),
  }),
);

export const artifacts = sqliteTable(
  "artifacts",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    link: text("link"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    workspaceIdx: index("artifacts_workspace_idx").on(table.workspaceId),
    employeeIdx: index("artifacts_employee_idx").on(table.employeeId),
  }),
);

export const artifactSkills = sqliteTable(
  "artifact_skills",
  {
    artifactId: text("artifact_id")
      .notNull()
      .references(() => artifacts.id, { onDelete: "cascade" }),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    weight: integer("weight").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.artifactId, table.skillId] }),
  }),
);

export const employeeSkills = sqliteTable(
  "employee_skills",
  {
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    level: integer("level").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.employeeId, table.skillId] }),
  }),
);

export const leads = sqliteTable("leads", {
  id: text("id").notNull().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company").notNull(),
  headcount: text("headcount").notNull(),
  message: text("message").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type User = typeof users.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type Member = typeof members.$inferSelect;
export type Invite = typeof invites.$inferSelect;
export type Artifact = typeof artifacts.$inferSelect;
export type ArtifactSkill = typeof artifactSkills.$inferSelect;
export type Integration = typeof integrations.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type Employee = typeof employees.$inferSelect;
export type Skill = typeof skills.$inferSelect;
export type Track = typeof tracks.$inferSelect;
export type TrackLevel = typeof trackLevels.$inferSelect;
export type EmployeeSkill = typeof employeeSkills.$inferSelect;
export type Lead = typeof leads.$inferSelect;
