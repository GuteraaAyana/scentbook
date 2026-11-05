import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { groupByMonth, validateWear } from "./wear";

const today = "2026-11-04";
const noPlace = { place: "", placeLatitude: "", placeLongitude: "" };
const base = {
  wornOn: "2026-11-03", occasion: "Work", weather: "Rainy", temperature: "12", unit: "c",
  ...noPlace, compliments: "2", note: " Lasted all day. ",
};
const empty = { place: null, placeLatitude: null, placeLongitude: null };

describe("validateWear", () => {
  test("accepts a full entry and tidies it", () => {
    const result = validateWear(base, today);
    assert.deepEqual(result, {
      ok: true,
      value: {
        wornOn: "2026-11-03", occasion: "Work", weather: "Rainy", temperatureC: 12, unit: "c",
        ...empty, compliments: 2, note: "Lasted all day.",
      },
    });
  });

  test("only the date is required; blanks become nothing", () => {
    const result = validateWear(
      { wornOn: today, occasion: "", weather: "", temperature: "", unit: "c", ...noPlace, compliments: "", note: "  " },
      today,
    );
    assert.deepEqual(result, {
      ok: true,
      value: { wornOn: today, occasion: null, weather: null, temperatureC: null, unit: "c", ...empty, compliments: 0, note: null },
    });
  });

  test("allows one day ahead, since your 'today' may be ahead of the server's", () => {
    assert.ok(validateWear({ ...base, wornOn: "2026-11-05" }, today).ok);
    assert.ok(!validateWear({ ...base, wornOn: "2026-11-06" }, today).ok);
  });

  test("rejects missing, malformed, impossible and ancient dates", () => {
    for (const wornOn of ["", "03/11/2026", "2026-02-30", "1899-12-31"]) {
      const result = validateWear({ ...base, wornOn }, today);
      assert.ok(!result.ok && result.errors.wornOn, `should reject "${wornOn}"`);
    }
  });

  test("rejects an unknown weather and a too-long occasion", () => {
    const result = validateWear({ ...base, weather: "Volcanic", occasion: "x".repeat(41) }, today);
    assert.ok(!result.ok && result.errors.weather && result.errors.occasion);
  });

  test("a temperature typed in °F is stored in °C", () => {
    const result = validateWear({ ...base, temperature: "64", unit: "f" }, today);
    assert.ok(result.ok && result.value.temperatureC === 18 && result.value.unit === "f");
  });

  test("°F limits are the same temperatures as the °C ones", () => {
    assert.ok(validateWear({ ...base, temperature: "140", unit: "f" }, today).ok);
    const tooHot = validateWear({ ...base, temperature: "150", unit: "f" }, today);
    assert.ok(!tooHot.ok && tooHot.errors.temperature?.includes("-58 and 140"));
  });

  test("a place comes with coordinates", () => {
    const lisbon = { place: "Lisbon, Portugal", placeLatitude: "38.72", placeLongitude: "-9.15" };
    const ok = validateWear({ ...base, ...lisbon }, today);
    assert.ok(ok.ok && ok.value.place === "Lisbon, Portugal" && ok.value.placeLatitude === 38.72);
    assert.ok(!validateWear({ ...base, ...lisbon, placeLatitude: "" }, today).ok);
    assert.ok(!validateWear({ ...base, ...lisbon, placeLongitude: "500" }, today).ok);
  });

  test("temperature must be a whole number between -50 and 60", () => {
    for (const t of ["12.5", "abc", "-51", "61"]) {
      assert.ok(!validateWear({ ...base, temperature: t }, today).ok, `should reject ${t}`);
    }
    assert.ok(validateWear({ ...base, temperature: "-5" }, today).ok);
  });

  test("compliments must be a whole number from 0 to 99", () => {
    for (const c of ["-1", "100", "1.5"]) assert.ok(!validateWear({ ...base, compliments: c }, today).ok);
  });

  test("rejects a note over 280 characters", () => {
    const result = validateWear({ ...base, note: "x".repeat(281) }, today);
    assert.ok(!result.ok && result.errors.note);
  });
});

describe("groupByMonth", () => {
  test("groups newest-first entries into months, keeping order", () => {
    const groups = groupByMonth([{ wornOn: "2026-11-03" }, { wornOn: "2026-11-01" }, { wornOn: "2026-10-30" }, { wornOn: "2025-10-02" }]);
    assert.deepEqual(
      groups.map((g) => [g.label, g.items.length]),
      [["November 2026", 2], ["October 2026", 1], ["October 2025", 1]],
    );
  });
});
