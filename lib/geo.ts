// Countries for the targeting map: ISO-2 → display name + a centroid. The
// centroids place a dot on a 200×100 equirectangular grid (one cell ≈ 1.8°), so
// they only need to land in the right country, not on its capital. Source
// values in the roster are free-text names (MISP galaxy, ransomware.live), so
// `resolveCountry` folds the spellings we actually see into ISO-2 and returns
// null for non-countries (NATO, a company, an org) — those stay in the text
// list and never on the map.
export type Country = { name: string; lat: number; lon: number };

export const COUNTRIES: Record<string, Country> = {
  AF: { name: "Afghanistan", lat: 33.9, lon: 67.7 }, AL: { name: "Albania", lat: 41.2, lon: 20.2 }, DZ: { name: "Algeria", lat: 28.0, lon: 1.7 },
  AO: { name: "Angola", lat: -11.2, lon: 17.9 }, AR: { name: "Argentina", lat: -38.4, lon: -63.6 }, AM: { name: "Armenia", lat: 40.1, lon: 45.0 },
  AU: { name: "Australia", lat: -25.3, lon: 133.8 }, AT: { name: "Austria", lat: 47.5, lon: 14.6 }, AZ: { name: "Azerbaijan", lat: 40.1, lon: 47.6 },
  BS: { name: "Bahamas", lat: 25.0, lon: -77.4 }, BH: { name: "Bahrain", lat: 26.1, lon: 50.6 }, BD: { name: "Bangladesh", lat: 23.7, lon: 90.4 },
  BY: { name: "Belarus", lat: 53.7, lon: 27.9 }, BE: { name: "Belgium", lat: 50.5, lon: 4.5 }, BO: { name: "Bolivia", lat: -16.3, lon: -63.6 },
  BA: { name: "Bosnia and Herzegovina", lat: 43.9, lon: 17.7 }, BW: { name: "Botswana", lat: -22.3, lon: 24.7 }, BR: { name: "Brazil", lat: -14.2, lon: -51.9 },
  BG: { name: "Bulgaria", lat: 42.7, lon: 25.5 }, KH: { name: "Cambodia", lat: 12.6, lon: 105.0 }, CM: { name: "Cameroon", lat: 7.4, lon: 12.4 },
  CA: { name: "Canada", lat: 56.1, lon: -106.3 }, CL: { name: "Chile", lat: -35.7, lon: -71.5 }, CN: { name: "China", lat: 35.9, lon: 104.2 },
  CO: { name: "Colombia", lat: 4.6, lon: -74.3 }, CR: { name: "Costa Rica", lat: 9.7, lon: -83.8 }, HR: { name: "Croatia", lat: 45.1, lon: 15.2 },
  CU: { name: "Cuba", lat: 21.5, lon: -77.8 }, CY: { name: "Cyprus", lat: 35.1, lon: 33.4 }, CZ: { name: "Czechia", lat: 49.8, lon: 15.5 },
  CI: { name: "Côte d'Ivoire", lat: 7.5, lon: -5.5 }, DK: { name: "Denmark", lat: 56.3, lon: 9.5 }, DO: { name: "Dominican Republic", lat: 18.7, lon: -70.2 },
  EC: { name: "Ecuador", lat: -1.8, lon: -78.2 }, EG: { name: "Egypt", lat: 26.8, lon: 30.8 }, SV: { name: "El Salvador", lat: 13.8, lon: -88.9 },
  EE: { name: "Estonia", lat: 58.6, lon: 25.0 }, ET: { name: "Ethiopia", lat: 9.1, lon: 40.5 }, FI: { name: "Finland", lat: 61.9, lon: 25.7 },
  FR: { name: "France", lat: 46.2, lon: 2.2 }, GE: { name: "Georgia", lat: 42.3, lon: 43.4 }, DE: { name: "Germany", lat: 51.2, lon: 10.5 },
  GH: { name: "Ghana", lat: 7.9, lon: -1.0 }, GR: { name: "Greece", lat: 39.1, lon: 21.8 }, GT: { name: "Guatemala", lat: 15.8, lon: -90.2 },
  HN: { name: "Honduras", lat: 15.2, lon: -86.2 }, HK: { name: "Hong Kong", lat: 22.3, lon: 114.2 }, HU: { name: "Hungary", lat: 47.2, lon: 19.5 },
  IS: { name: "Iceland", lat: 64.9, lon: -19.0 }, IN: { name: "India", lat: 20.6, lon: 79.0 }, ID: { name: "Indonesia", lat: -0.8, lon: 113.9 },
  IR: { name: "Iran", lat: 32.4, lon: 53.7 }, IQ: { name: "Iraq", lat: 33.2, lon: 43.7 }, IE: { name: "Ireland", lat: 53.4, lon: -8.2 },
  IL: { name: "Israel", lat: 31.0, lon: 34.9 }, IT: { name: "Italy", lat: 41.9, lon: 12.6 }, JM: { name: "Jamaica", lat: 18.1, lon: -77.3 },
  JP: { name: "Japan", lat: 36.2, lon: 138.3 }, JO: { name: "Jordan", lat: 30.6, lon: 36.2 }, KZ: { name: "Kazakhstan", lat: 48.0, lon: 66.9 },
  KE: { name: "Kenya", lat: -0.0, lon: 37.9 }, KW: { name: "Kuwait", lat: 29.3, lon: 47.5 }, KG: { name: "Kyrgyzstan", lat: 41.2, lon: 74.8 },
  LA: { name: "Laos", lat: 19.9, lon: 102.5 }, LV: { name: "Latvia", lat: 56.9, lon: 24.6 }, LB: { name: "Lebanon", lat: 33.9, lon: 35.9 },
  LY: { name: "Libya", lat: 26.3, lon: 17.2 }, LT: { name: "Lithuania", lat: 55.2, lon: 23.9 }, LU: { name: "Luxembourg", lat: 49.8, lon: 6.1 },
  MO: { name: "Macau", lat: 22.2, lon: 113.5 }, MG: { name: "Madagascar", lat: -18.8, lon: 46.9 }, MY: { name: "Malaysia", lat: 4.2, lon: 102.0 },
  MV: { name: "Maldives", lat: 3.2, lon: 73.2 }, ML: { name: "Mali", lat: 17.6, lon: -4.0 }, MT: { name: "Malta", lat: 35.9, lon: 14.4 },
  MU: { name: "Mauritius", lat: -20.3, lon: 57.6 }, MX: { name: "Mexico", lat: 23.6, lon: -102.6 }, MD: { name: "Moldova", lat: 47.4, lon: 28.4 },
  MN: { name: "Mongolia", lat: 46.9, lon: 103.8 }, ME: { name: "Montenegro", lat: 42.7, lon: 19.4 }, MA: { name: "Morocco", lat: 31.8, lon: -7.1 },
  MZ: { name: "Mozambique", lat: -18.7, lon: 35.5 }, MM: { name: "Myanmar", lat: 19.8, lon: 96.7 }, NP: { name: "Nepal", lat: 28.4, lon: 84.1 },
  NL: { name: "Netherlands", lat: 52.1, lon: 5.3 }, NZ: { name: "New Zealand", lat: -40.9, lon: 174.9 }, NI: { name: "Nicaragua", lat: 12.9, lon: -85.2 },
  NE: { name: "Niger", lat: 17.6, lon: 8.1 }, NG: { name: "Nigeria", lat: 9.1, lon: 8.7 }, MK: { name: "North Macedonia", lat: 41.6, lon: 21.7 },
  NO: { name: "Norway", lat: 60.5, lon: 8.5 }, OM: { name: "Oman", lat: 21.5, lon: 55.9 }, PK: { name: "Pakistan", lat: 30.4, lon: 69.3 },
  PS: { name: "Palestine", lat: 31.9, lon: 35.2 }, PA: { name: "Panama", lat: 8.5, lon: -80.8 }, PY: { name: "Paraguay", lat: -23.4, lon: -58.4 },
  PE: { name: "Peru", lat: -9.2, lon: -75.0 }, PH: { name: "Philippines", lat: 12.9, lon: 121.8 }, PL: { name: "Poland", lat: 51.9, lon: 19.1 },
  PT: { name: "Portugal", lat: 39.4, lon: -8.2 }, QA: { name: "Qatar", lat: 25.4, lon: 51.2 }, RO: { name: "Romania", lat: 45.9, lon: 25.0 },
  RU: { name: "Russia", lat: 61.5, lon: 105.3 }, RW: { name: "Rwanda", lat: -1.9, lon: 29.9 }, SA: { name: "Saudi Arabia", lat: 23.9, lon: 45.1 },
  SN: { name: "Senegal", lat: 14.5, lon: -14.5 }, RS: { name: "Serbia", lat: 44.0, lon: 21.0 }, SG: { name: "Singapore", lat: 1.4, lon: 103.8 },
  SK: { name: "Slovakia", lat: 48.7, lon: 19.7 }, SI: { name: "Slovenia", lat: 46.2, lon: 15.0 }, ZA: { name: "South Africa", lat: -30.6, lon: 22.9 },
  KR: { name: "South Korea", lat: 35.9, lon: 127.8 }, KP: { name: "North Korea", lat: 40.3, lon: 127.5 }, ES: { name: "Spain", lat: 40.5, lon: -3.7 },
  LK: { name: "Sri Lanka", lat: 7.9, lon: 80.8 }, SD: { name: "Sudan", lat: 12.9, lon: 30.2 }, SE: { name: "Sweden", lat: 60.1, lon: 18.6 },
  CH: { name: "Switzerland", lat: 46.8, lon: 8.2 }, SY: { name: "Syria", lat: 34.8, lon: 38.9 }, TW: { name: "Taiwan", lat: 23.7, lon: 121.0 },
  TJ: { name: "Tajikistan", lat: 38.9, lon: 71.3 }, TZ: { name: "Tanzania", lat: -6.4, lon: 34.9 }, TH: { name: "Thailand", lat: 15.9, lon: 100.9 },
  TT: { name: "Trinidad and Tobago", lat: 10.7, lon: -61.2 }, TN: { name: "Tunisia", lat: 33.9, lon: 9.5 }, TR: { name: "Türkiye", lat: 38.9, lon: 35.2 },
  TM: { name: "Turkmenistan", lat: 38.9, lon: 59.6 }, UG: { name: "Uganda", lat: 1.4, lon: 32.3 }, UA: { name: "Ukraine", lat: 48.4, lon: 31.2 },
  AE: { name: "United Arab Emirates", lat: 23.4, lon: 53.8 }, GB: { name: "United Kingdom", lat: 55.4, lon: -3.4 }, US: { name: "United States", lat: 37.1, lon: -95.7 },
  UY: { name: "Uruguay", lat: -32.5, lon: -55.8 }, UZ: { name: "Uzbekistan", lat: 41.4, lon: 64.6 }, VE: { name: "Venezuela", lat: 6.4, lon: -66.6 },
  VN: { name: "Vietnam", lat: 14.1, lon: 108.3 }, YE: { name: "Yemen", lat: 15.6, lon: 48.5 }, ZM: { name: "Zambia", lat: -13.1, lon: 27.8 },
  ZW: { name: "Zimbabwe", lat: -19.0, lon: 29.2 }, XK: { name: "Kosovo", lat: 42.6, lon: 20.9 }, GL: { name: "Greenland", lat: 71.7, lon: -42.6 },
};

