import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { describeUnfolding, joinList, noteInSentence } from "./writing";

describe("joinList", () => {
  test("joins naturally", () => {
    assert.equal(joinList([]), "");
    assert.equal(joinList(["plum"]), "plum");
    assert.equal(joinList(["plum", "rose"]), "plum and rose");
    assert.equal(joinList(["plum", "rose", "cherry"]), "plum, rose and cherry");
  });
});

describe("noteInSentence", () => {
  test("lowercases ordinary note names", () => {
    assert.equal(noteInSentence("Bitter Almond"), "bitter almond");
    assert.equal(noteInSentence("Tonka Bean"), "tonka bean");
  });

  test("keeps places and people capitalised", () => {
    assert.equal(noteInSentence("Turkish Rose"), "Turkish rose");
    assert.equal(noteInSentence("Peru Balsam"), "Peru balsam");
    assert.equal(noteInSentence("Calabrian Bergamot"), "Calabrian bergamot");
  });
});

describe("describeUnfolding", () => {
  test("walks through all three stages", () => {
    const text = describeUnfolding({ top: ["Black Cherry", "Bitter Almond"], heart: ["Turkish Rose"], base: ["Vanilla", "Tonka Bean", "Cedar"] });
    assert.equal(
      text,
      "It opens with black cherry and bitter almond. Over the next few hours it turns to Turkish rose, and by evening what's left is vanilla, tonka bean and cedar.",
    );
  });

  test("skips stages with no notes", () => {
    assert.equal(describeUnfolding({ top: ["Lemon"], heart: [], base: ["Musk"] }), "It opens with lemon, and by evening what's left is musk.");
    assert.equal(describeUnfolding({ top: [], heart: ["Iris"], base: [] }), "At its heart it's iris.");
  });

  test("returns null when there are no notes at all", () => {
    assert.equal(describeUnfolding({ top: [], heart: [], base: [] }), null);
  });

  test("keeps long base lists readable by naming the first five", () => {
    const text = describeUnfolding({ top: [], heart: [], base: ["A", "B", "C", "D", "E", "F", "G"] })!;
    assert.match(text, /a, b, c, d and e\.$/);
  });
});
