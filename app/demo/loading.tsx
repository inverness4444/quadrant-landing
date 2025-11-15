import Skeleton from "@/components/common/Skeleton";

export default function DemoLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-36 w-full" />
      <Skeleton className="h-[420px] w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
