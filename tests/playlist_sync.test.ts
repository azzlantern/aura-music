import { expect, test } from "bun:test";
import { parsePlaylistSource } from "@aura-music/player/services/libraryStore";
import { deriveOwned, diffPlaylist } from "@aura-music/player/services/playlistSync";
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

test("appending new tracks keeps the playlist order", () => {
  const queue = [song("1", "1"), song("2", "2")];

  const diff = diffPlaylist(queue, ["1", "3", "2", "4"], ["1", "2"]);

  expect(diff.add).toEqual(["3", "4"]);
  expect(diff.remove).toEqual([]);
});

test("tracks the playlist no longer holds are dropped", () => {
  const queue = [song("1", "1"), song("2", "2"), song("3", "3")];

  const diff = diffPlaylist(queue, ["1", "3"], ["1", "2", "3"]);

  expect(diff.add).toEqual([]);
  expect(diff.remove).toEqual(["2"]);
});

test("a netease single imported from a song link is never dropped", () => {
  const queue = [song("1", "1"), song("99", "99")];

  const diff = diffPlaylist(queue, ["1"], ["1"]);

  expect(diff.add).toEqual([]);
  expect(diff.remove).toEqual([]);
});

test("local files survive a sync and never block appends", () => {
  const queue = [song("local-1", undefined, "local")];

  const diff = diffPlaylist(queue, ["1"], ["1"]);

  expect(diff.add).toEqual(["1"]);
  expect(diff.remove).toEqual([]);
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
  const fresh = ["1", "2", "3", "4", "9"];

  const diff = diffPlaylist(queue, fresh, deriveOwned(queue, fresh));

  expect(diff.add).toEqual(["9"]);
  expect(diff.remove).toEqual(["5"]);
});