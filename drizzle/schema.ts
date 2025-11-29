import { sqliteTable, text, integer, primaryKey, uniqueIndex, index, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const employeeLevels = ["Junior", "Middle", "Senior"] as const;
export type EmployeeLevel = (typeof employeeLevels)[number];

export const skillTypes = ["hard", "soft", "product", "data"] as const;
export type SkillType = (typeof skillTypes)[number];

export const memberRoles = ["owner", "admin", "member"] as const;
export type MemberRole = (typeof memberRoles)[number];

export const integrationStatuses = ["connected", "disconnected", "error"] as const;
export type IntegrationStatus = (typeof integrationStatuses)[number];

export const integrationTypes = ["github", "jira", "notion", "linear", "custom"] as const;
export type IntegrationType = (typeof integrationTypes)[number];
export type OnboardingSteps = {
  invitedMembers: boolean;
  createdEmployee: boolean;
  createdSkill: boolean;
  createdTrack: boolean;
  connectedIntegration: boolean;
};

export const pilotStatuses = ["planned", "active", "completed", "archived"] as const;
export type PilotStatus = (typeof pilotStatuses)[number];

export const pilotStepStatusesEnum = ["not_started", "in_progress", "done"] as const;
export type PilotStepStatus = (typeof pilotStepStatusesEnum)[number];

export const questDifficulties = ["easy", "medium", "hard"] as const;
export type QuestDifficulty = (typeof questDifficulties)[number];

export const questStatuses = ["draft", "active", "completed", "archived"] as const;
export type QuestStatus = (typeof questStatuses)[number];

export const questPriorities = ["low", "medium", "high"] as const;
export type QuestPriority = (typeof questPriorities)[number];

export const talentDecisionTypes = ["promote", "lateral_move", "role_change", "keep_in_place", "hire_external", "monitor_risk"] as const;
export type TalentDecisionType = (typeof talentDecisionTypes)[number];

export const talentDecisionStatuses = ["proposed", "approved", "implemented", "rejected"] as const;
export type TalentDecisionStatus = (typeof talentDecisionStatuses)[number];

export const talentDecisionSourceTypes = ["pilot", "report", "meeting", "manual"] as const;
export type TalentDecisionSourceType = (typeof talentDecisionSourceTypes)[number];

export const skillLevelScale = [1, 2, 3, 4, 5] as const; // TODO: align with real scale if differs
export type SkillLevelScale = (typeof skillLevelScale)[number];

export const questGoalTypes = ["reduce_risk", "develop_skill", "onboarding", "project_help", "other"] as const;
export type QuestGoalType = (typeof questGoalTypes)[number];

export const questAssignmentStatuses = ["invited", "in_progress", "completed", "dropped"] as const;
export type QuestAssignmentStatus = (typeof questAssignmentStatuses)[number];

export const questStepStatuses = ["not_started", "in_progress", "done"] as const;
export type QuestStepStatus = (typeof questStepStatuses)[number];

export const assessmentStatuses = ["draft", "active", "closed", "archived"] as const;
export type AssessmentStatus = (typeof assessmentStatuses)[number];

export const assessmentSkillStatuses = ["not_started", "self_submitted", "manager_review", "finalized"] as const;
export type AssessmentSkillStatus = (typeof assessmentSkillStatuses)[number];

export const assessmentSelfStatuses = ["not_started", "in_progress", "submitted"] as const;
export type AssessmentSelfStatus = (typeof assessmentSelfStatuses)[number];

export const assessmentManagerStatuses = ["not_assigned", "in_progress", "approved"] as const;
export type AssessmentManagerStatus = (typeof assessmentManagerStatuses)[number];

export const assessmentFinalStatuses = ["not_started", "in_progress", "completed"] as const;
export type AssessmentFinalStatus = (typeof assessmentFinalStatuses)[number];

export const jobRoleImportance = ["must_have", "nice_to_have"] as const;
export type JobRoleImportance = (typeof jobRoleImportance)[number];

export const moveScenarioStatuses = ["draft", "review", "approved", "archived"] as const;
export type MoveScenarioStatus = (typeof moveScenarioStatuses)[number];

export const moveActionTypes = ["hire", "develop", "reassign", "promote", "backfill"] as const;
export type MoveActionType = (typeof moveActionTypes)[number];

export const movePriorities = ["low", "medium", "high"] as const;
export type MovePriority = (typeof movePriorities)[number];

export const pilotRunStatuses = ["draft", "planned", "active", "completed", "cancelled", "archived"] as const;
export type PilotRunStatus = (typeof pilotRunStatuses)[number];

export const pilotRunStepStatuses = ["pending", "in_progress", "done", "skipped"] as const;
export type PilotRunStepStatus = (typeof pilotRunStepStatuses)[number];

export const pilotNoteTypes = ["meeting", "insight", "risk", "decision"] as const;
export type PilotNoteType = (typeof pilotNoteTypes)[number];

export const reportTypes = ["team", "pilot", "workspace"] as const;
export type ReportType = (typeof reportTypes)[number];

export const reportGeneratedFrom = ["manual", "pilot", "moves", "assessment", "mixed"] as const;
export type ReportGeneratedFrom = (typeof reportGeneratedFrom)[number];

export const reportStatuses = ["draft", "finalized", "archived"] as const;
export type ReportStatus = (typeof reportStatuses)[number];

export const reportSectionKeys = ["summary", "risks", "talents", "moves", "quests", "pilot_progress", "next_steps"] as const;
export type ReportSectionKey = (typeof reportSectionKeys)[number];

export const meetingTypes = ["team_review", "pilot_review", "exec_briefing"] as const;
export type MeetingType = (typeof meetingTypes)[number];

export const programStatuses = ["draft", "active", "paused", "completed"] as const;
export type ProgramStatus = (typeof programStatuses)[number];

export const programTemplates = sqliteTable("program_templates", {
  id: text("id").notNull().primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  targetRoles: text("target_roles").notNull().default("[]"),
  targetSizeHint: text("target_size_hint").notNull().default(""),
  defaultDurationDays: integer("default_duration_days").notNull().default(90),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
export type ProgramTemplate = typeof programTemplates.$inferSelect;

export const workspacePrograms = sqliteTable(
  "workspace_programs",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    templateCode: text("template_code")
      .notNull()
      .references(() => programTemplates.code, { onDelete: "restrict" }),
    name: text("name").notNull(),
    description: text("description").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: text("status").$type<ProgramStatus>().notNull().default("draft"),
    startedAt: text("started_at"),
    plannedEndAt: text("planned_end_at"),
    actualEndAt: text("actual_end_at"),
    targetEmployeeIds: text("target_employee_ids").notNull().default("[]"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    workspaceIdx: index("workspace_programs_workspace_idx").on(table.workspaceId),
    statusIdx: index("workspace_programs_status_idx").on(table.workspaceId, table.status),
  }),
);
export type WorkspaceProgram = typeof workspacePrograms.$inferSelect;

export type OutcomeSentiment = "positive" | "neutral" | "negative";

export const roleSkillRequirements = sqliteTable(
  "role_skill_requirements",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    roleId: text("role_id")
      .notNull()
      .references(() => roleProfiles.id, { onDelete: "cascade" }),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    requiredLevel: integer("required_level").notNull(),
    importance: integer("importance").notNull().default(3),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    workspaceIdx: index("role_skill_req_workspace_idx").on(table.workspaceId),
    uniqueReq: uniqueIndex("role_skill_req_unique").on(table.workspaceId, table.roleId, table.skillId),
  }),
);
export type RoleSkillRequirement = typeof roleSkillRequirements.$inferSelect;

