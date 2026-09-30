import { Song } from "@aura-music/core/types";

export interface QueueAlignment {
  /** The queue rebuilt in playlist order. */
  queue: Song[];
  /** Track ids the playlist gained. */
  added: string[];
  /** Song ids the playlist dropped. */
  removed: string[];
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
 * Rebuild the queue so the songs the playlist owns sit in playlist order.
 *
 * Everything else — local files and Netease singles added by hand — keeps its
 * relative order after them. `ownedIds` are the track ids this playlist held on
 * the previous sync, so only songs the playlist itself contributed can be
 * dropped: a song link is never part of `ownedIds` and therefore never removed.
 *
 * Rebuilding also reorders, which is what keeps the queue aligned when the
 * playlist inserts a track in the middle rather than appending it.
 */
export const alignQueue = <T extends { id: string }>(
  queue: Song[],
  tracks: readonly T[],
  ownedIds: string[],
  make: (track: T) => Song,
): QueueAlignment => {
  const owned = new Set(ownedIds);
  const current = new Map<string, Song>();
  queue.forEach((song) => {
    if (
      song.neteaseId !== undefined &&
      owned.has(song.neteaseId) &&
      !current.has(song.neteaseId)
    ) {
      current.set(song.neteaseId, song);
    }
  });

  const added: string[] = [];
  const ordered = tracks.map((track) => {
    const song = current.get(track.id);
    if (song) {
      current.delete(track.id);
      return song;
    }

    added.push(track.id);
    return make(track);
  });

  // Whatever did not make it into the new order is gone: the playlist gave the
  // track up, or it was a duplicate of one that is still listed.
  const kept = new Set(ordered.map((song) => song.id));
  const removed = queue
    .filter(
      (song) =>
        song.neteaseId !== undefined &&
        owned.has(song.neteaseId) &&
        !kept.has(song.id),
    )
    .map((song) => song.id);
  const rest = queue.filter(
    (song) => song.neteaseId === undefined || !owned.has(song.neteaseId),
  );

  return { queue: [...ordered, ...rest], added, removed };
};