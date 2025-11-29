import Card from "@/components/common/Card";

export default function TeamProfileLoading() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
      <Card className="space-y-3 p-6">
        <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
      </Card>
    </div>
  );
}
