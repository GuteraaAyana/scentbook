// "What to wear today": picks from the fragrances you own using today's
// weather. Pure, so it's tested on its own (wear-today.test.ts).
import { joinList } from "./writing";

export type CurrentWeather = { temperatureC: number; code: number; humidity: number; windKph: number };
type Band = "cold" | "mild" | "warm" | "hot";

// WMO weather codes (what Open-Meteo returns) in the diary's weather words.
export function conditionFor(w: CurrentWeather): "Sunny" | "Cloudy" | "Rainy" | "Snowy" | "Windy" | "Humid" {
  const { code } = w;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snowy";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return "Rainy";
  if (w.windKph >= 35) return "Windy";
  if (w.humidity >= 80 && w.temperatureC >= 22) return "Humid";
  if (code <= 1) return "Sunny";
  return "Cloudy";
}

export function temperatureBand(temperatureC: number): Band {
  if (temperatureC < 10) return "cold";
  if (temperatureC < 18) return "mild";
  if (temperatureC < 25) return "warm";
  return "hot";
}

// How well each accord suits the weather, from -1 (wrong) to +1 (just right).
// Accords not listed are neutral. Broad strokes on purpose: fresh and bright
// for heat, warm and rich for cold, woods and moss in the rain.
const FRESH = ["Citrus", "Marine", "Aquatic", "Fresh", "Fresh Spicy", "Green", "Aromatic", "Ozonic", "Salty", "Herbal"];
const RICH = [
  "Amber", "Vanilla", "Gourmand", "Tobacco", "Oud", "Leather", "Warm Spicy", "Sweet", "Balsamic",
  "Cacao", "Chocolate", "Coffee", "Rum", "Honey", "Cinnamon", "Smoky", "Animalic",
];
const BY_BAND: Record<Band, Record<string, number>> = {
  hot: {
    ...Object.fromEntries(FRESH.map((a) => [a, 1])),
    ...Object.fromEntries(["White Floral", "Floral", "Fruity", "Tropical", "Coconut"].map((a) => [a, 0.5])),
    ...Object.fromEntries(RICH.map((a) => [a, -1])),
  },
  warm: {
    ...Object.fromEntries([...FRESH, "Floral", "White Floral", "Fruity", "Rose"].map((a) => [a, 0.5])),
    ...Object.fromEntries(["Tobacco", "Oud", "Gourmand", "Balsamic", "Animalic"].map((a) => [a, -0.5])),
  },
  mild: Object.fromEntries(["Woody", "Floral", "Iris", "Powdery", "Rose", "Musky", "Aromatic", "Patchouli"].map((a) => [a, 0.5])),
  cold: {
    ...Object.fromEntries([...RICH, "Woody"].map((a) => [a, 1])),
    ...Object.fromEntries(["Citrus", "Marine", "Aquatic", "Fresh", "Ozonic", "Salty", "Green"].map((a) => [a, -1])),
  },
};
const BY_CONDITION: Partial<Record<ReturnType<typeof conditionFor>, Record<string, number>>> = {
  Rainy: Object.fromEntries(["Woody", "Earthy", "Mossy", "Green", "Smoky", "Patchouli", "Leather"].map((a) => [a, 0.6])),
  Snowy: Object.fromEntries(["Vanilla", "Amber", "Warm Spicy", "Woody"].map((a) => [a, 0.4])),
  Humid: {
    ...Object.fromEntries(["Sweet", "Gourmand", "Amber", "Vanilla"].map((a) => [a, -0.5])),
    ...Object.fromEntries(["Fresh", "Citrus", "Marine", "Aquatic"].map((a) => [a, 0.5])),
  },
};

export type Candidate = {
  slug: string;
  accords: { name: string; strength: number }[];
  yourScore?: number | null; // your ranking score out of 10, if ranked
  daysSinceWorn?: number | null; // from your diary, if you've worn it
};

// Weights: the weather fit matters most; your own ranking next; a small nudge
// away from whatever you wore in the last few days.
const FIT_WEIGHT = 10;
const SCORE_WEIGHT = 0.5;
const NEUTRAL_SCORE = 5; // unranked fragrances count as middling
const recentPenalty = (days: number | null | undefined) => (days == null ? 0 : Math.max(0, 4 - days));

export function pickForToday<T extends Candidate>(candidates: T[], weather: CurrentWeather) {
  const band = temperatureBand(weather.temperatureC);
  const condition = conditionFor(weather);
  const preference = (accord: string) => (BY_BAND[band][accord] ?? 0) + (BY_CONDITION[condition]?.[accord] ?? 0);

  return candidates
    .map((candidate) => {
      const total = candidate.accords.reduce((sum, a) => sum + a.strength, 0) || 1;
      // Strength-weighted average preference, -1 to +1ish.
      const fit = candidate.accords.reduce((sum, a) => sum + preference(a.name) * a.strength, 0) / total;
      const score =
        fit * FIT_WEIGHT + (candidate.yourScore ?? NEUTRAL_SCORE) * SCORE_WEIGHT - recentPenalty(candidate.daysSinceWorn);

      const suited = candidate.accords.filter((a) => preference(a.name) > 0).slice(0, 2).map((a) => a.name.toLowerCase());
      const reason = suited.length
        ? `Its ${joinList(suited)} feel suits ${weatherPhrase(band, condition)}.`
        : candidate.yourScore != null
          ? `One of your favourites, and nothing in it fights ${weatherPhrase(band, condition)}.`
          : `A change from your usual, for ${weatherPhrase(band, condition)}.`;

      return { ...candidate, score, fit, reason };
    })
    .sort((a, b) => b.score - a.score);
}

function weatherPhrase(band: Band, condition: ReturnType<typeof conditionFor>) {
  if (condition === "Rainy") return "a rainy day";
  if (condition === "Snowy") return "a snowy day";
  if (condition === "Humid") return "humid weather";
  return { cold: "the cold", mild: "a mild day", warm: "a warm day", hot: "the heat" }[band];
}
