import { Song } from "@aura-music/core/types";

export interface PlaylistDiff {
  add: string[];
  remove: string[];
}

/** How much of an untracked queue must still be in the playlist before the
 *  queue is treated as this playlist's previous state. */
const OVERLAP = 0.8;

/**
 * Guess what an untracked queue owned.
 *
 * A queue restored from storage carries no record of the playlist it came from,
 * so the first sync only knows the queue itself. When at least 80% of its
 * Netease songs are still in the playlist the queue is clearly derived from it,
 * and its leftovers may be dropped. A queue that barely overlaps is left alone.
 */
export const deriveOwned = (queue: Song[], freshIds: string[]): string[] => {
  const fresh = new Set(freshIds);
  const queued = [
    ...new Set(
      queue.map((song) => song.neteaseId).filter((id): id is string => Boolean(id)),
    ),
  ];
  if (queued.length === 0) {
    return [];
  }

  const hits = queued.filter((id) => fresh.has(id)).length;
  return hits / queued.length >= OVERLAP ? queued : [];
};

/**
 * Compare the queue against a freshly fetched playlist.
 *
 * `ownedIds` are the track ids this playlist held on the previous sync, so only
 * songs the playlist itself contributed can be removed. A Netease single added
 * from a song link is never part of `ownedIds` and therefore never dropped.
 */
export const diffPlaylist = (
  queue: Song[],
  freshIds: string[],
  ownedIds: string[],
): PlaylistDiff => {
  const fresh = new Set(freshIds);
  const owned = new Set(ownedIds);
  const queued = new Set(
    queue.map((song) => song.neteaseId).filter((id): id is string => Boolean(id)),
  );

  return {
    add: freshIds.filter((id) => !queued.has(id)),
    remove: queue
      .filter(
        (song) =>
          song.neteaseId !== undefined &&
          owned.has(song.neteaseId) &&
          !fresh.has(song.neteaseId),
      )
      .map((song) => song.id),
  };
};