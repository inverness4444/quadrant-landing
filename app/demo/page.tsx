import type { Metadata } from "next";
import DemoPageSection from "@/components/sections/demo/DemoPageSection";

export const metadata: Metadata = {
  title: "Quadrant — демо живой карты навыков",
  description:
    "Демо показывает, как Quadrant связывает сотрудников и навыки на основе артефактов. Данные на странице фиктивные.",
};

export default function DemoPage() {
  return (
    <div className="bg-gradient-to-b from-brand-muted/40 via-white to-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <DemoPageSection />
      </div>
    </div>
  );
}
