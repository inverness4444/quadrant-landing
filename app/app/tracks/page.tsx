import TracksClient from "@/components/app/tracks/TracksClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { listTracks, listTrackLevelsByWorkspace } from "@/repositories/trackRepository";
import { listEmployees } from "@/repositories/employeeRepository";

export default async function TracksPage() {
  const { workspace } = await requireWorkspaceContext();
  const [tracks, trackLevels, employees] = await Promise.all([
    listTracks(workspace.id),
    listTrackLevelsByWorkspace(workspace.id),
    listEmployees(workspace.id),
  ]);

  return <TracksClient tracks={tracks} trackLevels={trackLevels} employees={employees} />;
}
