import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { AUTO_HIDE_AT, nextLimitWindow, shouldAutoHide, validateReport } from "./moderation";

describe("validateReport", () => {
  test("accepts a known reason with optional details", () => {
    assert.deepEqual(validateReport({ reason: "spam", details: "  Selling replicas. " }), {
      ok: true,
      value: { reason: "spam", details: "Selling replicas." },
    });
    assert.deepEqual(validateReport({ reason: "offensive", details: "" }), {
      ok: true,
      value: { reason: "offensive", details: null },
    });
  });

  test("rejects an unknown or missing reason", () => {
    for (const reason of ["", "boring", "SPAM"]) {
      const result = validateReport({ reason, details: "" });
      assert.ok(!result.ok && result.errors.reason, `should reject "${reason}"`);
    }
  });

  test("'other' needs a few words of explanation", () => {
    assert.ok(!validateReport({ reason: "other", details: "" }).ok);
    assert.ok(validateReport({ reason: "other", details: "Wrong fragrance entirely." }).ok);
  });

  test("details are capped at 500 characters", () => {
    assert.ok(!validateReport({ reason: "spam", details: "x".repeat(501) }).ok);
  });
});

describe("shouldAutoHide", () => {
  test(`hides once ${AUTO_HIDE_AT} different people have reported it`, () => {
    assert.equal(shouldAutoHide(AUTO_HIDE_AT - 1), false);
    assert.equal(shouldAutoHide(AUTO_HIDE_AT), true);
  });
});

describe("nextLimitWindow", () => {
  const minute = 60_000;
  const now = new Date("2026-11-04T12:00:00Z");

  test("the first action starts a window", () => {
    assert.deepEqual(nextLimitWindow(null, now, { max: 3, windowMs: minute }), { count: 1, windowStart: now, allowed: true });
  });

  test("counts up within the window and stops at the limit", () => {
    const start = new Date(now.getTime() - 10_000);
    assert.equal(nextLimitWindow({ count: 2, windowStart: start }, now, { max: 3, windowMs: minute }).allowed, true);
    const full = nextLimitWindow({ count: 3, windowStart: start }, now, { max: 3, windowMs: minute });
    assert.equal(full.allowed, false);
    assert.equal(full.count, 3, "a refused attempt doesn't count");
  });

  test("starts a fresh window once the old one has passed", () => {
    const old = new Date(now.getTime() - minute - 1);
    assert.deepEqual(nextLimitWindow({ count: 99, windowStart: old }, now, { max: 3, windowMs: minute }), {
      count: 1,
      windowStart: now,
      allowed: true,
    });
  });

  test("says how long until the window resets", () => {
    const start = new Date(now.getTime() - 15_000);
    const full = nextLimitWindow({ count: 3, windowStart: start }, now, { max: 3, windowMs: minute });
    assert.equal(full.retryAfterSeconds, 45);
  });
});