export const programOutcomes = sqliteTable(
  "program_outcomes",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    programId: text("program_id")
      .notNull()
      .references(() => workspacePrograms.id, { onDelete: "cascade" }),
    summaryTitle: text("summary_title").notNull(),
    summaryText: text("summary_text").notNull(),
    metrics: text("metrics").notNull().default("[]"),
    sentiment: text("sentiment").$type<OutcomeSentiment>().notNull().default("neutral"),
    recommendations: text("recommendations").notNull().default(""),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    workspaceIdx: index("program_outcomes_workspace_idx").on(table.workspaceId),
    programIdx: index("program_outcomes_program_idx").on(table.programId),
    uniqueProgram: uniqueIndex("program_outcomes_program_unique").on(table.workspaceId, table.programId),
  }),
);
export type ProgramOutcome = typeof programOutcomes.$inferSelect;

export const pilotOutcomes = sqliteTable(
  "pilot_outcomes",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    pilotId: text("pilot_id")
      .notNull()
      .references(() => pilotRuns.id, { onDelete: "cascade" }),
    summaryTitle: text("summary_title").notNull(),
    summaryText: text("summary_text").notNull(),
    metrics: text("metrics").notNull().default("[]"),
    sentiment: text("sentiment").$type<OutcomeSentiment>().notNull().default("neutral"),
    recommendations: text("recommendations").notNull().default(""),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    workspaceIdx: index("pilot_outcomes_workspace_idx").on(table.workspaceId),
    pilotIdx: index("pilot_outcomes_pilot_idx").on(table.pilotId),
    uniquePilot: uniqueIndex("pilot_outcomes_pilot_unique").on(table.workspaceId, table.pilotId),
  }),
);
export type PilotOutcome = typeof pilotOutcomes.$inferSelect;

export const notificationTypes = [
  "pilot_created",
  "pilot_step_due",
  "pilot_status",
  "pilot_overdue",
  "pilot_started",
  "pilot_ending_soon",
  "one_on_one_scheduled",
  "one_on_one_upcoming",
  "feedback_assigned",
  "feedback_due_soon",
  "risk_employee",
  "risk_case_resolved",
  "development_goal_due",
  "development_goal_stale",
  "quarterly_report_ready",
  "invite_pending",
  "invite_accepted",
  "meeting_upcoming",
  "report_stale",
  "system",
] as const;
export type NotificationType = (typeof notificationTypes)[number];

export const notificationEntityTypes = ["pilot_run", "pilot_step", "meeting_agenda", "team", "report", "employee", "goal"] as const;
export type NotificationEntityType = (typeof notificationEntityTypes)[number];

export const reminderRuleKeys = ["pilot_steps", "meetings", "reports"] as const;
export type ReminderRuleKey = (typeof reminderRuleKeys)[number];

export const reminderJobTypes = ["pilot_scan", "meeting_scan", "report_scan"] as const;
export type ReminderJobType = (typeof reminderJobTypes)[number];

export const reminderJobStatuses = ["running", "success", "error"] as const;
export type ReminderJobStatus = (typeof reminderJobStatuses)[number];

export const riskLevels = ["low", "medium", "high"] as const;
export type RiskLevel = (typeof riskLevels)[number];

export type OneOnOne = typeof oneOnOnes.$inferSelect;
export type OneOnOneInsert = typeof oneOnOnes.$inferInsert;
export type OneOnOneNote = typeof oneOnOneNotes.$inferSelect;
export type OneOnOneNoteInsert = typeof oneOnOneNotes.$inferInsert;
export type OneOnOneLink = typeof oneOnOneLinks.$inferSelect;
export type OneOnOneLinkInsert = typeof oneOnOneLinks.$inferInsert;

export const oneOnOnes = sqliteTable(
  "one_on_ones",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    managerId: text("manager_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    scheduledAt: text("scheduled_at").notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(60),
    status: text("status").notNull().default("scheduled"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    oneOnOnesWorkspaceIdx: index("one_on_ones_workspace_idx").on(table.workspaceId),
    oneOnOnesManagerIdx: index("one_on_ones_manager_idx").on(table.workspaceId, table.managerId, table.scheduledAt),
    oneOnOnesEmployeeIdx: index("one_on_ones_employee_idx").on(table.workspaceId, table.employeeId, table.scheduledAt),
  }),
);

export const oneOnOneNotes = sqliteTable(
  "one_on_one_notes",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    oneOnOneId: text("one_on_one_id")
      .notNull()
      .references(() => oneOnOnes.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    visibility: text("visibility").notNull().default("private"),
    text: text("text").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    oneOnOneNotesIdx: index("one_on_one_notes_idx").on(table.workspaceId, table.oneOnOneId),
  }),
);

