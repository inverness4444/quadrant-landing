export type ActionItem = {
  id: string;
  workspaceId: string;
  type:
    | "rate_skill"
    | "create_goal"
    | "run_1_1"
    | "close_program"
    | "fill_program_outcome"
    | "fill_pilot_outcome"
    | "launch_program"
    | "launch_program_for_gap"
    | "invite_employee"
    | "finish_onboarding"
    | "answer_survey"
    | "check_burnout"
    | "report";
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  dueDate: string | null;
  targetScope: "company" | "team" | "employee" | "program" | "pilot" | "report";
  targetId: string | null;
  link: string;
  createdAt: string;
  source: "program" | "pilot" | "skill_gap" | "feedback" | "onboarding" | "system";
};

