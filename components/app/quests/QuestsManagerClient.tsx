"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import Tag from "@/components/common/Tag";
import type { QuestWithStepsDTO } from "@/services/types/quest";

type EmployeeOption = { id: string; name: string; position: string };

type QuestsManagerClientProps = {
  initialQuests?: QuestWithStepsDTO[];
};

export default function QuestsManagerClient({ initialQuests = [] }: QuestsManagerClientProps) {
  const [quests, setQuests] = useState<QuestWithStepsDTO[]>(initialQuests);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<{ status: string; teamId: string; goalType: string }>({
    status: "all",
    teamId: "all",
    goalType: "all",
  });
  const [suggestions, setSuggestions] = useState<
    Array<{
      title: string;
      description: string;
      skills: { skillId: string; name: string }[];
      teams: { teamId: string | null; teamName: string }[];
    }>
  >([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    goalType: "reduce_risk",
    priority: "medium",
    relatedTeamId: "all",
    ownerEmployeeId: "",
    steps: [{ title: "", description: "", required: true, order: 1, relatedSkillId: "" }],
  });
  const [assignSelection, setAssignSelection] = useState<Record<string, string>>({});

  useEffect(() => {
    void fetchQuests();
    void fetchSuggestions();
    void fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchQuests = async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filters.status !== "all") params.set("status", filters.status);
    if (filters.teamId !== "all") params.set("teamId", filters.teamId);
    if (filters.goalType !== "all") params.set("goalType", filters.goalType);
    try {
      const response = await fetch(`/api/app/quests?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось загрузить квесты");
      }
      setQuests(payload.quests ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    const response = await fetch("/api/app/quests/suggestions", { cache: "no-store" });
    const payload = await response.json().catch(() => null);
    if (payload?.ok) {
      setSuggestions(payload.suggestions);
    }
  };

  const fetchEmployees = async () => {
    const response = await fetch("/api/app/employees?page=1&pageSize=50", { cache: "no-store" });
    const payload = await response.json().catch(() => null);
    if (payload?.employees) {
      const data: Array<{ id: string; name: string; position: string }> = payload.employees ?? [];
      setEmployees(data.map((emp) => ({ id: emp.id, name: emp.name, position: emp.position })));
      setForm((prev) => ({ ...prev, ownerEmployeeId: data[0]?.id ?? "" }));
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/app/quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          relatedTeamId: form.relatedTeamId === "all" ? null : form.relatedTeamId,
          steps: form.steps.map((step, index) => ({
            ...step,
            order: step.order || index + 1,
            relatedSkillId: step.relatedSkillId || null,
          })),
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось создать квест");
      }
      await fetchQuests();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      goalType: "reduce_risk",
      priority: "medium",
      relatedTeamId: "all",
      ownerEmployeeId: employees[0]?.id ?? "",
      steps: [{ title: "", description: "", required: true, order: 1, relatedSkillId: "" }],
    });
  };

  const handleSuggestionToForm = (suggestion: typeof suggestions[number]) => {
    setForm((prev) => ({
      ...prev,
      title: suggestion.title,
      description: suggestion.description,
      goalType: "reduce_risk",
      relatedTeamId: suggestion.teams[0]?.teamId ?? "all",
      steps:
        suggestion.skills.length > 0
          ? suggestion.skills.map((skill, index) => ({
              title: `Подтвердить навык ${skill.name}`,
              description: "Собрать артефакты и провести ревью",
              required: true,
              order: index + 1,
              relatedSkillId: skill.skillId,
            }))
          : prev.steps,
    }));
  };

  const progressByQuest = useMemo(() => {
    const map = new Map<string, number>();
    quests.forEach((quest) => {
      const requiredSteps = quest.steps.filter((step) => step.required).length || quest.steps.length || 1;
      const done = 0;
      map.set(quest.id, Math.round((done / requiredSteps) * 100));
    });
    return map;
  }, [quests]);

  const assignQuest = async (questId: string, employeeId: string) => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/app/quests/${questId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeIds: [employeeId] }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? "Не удалось назначить квест");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Квесты и развитие</p>
          <h1 className="text-3xl font-semibold text-brand-text">Квесты и мини-проекты</h1>
          <p className="text-sm text-slate-600">
            Создавайте квесты для закрытия рисков по навыкам и развития людей под новые роли.
          </p>
        </div>
        <PrimaryButton onClick={handleCreate} disabled={loading} className="px-4 py-2">
          {loading ? "Сохраняем…" : "Создать квест"}
        </PrimaryButton>
      </div>

      {error && (
        <Card className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </Card>
      )}

      <Card className="space-y-3">
        <div className="grid gap-3 md:grid-cols-4">
          <select
            value={filters.status}
            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            className="h-11 rounded-xl border border-brand-border px-3 text-sm text-brand-text"
          >
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="completed">Завершённые</option>
            <option value="archived">Архив</option>
          </select>
          <input
            placeholder="ID команды (опционально)"
            value={filters.teamId === "all" ? "" : filters.teamId}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, teamId: event.target.value || "all" }))
            }
            className="h-11 rounded-xl border border-brand-border px-3 text-sm text-brand-text"
          />
          <select
            value={filters.goalType}
            onChange={(event) => setFilters((prev) => ({ ...prev, goalType: event.target.value }))}
            className="h-11 rounded-xl border border-brand-border px-3 text-sm text-brand-text"
          >
            <option value="all">Все цели</option>
            <option value="reduce_risk">Снизить риск</option>
            <option value="develop_skill">Развить навык</option>
            <option value="onboarding">Онбординг</option>
            <option value="project_help">Помощь проекту</option>
            <option value="other">Другое</option>
          </select>
          <SecondaryButton onClick={() => void fetchQuests()} className="h-11">
            Обновить
          </SecondaryButton>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-brand-text">Квесты</h2>
            <span className="text-sm text-slate-500">{quests.length} шт.</span>
          </div>
          {loading && <p className="text-sm text-slate-500">Загружаем...</p>}
          {quests.length === 0 && !loading ? (
            <p className="text-sm text-slate-500">Квестов пока нет.</p>
          ) : (
            <div className="space-y-3">
              {quests.map((quest) => (
                <div key={quest.id} className="rounded-2xl border border-white/60 bg-white/90 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-brand-text">{quest.title}</p>
                      <p className="text-xs text-slate-500">{quest.description}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        <Tag variant="outline">{formatGoal(quest.goalType)}</Tag>
                        <Tag variant="outline">Приоритет: {formatPriority(quest.priority)}</Tag>
                        <Tag variant="outline">Статус: {formatStatus(quest.status)}</Tag>
                      </div>
                    </div>
                    <div className="text-right text-sm text-slate-500">
                      <p>Прогресс: {progressByQuest.get(quest.id) ?? 0}%</p>
                      <p>{quest.steps.length} шагов</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    <select
                      value={assignSelection[quest.id] ?? employees[0]?.id ?? ""}
                      onChange={(event) =>
                        setAssignSelection((prev) => ({ ...prev, [quest.id]: event.target.value }))
                      }
                      className="rounded-xl border border-brand-border px-3 py-2"
                    >
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                    <SecondaryButton
                      onClick={() =>
                        void assignQuest(quest.id, assignSelection[quest.id] ?? employees[0]?.id ?? "")
                      }
                      className="px-3 py-2 text-xs"
                    >
                      Назначить
                    </SecondaryButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="space-y-3">
            <h3 className="text-lg font-semibold text-brand-text">Создать квест</h3>
            <label className="space-y-1 text-sm text-slate-600">
              Название
              <input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                className="w-full rounded-xl border border-brand-border px-3 py-2"
              />
            </label>
            <label className="space-y-1 text-sm text-slate-600">
              Описание
              <textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                className="w-full rounded-xl border border-brand-border px-3 py-2"
                rows={3}
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="space-y-1 text-sm text-slate-600">
                Цель
                <select
                  value={form.goalType}
                  onChange={(event) => setForm((prev) => ({ ...prev, goalType: event.target.value }))}
                  className="w-full rounded-xl border border-brand-border px-3 py-2"
                >
                  <option value="reduce_risk">Снизить риск</option>
                  <option value="develop_skill">Развить навык</option>
                  <option value="onboarding">Онбординг</option>
                  <option value="project_help">Помощь проекту</option>
                  <option value="other">Другое</option>
                </select>
              </label>
              <label className="space-y-1 text-sm text-slate-600">
                Приоритет
                <select
                  value={form.priority}
                  onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
                  className="w-full rounded-xl border border-brand-border px-3 py-2"
                >
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                </select>
              </label>
            </div>
            <label className="space-y-1 text-sm text-slate-600">
              Команда (опционально)
              <input
                value={form.relatedTeamId === "all" ? "" : form.relatedTeamId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, relatedTeamId: event.target.value || "all" }))
                }
                className="w-full rounded-xl border border-brand-border px-3 py-2"
                placeholder="ID команды"
              />
            </label>
            <label className="space-y-1 text-sm text-slate-600">
              Ответственный (owner)
              <select
                value={form.ownerEmployeeId}
                onChange={(event) => setForm((prev) => ({ ...prev, ownerEmployeeId: event.target.value }))}
                className="w-full rounded-xl border border-brand-border px-3 py-2"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} · {emp.position}
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-brand-text">Шаги</p>
                <SecondaryButton
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      steps: [
                        ...prev.steps,
                        {
                          title: "",
                          description: "",
                          required: true,
                          order: prev.steps.length + 1,
                          relatedSkillId: "",
                        },
                      ],
                    }))
                  }
                  className="px-3 py-1 text-xs"
                >
                  Добавить шаг
                </SecondaryButton>
              </div>
              {form.steps.map((step, index) => (
                <div key={index} className="rounded-xl border border-brand-border/70 p-3">
                  <input
                    value={step.title}
                    onChange={(event) =>
                      setForm((prev) => {
                        const next = [...prev.steps];
                        next[index] = { ...next[index], title: event.target.value };
                        return { ...prev, steps: next };
                      })
                    }
                    className="mb-2 w-full rounded-lg border border-brand-border px-3 py-2 text-sm"
                    placeholder="Название шага"
                  />
                  <textarea
                    value={step.description}
                    onChange={(event) =>
                      setForm((prev) => {
                        const next = [...prev.steps];
                        next[index] = { ...next[index], description: event.target.value };
                        return { ...prev, steps: next };
                      })
                    }
                    className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm"
                    rows={2}
                    placeholder="Описание"
                  />
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={step.required}
                        onChange={(event) =>
                          setForm((prev) => {
                            const next = [...prev.steps];
                            next[index] = { ...next[index], required: event.target.checked };
                            return { ...prev, steps: next };
                          })
                        }
                      />
                      Обязательный шаг
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={step.order}
                      onChange={(event) =>
                        setForm((prev) => {
                          const next = [...prev.steps];
                          next[index] = { ...next[index], order: Number(event.target.value) };
                          return { ...prev, steps: next };
                        })
                      }
                      className="h-9 w-16 rounded-lg border border-brand-border px-2"
                      title="Порядок"
                    />
                    <input
                      value={step.relatedSkillId ?? ""}
                      onChange={(event) =>
                        setForm((prev) => {
                          const next = [...prev.steps];
                          next[index] = { ...next[index], relatedSkillId: event.target.value };
                          return { ...prev, steps: next };
                        })
                      }
                      placeholder="ID навыка"
                      className="flex-1 rounded-lg border border-brand-border px-2 py-1"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-brand-text">Предлагаемые квесты</h3>
              <SecondaryButton onClick={() => void fetchSuggestions()} className="px-3 py-1 text-xs">
                Обновить
              </SecondaryButton>
            </div>
            {suggestions.length === 0 ? (
              <p className="text-sm text-slate-500">Пока нет подсказок от аналитики.</p>
            ) : (
              suggestions.map((item, index) => (
                <div key={index} className="rounded-2xl border border-brand-border/60 bg-white/80 p-3 text-sm text-slate-600">
                  <p className="font-semibold text-brand-text">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.description}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    {item.skills.map((skill) => (
                      <Tag key={skill.skillId} variant="outline">
                        {skill.name}
                      </Tag>
                    ))}
                  </div>
                  <SecondaryButton
                    onClick={() => handleSuggestionToForm(item)}
                    className="mt-2 px-3 py-1 text-xs"
                  >
                    Создать квест из подсказки
                  </SecondaryButton>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function formatGoal(goal: string) {
  const map: Record<string, string> = {
    reduce_risk: "Снизить риск",
    develop_skill: "Развить навык",
    onboarding: "Онбординг",
    project_help: "Помощь проекту",
    other: "Другое",
  };
  return map[goal] ?? goal;
}

function formatPriority(priority: string) {
  const map: Record<string, string> = { low: "Низкий", medium: "Средний", high: "Высокий" };
  return map[priority] ?? priority;
}

function formatStatus(status: string) {
  const map: Record<string, string> = { draft: "Черновик", active: "Активный", completed: "Завершён", archived: "Архив" };
  return map[status] ?? status;
}
