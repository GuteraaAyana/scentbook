import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { USERNAME_CHANGE_DAYS, usernameChange, validateProfile, validateUsername } from "./profile";

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

describe("validateUsername", () => {
  test("accepts a leading @ and lowercases", () => {
    assert.deepEqual(validateUsername(" @Oud_Lover "), { ok: true, value: "oud_lover" });
  });

  test("refuses names that would look official", () => {
    for (const name of ["admin", "Moderator", "scentbook"]) assert.equal(validateUsername(name).ok, false, name);
  });
});

describe("usernameChange", () => {
  const now = new Date("2026-11-05T12:00:00Z");
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  test("keeping the same username is always fine and isn't a change", () => {
    assert.deepEqual(usernameChange({ username: "maya", changedAt: daysAgo(1) }, "maya", now), {
      allowed: true,
      changed: false,
    });
  });

  test("setting one for the first time is always allowed", () => {
    assert.deepEqual(usernameChange({ username: null, changedAt: null }, "maya", now), { allowed: true, changed: true });
  });

  test("a username set before the rule existed can change once", () => {
    assert.ok(usernameChange({ username: "maya", changedAt: null }, "maya_b", now).allowed);
  });

  test(`blocks a change within ${USERNAME_CHANGE_DAYS} days and says when it opens`, () => {
    const result = usernameChange({ username: "maya", changedAt: daysAgo(3) }, "maya_b", now);
    assert.ok(!result.allowed);
    assert.equal(result.availableAt.toISOString(), daysAgo(3 - USERNAME_CHANGE_DAYS).toISOString());
  });

  test(`allows it again after exactly ${USERNAME_CHANGE_DAYS} days`, () => {
    assert.ok(usernameChange({ username: "maya", changedAt: daysAgo(USERNAME_CHANGE_DAYS) }, "maya_b", now).allowed);
  });
});
