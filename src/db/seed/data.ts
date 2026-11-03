// The hand-curated catalog (see DECISIONS.md 006). This file is the source of
// truth: `npm run db:seed` makes the database match it, and running it again
// after an edit updates the existing rows instead of duplicating them.
//
// Notes and their pyramid layers should match each brand's official listing.
// Accord strengths (1–100) are our own editorial estimate of how prominent
// each accord is; they set the length of the bars on the fragrance page.

import { concentrationEnum, genderEnum } from "../schema";

type Concentration = (typeof concentrationEnum.enumValues)[number];
type Gender = (typeof genderEnum.enumValues)[number];

export type SeedBrand = { name: string; country: string | null };

export type SeedFragrance = {
  brand: string; // must match a name in `brands`
  name: string;
  releaseYear: number;
  concentration: Concentration;
  gender: Gender;
  perfumers: string[];
  notes: { top: string[]; heart: string[]; base: string[] }; // names from `notes`
  accords: Record<string, number>; // accord name → strength 1–100
};

export const brands: SeedBrand[] = [
  { name: "Byredo", country: "Sweden" },
  { name: "Chanel", country: "France" },
  { name: "Creed", country: "France" },
  { name: "Dior", country: "France" },
  { name: "Giorgio Armani", country: "Italy" },
  { name: "Le Labo", country: "United States" },
  { name: "Maison Francis Kurkdjian", country: "France" },
  { name: "Parfums de Marly", country: "France" },
  { name: "Tom Ford", country: "United States" },
  { name: "Viktor&Rolf", country: "Netherlands" },
  { name: "Yves Saint Laurent", country: "France" },
];

// Note name → scent family.
export const notes: Record<string, string> = {
  // citrus
  Bergamot: "citrus",
  Lemon: "citrus",
  Lime: "citrus",
  Mandarin: "citrus",
  Orange: "citrus",
  // fruity
  Apple: "fruity",
  "Black Currant": "fruity",
  "Dried Fruits": "fruity",
  Peach: "fruity",
  Pear: "fruity",
  Pineapple: "fruity",
  // floral
  Freesia: "floral",
  Iris: "floral",
  Jasmine: "floral",
  Neroli: "floral",
  Orchid: "floral",
  "Orange Blossom": "floral",
  Rose: "floral",
  Violet: "floral",
  "Tobacco Blossom": "floral",
  // aromatic & green
  Geranium: "aromatic",
  "Juniper Berries": "aromatic",
  Lavender: "aromatic",
  "Pine Needles": "aromatic",
  Rosemary: "aromatic",
  Tea: "green",
  "Tobacco Leaf": "aromatic",
  // spicy
  Cardamom: "spicy",
  Cinnamon: "spicy",
  Pepper: "spicy",
  "Pink Pepper": "spicy",
  Saffron: "spicy",
  "Sichuan Pepper": "spicy",
  Spices: "spicy",
  // marine
  "Sea Notes": "marine",
  // gourmand
  Cacao: "gourmand",
  Coffee: "gourmand",
  Praline: "gourmand",
  "Tonka Bean": "gourmand",
  Vanilla: "gourmand",
  // woody
  Amberwood: "woody",
  Birch: "woody",
  Cedar: "woody",
  "Guaiac Wood": "woody",
  Papyrus: "woody",
  Patchouli: "woody",
  Sandalwood: "woody",
  Vetiver: "woody",
  "Woody Notes": "woody",
  // amber & resinous
  Amber: "amber",
  Ambergris: "amber",
  Ambroxan: "amber",
  Elemi: "resinous",
  "Fir Resin": "resinous",
  Incense: "resinous",
  Labdanum: "resinous",
  // musk, moss, leather
  Leather: "leather",
  Musk: "musk",
  Oakmoss: "mossy",
  "White Musk": "musk",
};

// Accord name → color for the accord bars.
export const accords: Record<string, string> = {
  Amber: "#c8873a",
  Aromatic: "#6f8f72",
  Citrus: "#e3c443",
  Coffee: "#5a3a26",
  "Fresh Spicy": "#8fb8a0",
  Fruity: "#e07a5f",
  Leather: "#7a4b32",
  Marine: "#4f8fbf",
  Mossy: "#5c6b3c",
  Musky: "#c9b8c7",
  Patchouli: "#6b5240",
  Powdery: "#d9c2d0",
  Rose: "#d0607a",
  Smoky: "#7d7f80",
  Sweet: "#e8a0a8",
  Tobacco: "#8a5a2b",
  Vanilla: "#e9d6a8",
  "Warm Spicy": "#b5512e",
  "White Floral": "#ece6d6",
  Woody: "#8c6a46",
};

