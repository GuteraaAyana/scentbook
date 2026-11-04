import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { mergeFeed, timeAgo } from "./feed";

const at = (iso: string) => new Date(iso);

describe("mergeFeed", () => {
  test("interleaves several newest-first lists into one, newest first", () => {
    const rankings = [{ id: "r1", at: at("2026-11-04T10:00Z") }, { id: "r2", at: at("2026-11-01T10:00Z") }];
    const wears = [{ id: "w1", at: at("2026-11-03T10:00Z") }];
    const reviews = [{ id: "v1", at: at("2026-11-05T10:00Z") }, { id: "v2", at: at("2026-10-01T10:00Z") }];
    assert.deepEqual(
      mergeFeed([rankings, wears, reviews], 10).map((x) => x.id),
      ["v1", "r1", "w1", "r2", "v2"],
    );
  });

  test("stops at the limit", () => {
    const a = [{ id: "a", at: at("2026-11-04T10:00Z") }];
    const b = [{ id: "b", at: at("2026-11-03T10:00Z") }, { id: "c", at: at("2026-11-02T10:00Z") }];
    assert.deepEqual(mergeFeed([a, b], 2).map((x) => x.id), ["a", "b"]);
  });

  test("handles empty lists", () => {
    assert.deepEqual(mergeFeed([[], []], 5), []);
  });
});

describe("timeAgo", () => {
  const now = at("2026-11-04T12:00:00Z");
  test("uses the largest sensible unit", () => {
    assert.equal(timeAgo(at("2026-11-04T11:59:40Z"), now), "just now");
    assert.equal(timeAgo(at("2026-11-04T11:15:00Z"), now), "45m");
    assert.equal(timeAgo(at("2026-11-04T07:00:00Z"), now), "5h");
    assert.equal(timeAgo(at("2026-11-01T12:00:00Z"), now), "3d");
    assert.equal(timeAgo(at("2026-10-01T12:00:00Z"), now), "Oct 1");
  });
});