export const oneOnOneLinks = sqliteTable(
  "one_on_one_links",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    oneOnOneId: text("one_on_one_id")
      .notNull()
      .references(() => oneOnOnes.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
  },
  (table) => ({
    oneOnOneLinksIdx: index("one_on_one_links_idx").on(table.workspaceId, table.oneOnOneId),
  }),
);

export const feedbackSurveys = sqliteTable(
  "feedback_surveys",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    type: text("type").notNull().default("pulse"),
    status: text("status").notNull().default("draft"),
    targetScope: text("target_scope").notNull().default("employees"),
    period: text("period"),
    createdBy: text("created_by").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    startDate: text("start_date"),
    endDate: text("end_date"),
    linkedPilotId: text("linked_pilot_id").references(() => pilotRuns.id, { onDelete: "set null" }),
  },
  (table) => ({
    feedbackSurveysWorkspaceIdx: index("feedback_surveys_workspace_idx").on(table.workspaceId),
  }),
);

export const feedbackQuestions = sqliteTable(
  "feedback_questions",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    surveyId: text("survey_id")
      .notNull()
      .references(() => feedbackSurveys.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull(),
    text: text("text").notNull(),
    kind: text("kind").notNull().default("scale"),
    isRequired: integer("is_required", { mode: "boolean" }).notNull().default(true),
  },
  (table) => ({
    feedbackQuestionsSurveyIdx: index("feedback_questions_survey_idx").on(table.workspaceId, table.surveyId),
  }),
);

export const feedbackResponses = sqliteTable(
  "feedback_responses",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    surveyId: text("survey_id")
      .notNull()
      .references(() => feedbackSurveys.id, { onDelete: "cascade" }),
    respondentId: text("respondent_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subjectEmployeeId: text("subject_employee_id").references(() => employees.id, { onDelete: "set null" }),
    subjectPilotId: text("subject_pilot_id").references(() => pilotRuns.id, { onDelete: "set null" }),
    status: text("status").notNull().default("in_progress"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    submittedAt: text("submitted_at"),
  },
  (table) => ({
    feedbackResponsesIdx: index("feedback_responses_idx").on(table.workspaceId, table.surveyId, table.respondentId),
  }),
);

export const feedbackAnswers = sqliteTable(
  "feedback_answers",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    responseId: text("response_id")
      .notNull()
      .references(() => feedbackResponses.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => feedbackQuestions.id, { onDelete: "cascade" }),
    scaleValue: integer("scale_value"),
    yesNoValue: integer("yes_no_value"),
    textValue: text("text_value"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    feedbackAnswersIdx: index("feedback_answers_idx").on(table.workspaceId, table.responseId),
  }),
);

export type FeedbackSurvey = typeof feedbackSurveys.$inferSelect;
export type FeedbackSurveyInsert = typeof feedbackSurveys.$inferInsert;
export type FeedbackQuestion = typeof feedbackQuestions.$inferSelect;
export type FeedbackQuestionInsert = typeof feedbackQuestions.$inferInsert;
export type FeedbackResponse = typeof feedbackResponses.$inferSelect;
export type FeedbackResponseInsert = typeof feedbackResponses.$inferInsert;
export type FeedbackAnswer = typeof feedbackAnswers.$inferSelect;
export type FeedbackAnswerInsert = typeof feedbackAnswers.$inferInsert;

export interface QuarterlyReportPayload {
  period: { year: number; quarter: number; startDate?: string | null; endDate?: string | null };
  headcount: { totalEmployees: number; activeEmployees: number };
  roles: {
    totalRoles: number;
    employeesPerRole: { roleId: string; roleName: string; count: number }[];
  };
  skills: {
    trackedSkills: number;
    avgSkillLevelByRole: { roleId: string; roleName: string; avgLevel: number }[];
    riskSkills: { skillCode: string; atRiskEmployees: number }[];
  };
  developmentGoals: {
    totalGoals: number;
    activeGoals: number;
    completedLastQuarter: number;
    staleGoals: number;
    highPriorityOverdue: number;
  };
  pilots: {
    activePilots: number;
    completedPilots: number;
    pilotSummaries: { pilotId: string; name: string; status: string; participants: number; startDate?: string | null; endDate?: string | null }[];
  };
  decisions?: { items: { id: string; text: string; ownerName?: string; dueDate?: string | null; status?: string }[] };
  feedback?: {
    surveysRun: number;
    responsesSubmitted: number;
    avgScaleOverall?: number | null;
  };
}

export const riskStatuses = ["open", "monitoring", "resolved"] as const;
export type RiskStatus = (typeof riskStatuses)[number];

export const riskCases = sqliteTable(
  "risk_cases",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    detectedAt: text("detected_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    level: text("level").$type<RiskLevel>().notNull(),
    source: text("source").notNull(),
    status: text("status").$type<RiskStatus>().notNull().default("open"),
    title: text("title").notNull(),
    reason: text("reason"),
    recommendation: text("recommendation"),
    pilotId: text("pilot_id").references(() => pilotRuns.id, { onDelete: "set null" }),
    createdByUserId: text("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    ownerUserId: text("owner_user_id").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: text("resolved_at"),
    resolutionNote: text("resolution_note"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    riskCasesIdx: index("risk_cases_workspace_status_level_idx").on(table.workspaceId, table.status, table.level),
    riskCasesEmployeeIdx: index("risk_cases_workspace_employee_status_idx").on(table.workspaceId, table.employeeId, table.status),
  }),
);

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

export const onboardingStepsEnum = [
  "company_info",
  "roles_skills",
  "employees",
  "focus_teams",
  "pilots",
  "feedback",
  "review",
] as const;
export type OnboardingStep = (typeof onboardingStepsEnum)[number];

export const workspaceOnboardingState = sqliteTable(
  "workspace_onboarding_state",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .unique()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    isCompleted: integer("is_completed", { mode: "boolean" }).notNull().default(false),
    currentStep: text("current_step").$type<OnboardingStep>().notNull().default("company_info"),
    completedSteps: text("completed_steps").notNull().default("[]"),
    lastUpdatedAt: text("last_updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    workspaceIdx: index("workspace_onboarding_state_workspace_idx").on(table.workspaceId),
  }),
);
export type WorkspaceOnboardingState = typeof workspaceOnboardingState.$inferSelect;

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
    type: text("type").$type<IntegrationType>().notNull(),
    name: text("name").notNull(),
    status: text("status").$type<IntegrationStatus>().notNull().default("connected"),
    config: text("config").notNull().default("{}"),
    lastSyncedAt: text("last_synced_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    workspaceIdx: index("integrations_workspace_idx").on(table.workspaceId),
    workspaceTypeIdx: index("integrations_workspace_type_idx").on(table.workspaceId, table.type),
  }),
);

