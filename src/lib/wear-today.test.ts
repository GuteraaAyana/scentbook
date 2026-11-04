import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { conditionFor, pickForToday, temperatureBand } from "./wear-today";

const weather = (temperatureC: number, extra: Partial<{ code: number; humidity: number; windKph: number }> = {}) => ({
  temperatureC,
  code: 0,
  humidity: 50,
  windKph: 5,
  ...extra,
});

const citrusy = { slug: "fresh", accords: [{ name: "Citrus", strength: 100 }, { name: "Marine", strength: 80 }] };
const cosy = { slug: "cosy", accords: [{ name: "Vanilla", strength: 100 }, { name: "Amber", strength: 90 }] };
const woody = { slug: "woody", accords: [{ name: "Woody", strength: 100 }, { name: "Earthy", strength: 60 }] };

describe("conditionFor", () => {
  test("maps weather codes to the diary's weather words", () => {
    assert.equal(conditionFor(weather(20, { code: 0 })), "Sunny");
    assert.equal(conditionFor(weather(20, { code: 3 })), "Cloudy");
    assert.equal(conditionFor(weather(10, { code: 63 })), "Rainy");
    assert.equal(conditionFor(weather(-2, { code: 73 })), "Snowy");
    assert.equal(conditionFor(weather(12, { code: 95 })), "Rainy");
  });

  test("calls strong wind windy and warm damp air humid, unless it's raining", () => {
    assert.equal(conditionFor(weather(15, { code: 2, windKph: 45 })), "Windy");
    assert.equal(conditionFor(weather(28, { code: 1, humidity: 85 })), "Humid");
    assert.equal(conditionFor(weather(28, { code: 61, humidity: 90 })), "Rainy");
  });
});

describe("temperatureBand", () => {
  test("splits at 10, 18 and 25 degrees", () => {
    assert.deepEqual([4, 12, 20, 30].map(temperatureBand), ["cold", "mild", "warm", "hot"]);
  });
});

describe("pickForToday", () => {
  test("prefers fresh fragrances when it's hot", () => {
    assert.equal(pickForToday([cosy, citrusy], weather(31))[0].slug, "fresh");
  });

  test("prefers warm, sweet fragrances when it's cold", () => {
    assert.equal(pickForToday([citrusy, cosy], weather(3))[0].slug, "cosy");
  });

  test("leans woody when it rains on a mild day", () => {
    assert.equal(pickForToday([citrusy, woody], weather(13, { code: 63 }))[0].slug, "woody");
  });

  test("your higher ranking breaks a tie", () => {
    const a = { ...woody, slug: "a", yourScore: 6 };
    const b = { ...woody, slug: "b", yourScore: 9.5 };
    assert.equal(pickForToday([a, b], weather(14))[0].slug, "b");
  });

  test("something you wore yesterday drops behind an equal alternative", () => {
    const worn = { ...woody, slug: "worn", daysSinceWorn: 1 };
    const fresh = { ...woody, slug: "rested" };
    assert.equal(pickForToday([worn, fresh], weather(14))[0].slug, "rested");
  });

  test("gives a reason naming the accords that suit the weather", () => {
    const [pick] = pickForToday([citrusy], weather(30));
    assert.equal(pick.reason, "Its citrus and marine feel suits the heat.");
  });

  test("returns nothing for an empty shelf", () => {
    assert.deepEqual(pickForToday([], weather(20)), []);
  });
});
