import Skeleton from "@/components/common/Skeleton";

export default function CasesLoading() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <Skeleton key={idx} className="h-40 w-full" />
      ))}
    </div>
  );
}