export const artifactTypes = ["task", "ticket", "pull_request", "doc", "comment", "incident", "other"] as const;
export type ArtifactType = (typeof artifactTypes)[number];

export const artifactAssigneeRoles = ["author", "assignee", "reviewer", "commenter"] as const;
export type ArtifactAssigneeRole = (typeof artifactAssigneeRoles)[number];

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
    integrationId: text("integration_id").references(() => integrations.id, { onDelete: "set null" }),
    employeeId: text("employee_id").references(() => employees.id, { onDelete: "set null" }),
    externalId: text("external_id"),
    type: text("type").$type<ArtifactType>().notNull(),
    title: text("title").notNull(),
    url: text("url"),
    summary: text("summary"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    ingestedAt: text("ingested_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    workspaceIdx: index("artifacts_workspace_idx").on(table.workspaceId),
    integrationIdx: index("artifacts_integration_idx").on(table.integrationId),
    employeeIdx: index("artifacts_employee_idx").on(table.employeeId),
    externalIdx: index("artifacts_external_idx").on(table.workspaceId, table.integrationId, table.externalId),
  }),
);

export const artifactAssignees = sqliteTable(
  "artifact_assignees",
  {
    id: text("id").notNull().primaryKey(),
    artifactId: text("artifact_id")
      .notNull()
      .references(() => artifacts.id, { onDelete: "cascade" }),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    role: text("role").$type<ArtifactAssigneeRole>().notNull().default("assignee"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    artifactIdx: index("artifact_assignees_artifact_idx").on(table.artifactId),
    employeeIdx: index("artifact_assignees_employee_idx").on(table.employeeId),
  }),
);

export const artifactSkills = sqliteTable(
  "artifact_skills",
  {
    id: text("id").notNull().primaryKey(),
    artifactId: text("artifact_id")
      .notNull()
      .references(() => artifacts.id, { onDelete: "cascade" }),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    confidence: real("confidence").notNull().default(0.5),
  },
  (table) => ({
    artifactIdx: index("artifact_skills_artifact_idx").on(table.artifactId),
    skillIdx: index("artifact_skills_skill_idx").on(table.skillId),
  }),
);

export const questTemplates = sqliteTable(
  "quest_templates",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    targetRole: text("target_role"),
    difficulty: text("difficulty").$type<QuestDifficulty>().notNull(),
    estimatedDurationWeeks: integer("estimated_duration_weeks"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    workspaceIdx: index("quest_templates_workspace_idx").on(table.workspaceId),
  }),
);

export const quests = sqliteTable(
  "quests",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    templateId: text("template_id").references(() => questTemplates.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    status: text("status").$type<QuestStatus>().notNull(),
    ownerEmployeeId: text("owner_employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    relatedTeamId: text("related_team_id").references(() => tracks.id, { onDelete: "set null" }),
    priority: text("priority").$type<QuestPriority>().notNull(),
    goalType: text("goal_type").$type<QuestGoalType>().notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    workspaceIdx: index("quests_workspace_idx").on(table.workspaceId),
    statusIdx: index("quests_status_idx").on(table.status),
    teamIdx: index("quests_team_idx").on(table.relatedTeamId),
  }),
);

export const questSteps = sqliteTable(
  "quest_steps",
  {
    id: text("id").notNull().primaryKey(),
    questId: text("quest_id")
      .notNull()
      .references(() => quests.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    order: integer("order_index").notNull(),
    required: integer("required", { mode: "boolean" }).notNull().default(true),
    relatedSkillId: text("related_skill_id").references(() => skills.id, { onDelete: "set null" }),
    suggestedArtifactsCount: integer("suggested_artifacts_count"),
  },
  (table) => ({
    questIdx: index("quest_steps_quest_idx").on(table.questId),
  }),
);

export const questAssignments = sqliteTable(
  "quest_assignments",
  {
    id: text("id").notNull().primaryKey(),
    questId: text("quest_id")
      .notNull()
      .references(() => quests.id, { onDelete: "cascade" }),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    status: text("status").$type<QuestAssignmentStatus>().notNull(),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
    mentorEmployeeId: text("mentor_employee_id").references(() => employees.id, { onDelete: "set null" }),
  },
  (table) => ({
    questIdx: index("quest_assignments_quest_idx").on(table.questId),
    employeeIdx: index("quest_assignments_employee_idx").on(table.employeeId),
  }),
);

export const questStepProgress = sqliteTable(
  "quest_step_progress",
  {
    id: text("id").notNull().primaryKey(),
    questAssignmentId: text("quest_assignment_id")
      .notNull()
      .references(() => questAssignments.id, { onDelete: "cascade" }),
    stepId: text("step_id")
      .notNull()
      .references(() => questSteps.id, { onDelete: "cascade" }),
    status: text("status").$type<QuestStepStatus>().notNull(),
    notes: text("notes"),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    assignmentIdx: index("quest_step_progress_assignment_idx").on(table.questAssignmentId),
    stepIdx: index("quest_step_progress_step_idx").on(table.stepId),
  }),
);

export const assessmentCycles = sqliteTable(
  "assessment_cycles",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").$type<AssessmentStatus>().notNull(),
    startsAt: text("starts_at"),
    endsAt: text("ends_at"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    workspaceIdx: index("assessment_cycles_workspace_idx").on(table.workspaceId),
    statusIdx: index("assessment_cycles_status_idx").on(table.status),
  }),
);

