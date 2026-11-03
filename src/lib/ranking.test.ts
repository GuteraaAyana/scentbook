import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { comparison, keyBetween, placeAfterAnswer, renumberedKeys, scoreFor, startPlacement } from "./ranking";

describe("placing a fragrance with comparisons", () => {
  // Answers "is the new one better than the fragrance at index i?" as if the
  // new one truly belongs at `target`, and returns where the search lands.
  function place(count: number, target: number) {
    let state = startPlacement(count);
    let questions = 0;
    while (comparison(state) !== null) {
      const pivot = comparison(state)!;
      state = placeAfterAnswer(state, target <= pivot ? "better" : "worse");
      questions++;
    }
    return { index: state.lo, questions };
  }

  test("an empty bucket needs no questions", () => {
    assert.deepEqual(place(0, 0), { index: 0, questions: 0 });
  });

  test("finds every possible position in buckets of many sizes", () => {
    for (let count = 1; count <= 40; count++) {
      for (let target = 0; target <= count; target++) {
        assert.equal(place(count, target).index, target, `count ${count}, target ${target}`);
      }
    }
  });

  test("asks about log2(n) questions: at most 7 for 100 fragrances", () => {
    for (let target = 0; target <= 100; target++) {
      assert.ok(place(100, target).questions <= 7);
    }
  });

  test("'about the same' places it right after the one it was compared with", () => {
    const state = startPlacement(10);
    const pivot = comparison(state)!;
    const done = placeAfterAnswer(state, "same");
    assert.equal(comparison(done), null);
    assert.equal(done.lo, pivot + 1);
  });
});

describe("sort keys", () => {
  test("first in an empty bucket gets 0", () => {
    assert.equal(keyBetween(null, null), 0);
  });

  test("new best goes above the current best; new worst below the worst", () => {
    assert.equal(keyBetween(null, 5), 6);
    assert.equal(keyBetween(5, null), 4);
  });

  test("between two fragrances goes halfway", () => {
    assert.equal(keyBetween(3, 2), 2.5);
  });

  test("returns null when the gap is too small to split", () => {
    const a = 1;
    const b = 1 - Number.EPSILON / 2; // the next double below 1
    assert.equal(keyBetween(a, b), null);
  });

  test("renumbered keys keep the order, best highest, evenly spaced", () => {
    assert.deepEqual(renumberedKeys(3), [3, 2, 1]);
  });
});

describe("scores", () => {
  test("loved scores 6.7 to 10, best first", () => {
    assert.equal(scoreFor("loved", 0, 3), 10);
    assert.equal(scoreFor("loved", 2, 3), 7.8);
  });

  test("buckets never overlap: worst loved beats best fine", () => {
    for (let count = 1; count <= 50; count++) {
      assert.ok(scoreFor("loved", count - 1, count) > scoreFor("fine", 0, count));
      assert.ok(scoreFor("fine", count - 1, count) > scoreFor("disliked", 0, count));
    }
  });

  test("a single fragrance gets the top of its bucket", () => {
    assert.equal(scoreFor("fine", 0, 1), 6.6);
    assert.equal(scoreFor("disliked", 0, 1), 3.3);
  });
});
