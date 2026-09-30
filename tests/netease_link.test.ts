import { test, expect } from "bun:test";
import { parseNeteaseLink } from "../packages/player/src/services/utils";

test("parses the hash-router link built from a bare playlist id", () => {
  expect(parseNeteaseLink("https://music.163.com/#/playlist?id=123456789")).toEqual({
    type: "playlist",
    id: "123456789",
  });
});

test("parses a plain playlist link", () => {
  expect(parseNeteaseLink("https://music.163.com/playlist?id=123456789")).toEqual({
    type: "playlist",
    id: "123456789",
  });
});

test("parses a song link", () => {
  expect(parseNeteaseLink("https://music.163.com/#/song?id=42")).toEqual({
    type: "song",
    id: "42",
  });
});

test("rejects a bare id and unrelated links", () => {
  expect(parseNeteaseLink("123456789")).toBeNull();
  expect(parseNeteaseLink("https://example.com/")).toBeNull();
});