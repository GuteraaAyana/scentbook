import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  type FragranceDraft,
  catalogIndex,
  matchName,
  nameKey,
  parseAccords,
  parsePyramidSentence,
  splitList,
  tidyName,
  validateDraft,
} from "./catalog-entry";

describe("splitList", () => {
  test("splits on commas, 'and', semicolons and new lines, and drops duplicates", () => {
    assert.deepEqual(splitList("Pink Pepper, Pineapple and Lavender;\nToffee\n• toffee"), [
      "Pink Pepper",
      "Pineapple",
      "Lavender",
      "Toffee",
    ]);
  });

  test("ignores blanks and stray punctuation", () => {
    assert.deepEqual(splitList(" , Vanilla., - Amber ,,"), ["Vanilla", "Amber"]);
  });
});

describe("parsePyramidSentence", () => {
  test("reads the usual 'top notes are …' sentence", () => {
    const text =
      "Top notes are Pink Pepper, Cardamom and Violet Leaf; middle notes are Toffee, Cinnamon, Lavender and Sage; base notes are Vanilla, Chestnut and Amber.";
    assert.deepEqual(parsePyramidSentence(text), {
      top: ["Pink Pepper", "Cardamom", "Violet Leaf"],
      heart: ["Toffee", "Cinnamon", "Lavender", "Sage"],
      base: ["Vanilla", "Chestnut", "Amber"],
    });
  });

  test("returns null for text that isn't a pyramid", () => {
    assert.equal(parsePyramidSentence("Vanilla, Amber"), null);
  });
});

describe("parseAccords", () => {
  test("reads strengths in several styles", () => {
    assert.deepEqual(parseAccords("Amber 100, warm spicy: 80\nVanilla (65%)"), [
      { name: "Amber", strength: 100 },
      { name: "warm spicy", strength: 80 },
      { name: "Vanilla", strength: 65 },
    ]);
  });

  test("names alone get falling strengths in the order given", () => {
    assert.deepEqual(
      parseAccords("Sweet, Warm Spicy, Vanilla").map((a) => a.strength),
      [100, 90, 80],
    );
  });
});

describe("matchName", () => {
  const notes = catalogIndex(["Tonka Bean", "Pink Pepper", "Vanilla", "Bergamot", "Iris"]);

  test("finds the catalog's spelling whatever the case, accents or plural", () => {
    for (const typed of ["tonka bean", "TONKA BEAN", "Tonka-Bean", "Pink Peppers", "vanílla"]) {
      const match = matchName(typed, notes);
      assert.equal(match.kind, "existing", typed);
    }
    assert.equal(matchName("pink peppers", notes).name, "Pink Pepper");
  });

  test("marks something new and suggests a likely typo", () => {
    const match = matchName("bergamont", notes);
    assert.deepEqual(match, { kind: "new", input: "bergamont", name: "Bergamont", suggestion: "Bergamot" });
  });

  test("suggests the full name for a shortened one", () => {
    const houses = catalogIndex(["Giorgio Armani", "Maison Francis Kurkdjian", "Tom Ford"]);
    const armani = matchName("armani", houses);
    assert.ok(armani.kind === "new" && armani.suggestion === "Giorgio Armani");
    const kurkdjian = matchName("Kurkdjian", houses);
    assert.ok(kurkdjian.kind === "new" && kurkdjian.suggestion === "Maison Francis Kurkdjian");
  });

  test("doesn't suggest far-off names", () => {
    const match = matchName("chestnut", notes);
    assert.ok(match.kind === "new" && match.suggestion === null);
  });

  test("short names only tolerate one wrong letter", () => {
    const near = matchName("iros", notes);
    assert.ok(near.kind === "new" && near.suggestion === "Iris");
    const far = matchName("oud", notes);
    assert.ok(far.kind === "new" && far.suggestion === null);
  });
});

describe("tidyName and nameKey", () => {
  test("title-cases all-lowercase names but keeps deliberate casing", () => {
    assert.equal(tidyName("  pink   pepper "), "Pink Pepper");
    assert.equal(tidyName("l'homme"), "L'Homme");
    assert.equal(tidyName("McQueen"), "McQueen");
  });

  test("keeps double-s words intact", () => {
    assert.equal(nameKey("Moss"), "moss");
    assert.equal(nameKey("Musks"), "musk");
  });
});

describe("validateDraft", () => {
  const draft: FragranceDraft = {
    brand: "giorgio armani",
    brandCountry: "",
    name: "Stronger With You Intensely",
    releaseYear: "2019",
    concentration: "edp",
    gender: "masculine",
    perfumers: "Cécile Matton and Serge Majoullier",
    top: "Pink Pepper, Juniper, Mandarin, Cardamom and Violet",
    heart: "Toffee, Cinnamon, Lavender and Sage",
    base: "Vanilla, Tonka Bean, Amber and Suede",
    accords: "Sweet, Warm Spicy, Vanilla, Amber, Aromatic",
    description: "",
    imageUrl: "https://example.com/bottle.jpg",
  };

  test("accepts a full entry and tidies it", () => {
    const result = validateDraft(draft, 2026);
    assert.ok(result.ok);
    assert.equal(result.value.brand, "Giorgio Armani");
    assert.equal(result.value.releaseYear, 2019);
    assert.deepEqual(result.value.perfumers, ["Cécile Matton", "Serge Majoullier"]);
    assert.equal(result.value.notes.base.length, 4);
    assert.equal(result.value.accords[0].strength, 100);
    assert.equal(result.value.description, null);
  });

  test("year, links and lists are checked", () => {
    const result = validateDraft(
      { ...draft, releaseYear: "3000", imageUrl: "javascript:alert(1)", top: "", heart: "", base: "", concentration: "eau" },
      2026,
    );
    assert.ok(!result.ok);
    assert.deepEqual(Object.keys(result.errors).sort(), ["concentration", "imageUrl", "notes", "releaseYear"]);
  });

  test("plain http image links are refused", () => {
    const result = validateDraft({ ...draft, imageUrl: "http://example.com/bottle.jpg" }, 2026);
    assert.ok(!result.ok && result.errors.imageUrl);
  });

  test("an all-lowercase name is title-cased; deliberate casing is kept", () => {
    const lower = validateDraft({ ...draft, name: "stronger with you intensely" }, 2026);
    assert.ok(lower.ok && lower.value.name === "Stronger With You Intensely");
    const kept = validateDraft({ ...draft, name: "Acqua di Giò Profondo" }, 2026);
    assert.ok(kept.ok && kept.value.name === "Acqua di Giò Profondo");
  });

  test("the year is optional", () => {
    const result = validateDraft({ ...draft, releaseYear: " " }, 2026);
    assert.ok(result.ok && result.value.releaseYear === null);
  });
});
