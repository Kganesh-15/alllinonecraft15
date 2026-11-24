import assert from "node:assert/strict";
import test from "node:test";
import { getPerspectiveGuideLines, getSymmetrySegments } from "./drawingGuides.js";

test("mirrors line segments across selected axes", () => {
  const start = { x: 10, y: 20 };
  const end = { x: 30, y: 40 };
  assert.deepEqual(getSymmetrySegments(start, end, 100, 100, "vertical"), [
    [start, end],
    [{ x: 90, y: 20 }, { x: 70, y: 40 }],
  ]);
  assert.equal(getSymmetrySegments(start, end, 100, 100, "both").length, 4);
});

test("creates radial copies centered on the canvas", () => {
  const segments = getSymmetrySegments({ x: 60, y: 50 }, { x: 70, y: 50 }, 100, 100, "radial-6");
  assert.equal(segments.length, 6);
  assert.ok(Math.abs(segments[1][0].x - 55) < 1e-10);
  assert.ok(Math.abs(segments[1][0].y - 58.6602540378) < 1e-8);
});

test("generates one-, two-, and three-point perspective guides", () => {
  assert.equal(getPerspectiveGuideLines("one-point").length, 8);
  assert.equal(getPerspectiveGuideLines("two-point").length, 8);
  assert.equal(getPerspectiveGuideLines("three-point").length, 12);
  assert.deepEqual(getPerspectiveGuideLines("none"), []);
});