export const assessmentCycleTeams = sqliteTable(
  "assessment_cycle_teams",
  {
    id: text("id").notNull().primaryKey(),
    cycleId: text("cycle_id")
      .notNull()
      .references(() => assessmentCycles.id, { onDelete: "cascade" }),
    teamId: text("team_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
  },
  (table) => ({
    cycleIdx: index("assessment_cycle_teams_cycle_idx").on(table.cycleId),
    teamIdx: index("assessment_cycle_teams_team_idx").on(table.teamId),
  }),
);

export const skillAssessments = sqliteTable(
  "skill_assessments",
  {
    id: text("id").notNull().primaryKey(),
    cycleId: text("cycle_id")
      .notNull()
      .references(() => assessmentCycles.id, { onDelete: "cascade" }),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    selfLevel: integer("self_level"),
    managerLevel: integer("manager_level"),
    finalLevel: integer("final_level"),
    selfComment: text("self_comment"),
    managerComment: text("manager_comment"),
    finalComment: text("final_comment"),
    status: text("status").$type<AssessmentSkillStatus>().notNull(),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    cycleIdx: index("skill_assessments_cycle_idx").on(table.cycleId),
    employeeIdx: index("skill_assessments_employee_idx").on(table.employeeId),
    skillIdx: index("skill_assessments_skill_idx").on(table.skillId),
  }),
);

export const assessmentCycleParticipants = sqliteTable(
  "assessment_cycle_participants",
  {
    id: text("id").notNull().primaryKey(),
    cycleId: text("cycle_id")
      .notNull()
      .references(() => assessmentCycles.id, { onDelete: "cascade" }),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    selfStatus: text("self_status").$type<AssessmentSelfStatus>().notNull(),
    managerStatus: text("manager_status").$type<AssessmentManagerStatus>().notNull(),
    finalStatus: text("final_status").$type<AssessmentFinalStatus>().notNull(),
    managerEmployeeId: text("manager_employee_id").references(() => employees.id, { onDelete: "set null" }),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    cycleIdx: index("assessment_participants_cycle_idx").on(table.cycleId),
    employeeIdx: index("assessment_participants_employee_idx").on(table.employeeId),
  }),
);

export const jobRoles = sqliteTable(
  "job_roles",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    levelBand: text("level_band"),
    isLeadership: integer("is_leadership", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    workspaceIdx: index("job_roles_workspace_idx").on(table.workspaceId),
  }),
);

export const jobRoleSkillRequirements = sqliteTable(
  "job_role_skill_requirements",
  {
    id: text("id").notNull().primaryKey(),
    jobRoleId: text("job_role_id")
      .notNull()
      .references(() => jobRoles.id, { onDelete: "cascade" }),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    requiredLevel: integer("required_level").notNull(),
    importance: text("importance").$type<JobRoleImportance>().notNull(),
  },
  (table) => ({
    roleIdx: index("job_role_skill_req_role_idx").on(table.jobRoleId),
    skillIdx: index("job_role_skill_req_skill_idx").on(table.skillId),
  }),
);

export const moveScenarios = sqliteTable(
  "move_scenarios",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").$type<MoveScenarioStatus>().notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    workspaceIdx: index("move_scenarios_workspace_idx").on(table.workspaceId),
    statusIdx: index("move_scenarios_status_idx").on(table.status),
  }),
);

export const moveScenarioActions = sqliteTable(
  "move_scenario_actions",
  {
    id: text("id").notNull().primaryKey(),
    scenarioId: text("scenario_id")
      .notNull()
      .references(() => moveScenarios.id, { onDelete: "cascade" }),
    type: text("type").$type<MoveActionType>().notNull(),
    teamId: text("team_id").references(() => tracks.id, { onDelete: "set null" }),
    fromEmployeeId: text("from_employee_id").references(() => employees.id, { onDelete: "set null" }),
    toEmployeeId: text("to_employee_id").references(() => employees.id, { onDelete: "set null" }),
    jobRoleId: text("job_role_id").references(() => jobRoles.id, { onDelete: "set null" }),
    skillId: text("skill_id").references(() => skills.id, { onDelete: "set null" }),
    priority: text("priority").$type<MovePriority>().notNull().default("medium"),
    estimatedTimeMonths: integer("estimated_time_months"),
    estimatedCostHire: integer("estimated_cost_hire"),
    estimatedCostDevelop: integer("estimated_cost_develop"),
    impactOnRisk: integer("impact_on_risk"),
  },
  (table) => ({
    scenarioIdx: index("move_actions_scenario_idx").on(table.scenarioId),
    teamIdx: index("move_actions_team_idx").on(table.teamId),
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

export const skillRoleProfiles = sqliteTable(
  "skill_role_profiles",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    roleCode: text("role_code"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    skillRoleProfilesWorkspaceIdx: index("skill_role_profiles_workspace_idx").on(table.workspaceId),
  }),
);

export const skillRoleProfileItems = sqliteTable(
  "skill_role_profile_items",
  {
    id: text("id").notNull().primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => skillRoleProfiles.id, { onDelete: "cascade" }),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    targetLevel: integer("target_level").notNull(),
    weight: integer("weight").notNull().default(1),
  },
  (table) => ({
    skillRoleProfileItemsProfileIdx: index("skill_role_profile_items_profile_idx").on(table.profileId),
    skillRoleProfileItemsSkillIdx: index("skill_role_profile_items_skill_idx").on(table.skillId),
  }),
);

export const quarterlyReports = sqliteTable(
  "quarterly_reports",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    quarter: integer("quarter").notNull(),
    title: text("title").notNull(),
    notes: text("notes"),
    isLocked: integer("is_locked", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
    payload: text("payload", { mode: "json" }).$type<QuarterlyReportPayload | null>().default(null),
    generatedAt: integer("generated_at", { mode: "timestamp" }),
    generatedByUserId: text("generated_by_user_id").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => ({
    quarterlyReportsWorkspaceIdx: index("quarterly_reports_workspace_idx").on(table.workspaceId),
    quarterlyReportsUniqueIdx: uniqueIndex("quarterly_reports_workspace_period_idx").on(table.workspaceId, table.year, table.quarter),
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

export const onboardingStates = sqliteTable(
  "onboarding_states",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    steps: text("steps").notNull().default("{}"),
    isCompleted: integer("is_completed", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    workspaceUniqueIdx: uniqueIndex("onboarding_states_workspace_id_unique").on(table.workspaceId),
  }),
);

export const roleProfiles = sqliteTable(
  "role_profiles",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    roleProfilesWorkspaceIdx: index("role_profiles_workspace_idx").on(table.workspaceId),
  }),
);

export const roleProfileSkillRequirements = sqliteTable(
  "role_profile_skill_requirements",
  {
    id: text("id").notNull().primaryKey(),
    roleProfileId: text("role_profile_id")
      .notNull()
      .references(() => roleProfiles.id, { onDelete: "cascade" }),
    skillCode: text("skill_code").notNull(),
    levelRequired: integer("level_required").notNull(),
    weight: real("weight").notNull().default(1),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    rpsrRoleProfileIdx: index("rpsr_role_profile_idx").on(table.roleProfileId),
  }),
);

export const employeeRoleAssignments = sqliteTable(
  "employee_role_assignments",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    employeeId: text("employee_id").notNull(),
    roleProfileId: text("role_profile_id")
      .notNull()
      .references(() => roleProfiles.id, { onDelete: "cascade" }),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(true),
    assignedAt: text("assigned_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    eraWorkspaceEmployeeIdx: index("era_workspace_employee_idx").on(table.workspaceId, table.employeeId),
  }),
);

