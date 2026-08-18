// The metros FamPass covers, with SEO-friendly display names.
// Slugs MUST match the ParentGuide pipeline's enabled metro IDs (the R2 feeds
// are published per-metro at https://api.fampass.io/events-{slug}.json).
// `name` is the phrase that slots after "in …" (e.g. "in Orange County").
// `the: true` prefixes "the" ("in the Inland Empire").

export interface Metro {
  slug: string;
  name: string;   // display name used after "in"
  state: string;  // for context copy + schema areaServed
  the?: boolean;  // whether the name needs a leading "the"
}

export const METROS: Metro[] = [
  { slug: 'los-angeles',        name: 'Los Angeles',        state: 'CA' },
  { slug: 'orange-county',      name: 'Orange County',      state: 'CA' },
  { slug: 'san-diego',          name: 'San Diego',          state: 'CA' },
  { slug: 'sf-peninsula',       name: 'San Francisco',      state: 'CA' },
  { slug: 'south-bay',          name: 'Silicon Valley',     state: 'CA' },
  { slug: 'east-bay',           name: 'the East Bay',       state: 'CA', the: false },
  { slug: 'north-bay',          name: 'the North Bay',      state: 'CA', the: false },
  { slug: 'inland-empire',      name: 'the Inland Empire',  state: 'CA', the: false },
  { slug: 'valley-of-the-sun',  name: 'Phoenix',            state: 'AZ' },
  { slug: 'puget-sound',        name: 'Seattle',            state: 'WA' },
  { slug: 'portland-metro',     name: 'Portland',           state: 'OR' },
  { slug: 'dmv',                name: 'Washington, DC',     state: 'DC' },
  { slug: 'boston',             name: 'Boston',             state: 'MA' },
  { slug: 'denver-front-range', name: 'Denver',             state: 'CO' },
  { slug: 'colorado-springs',   name: 'Colorado Springs',   state: 'CO' },
  { slug: 'northern-colorado',  name: 'Northern Colorado',  state: 'CO' },
  { slug: 'salt-lake',          name: 'Salt Lake City',     state: 'UT' },
  { slug: 'utah-county',        name: 'Utah County',        state: 'UT' },
  { slug: 'dallas-fort-worth',  name: 'Dallas–Fort Worth',  state: 'TX' },
  { slug: 'houston',            name: 'Houston',            state: 'TX' },
  { slug: 'austin',             name: 'Austin',             state: 'TX' },
  { slug: 'san-antonio',        name: 'San Antonio',        state: 'TX' },
  { slug: 'chicago',            name: 'Chicago',            state: 'IL' },
  { slug: 'atlanta',            name: 'Atlanta',            state: 'GA' },
  { slug: 'nashville',          name: 'Nashville',          state: 'TN' },
  { slug: 'charlotte',          name: 'Charlotte',          state: 'NC' },
  { slug: 'raleigh-durham',     name: 'Raleigh–Durham',     state: 'NC' },
  { slug: 'south-florida',      name: 'South Florida',      state: 'FL' },
];

const BY_SLUG = new Map(METROS.map((m) => [m.slug, m]));

export function getMetro(slug: string | undefined): Metro | undefined {
  return slug ? BY_SLUG.get(slug) : undefined;
}

/** The name already includes any needed article, so this is just the name. */
export function metroName(m: Metro): string {
  return m.name;
}

/** Title-case-safe: names starting with "the " lowercase the article mid-sentence. */
export function inMetro(m: Metro): string {
  return `in ${m.name}`;
}
