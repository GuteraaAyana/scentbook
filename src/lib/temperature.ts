// Temperatures are stored in °C; people read and type them in their own unit.
// Pure, tested in temperature.test.ts.

export type TemperatureUnit = "c" | "f";
export const UNIT_SYMBOL: Record<TemperatureUnit, string> = { c: "°C", f: "°F" };

export function toUnit(celsius: number, unit: TemperatureUnit): number {
  return unit === "f" ? Math.round((celsius * 9) / 5 + 32) : Math.round(celsius);
}

export function toCelsius(value: number, unit: TemperatureUnit): number {
  return unit === "f" ? Math.round(((value - 32) * 5) / 9) : Math.round(value);
}

// "18°C" / "64°F"
export function formatTemperature(celsius: number, unit: TemperatureUnit): string {
  return `${toUnit(celsius, unit)}${UNIT_SYMBOL[unit]}`;
}

export function isUnit(value: unknown): value is TemperatureUnit {
  return value === "c" || value === "f";
}