export const employeeSkillRatings = sqliteTable(
  "employee_skill_ratings",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    employeeId: text("employee_id").notNull(),
    skillCode: text("skill_code").notNull(),
    level: integer("level").notNull(),
    source: text("source").notNull(),
    ratedAt: text("rated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    esrWorkspaceEmployeeIdx: index("esr_workspace_employee_idx").on(table.workspaceId, table.employeeId),
    esrUniqueSkillSourceIdx: uniqueIndex("esr_unique_skill_source_idx").on(
      table.workspaceId,
      table.employeeId,
      table.skillCode,
      table.source,
    ),
  }),
);

export const developmentGoals = sqliteTable(
  "development_goals",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").notNull().default("active"),
    priority: integer("priority").notNull().default(2),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    dueDate: text("due_date"),
    targetSkillCode: text("target_skill_code"),
    targetLevel: integer("target_level"),
    roleProfileId: text("role_profile_id").references(() => roleProfiles.id, { onDelete: "set null" }),
  },
  (table) => ({
    developmentGoalsWorkspaceEmployeeIdx: index("development_goals_workspace_employee_idx").on(table.workspaceId, table.employeeId),
    developmentGoalsStatusIdx: index("development_goals_status_idx").on(table.workspaceId, table.status),
  }),
);

export const developmentGoalCheckins = sqliteTable(
  "development_goal_checkins",
  {
    id: text("id").notNull().primaryKey(),
    goalId: text("goal_id")
      .notNull()
      .references(() => developmentGoals.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id").notNull(),
    employeeId: text("employee_id").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    note: text("note").notNull(),
    status: text("status"),
  },
  (table) => ({
    developmentGoalCheckinsGoalIdx: index("development_goal_checkins_goal_idx").on(table.goalId),
    developmentGoalCheckinsWorkspaceEmployeeIdx: index("development_goal_checkins_workspace_employee_idx").on(table.workspaceId, table.employeeId),
  }),
);

export const pilotTemplates = sqliteTable(
  "pilot_templates",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    targetRole: text("target_role"),
    targetSkillId: text("target_skill_id").references(() => skills.id, { onDelete: "set null" }),
    suggestedDurationWeeks: integer("suggested_duration_weeks"),
    intensityLevel: text("intensity_level").$type<"light" | "normal" | "intensive" | string>(),
    isGlobal: integer("is_global", { mode: "boolean" }).notNull().default(false),
    isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    createdByUserId: text("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => ({
    pilotTemplatesSlugWorkspaceIdx: uniqueIndex("pilot_templates_slug_workspace_idx").on(table.slug, table.workspaceId),
    pilotTemplatesGlobalIdx: index("pilot_templates_global_idx").on(table.isGlobal, table.isArchived),
  }),
);

export const pilotTemplateSteps = sqliteTable(
  "pilot_template_steps",
  {
    id: text("id").notNull().primaryKey(),
    templateId: text("template_id")
      .notNull()
      .references(() => pilotTemplates.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    expectedOutcome: text("expected_outcome"),
    suggestedDueOffsetWeeks: integer("suggested_due_offset_weeks"),
    isRequired: integer("is_required", { mode: "boolean" }).notNull().default(true),
  },
  (table) => ({
    pilotTemplateStepsTemplateIdx: index("pilot_template_steps_template_idx").on(table.templateId),
  }),
);

export const pilots = sqliteTable(
  "pilots",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: text("status").$type<PilotStatus>().notNull().default("planned"),
    startDate: text("start_date"),
    endDate: text("end_date"),
    goals: text("goals"),
    templateId: text("template_id").references(() => pilotTemplates.id, { onDelete: "set null" }),
    origin: text("origin").$type<"manual" | "template" | "import">().notNull().default("manual"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    workspaceIdx: index("pilots_workspace_idx").on(table.workspaceId),
    workspaceStatusIdx: index("pilots_workspace_status_idx").on(table.workspaceId, table.status),
  }),
);

export const pilotSteps = sqliteTable(
  "pilot_steps",
  {
    id: text("id").notNull().primaryKey(),
    pilotId: text("pilot_id")
      .notNull()
      .references(() => pilots.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    order: integer("order_index").notNull().default(0),
    mandatory: integer("mandatory", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    pilotIdx: index("pilot_steps_pilot_idx").on(table.pilotId),
    pilotKeyIdx: index("pilot_steps_key_idx").on(table.pilotId, table.key),
  }),
);

export const pilotStepStatuses = sqliteTable(
  "pilot_step_statuses",
  {
    id: text("id").notNull().primaryKey(),
    pilotId: text("pilot_id")
      .notNull()
      .references(() => pilots.id, { onDelete: "cascade" }),
    stepId: text("step_id")
      .notNull()
      .references(() => pilotSteps.id, { onDelete: "cascade" }),
    status: text("status").$type<PilotStepStatus>().notNull().default("not_started"),
    notes: text("notes"),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    pilotStepIdx: uniqueIndex("pilot_step_statuses_pilot_step_idx").on(table.pilotId, table.stepId),
    pilotIdx: index("pilot_step_statuses_pilot_idx").on(table.pilotId),
  }),
);

