import Skeleton from "@/components/common/Skeleton";

export default function BlogLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 w-full" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Skeleton key={idx} className="h-40 w-full" />
        ))}
      </div>
    </div>
  );
}