export const fragrances: SeedFragrance[] = [
  {
    brand: "Dior",
    name: "Sauvage",
    releaseYear: 2015,
    concentration: "edt",
    gender: "masculine",
    perfumers: ["François Demachy"],
    notes: {
      top: ["Bergamot", "Pink Pepper"],
      heart: ["Sichuan Pepper", "Lavender", "Geranium", "Patchouli", "Vetiver"],
      base: ["Ambroxan", "Cedar", "Labdanum"],
    },
    accords: { "Fresh Spicy": 100, Amber: 80, Citrus: 70, Aromatic: 65, Woody: 50 },
  },
  {
    brand: "Parfums de Marly",
    name: "Althaïr",
    releaseYear: 2023,
    concentration: "edp",
    gender: "masculine",
    perfumers: ["Hamid Merati-Kashani", "Ilias Ermenidis"],
    notes: {
      top: ["Bergamot", "Mandarin", "Elemi"],
      heart: ["Orange Blossom", "Cinnamon", "Cardamom"],
      // The brand lists Bourbon vanilla; stored as Vanilla so it links with
      // every other vanilla fragrance in note search.
      base: ["Vanilla", "Guaiac Wood", "Praline"],
    },
    accords: { Vanilla: 100, "Warm Spicy": 75, Sweet: 70, Amber: 55, Citrus: 45 },
  },
  {
    brand: "Chanel",
    name: "Coco Mademoiselle",
    releaseYear: 2001,
    concentration: "edp",
    gender: "feminine",
    perfumers: ["Jacques Polge"],
    notes: {
      top: ["Orange", "Bergamot"],
      heart: ["Rose", "Jasmine"],
      base: ["Patchouli", "Vetiver", "Vanilla", "White Musk"],
    },
    accords: { Patchouli: 100, Citrus: 70, Rose: 65, Woody: 55, Musky: 45 },
  },
  {
    brand: "Yves Saint Laurent",
    name: "Black Opium",
    releaseYear: 2014,
    concentration: "edp",
    gender: "feminine",
    perfumers: ["Nathalie Lorson", "Marie Salamagne", "Olivier Cresp", "Honorine Blanc"],
    notes: {
      top: ["Pear", "Pink Pepper", "Orange Blossom"],
      heart: ["Coffee", "Jasmine"],
      base: ["Vanilla", "Patchouli", "Cedar"],
    },
    accords: { Vanilla: 100, Coffee: 90, Sweet: 80, "White Floral": 55, Fruity: 40 },
  },
  {
    brand: "Maison Francis Kurkdjian",
    name: "Baccarat Rouge 540",
    releaseYear: 2015,
    concentration: "edp",
    gender: "unisex",
    perfumers: ["Francis Kurkdjian"],
    notes: {
      top: ["Saffron", "Jasmine"],
      heart: ["Amberwood", "Ambergris"],
      base: ["Fir Resin", "Cedar"],
    },
    accords: { Amber: 100, Woody: 75, "Warm Spicy": 60, Sweet: 50, "White Floral": 35 },
  },
  {
    brand: "Le Labo",
    name: "Santal 33",
    releaseYear: 2011,
    concentration: "edp",
    gender: "unisex",
    perfumers: ["Frank Voelkl"],
    // Le Labo publishes these notes without a pyramid; the layers are our call.
    notes: {
      top: ["Cardamom", "Violet"],
      heart: ["Iris", "Papyrus", "Leather"],
      base: ["Sandalwood", "Cedar", "Ambroxan"],
    },
    accords: { Woody: 100, Leather: 70, Powdery: 50, "Warm Spicy": 45, Smoky: 35 },
  },
  {
    brand: "Creed",
    name: "Aventus",
    releaseYear: 2010,
    concentration: "edp",
    gender: "masculine",
    // Creed doesn't credit its perfumers consistently, so we leave this empty.
    perfumers: [],
    notes: {
      top: ["Pineapple", "Bergamot", "Black Currant", "Apple"],
      heart: ["Birch", "Patchouli", "Jasmine", "Rose"],
      base: ["Musk", "Oakmoss", "Ambergris", "Vanilla"],
    },
    accords: { Fruity: 100, Smoky: 70, Woody: 65, Citrus: 55, Mossy: 40 },
  },
  {
    brand: "Giorgio Armani",
    name: "Acqua di Giò",
    releaseYear: 1996,
    concentration: "edt",
    gender: "masculine",
    perfumers: ["Alberto Morillas"],
    notes: {
      top: ["Lime", "Lemon", "Bergamot", "Neroli", "Mandarin"],
      heart: ["Sea Notes", "Jasmine", "Peach", "Rosemary", "Freesia"],
      base: ["White Musk", "Cedar", "Oakmoss", "Patchouli", "Amber"],
    },
    accords: { Marine: 100, Citrus: 85, Aromatic: 60, Fruity: 40, Woody: 35 },
  },
  {
    brand: "Tom Ford",
    name: "Tobacco Vanille",
    releaseYear: 2007,
    concentration: "edp",
    gender: "unisex",
    perfumers: ["Olivier Gillotin"],
    notes: {
      top: ["Tobacco Leaf", "Spices"],
      heart: ["Vanilla", "Cacao", "Tonka Bean", "Tobacco Blossom"],
      base: ["Dried Fruits", "Woody Notes"],
    },
    accords: { Tobacco: 100, Vanilla: 90, "Warm Spicy": 70, Sweet: 60, Woody: 40 },
  },
  {
    brand: "Viktor&Rolf",
    name: "Flowerbomb",
    releaseYear: 2005,
    concentration: "edp",
    gender: "feminine",
    perfumers: ["Olivier Polge", "Carlos Benaïm", "Domitille Michalon-Bertier"],
    notes: {
      top: ["Tea", "Bergamot"],
      heart: ["Orchid", "Jasmine", "Freesia", "Rose"],
      base: ["Patchouli", "Musk"],
    },
    accords: { Sweet: 100, "White Floral": 80, Rose: 60, Patchouli: 55, Powdery: 40 },
  },
  {
    brand: "Byredo",
    name: "Gypsy Water",
    releaseYear: 2008,
    concentration: "edp",
    gender: "unisex",
    perfumers: ["Jérôme Épinette"],
    notes: {
      top: ["Bergamot", "Lemon", "Pepper", "Juniper Berries"],
      heart: ["Incense", "Pine Needles", "Iris"],
      base: ["Amber", "Vanilla", "Sandalwood"],
    },
    accords: { Woody: 100, Aromatic: 75, Citrus: 60, Smoky: 50, Vanilla: 40 },
  },
];
