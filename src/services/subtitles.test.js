import assert from "node:assert/strict";
import test from "node:test";
import { parseSrt, serializeSrt } from "./subtitles.js";

test("parses indexed and multiline SRT cues with comma and dot fractions", () => {
  const cues = parseSrt(
    "\uFEFF1\r\n00:00:01,250 --> 00:00:02,500\r\nFirst line\r\nSecond line\r\n\r\n00:00:03.000 --> 00:00:04.000\r\nNext cue"
  );
  assert.deepEqual(cues, [
    { start: 1.25, end: 2.5, text: "First line\nSecond line" },
    { start: 3, end: 4, text: "Next cue" },
  ]);
});

test("rejects malformed or non-positive subtitle timing", () => {
  assert.throws(() => parseSrt(""), /empty/);
  assert.throws(
    () => parseSrt("00:00:02,000 --> 00:00:01,000\nBackwards"),
    /ends before it starts/
  );
  assert.throws(
    () => parseSrt("00:61:00,000 --> 00:62:00,000\nInvalid minutes"),
    /block 1 is invalid/
  );
});

test("serializes timed text in chronological order and omits untimed layers", () => {
  const result = serializeSrt([
    { kind: "text", start: 4, end: 5.2, text: "Second" },
    { kind: "image", start: 0, end: 2, text: "Not a subtitle" },
    { kind: "text", start: 1.25, end: 2.5, text: "First\nline" },
    { kind: "text", start: 2, end: 2, text: "Zero duration" },
  ]);
  assert.equal(result.count, 2);
  assert.equal(
    result.contents,
    "1\n00:00:01,250 --> 00:00:02,500\nFirst\nline\n\n2\n00:00:04,000 --> 00:00:05,200\nSecond\n"
  );
});

test("requires at least one valid text cue for export", () => {
  assert.throws(() => serializeSrt([]), /at least one timed text layer/);
});