export type User = typeof users.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type Member = typeof members.$inferSelect;
export type Invite = typeof invites.$inferSelect;
export type Artifact = typeof artifacts.$inferSelect;
export type ArtifactAssignee = typeof artifactAssignees.$inferSelect;
export type ArtifactSkill = typeof artifactSkills.$inferSelect;
export type Integration = typeof integrations.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type Employee = typeof employees.$inferSelect;
export type Skill = typeof skills.$inferSelect;
export type SkillRoleProfile = typeof skillRoleProfiles.$inferSelect;
export type SkillRoleProfileItem = typeof skillRoleProfileItems.$inferSelect;
export type QuarterlyReport = typeof quarterlyReports.$inferSelect;
export type Track = typeof tracks.$inferSelect;
export type TrackLevel = typeof trackLevels.$inferSelect;
export type EmployeeSkill = typeof employeeSkills.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type OnboardingState = typeof onboardingStates.$inferSelect;
export type RoleProfile = typeof roleProfiles.$inferSelect;
export type RoleProfileSkillRequirement = typeof roleProfileSkillRequirements.$inferSelect;
export type EmployeeRoleAssignment = typeof employeeRoleAssignments.$inferSelect;
export type EmployeeSkillRating = typeof employeeSkillRatings.$inferSelect;
export type PilotRunParticipant = typeof pilotRunParticipants.$inferSelect;
export type DevelopmentGoal = typeof developmentGoals.$inferSelect;
export type DevelopmentGoalInsert = typeof developmentGoals.$inferInsert;
export type DevelopmentGoalCheckin = typeof developmentGoalCheckins.$inferSelect;
export type Pilot = typeof pilots.$inferSelect;
export type PilotStep = typeof pilotSteps.$inferSelect;
export type PilotStepStatusRecord = typeof pilotStepStatuses.$inferSelect;

export const pilotRuns = sqliteTable(
  "pilot_runs",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").$type<PilotRunStatus>().notNull().default("draft"),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetCycleId: text("target_cycle_id").references(() => assessmentCycles.id, { onDelete: "set null" }),
    templateId: text("template_id").references(() => pilotTemplates.id, { onDelete: "set null" }),
    origin: text("origin").$type<"manual" | "template" | "import">().notNull().default("manual"),
    startDate: text("start_date"),
    endDate: text("end_date"),
    targetAudience: text("target_audience"),
    successCriteria: text("success_criteria"),
    notes: text("notes"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    pilotRunsWorkspaceIdx: index("pilot_runs_workspace_idx").on(table.workspaceId),
    pilotRunsStatusIdx: index("pilot_runs_status_idx").on(table.workspaceId, table.status),
  }),
);

export const pilotRunTeams = sqliteTable(
  "pilot_run_teams",
  {
    id: text("id").notNull().primaryKey(),
    pilotRunId: text("pilot_run_id")
      .notNull()
      .references(() => pilotRuns.id, { onDelete: "cascade" }),
    teamId: text("team_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pilotRunTeamsIdx: index("pilot_run_teams_idx").on(table.pilotRunId, table.teamId),
  }),
);

