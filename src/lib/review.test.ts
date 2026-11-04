import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { LONGEVITY, SILLAGE, averageLabel, validateReview } from "./review";

describe("validateReview", () => {
  test("accepts a review and tidies the text", () => {
    const result = validateReview({ body: "  Smoky, creamy and long-lasting.\n\n\n\nLove it.  ", longevity: "4", sillage: "3" });
    assert.deepEqual(result, {
      ok: true,
      value: { body: "Smoky, creamy and long-lasting.\n\nLove it.", longevity: 4, sillage: 3 },
    });
  });

  test("ratings are optional", () => {
    const result = validateReview({ body: "Not for me, too sweet.", longevity: "", sillage: "" });
    assert.ok(result.ok && result.value.longevity === null && result.value.sillage === null);
  });

  test("the text must be between 10 and 2000 characters", () => {
    for (const body of ["", "   ", "Too short"]) {
      const result = validateReview({ body, longevity: "", sillage: "" });
      assert.ok(!result.ok && result.errors.body, `should reject "${body}"`);
    }
    assert.ok(!validateReview({ body: "x".repeat(2001), longevity: "", sillage: "" }).ok);
    assert.ok(validateReview({ body: "x".repeat(2000), longevity: "", sillage: "" }).ok);
  });

  test("ratings must be whole numbers from 1 to 5", () => {
    for (const bad of ["0", "6", "2.5", "high"]) {
      const result = validateReview({ body: "A perfectly fine review.", longevity: bad, sillage: bad });
      assert.ok(!result.ok && result.errors.longevity && result.errors.sillage, `should reject ${bad}`);
    }
  });
});

describe("averageLabel", () => {
  test("rounds an average to the nearest named step", () => {
    assert.equal(averageLabel(LONGEVITY, 4.4), "Long lasting");
    assert.equal(averageLabel(LONGEVITY, 4.6), "All day and beyond");
    assert.equal(averageLabel(SILLAGE, 1), "Close to the skin");
  });
});
