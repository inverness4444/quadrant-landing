import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { programTemplates } from "@/drizzle/schema";

export async function seedProgramTemplates() {
  // safety: ensure tables exist even если миграции не прогнаны в локальной БД
  try {
    await db.run(
      sql`CREATE TABLE IF NOT EXISTS program_templates (
        id text primary key,
        code text not null unique,
        name text not null,
        description text not null,
        target_roles text not null default '[]',
        target_size_hint text not null default '',
        default_duration_days integer not null default 90,
        created_at text not null default (CURRENT_TIMESTAMP),
        updated_at text not null default (CURRENT_TIMESTAMP)
      );`,
    );
    await db.run(
      sql`CREATE TABLE IF NOT EXISTS workspace_programs (
        id text primary key,
        workspace_id text not null references workspaces(id) on delete cascade,
        template_code text not null references program_templates(code) on delete cascade,
        name text not null,
        description text not null,
        owner_id text not null references users(id),
        status text not null default 'draft',
        started_at text,
        planned_end_at text,
        actual_end_at text,
        target_employee_ids text not null default '[]',
        created_at text not null default (CURRENT_TIMESTAMP),
        updated_at text not null default (CURRENT_TIMESTAMP)
      );`,
    );
  } catch (error) {
    console.warn("seedProgramTemplates: unable to ensure program tables", error);
  }
  const now = new Date().toISOString();
  const templates = [
    {
      code: "emerging_leads",
      name: "Программа развития будущих тимлидов за 90 дней",
      description: "Поддержка middle-инженеров на пути к тимлидству: пилоты, цели развития, 1:1 и опросы.",
      targetRoles: JSON.stringify([]),
      targetSizeHint: "5–20 человек",
      defaultDurationDays: 90,
    },
    {
      code: "junior_onboarding",
      name: "Онбординг джунов в продуктовую команду за 60 дней",
      description: "Пилот онбординга, цели по ключевым навыкам и опрос после 30 дней.",
      targetRoles: JSON.stringify([]),
      targetSizeHint: "3–10 человек",
      defaultDurationDays: 60,
    },
    {
      code: "burnout_recovery",
      name: "Восстановление перегруженной команды за 45 дней",
      description: "Pulse-опросы, пилот по балансу нагрузки и частые 1:1.",
      targetRoles: JSON.stringify([]),
      targetSizeHint: "5–15 человек",
      defaultDurationDays: 45,
    },
  ];
  for (const tpl of templates) {
    await db
      .insert(programTemplates)
      .values({
        id: randomUUID(),
        ...tpl,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: programTemplates.code })
      .run();
  }
}
