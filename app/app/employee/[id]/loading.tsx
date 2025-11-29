import Card from "@/components/common/Card";

export default function EmployeeProfileLoading() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-56 animate-pulse rounded bg-slate-200" />
      <Card className="space-y-3 p-6">
        <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
      </Card>
    </div>
  );
}
