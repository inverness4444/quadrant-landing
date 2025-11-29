import TracksClient from "@/components/app/tracks/TracksClient";
import { requireWorkspaceContext } from "@/lib/workspaceContext";
import { listTracks, listTrackLevelsByWorkspace } from "@/repositories/trackRepository";
import { listEmployees } from "@/repositories/employeeRepository";

type TracksPageSearchParams = {
  modal?: string | string[];
};

export default async function TracksPage({ searchParams }: { searchParams?: TracksPageSearchParams }) {
  const { workspace } = await requireWorkspaceContext();
  const [tracks, trackLevels, employees] = await Promise.all([
    listTracks(workspace.id),
    listTrackLevelsByWorkspace(workspace.id),
    listEmployees(workspace.id),
  ]);
  const modalParam = Array.isArray(searchParams?.modal) ? searchParams?.modal[0] : searchParams?.modal;
  const openCreateModalOnMount = modalParam === "create";

  return (
    <TracksClient
      tracks={tracks}
      trackLevels={trackLevels}
      employees={employees}
      openCreateModalOnMount={openCreateModalOnMount}
    />
  );
}
