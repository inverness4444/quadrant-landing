import { randomUUID } from "crypto";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { trackLevels, tracks } from "@/drizzle/schema";

const now = () => new Date().toISOString();

export type TrackInput = {
  name: string;
  levels: Array<{ name: string; description: string }>;
};

export async function listTracks(workspaceId: string) {
  return db.select().from(tracks).where(eq(tracks.workspaceId, workspaceId)).orderBy(asc(tracks.name));
}

export async function listTrackLevelsByWorkspace(workspaceId: string) {
  const ids = await db
    .select({ id: tracks.id })
    .from(tracks)
    .where(eq(tracks.workspaceId, workspaceId));
  const trackIdList = ids.map((item) => item.id);
  if (trackIdList.length === 0) return [];
  return db
    .select()
    .from(trackLevels)
    .where(inArray(trackLevels.trackId, trackIdList))
    .orderBy(asc(trackLevels.order));
}

export async function listTrackLevels(trackId: string) {
  return db
    .select()
    .from(trackLevels)
    .where(eq(trackLevels.trackId, trackId))
    .orderBy(asc(trackLevels.order));
}

export async function createTrack(workspaceId: string, payload: TrackInput) {
  const trackId = randomUUID();
  await db.insert(tracks).values({
    id: trackId,
    workspaceId,
    name: payload.name,
    createdAt: now(),
    updatedAt: now(),
  });
  let orderIndex = 0;
  for (const level of payload.levels) {
    await db.insert(trackLevels).values({
      id: randomUUID(),
      trackId,
      name: level.name,
      description: level.description,
      order: orderIndex++,
    });
  }
  return findTrackById(trackId);
}

export async function updateTrack(trackId: string, data: { name: string }) {
  db.update(tracks)
    .set({ name: data.name, updatedAt: now() })
    .where(eq(tracks.id, trackId))
    .run();
  return findTrackById(trackId);
}

export async function updateTrackLevel(levelId: string, data: { name?: string; description?: string }) {
  db.update(trackLevels)
    .set({
      name: data.name,
      description: data.description,
    })
    .where(eq(trackLevels.id, levelId))
    .run();
  return findTrackLevelById(levelId);
}

export async function findTrackById(id: string) {
  const [track] = await db.select().from(tracks).where(eq(tracks.id, id));
  return track ?? null;
}

export async function findTrackLevelById(id: string) {
  const [level] = await db.select().from(trackLevels).where(eq(trackLevels.id, id));
  return level ?? null;
}
