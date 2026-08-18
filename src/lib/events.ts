// Server-side helpers for the programmatic-SEO event pages.
// Data comes from the ParentGuide pipeline's public R2 feeds
// (https://api.fampass.io/events-{slug}.json). No client JS — everything is
// rendered into the HTML so search engines index the actual event content.

import type { Metro } from './metros';

export interface PublicEvent {
  title: string;
  description?: string;
  startDate: string;      // ISO local wall-clock, e.g. "2026-08-25T10:30:00"
  endDate?: string;
  isAllDay?: boolean;
  category?: string;
  city?: string;
  locationName?: string;
  address?: string;
  price?: string;
  ageRange?: string;
  imageURL?: string;
  websiteURL?: string;
  externalURL?: string;
  status?: string;
}

const FEED_BASE = 'https://api.fampass.io';

/** Fetch a metro's published, upcoming events, sorted by start date. */
export async function fetchMetroEvents(slug: string): Promise<PublicEvent[]> {
  try {
    const res = await fetch(`${FEED_BASE}/events-${slug}.json`, {
      headers: { 'cache-control': 'no-cache' },
    });
    if (!res.ok) return [];
    const all = (await res.json()) as PublicEvent[];
    const today = ymd(new Date());
    return all
      .filter((e) => (e.status ?? 'published') === 'published')
      .filter((e) => !!e.startDate && dateOnly(e.startDate) >= today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  } catch {
    return [];
  }
}

/* ---------- date helpers (calendar-date comparison, TZ-agnostic) ---------- */

export function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface WeekendWindow {
  days: Set<string>; // the Fri/Sat/Sun calendar dates
  label: string;     // e.g. "Aug 22–24"
}

/** The upcoming (or in-progress) Fri–Sun weekend, as calendar-date strings. */
export function getWeekendWindow(now = new Date()): WeekendWindow {
  const dow = now.getUTCDay(); // 0=Sun … 6=Sat
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let deltaToFri: number;
  if (dow === 6) deltaToFri = -1;        // Saturday → this weekend started yesterday
  else if (dow === 0) deltaToFri = -2;   // Sunday → this weekend started 2 days ago
  else deltaToFri = (5 - dow + 7) % 7;   // Mon–Fri → next/this Friday
  const fri = new Date(base);
  fri.setUTCDate(base.getUTCDate() + deltaToFri);
  const sat = new Date(fri); sat.setUTCDate(fri.getUTCDate() + 1);
  const sun = new Date(fri); sun.setUTCDate(fri.getUTCDate() + 2);
  return {
    days: new Set([ymd(fri), ymd(sat), ymd(sun)]),
    label: rangeLabel(fri, sun),
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function rangeLabel(a: Date, b: Date): string {
  const am = MONTHS[a.getUTCMonth()], bm = MONTHS[b.getUTCMonth()];
  if (am === bm) return `${am} ${a.getUTCDate()}–${b.getUTCDate()}`;
  return `${am} ${a.getUTCDate()} – ${bm} ${b.getUTCDate()}`;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "Saturday, Aug 23" from an ISO date. */
export function formatDay(iso: string): string {
  const d = new Date(iso + (iso.length <= 10 ? 'T00:00:00' : ''));
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "10:30 AM" — midnight and all-day events render as "All day". */
export function formatTime(iso: string, isAllDay?: boolean): string {
  if (isAllDay) return 'All day';
  const m = iso.match(/T(\d{2}):(\d{2})/);
  if (!m) return 'All day';
  let h = parseInt(m[1], 10);
  const min = m[2];
  if (h === 0 && min === '00') return 'All day'; // no family event starts at 12:00 AM
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return min === '00' ? `${h} ${ampm}` : `${h}:${min} ${ampm}`;
}

export function priceLabel(price?: string): string {
  const p = (price ?? '').trim();
  if (!p) return '';
  if (/^(free|\$0)$/i.test(p)) return 'Free';
  return p;
}

export function isFree(price?: string): boolean {
  return /^(free|\$0)$/i.test((price ?? '').trim());
}

/* ---------- category placeholder (used when an event has no / a broken image) ---------- */

const CATEGORY_EMOJI: Record<string, string> = {
  'Storytime': '📖',
  'Arts and Crafts': '🎨',
  'Music': '🎵',
  'Dance': '💃',
  'Theater and Shows': '🎭',
  'Team Sports': '⚽',
  'Swimming': '🏊',
  'Gymnastics': '🤸',
  'Martial Arts': '🥋',
  'Skating and Wheels': '🛼',
  'Indoor Play': '🧸',
  'Fun Run and Fitness': '🏃',
  'Hiking and Trails': '🥾',
  'Beach and Water': '🏖️',
  'Parks and Playgrounds': '🛝',
  'Nature and Wildlife': '🦋',
  'Farms and Animals': '🐐',
  'STEM and Coding': '🔬',
  'Classes and Workshops': '📝',
  'Museum': '🏛️',
  'Food and Dining': '🍴',
  'Cooking Class': '👩‍🍳',
  'Farmers Market': '🧺',
  'Movies': '🎬',
  'Theme Parks': '🎢',
  'Camps': '🏕️',
  'Festival': '🎉',
  'Baby and Toddler': '🍼',
  'Community Event': '🎪',
  'Halloween': '🎃',
  'Christmas and Holiday': '🎄',
  'Easter and Spring': '🌷',
  'Fourth of July': '🎆',
  'Fire Station': '🚒',
};

export function categoryEmoji(category?: string): string {
  return (category && CATEGORY_EMOJI[category]) || '🎈';
}

/* ---------- JSON-LD Event schema (Google rich results) ---------- */

export function buildEventJsonLd(events: PublicEvent[], metro: Metro, pageUrl: string) {
  const itemListElement = events.slice(0, 30).map((e, i) => {
    const ev: Record<string, unknown> = {
      '@type': 'Event',
      name: e.title,
      startDate: e.startDate,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: {
        '@type': 'Place',
        name: e.locationName || e.city || metro.name,
        address: e.address || [e.city, metro.state].filter(Boolean).join(', '),
      },
    };
    if (e.endDate) ev.endDate = e.endDate;
    if (e.description) ev.description = e.description.slice(0, 300);
    if (e.imageURL) ev.image = e.imageURL;
    const url = e.websiteURL || e.externalURL;
    if (url) ev.url = url;
    ev.offers = {
      '@type': 'Offer',
      price: isFree(e.price) ? '0' : undefined,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url,
    };
    return { '@type': 'ListItem', position: i + 1, item: ev };
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Family events in ${metro.name}`,
    url: pageUrl,
    numberOfItems: itemListElement.length,
    itemListElement,
  };
}
