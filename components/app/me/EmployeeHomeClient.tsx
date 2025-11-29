"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/common/Card";
import Tag from "@/components/common/Tag";
import SecondaryButton from "@/components/common/SecondaryButton";
import PrimaryButton from "@/components/common/PrimaryButton";
import type { EmployeeProfileSnapshot } from "@/services/employeeProfileService";
import type { EmployeeActionItem } from "@/services/employeeActionService";

type ProfileResponse = { ok: boolean; profile: EmployeeProfileSnapshot | null };
type ActionsResponse = { ok: boolean; actions: EmployeeActionItem[] };

export default function EmployeeHomeClient({ userName, workspaceName }: { userName: string; workspaceName: string }) {
  const [profile, setProfile] = useState<EmployeeProfileSnapshot | null>(null);
  const [actions, setActions] = useState<EmployeeActionItem[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState<
    Array<{ id: string; title: string; body: string; createdAt: string; url?: string | null }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileResp, actionsResp] = await Promise.all([
        fetch("/api/app/me/profile", { cache: "no-store" }),
        fetch("/api/app/me/actions", { cache: "no-store" }),
      ]);
      const profileJson = (await profileResp.json().catch(() => null)) as ProfileResponse | null;
      const actionsJson = (await actionsResp.json().catch(() => null)) as ActionsResponse | null;
      if (!profileResp.ok || !profileJson?.ok) throw new Error(profileJson?.error?.message ?? "Не удалось загрузить профиль");
      setProfile(profileJson.profile);
      if (actionsResp.ok && actionsJson?.ok) setActions(actionsJson.actions);
      const unreadResp = await fetch("/api/app/notifications?onlyUnread=true&limit=3", { cache: "no-store" });
      const unreadJson = await unreadResp.json().catch(() => null);
      if (unreadResp.ok && unreadJson?.notifications) {
        setUnreadNotifications(unreadJson.notifications);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const topGaps = useMemo(() => profile?.skills.topGaps ?? [], [profile]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Твой кабинет</p>
          <h1 className="text-3xl font-semibold text-brand-text">Привет, {userName}</h1>
          <p className="text-sm text-slate-600">Quadrant помогает расти внутри {workspaceName}.</p>
          {profile && (
            <p className="text-sm text-slate-600">
              Роль: {profile.roleName ?? "—"} · Менеджер: {profile.managerName ?? "—"}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <SecondaryButton onClick={() => void load()} className="px-3 py-2 text-xs" disabled={loading}>
            Обновить
          </SecondaryButton>
        </div>
      </div>

      {error && <Card className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card>}
      {loading && !profile && <Card className="p-3 text-sm text-slate-500">Загружаем данные…</Card>}

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Следующие шаги</p>
            <h2 className="text-xl font-semibold text-brand-text">Личный Action Center</h2>
          </div>
          <SecondaryButton href="/app/agenda" className="px-3 py-1 text-xs">
            Моя повестка
          </SecondaryButton>
        </div>
        {actions.length === 0 ? (
          <p className="text-sm text-slate-500">У тебя нет срочных задач. Можно сосредоточиться на текущей работе.</p>
        ) : (
          <div className="space-y-2">
            {actions.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/70 bg-white/90 p-3 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-2">
                  <Tag variant="outline">{mapActionType(item.type)}</Tag>
                  <Link href={item.link} className="text-xs font-semibold text-brand-primary">
                    Перейти →
                  </Link>
                </div>
                <p className="mt-1 font-semibold text-brand-text">{item.title}</p>
                <p className="text-xs text-slate-500">{item.description}</p>
                {item.dueDate && <p className="text-[11px] text-slate-400">до {new Date(item.dueDate).toLocaleDateString("ru-RU")}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {profile && (
        <>
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Цели развития</p>
                <h2 className="text-xl font-semibold text-brand-text">Твои цели</h2>
              </div>
              <PrimaryButton href="/app/development-goals" className="px-3 py-1 text-xs">
                Создать цель
              </PrimaryButton>
            </div>
            {profile.goals.length === 0 ? (
              <p className="text-sm text-slate-500">Пока нет целей. Начни с главных навыков для своей роли.</p>
            ) : (
              <div className="space-y-2">
                {profile.goals.map((goal) => (
                  <div key={goal.id} className="rounded-2xl border border-white/70 bg-white/90 p-3 text-sm text-slate-700">
                    <div className="flex items-center gap-2">
                      <Tag variant={goal.status === "overdue" ? "danger" : goal.status === "completed" ? "success" : "outline"}>
                        {goal.status === "overdue" ? "Просрочено" : goal.status === "completed" ? "Завершена" : "Активна"}
                      </Tag>
                      {goal.targetDate && <span className="text-xs text-slate-500">до {new Date(goal.targetDate).toLocaleDateString("ru-RU")}</span>}
                    </div>
                    <p className="mt-1 font-semibold text-brand-text">{goal.title}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Программы и пилоты</p>
                <h2 className="text-xl font-semibold text-brand-text">Где ты участвуешь</h2>
              </div>
            </div>
            {profile.programs.length === 0 && profile.pilots.length === 0 ? (
              <p className="text-sm text-slate-500">Ты ещё не включён в программы или пилоты.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {profile.programs.map((p) => (
                  <Card key={p.id} className="border border-white/70 bg-white/90 p-3 text-sm text-slate-700">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-brand-text">{p.name}</p>
                      <Tag variant={p.status === "active" ? "outline" : p.status === "completed" ? "success" : "warning"}>{p.status}</Tag>
                    </div>
                    <Link href={`/app/programs/${p.id}`} className="text-xs font-semibold text-brand-primary">
                      Открыть →
                    </Link>
                  </Card>
                ))}
                {profile.pilots.map((p) => (
                  <Card key={p.id} className="border border-white/70 bg-white/90 p-3 text-sm text-slate-700">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-brand-text">{p.name}</p>
                      <Tag variant={p.status === "active" ? "outline" : "success"}>{p.status}</Tag>
                    </div>
                    <Link href={`/app/pilots/${p.id}`} className="text-xs font-semibold text-brand-primary">
                      Открыть →
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Предстоящие 1:1</p>
                <h2 className="text-xl font-semibold text-brand-text">Следующие встречи</h2>
              </div>
            </div>
            {profile.upcomingOneOnOnes.length === 0 ? (
              <p className="text-sm text-slate-500">Нет запланированных 1:1 в ближайшие 2 недели.</p>
            ) : (
              <div className="space-y-2">
                {profile.upcomingOneOnOnes.map((o) => (
                  <div key={o.id} className="rounded-2xl border border-white/70 bg-white/90 p-3 text-sm text-slate-700">
                    <p className="font-semibold text-brand-text">{new Date(o.scheduledAt).toLocaleString("ru-RU")}</p>
                    <p className="text-xs text-slate-500">С {o.withName}</p>
                    <Link href={`/app/one-on-ones/${o.id}`} className="text-xs font-semibold text-brand-primary">
                      Открыть →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Опросы</p>
                <h2 className="text-xl font-semibold text-brand-text">Обратная связь</h2>
              </div>
            </div>
            {profile.feedback.activeSurveysCount === 0 ? (
              <p className="text-sm text-slate-500">Сейчас нет активных опросов.</p>
            ) : (
              <div className="space-y-2">
                {profile.feedback.pendingSurveys.map((s) => (
                  <div key={s.id} className="rounded-2xl border border-white/70 bg-white/90 p-3 text-sm text-slate-700">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-brand-text">{s.title}</p>
                      {s.dueDate && <span className="text-xs text-slate-500">до {new Date(s.dueDate).toLocaleDateString("ru-RU")}</span>}
                    </div>
                    <Link href={`/app/feedback/surveys/${s.id}`} className="text-xs font-semibold text-brand-primary">
                      Пройти →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Навыки и рост</p>
                <h2 className="text-xl font-semibold text-brand-text">Самые важные навыки</h2>
              </div>
              {profile.skills.items.length > 0 && (
                <SecondaryButton href={`/app/employees/${profile.employeeId}/skills-gap`} className="px-3 py-1 text-xs">
                  Полный профиль
                </SecondaryButton>
              )}
            </div>
            {topGaps.length === 0 ? (
              <p className="text-sm text-slate-500">Нет критичных разрывов или пока нет оценок.</p>
            ) : (
              <div className="space-y-2">
                {topGaps.map((g) => (
                  <div key={g.skillId} className="rounded-2xl border border-white/70 bg-white/90 p-3 text-sm text-slate-700">
                    <p className="font-semibold text-brand-text">{g.skillName}</p>
                    <p className="text-xs text-slate-500">
                      Gap: {g.gap !== null ? g.gap.toFixed(2) : "—"} · Важность: {g.importance ?? "—"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Уведомления</p>
                <h2 className="text-xl font-semibold text-brand-text">Что нового</h2>
              </div>
              <SecondaryButton href="/app/notifications" className="px-3 py-1 text-xs">
                Все уведомления
              </SecondaryButton>
            </div>
            {unreadNotifications.length === 0 ? (
              <p className="text-sm text-slate-500">Нет непрочитанных уведомлений.</p>
            ) : (
              <div className="space-y-2">
                {unreadNotifications.map((n) => (
                  <div key={n.id} className="rounded-2xl border border-white/70 bg-white/90 p-3 text-sm text-slate-700">
                    <p className="font-semibold text-brand-text">{n.title}</p>
                    <p className="text-xs text-slate-600">{n.body}</p>
                    <p className="text-[11px] text-slate-400">{new Date(n.createdAt).toLocaleString("ru-RU")}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function mapActionType(type: EmployeeActionItem["type"]) {
  switch (type) {
    case "finish_goal":
      return "Цели";
    case "start_goal":
      return "Развитие";
    case "prepare_1_1":
      return "1:1";
    case "answer_survey":
      return "Опрос";
    case "check_skill_gap":
      return "Навыки";
    case "read_program_outcome":
      return "Программа";
    default:
      return "Действие";
  }
}
