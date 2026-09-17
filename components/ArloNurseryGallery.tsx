"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Images } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { ArloDayFacts, ArloNurseryDay, ArloNurseryPhoto } from "@/lib/arloNurseryPhotos";

// The route that serves the photo bytes — configurable for the same reason
// as in MiloNurseryGallery.tsx (the /family view goes through
// /api/family/arlo-image instead).
const DEFAULT_IMAGE_ENDPOINT = "/api/arlo-nursery/image";

function photoUrl(photo: ArloNurseryPhoto, endpoint: string): string {
  return `${endpoint}?monthDir=${encodeURIComponent(
    photo.monthDir
  )}&file=${encodeURIComponent(photo.file)}`;
}

function formatPhotoCount(n: number): string {
  return `${n} ${n === 1 ? "photo" : "photos"}`;
}

function formatDayHeading(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function monthKey(date: string): string {
  return date.slice(0, 7); // YYYY-MM
}

function formatMonthHeading(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

// Same sliding-track, seamless-infinite-loop carousel as
// components/MiloNurseryGallery.tsx's DayCarousel — see the comments there
// for how the clone-slide technique avoids the "huge jump" when wrapping
// from last photo back to first.
function DayCarousel({
  photos,
  imageEndpoint,
}: {
  photos: ArloNurseryPhoto[];
  imageEndpoint: string;
}) {
  const n = photos.length;
  const hasMultiple = n > 1;

  const slides = hasMultiple ? [photos[n - 1], ...photos, photos[0]] : photos;
  const [pos, setPos] = useState(hasMultiple ? 1 : 0);
  const [withTransition, setWithTransition] = useState(true);
  const index = hasMultiple ? (((pos - 1) % n) + n) % n : 0;

  const step = (delta: number) => {
    setWithTransition(true);
    setPos((p) => p + delta);
  };
  const jumpTo = (i: number) => {
    setWithTransition(true);
    setPos(i + 1);
  };

  const handleTransitionEnd = () => {
    if (!hasMultiple) return;
    if (pos === n + 1) {
      setWithTransition(false);
      setPos(1);
    } else if (pos === 0) {
      setWithTransition(false);
      setPos(n);
    }
  };
  useEffect(() => {
    if (withTransition) return;
    const raf = requestAnimationFrame(() => setWithTransition(true));
    return () => cancelAnimationFrame(raf);
  }, [withTransition]);

  useEffect(() => {
    if (!hasMultiple) return;
    const id = setInterval(() => step(1), 3500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMultiple, n]);

  return (
    // Fixed aspect ratio when stacked above the update on mobile (nothing
    // to match height against there); on desktop it instead stretches to
    // the update column's natural height, via md:h-full plus the parent
    // row's default flex align-items: stretch — see DayCard.
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-white sm:aspect-[16/9] md:aspect-auto md:h-full">
      <div
        className={`flex h-full ${
          withTransition ? "transition-transform duration-700 ease-in-out" : ""
        }`}
        style={{ transform: `translateX(-${pos * 100}%)` }}
        onTransitionEnd={handleTransitionEnd}
      >
        {slides.map((p, i) => (
          <div key={`${p.id}-${i}`} className="h-full w-full shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl(p, imageEndpoint)}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain"
            />
          </div>
        ))}
      </div>

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous photo"
            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
            {photos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => jumpTo(i)}
                aria-label={`Go to photo ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-white" : "w-1.5 bg-white/60 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Emoji picked from keywords in the entry text, so the visualization reads
// at a glance rather than as another wall of text. None of this changes
// what's stored (lib/arloNurseryPhotos.ts keeps the plain parsed strings) —
// it's a presentation-only mapping, same idea as the kit-schedule/PE&Games
// visual boxes on the Gatehouse class info page.
function mealIcon(entry: string): string {
  const lower = entry.toLowerCase();
  if (lower.includes("breakfast")) return "🥣";
  if (lower.includes("snack")) return "🍎";
  if (lower.includes("lunch")) return "🍽️";
  if (lower.includes("pudding")) return "🍮";
  if (lower.includes("tea")) return "🫖";
  if (lower.includes("bottle")) return "🍼";
  return "🍽️";
}

function nappyIcon(entry: string): string {
  const lower = entry.toLowerCase();
  const wet = lower.includes("wet");
  const bm = /\bbm\b/.test(lower);
  const base = wet && bm ? "💧💩" : bm ? "💩" : wet ? "💧" : "🧷";
  // "Wet (Cream)" — barrier cream applied at the same change.
  return lower.includes("cream") ? `${base}🧴` : base;
}

function activityIcon(entry: string): string {
  const lower = entry.toLowerCase();
  if (/park|garden|walk|wharf|outdoor|rooftop/.test(lower)) return "🌳";
  if (/paint|art|craft|colour/.test(lower)) return "🎨";
  if (/music|sing|instrument|shaker/.test(lower)) return "🎵";
  if (/book|story|read/.test(lower)) return "📖";
  if (/animal|zoo/.test(lower)) return "🦁";
  return "🧸";
}

function otherIcon(entry: string): string {
  return /sick|ill|unwell|poorly/i.test(entry) ? "🤒" : "📌";
}

// An emoji for the dish itself, on top of the meal-type icon above, so a
// day's food reads as food rather than as a row of identical plates. Keyed
// on words that actually appear in the nursery's menus. Order matters and
// is the whole trick: the dish's *form* wins first (a "Blueberry and Banana
// Cake" is cake, not fruit), then its protein ("Salmon Pasta Bake" is fish,
// not pasta), then its staple, and only then loose fruit and veg — which is
// how you'd describe the plate out loud.
const FOOD_ICONS: [RegExp, string][] = [
  // form of the dish
  [/custard/i, "🍮"],
  [/yoghurt|yogurt/i, "🍨"],
  [/cake|tray bake|muffin/i, "🧁"],
  [/scone/i, "🥯"],
  [/soup/i, "🍲"],
  [/\bpie\b/i, "🥧"],
  [/sandwich/i, "🥪"],
  [/cracker/i, "🍘"],
  [/toast/i, "🍞"],
  [/pitta|pita|bread|naan/i, "🫓"],
  [/weetabix|porridge|cereal|\boats?\b/i, "🥣"],
  // protein
  [/salmon|\bfish\b|tuna|\bcod\b/i, "🐟"],
  [/chicken/i, "🍗"],
  [/beef|lamb|chilli|pork|mince|meatball/i, "🥩"],
  [/\beggs?\b/i, "🥚"],
  [/cheese/i, "🧀"],
  [/beans/i, "🫘"],
  [/stir.?fry/i, "🥡"],
  // staple
  [/pasta|spaghetti|lasagne|macaroni/i, "🍝"],
  [/noodle/i, "🍜"],
  [/rice|risotto|couscous/i, "🍚"],
  [/potato|mash|jacket/i, "🥔"],
  // fruit
  [/apple/i, "🍎"],
  [/banana/i, "🍌"],
  [/watermelon|melon/i, "🍉"],
  [/orange/i, "🍊"],
  [/peach|apricot|nectarine/i, "🍑"],
  [/pineapple/i, "🍍"],
  [/blueberr|blackberr|raspberr|berry/i, "🫐"],
  [/mango/i, "🥭"],
  [/pear\b/i, "🍐"],
  [/grape/i, "🍇"],
  [/strawberr/i, "🍓"],
  // veg
  [/cauliflower|broccoli|courgette|zucchini|vegetable|\bveg\b/i, "🥦"],
  [/sweetcorn|\bcorn\b/i, "🌽"],
  [/peas\b/i, "🫛"],
  [/carrot/i, "🥕"],
  [/tomato/i, "🍅"],
  // drink
  [/milk/i, "🥛"],
  [/juice/i, "🧃"],
  [/water\b/i, "💧"],
];

function foodIcon(dish: string): string {
  for (const [re, icon] of FOOD_ICONS) {
    if (re.test(dish)) return icon;
  }
  return "🍴";
}

// How much of it he actually ate, which the app used to hide inside the
// entry text. A traffic-light dot rather than a red cross for "None" — it's
// a baby's lunch, not a test score.
function portionDot(portion: string): string | null {
  const p = portion.trim().toLowerCase();
  if (p === "all" || p === "all+" || p === "most") return "🟢";
  if (p === "half") return "🟡";
  if (p === "little" || p === "some") return "🟠";
  if (p === "none") return "⚪️";
  return null;
}

// "13:03 Bottle – Soya Milk (All)" -> time, meal type, and one entry per
// dish. Anything that doesn't fit the shape is handed back whole as a
// single unnamed dish, so an unexpected line still renders as text.
function parseMealEntry(entry: string): {
  time: string | null;
  type: string | null;
  dishes: { name: string; portion: string | null }[];
} {
  const m = entry.match(/^(\d{1,2}:\d{2})\s+(.+?)\s*[\u2013-]\s*([\s\S]+)$/);
  if (!m) return { time: null, type: null, dishes: [{ name: entry.trim(), portion: null }] };
  return { time: m[1], type: m[2].trim(), dishes: parseDishes(m[3]) };
}

// Dishes are comma-separated, but a dish name can contain commas of its own
// ("... with Sweet Potato Mash, Peas, Sweetcorn and Tomato Sauce (All)"), so
// the split is driven by each "(portion)" instead — slice between the
// brackets and drop only a *leading* comma.
function parseDishes(text: string): { name: string; portion: string | null }[] {
  const out: { name: string; portion: string | null }[] = [];
  const re = /\(([^)]*)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const name = text.slice(last, m.index).replace(/^\s*,\s*/, "").trim();
    if (name) out.push({ name, portion: m[1].trim() || null });
    last = re.lastIndex;
  }
  const tail = text.slice(last).replace(/^\s*,\s*/, "").trim();
  if (tail) out.push({ name: tail, portion: null });
  return out.length > 0 ? out : [{ name: text.trim(), portion: null }];
}

// Minutes between two same-day "HH:MM" clock readings.
function minutesBetween(from: string, to: string): number | null {
  const a = from.match(/^(\d{1,2}):(\d{2})$/);
  const b = to.match(/^(\d{1,2}):(\d{2})$/);
  if (!a || !b) return null;
  const mins = (Number(b[1]) * 60 + Number(b[2])) - (Number(a[1]) * 60 + Number(a[2]));
  return mins > 0 ? mins : null;
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// One labeled row: an emoji, the field's name, and its entries as small
// chips (each with its own icon from the functions above). Renders nothing
// if there's nothing logged for this field that day.
function FactRow({
  emoji,
  label,
  items,
}: {
  emoji: string;
  label: string;
  items: { icon: string; text: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex items-start gap-2 px-4 py-2">
      <span className="w-5 shrink-0 text-center text-base leading-5">{emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          {items.map((it, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-1.5 py-0.5 text-[11px] leading-relaxed text-slate-700"
            >
              <span>{it.icon}</span>
              {it.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Arrival/departure/pickup as one inline row rather than a chip list — it's
// at most three short values, and reads better as a single line.
function ArrivalDepartureRow({ facts }: { facts: ArloDayFacts }) {
  if (!facts.signedIn && !facts.signedOut && !facts.expectedPickup) return null;
  const mins =
    facts.signedIn && facts.signedOut ? minutesBetween(facts.signedIn, facts.signedOut) : null;
  const atNursery = mins === null ? null : formatDuration(mins);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-xs text-slate-700">
      {facts.signedIn && (
        <span className="inline-flex items-center gap-1">
          🌅 Arrived <span className="font-semibold text-slate-900">{facts.signedIn}</span>
        </span>
      )}
      {facts.signedOut && (
        <span className="inline-flex items-center gap-1">
          🌇 Left <span className="font-semibold text-slate-900">{facts.signedOut}</span>
        </span>
      )}
      {facts.expectedPickup && (
        <span className="inline-flex items-center gap-1">🚗 Pickup {facts.expectedPickup}</span>
      )}
      {atNursery && (
        <span className="inline-flex items-center gap-1 text-slate-500">
          ⏱️ <span className="font-semibold text-slate-700">{atNursery}</span> at nursery
        </span>
      )}
    </div>
  );
}

// One meal per line: the time in a gutter, the meal type, then a chip per
// dish carrying its own food emoji and how much of it he ate. Replaces the
// generic FactRow for meals, where a single chip per entry buried both the
// dish and the portion in one run of text.
function MealsRow({ meals }: { meals: string[] }) {
  if (meals.length === 0) return null;
  return (
    <div className="flex items-start gap-2 px-4 py-2">
      <span className="w-5 shrink-0 text-center text-base leading-5">🍽️</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Meals</p>
        <div className="mt-1 space-y-1.5">
          {meals.map((entry, i) => {
            const { time, type, dishes } = parseMealEntry(entry);
            return (
              <div key={i} className="flex items-start gap-2">
                <span className="w-9 shrink-0 pt-1 text-[11px] font-semibold tabular-nums text-slate-400">
                  {time ?? ""}
                </span>
                <div className="min-w-0 flex-1">
                  {type && (
                    <p className="text-[11px] leading-4 text-slate-500">
                      {mealIcon(type)} {type}
                    </p>
                  )}
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {dishes.map((d, j) => {
                      const dot = d.portion ? portionDot(d.portion) : null;
                      return (
                        <span
                          key={j}
                          className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-1.5 py-0.5 text-[11px] leading-relaxed text-slate-700"
                        >
                          <span>{foodIcon(d.name)}</span>
                          {d.name}
                          {d.portion && (
                            <span className="text-slate-400">
                              {dot ? `${dot} ` : ""}
                              {d.portion}
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// The structured Bright Horizons app data (see lib/arloNurseryPhotos.ts:
// ArloDayFacts) as a small emoji-labeled visualization instead of plain
// bullet text.
export function DayFacts({ facts }: { facts: ArloDayFacts }) {
  return (
    <div className="divide-y divide-slate-100">
      <ArrivalDepartureRow facts={facts} />
      <MealsRow meals={facts.meals} />
      <FactRow
        emoji="🧷"
        label="Nappy"
        items={facts.nappy.map((n) => ({ icon: nappyIcon(n), text: n }))}
      />
      <FactRow emoji="😴" label="Sleep" items={facts.sleep.map((s) => ({ icon: "😴", text: s }))} />
      <FactRow
        emoji="🧸"
        label="Activity"
        items={facts.activity.map((a) => ({ icon: activityIcon(a), text: a }))}
      />
      <FactRow
        emoji="📌"
        label="Other"
        items={facts.other.map((o) => ({ icon: otherIcon(o), text: o }))}
      />
      {facts.notes.length > 0 && (
        <div className="space-y-0.5 px-4 py-2 text-[11px] italic text-slate-500">
          {facts.notes.map((n, i) => (
            <p key={i}>📝 {n}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// The teacher's own free-text updates for a day (see
// lib/arloNurseryPhotos.ts: observationsMarkdown) — shown in full, no
// collapse/truncation.
export function UpdateText({ markdown, bordered }: { markdown: string; bordered: boolean }) {
  return (
    <div className={`px-4 py-3 ${bordered ? "border-t border-slate-100" : ""}`}>
      <div className="prose-arlo-update text-xs leading-relaxed text-slate-600">
        <ReactMarkdown
          components={{
            p: (props) => <p className="mb-1.5 last:mb-0" {...props} />,
            ul: (props) => <ul className="mb-1.5 list-disc space-y-0.5 pl-4" {...props} />,
            li: (props) => <li {...props} />,
            strong: (props) => <strong className="font-semibold text-slate-800" {...props} />,
            em: (props) => <em className="text-slate-500" {...props} />,
          }}
        >
          {markdown}
        </ReactMarkdown>
      </div>
    </div>
  );
}

function DayCard({ day, imageEndpoint }: { day: ArloNurseryDay; imageEndpoint: string }) {
  const hasPhotos = day.photos.length > 0;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col md:flex-row">
        {hasPhotos && (
          <div className="md:w-[45%] md:shrink-0">
            <DayCarousel photos={day.photos} imageEndpoint={imageEndpoint} />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">{formatDayHeading(day.date)}</p>
            {hasPhotos && (
              <span className="flex shrink-0 items-center gap-1 text-xs text-slate-400">
                <Images className="h-3.5 w-3.5" />
                {formatPhotoCount(day.photos.length)}
              </span>
            )}
          </div>

          {day.facts && <DayFacts facts={day.facts} />}
          {day.observationsMarkdown && (
            <UpdateText markdown={day.observationsMarkdown} bordered={Boolean(day.facts)} />
          )}
          {!day.facts && !day.observationsMarkdown && (
            <p className="px-4 py-3 text-xs text-slate-400">No nursery-app update logged.</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface MonthGroup {
  key: string;
  days: ArloNurseryDay[];
}

function groupByMonth(days: ArloNurseryDay[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const day of days) {
    const key = monthKey(day.date);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.days.push(day);
    } else {
      groups.push({ key, days: [day] });
    }
  }
  return groups;
}

export function ArloNurseryGallery({
  days,
  imageEndpoint = DEFAULT_IMAGE_ENDPOINT,
}: {
  days: ArloNurseryDay[];
  imageEndpoint?: string;
}) {
  // `days` comes in oldest-first. Reverse before grouping so the most
  // recent month lands first and, within it, the most recent day is first
  // too — most-recent-on-top throughout, same as the other galleries.
  const groups = useMemo(() => groupByMonth([...days].reverse()), [days]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g) => [g.key, true]))
  );

  const toggle = (key: string) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  if (days.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No updates found yet. Check that ARLO_NURSERY_PHOTOS_DIR points at the nursery photos
        folder.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const isCollapsed = collapsed[group.key] ?? true;
        const monthPhotoCount = group.days.reduce((sum, d) => sum + d.photos.length, 0);
        return (
          <div key={group.key}>
            <button
              type="button"
              onClick={() => toggle(group.key)}
              className="flex w-full items-center gap-3 rounded-lg py-2 text-left hover:bg-slate-50"
            >
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                  isCollapsed ? "-rotate-90" : ""
                }`}
              />
              <h2 className="text-lg font-bold text-slate-900">{formatMonthHeading(group.key)}</h2>
              <span className="text-sm text-slate-400">
                {group.days.length} {group.days.length === 1 ? "day" : "days"} ·{" "}
                {formatPhotoCount(monthPhotoCount)}
              </span>
            </button>

            {!isCollapsed && (
              <div className="mt-4 space-y-5">
                {group.days.map((day) => (
                  <DayCard key={day.date} day={day} imageEndpoint={imageEndpoint} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
