import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { likelyUnit, placeLabel, toPlace } from "./places";
import { formatTemperature, toCelsius, toUnit } from "./temperature";
import { weatherFromCode } from "./wear";

describe("temperature units", () => {
  test("converts both ways, in whole degrees", () => {
    assert.equal(toUnit(18, "f"), 64);
    assert.equal(toUnit(-40, "f"), -40);
    assert.equal(toCelsius(64, "f"), 18);
    assert.equal(toCelsius(18, "c"), 18);
  });

  test("a round trip through °F lands back on the same °C", () => {
    for (let c = -30; c <= 45; c++) assert.equal(toCelsius(toUnit(c, "f"), "f"), c);
  });

  test("formats with the right symbol", () => {
    assert.equal(formatTemperature(18, "c"), "18°C");
    assert.equal(formatTemperature(18, "f"), "64°F");
  });
});

describe("places", () => {
  const raw = {
    id: 5746545, name: "Portland", admin1: "Oregon", country: "United States", country_code: "US",
    latitude: 45.52, longitude: -122.68, timezone: "America/Los_Angeles",
  };

  test("reads Open-Meteo's result and labels it", () => {
    const place = toPlace(raw)!;
    assert.equal(placeLabel(place), "Portland, Oregon, United States");
    assert.equal(placeLabel(place, false), "Portland, United States");
  });

  test("doesn't repeat a region that's the city's own name", () => {
    assert.equal(placeLabel({ name: "Lisbon", region: "Lisbon", country: "Portugal" }, true), "Lisbon, Portugal");
  });

  test("rejects results missing coordinates", () => {
    assert.equal(toPlace({ id: 1, name: "Nowhere" }), null);
  });

  test("guesses °F for the US, °C elsewhere", () => {
    assert.equal(likelyUnit("US"), "f");
    assert.equal(likelyUnit("PT"), "c");
    assert.equal(likelyUnit(null), "c");
  });
});

describe("weatherFromCode", () => {
  test("maps the weather service's codes to the diary's options", () => {
    assert.equal(weatherFromCode(0), "Sunny");
    assert.equal(weatherFromCode(3), "Cloudy");
    assert.equal(weatherFromCode(61), "Rainy");
    assert.equal(weatherFromCode(95), "Rainy");
    assert.equal(weatherFromCode(73), "Snowy");
  });

  test("strong wind beats a clear or cloudy sky, not rain", () => {
    assert.equal(weatherFromCode(1, 45), "Windy");
    assert.equal(weatherFromCode(63, 45), "Rainy");
  });
});