export const pilotRunParticipants = sqliteTable(
  "pilot_run_participants",
  {
    id: text("id").notNull().primaryKey(),
    pilotRunId: text("pilot_run_id")
      .notNull()
      .references(() => pilotRuns.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    roleInPilot: text("role_in_pilot"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    pilotRunParticipantsPilotIdx: index("pilot_run_participants_pilot_idx").on(table.pilotRunId),
    pilotRunParticipantsWorkspaceEmployeeIdx: index("pilot_run_participants_workspace_employee_idx").on(table.workspaceId, table.employeeId),
  }),
);

export const pilotRunSteps = sqliteTable(
  "pilot_run_steps",
  {
    id: text("id").notNull().primaryKey(),
    pilotRunId: text("pilot_run_id")
      .notNull()
      .references(() => pilotRuns.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    orderIndex: integer("order_index").notNull().default(0),
    status: text("status").$type<PilotRunStepStatus>().notNull().default("pending"),
    dueDate: text("due_date"),
    completedAt: text("completed_at"),
  },
  (table) => ({
    pilotRunStepsIdx: index("pilot_run_steps_idx").on(table.pilotRunId),
    pilotRunStepsKeyIdx: index("pilot_run_steps_key_idx").on(table.pilotRunId, table.key),
  }),
);

export const pilotRunNotes = sqliteTable(
  "pilot_run_notes",
  {
    id: text("id").notNull().primaryKey(),
    pilotRunId: text("pilot_run_id")
      .notNull()
      .references(() => pilotRuns.id, { onDelete: "cascade" }),
    authorUserId: text("author_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<PilotNoteType>().notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    relatedTeamId: text("related_team_id").references(() => tracks.id, { onDelete: "set null" }),
    relatedScenarioId: text("related_scenario_id").references(() => moveScenarios.id, { onDelete: "set null" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    pilotRunNotesIdx: index("pilot_run_notes_idx").on(table.pilotRunId),
    pilotRunNotesTeamIdx: index("pilot_run_notes_team_idx").on(table.relatedTeamId),
  }),
);

export type PilotRun = typeof pilotRuns.$inferSelect;
export type PilotRunStep = typeof pilotRunSteps.$inferSelect;
export type PilotRunNote = typeof pilotRunNotes.$inferSelect;

export const reports = sqliteTable(
  "reports",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    type: text("type").$type<ReportType>().notNull(),
    title: text("title").notNull(),
    teamId: text("team_id").references(() => tracks.id, { onDelete: "set null" }),
    pilotRunId: text("pilot_run_id").references(() => pilotRuns.id, { onDelete: "set null" }),
    generatedFrom: text("generated_from").$type<ReportGeneratedFrom>().default("manual"),
    status: text("status").$type<ReportStatus>().notNull().default("draft"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    reportsWorkspaceIdx: index("reports_workspace_idx").on(table.workspaceId),
    reportsStatusIdx: index("reports_status_idx").on(table.workspaceId, table.status),
  }),
);

export const reportSections = sqliteTable(
  "report_sections",
  {
    id: text("id").notNull().primaryKey(),
    reportId: text("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    key: text("key"),
    title: text("title").notNull(),
    orderIndex: integer("order_index").notNull().default(0),
    contentMarkdown: text("content_markdown").notNull().default(""),
    isAutoGenerated: integer("is_auto_generated", { mode: "boolean" }).notNull().default(true),
  },
  (table) => ({
    reportSectionsReportIdx: index("report_sections_report_idx").on(table.reportId),
  }),
);

export const meetingAgendas = sqliteTable(
  "meeting_agendas",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    reportId: text("report_id").references(() => reports.id, { onDelete: "set null" }),
    type: text("type").$type<MeetingType>().notNull(),
    title: text("title").notNull(),
    description: text("description"),
    scheduledAt: text("scheduled_at"),
    durationMinutes: integer("duration_minutes"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    meetingAgendaWorkspaceIdx: index("meeting_agenda_workspace_idx").on(table.workspaceId),
  }),
);

export const meetingAgendaItems = sqliteTable(
  "meeting_agenda_items",
  {
    id: text("id").notNull().primaryKey(),
    agendaId: text("agenda_id")
      .notNull()
      .references(() => meetingAgendas.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull().default(0),
    title: text("title").notNull(),
    bodyMarkdown: text("body_markdown").notNull().default(""),
    relatedTeamId: text("related_team_id").references(() => tracks.id, { onDelete: "set null" }),
    relatedPilotRunId: text("related_pilot_run_id").references(() => pilotRuns.id, { onDelete: "set null" }),
    relatedScenarioId: text("related_scenario_id").references(() => moveScenarios.id, { onDelete: "set null" }),
    isAutoGenerated: integer("is_auto_generated", { mode: "boolean" }).notNull().default(true),
  },
  (table) => ({
    meetingAgendaItemsIdx: index("meeting_agenda_items_idx").on(table.agendaId),
  }),
);

export type Report = typeof reports.$inferSelect;
export type ReportSection = typeof reportSections.$inferSelect;
export type MeetingAgenda = typeof meetingAgendas.$inferSelect;
export type MeetingAgendaItem = typeof meetingAgendaItems.$inferSelect;
export type TalentDecision = typeof talentDecisions.$inferSelect;

export const talentDecisions = sqliteTable(
  "talent_decisions",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    type: text("type").$type<TalentDecisionType>().notNull(),
    sourceType: text("source_type").$type<TalentDecisionSourceType>().notNull(),
    sourceId: text("source_id"),
    status: text("status").$type<TalentDecisionStatus>().notNull().default("proposed"),
    priority: text("priority").$type<QuestPriority>().notNull().default("medium"),
    title: text("title").notNull(),
    rationale: text("rationale").notNull(),
    risks: text("risks"),
    timeframe: text("timeframe"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    talentDecisionsWorkspaceIdx: index("talent_decisions_workspace_idx").on(table.workspaceId),
    talentDecisionsEmployeeIdx: index("talent_decisions_employee_idx").on(table.employeeId),
    talentDecisionsStatusIdx: index("talent_decisions_status_idx").on(table.status),
    talentDecisionsTypeIdx: index("talent_decisions_type_idx").on(table.type),
  }),
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<NotificationType>().notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    entityType: text("entity_type").$type<NotificationEntityType>().default(null),
    entityId: text("entity_id"),
    url: text("url"),
    isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
    isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
    readAt: text("read_at"),
    expiresAt: text("expires_at"),
    priority: integer("priority").notNull().default(2),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    notificationsWorkspaceIdx: index("notifications_workspace_idx").on(table.workspaceId),
    notificationsUserIdx: index("notifications_user_idx").on(table.workspaceId, table.userId),
    notificationsReadIdx: index("notifications_read_idx").on(table.workspaceId, table.userId, table.isRead),
  }),
);

export const notificationSettings = sqliteTable(
  "notification_settings",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channel: text("channel").notNull().default("in_app"),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    type: text("type"),
    emailEnabled: integer("email_enabled", { mode: "boolean" }).notNull().default(true),
    emailDailyDigest: integer("email_daily_digest", { mode: "boolean" }).notNull().default(true),
    emailWeeklyDigest: integer("email_weekly_digest", { mode: "boolean" }).notNull().default(false),
    inAppEnabled: integer("in_app_enabled", { mode: "boolean" }).notNull().default(true),
    timezone: text("timezone"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    notificationSettingsWorkspaceUserIdx: index("notification_settings_workspace_user_idx").on(table.workspaceId, table.userId),
  }),
);

export const notificationChannels = sqliteTable(
  "notification_channels",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<"email" | "slack" | string>().notNull(),
    target: text("target").notNull(),
    isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
    preferences: text("preferences").notNull().default("[]"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    notificationChannelsWorkspaceIdx: index("notification_channels_workspace_idx").on(table.workspaceId),
    notificationChannelsUserIdx: index("notification_channels_user_idx").on(table.workspaceId, table.userId),
  }),
);
export type NotificationChannel = typeof notificationChannels.$inferSelect;

export const reminderRules = sqliteTable(
  "reminder_rules",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    key: text("key").$type<ReminderRuleKey>().notNull(),
    isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
    daysBefore: integer("days_before"),
    staleDays: integer("stale_days"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    reminderRulesWorkspaceIdx: index("reminder_rules_workspace_idx").on(table.workspaceId),
    reminderRulesKeyIdx: index("reminder_rules_key_idx").on(table.workspaceId, table.key),
  }),
);

export const reminderJobs = sqliteTable(
  "reminder_jobs",
  {
    id: text("id").notNull().primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    type: text("type").$type<ReminderJobType>().notNull(),
    startedAt: text("started_at").notNull(),
    finishedAt: text("finished_at"),
    status: text("status").$type<ReminderJobStatus>().notNull().default("running"),
    errorMessage: text("error_message"),
  },
  (table) => ({
    reminderJobsWorkspaceIdx: index("reminder_jobs_workspace_idx").on(table.workspaceId),
  }),
);

export type Notification = typeof notifications.$inferSelect;
export type ReminderRule = typeof reminderRules.$inferSelect;
export type ReminderJob = typeof reminderJobs.$inferSelect;
export type TalentDecision = typeof talentDecisions.$inferSelect;
export type QuarterlyReport = typeof quarterlyReports.$inferSelect;
export type PilotTemplate = typeof pilotTemplates.$inferSelect;
export type PilotTemplateStep = typeof pilotTemplateSteps.$inferSelect;
export type NotificationSetting = typeof notificationSettings.$inferSelect;
export type RiskCase = typeof riskCases.$inferSelect;
