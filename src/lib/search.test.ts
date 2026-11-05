import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { fold, prepareFragrances, searchFragrances, searchPeople } from "./search";

const catalog = prepareFragrances([
  { slug: "tf-tobacco-vanille", name: "Tobacco Vanille", brand: "Tom Ford", notes: ["Tobacco Leaf", "Vanilla"], accordNames: ["Warm Spicy"] },
  { slug: "ga-acqua-di-gio", name: "Acqua di Giò", brand: "Giorgio Armani", notes: ["Bergamot", "Marine"], accordNames: ["Citrus", "Aquatic"] },
  { slug: "ga-swy-intensely", name: "Stronger With You Intensely", brand: "Giorgio Armani", notes: ["Toffee", "Vanilla"], accordNames: ["Sweet", "Vanilla"] },
  { slug: "dior-sauvage", name: "Sauvage", brand: "Dior", notes: ["Bergamot", "Ambroxan"], accordNames: ["Fresh Spicy"] },
]);
const slugs = (q: string) => searchFragrances(catalog, q).map((f) => f.slug);

describe("fold", () => {
  test("drops case, accents and punctuation", () => {
    assert.equal(fold("Acqua di Giò!"), "acqua di gio");
    assert.equal(fold("Viktor&Rolf"), "viktor rolf");
  });
});

describe("searchFragrances", () => {
  test("an empty query keeps everything in order", () => {
    assert.deepEqual(slugs("  "), catalog.map((f) => f.slug));
  });

  test("matches as you type, from the first letters", () => {
    assert.deepEqual(slugs("sau"), ["dior-sauvage"]);
    assert.deepEqual(slugs("gio"), ["ga-acqua-di-gio", "ga-swy-intensely"]);
  });

  test("every word has to match somewhere", () => {
    assert.deepEqual(slugs("armani stronger"), ["ga-swy-intensely"]);
    assert.deepEqual(slugs("armani sauvage"), []);
  });

  test("ignores accents in either direction", () => {
    assert.deepEqual(slugs("acqua di giò"), ["ga-acqua-di-gio"]);
  });

  test("finds notes and accords, but a name match ranks first", () => {
    // "vanille" (name) beats "vanilla" (a note), both start with "vanill"
    assert.deepEqual(slugs("vanill"), ["tf-tobacco-vanille", "ga-swy-intensely"]);
    assert.deepEqual(slugs("bergamot"), ["ga-acqua-di-gio", "dior-sauvage"]);
  });
});

describe("searchPeople", () => {
  const people = [
    { name: "Maya Chen", username: "oud_maya", bio: "Smoky woods." },
    { name: "Sam Ortiz", username: "samo", bio: "Citrus all summer." },
  ];

  test("matches name, @username or bio", () => {
    assert.deepEqual(searchPeople(people, "maya").map((p) => p.username), ["oud_maya"]);
    assert.deepEqual(searchPeople(people, "oud").map((p) => p.username), ["oud_maya"]);
    assert.deepEqual(searchPeople(people, "citrus").map((p) => p.username), ["samo"]);
  });

  test("a leading @ is ignored", () => {
    assert.deepEqual(searchPeople(people, "@samo").map((p) => p.username), ["samo"]);
  });
});
