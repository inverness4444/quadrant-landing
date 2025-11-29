import MyAssessmentsClient from "@/components/app/assessments/MyAssessmentsClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";

export default async function MyAssessmentsPage() {
  await requireWorkspaceContext();
  return <MyAssessmentsClient />;
}
