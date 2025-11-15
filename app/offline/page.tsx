"use client";

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-center">
      <div className="space-y-3 rounded-3xl border border-brand-border bg-white p-6 shadow-sm">
        <p className="text-lg font-semibold text-brand-text">Нет соединения</p>
        <p className="text-sm text-slate-600">
          Похоже, вы офлайн. Как только связь восстановится, Quadrant обновит данные.
        </p>
      </div>
    </div>
  );
}
