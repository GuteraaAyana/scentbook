import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { validateProfile } from "./profile";

describe("validateProfile", () => {
  const valid = { username: "santal_fan", bio: "Woods and smoke.", city: "Lisbon" };

  test("accepts a normal profile and trims it", () => {
    const result = validateProfile({ username: "  Santal_Fan ", bio: " Woods and smoke. ", city: " Lisbon " });
    assert.deepEqual(result, { ok: true, value: { username: "santal_fan", bio: "Woods and smoke.", city: "Lisbon" } });
  });

  test("lowercases usernames so @Santal and @santal can't both exist", () => {
    const result = validateProfile({ ...valid, username: "SANTAL" });
    assert.ok(result.ok && result.value.username === "santal");
  });

  test("empty bio and city are stored as nothing", () => {
    const result = validateProfile({ ...valid, bio: "   ", city: "" });
    assert.ok(result.ok && result.value.bio === null && result.value.city === null);
  });

  test("rejects usernames that are too short, too long or have other characters", () => {
    for (const username of ["ab", "a".repeat(21), "has space", "dot.ted", "émile", "dash-ed", ""]) {
      const result = validateProfile({ ...valid, username });
      assert.ok(!result.ok && result.errors.username, `should reject "${username}"`);
    }
  });

  test("rejects a bio over 160 characters and a city over 60", () => {
    const result = validateProfile({ ...valid, bio: "x".repeat(161), city: "y".repeat(61) });
    assert.ok(!result.ok && result.errors.bio && result.errors.city);
  });

  test("reports every problem at once", () => {
    const result = validateProfile({ username: "x", bio: "x".repeat(200), city: "fine" });
    assert.ok(!result.ok);
    assert.deepEqual(Object.keys(result.errors).sort(), ["bio", "username"]);
  });
});
