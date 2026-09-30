import { expect, test } from "bun:test";
import { parsePlaylistSource } from "@aura-music/player/services/libraryStore";
import { alignQueue, deriveOwned } from "@aura-music/player/services/playlistSync";
import { Song } from "@aura-music/core/types";

const song = (
  id: string,
  neteaseId?: string,
  source: "remote" | "local" = "remote",
): Song => ({
  id,
  title: id,
  artist: "Test",
  fileUrl: `https://api.example/audio?id=${id}`,
  source,
  neteaseId,
});

const make = (track: { id: string }): Song => song(track.id, track.id);
const ids = (queue: Song[]) => queue.map((entry) => entry.id);

test("a track the playlist inserted in the middle lands in its playlist slot", () => {
  const queue = [song("1", "1"), song("2", "2"), song("3", "3")];

  const aligned = alignQueue(
    queue,
    [{ id: "1" }, { id: "9" }, { id: "2" }, { id: "3" }],
    ["1", "2", "3"],
    make,
  );

  expect(ids(aligned.queue)).toEqual(["1", "9", "2", "3"]);
  expect(aligned.added).toEqual(["9"]);
  expect(aligned.removed).toEqual([]);
});

test("an out-of-order queue is rebuilt in playlist order", () => {
  const queue = [song("3", "3"), song("1", "1"), song("2", "2")];

  const aligned = alignQueue(
    queue,
    [{ id: "1" }, { id: "2" }, { id: "3" }],
    ["1", "2", "3"],
    make,
  );

  expect(ids(aligned.queue)).toEqual(["1", "2", "3"]);
  expect(aligned.added).toEqual([]);
  expect(aligned.removed).toEqual([]);
});

test("tracks the playlist no longer holds are dropped", () => {
  const queue = [song("1", "1"), song("2", "2"), song("3", "3")];

  const aligned = alignQueue(queue, [{ id: "1" }, { id: "3" }], ["1", "2", "3"], make);

  expect(ids(aligned.queue)).toEqual(["1", "3"]);
  expect(aligned.removed).toEqual(["2"]);
});

test("a netease single imported from a song link survives after the playlist", () => {
  const queue = [song("1", "1"), song("99", "99")];

  const aligned = alignQueue(queue, [{ id: "1" }], ["1"], make);

  expect(ids(aligned.queue)).toEqual(["1", "99"]);
  expect(aligned.removed).toEqual([]);
});

test("local files survive and keep their order after the playlist", () => {
  const queue = [
    song("local-1", undefined, "local"),
    song("1", "1"),
    song("local-2", undefined, "local"),
  ];

  const aligned = alignQueue(queue, [{ id: "1" }, { id: "2" }], ["1"], make);

  expect(ids(aligned.queue)).toEqual(["1", "2", "local-1", "local-2"]);
  expect(aligned.added).toEqual(["2"]);
  expect(aligned.removed).toEqual([]);
});

test("a second copy of a listed track is folded away and reported", () => {
  const queue = [song("1", "1"), song("1-copy", "1")];

  const aligned = alignQueue(queue, [{ id: "1" }], ["1"], make);

  expect(ids(aligned.queue)).toEqual(["1"]);
  expect(aligned.removed).toEqual(["1-copy"]);
});

test("playlist source parsing rejects junk", () => {
  expect(parsePlaylistSource(null)).toBeNull();
  expect(parsePlaylistSource("{")).toBeNull();
  expect(parsePlaylistSource(JSON.stringify({ url: "  " }))).toBeNull();
  expect(parsePlaylistSource(JSON.stringify({ url: "u", ids: [1, "a", ""] }))).toEqual({
    url: "u",
    ids: ["a"],
  });
});

test("a playlist source remembers a hand-made order", () => {
  const raw = JSON.stringify({ url: "u", ids: ["a", "b"], manual: true });

  expect(parsePlaylistSource(raw)).toEqual({ url: "u", ids: ["a", "b"], manual: true });
});

test("a non-boolean manual flag is dropped", () => {
  expect(
    parsePlaylistSource(JSON.stringify({ url: "u", ids: ["a"], manual: "yes" })),
  ).toEqual({ url: "u", ids: ["a"] });
});

test("a queue that mostly overlaps the playlist counts as its previous state", () => {
  const queue = [
    song("1", "1"),
    song("2", "2"),
    song("3", "3"),
    song("4", "4"),
    song("5", "5"),
  ];

  expect(deriveOwned(queue, ["1", "2", "3", "4"])).toEqual(["1", "2", "3", "4", "5"]);
});

test("a queue that barely overlaps the playlist is left alone", () => {
  const queue = [
    song("1", "1"),
    song("2", "2"),
    song("3", "3"),
    song("4", "4"),
    song("5", "5"),
  ];

  expect(deriveOwned(queue, ["1", "9"])).toEqual([]);
});

test("an empty queue owns nothing", () => {
  expect(deriveOwned([], ["1"])).toEqual([]);
});

test("the first sync drops leftovers once the queue is recognised", () => {
  const queue = [
    song("1", "1"),
    song("2", "2"),
    song("3", "3"),
    song("4", "4"),
    song("5", "5"),
  ];
  const fresh = [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }, { id: "9" }];
  const owned = deriveOwned(queue, fresh.map((track) => track.id));

  const aligned = alignQueue(queue, fresh, owned, make);

  expect(ids(aligned.queue)).toEqual(["1", "2", "3", "4", "9"]);
  expect(aligned.added).toEqual(["9"]);
  expect(aligned.removed).toEqual(["5"]);
});