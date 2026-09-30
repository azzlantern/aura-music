import { test, expect } from "bun:test";
import { parseLyrics } from "@aura-music/lyrics/parser/index";

const LRC = "[00:01.00]夜に駆ける";
const TRANS = "[00:01.00]奔向夜晚";
const ROMAN = "[00:01.00]yoru ni kakeru";

test("a line keeps both its translation and its romanization", () => {
  const lines = parseLyrics(LRC, TRANS, { romanContent: ROMAN });
  expect(lines.length).toBe(1);
  expect(lines[0].translation).toBe("奔向夜晚");
  expect(lines[0].romanization).toBe("yoru ni kakeru");
});

test("a line without a translation keeps its romanization", () => {
  const lines = parseLyrics(LRC, undefined, { romanContent: ROMAN });
  expect(lines[0].translation).toBeUndefined();
  expect(lines[0].romanization).toBe("yoru ni kakeru");
});

test("a line without a romanization keeps its translation", () => {
  const lines = parseLyrics(LRC, TRANS);
  expect(lines[0].translation).toBe("奔向夜晚");
  expect(lines[0].romanization).toBeUndefined();
});