// Spellings seen in the roster that are not the display name above.
const ALIASES: Record<string, string> = {
  "usa": "US", "u.s.": "US", "united states of america": "US", "america": "US",
  "uk": "GB", "britain": "GB", "great britain": "GB", "england": "GB",
  "korea (democratic people's republic of)": "KP", "democratic people's republic of korea": "KP", "dprk": "KP",
  "korea, republic of": "KR", "republic of korea": "KR", "korea": "KR",
  "russian federation": "RU", "turkey": "TR", "turkiye": "TR", "czech republic": "CZ",
  "iran, islamic republic of": "IR", "islamic republic of iran": "IR", "viet nam": "VN",
  "uae": "AE", "emirates": "AE", "hong kong sar": "HK", "taiwan, province of china": "TW",
  "palestinian territory": "PS", "palestinian territories": "PS", "state of palestine": "PS", "gaza": "PS",
  "macedonia": "MK", "ivory coast": "CI", "cote d'ivoire": "CI", "syrian arab republic": "SY",
  "lao people's democratic republic": "LA", "moldova, republic of": "MD", "bolivia (plurinational state of)": "BO",
  "venezuela (bolivarian republic of)": "VE", "tanzania, united republic of": "TZ", "burma": "MM",
  "netherlands (kingdom of the)": "NL", "holland": "NL", "the netherlands": "NL", "the bahamas": "BS",
  "türkiye": "TR", "azərbaycan": "AZ", "bangladesh bank": "BD",
};

const BY_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRIES).map(([iso, c]) => [c.name.toLowerCase(), iso]),
);

const clean = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** ISO-2 for a free-text country name, or null when it is not a country we place. */
export function resolveCountry(name: string | null | undefined): string | null {
  if (!name) return null;
  const k = clean(name);
  if (k.length === 2 && COUNTRIES[k.toUpperCase()]) return k.toUpperCase();
  return BY_NAME[k] ?? ALIASES[k] ?? null;
}

export function countryName(iso2: string | null | undefined): string | null {
  if (!iso2) return null;
  return COUNTRIES[iso2.toUpperCase()]?.name ?? null;
}

export function flagEmoji(iso2: string | null | undefined): string {
  if (!iso2 || !/^[A-Za-z]{2}$/.test(iso2)) return "";
  const cc = iso2.toUpperCase();
  return String.fromCodePoint(...[...cc].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}
