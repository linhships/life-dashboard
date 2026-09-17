# `updates.md` format contract — Arlo's nursery updates

Three pieces have to agree on one format:

| piece | job |
|---|---|
| the nursery scheduled task | reads Bright Horizons app screenshots, **writes** `updates.md` |
| `lib/arloNurseryPhotos.ts` | **parses** it into `ArloDayFacts` |
| `components/ArloNurseryGallery.tsx` | **renders** those facts (the emoji layer) |

This file is the contract between them. If the task writes something this
document doesn't describe, the parser does not error — it silently files the
paragraph as free text, which is how a whole month once rendered as a blank
page. Treat any deviation as a bug in the task, not a rendering quirk.

## 1. Which half does the visuals — and why it isn't the task

The instinct to move this into the task is half right, and worth being
precise about, because the two halves fail very differently.

**Structure belongs to the task.** The task is the only part that can see the
original screenshots, so it is the only part that can know that `Wet&BM` was
one change and not two, or that `(All+)` attaches to the chilli and not the
banana. Every format mismatch we hit came from the task's output drifting
while the parser stood still. Nailing the structure down is the task's job
and it's what this document is mostly about.

**Emoji belong to the app.** Concretely: the task writes `Fresh Apple (All)`
and the app decides that renders as `🍎 Fresh Apple 🟢 All`. Reasons, in
order of how much they'll bite:

1. **Emoji in the file freeze the look at write time.** Changing 🟠 to 🟡 for
   "Little" would mean regenerating every historical file. Emoji in the app
   means editing one table and every past day re-renders.
2. **An LLM writing emoji is not repeatable.** The same task on two runs will
   pick 🍽️ once and 🍛 the next for the same lunch. A keyword table gives the
   same dish the same icon in August and in March — the consistency is what
   makes the page scannable at all.
3. **Emoji aren't queryable.** `(All)` can be counted, sorted and charted;
   🟢 has to be decoded back into a word first. The moment you want "how
   often did he refuse lunch this term", plain words are the asset.
4. **The file is also the human record.** `updates.md` is editable by hand and
   is the thing that survives if the app goes away. Prose with emoji glued
   into it is worse to read and worse to correct.

So: **the task writes plain words with reliable structure; the app owns every
emoji.** That's already what the code says it does — see the comment above
`mealIcon` in `ArloNurseryGallery.tsx` ("presentation-only mapping").

**If you'd rather the task own the look after all,** don't put emoji in
markdown — switch the file to structured data (YAML frontmatter or a sidecar
`updates.json`) with an explicit field per fact. That kills this entire class
of bug, because there'd be no prose to regex. It's the better design; it just
costs a rewrite of the parser and of the task's output. Worth doing if you
end up touching this again.

## 2. Where the file lives

```
<ARLO_NURSERY_PHOTOS_DIR>/<YYYY>/<M> <MonthName>/updates.md
```

- One file per **month**, in that month's folder — e.g. `2026/9 September/updates.md`.
- The folder must match `^\d{4}/\d{1,2} [^/]+$`: a 4-digit year, then a month
  folder starting with the month *number*, then any name. `2026/9 September`
  works; `2026/Sep 16` does not, and a folder that fails this is skipped in
  silence along with everything in it.
- A file must only contain days belonging to its own month.
- Photos sit beside it as `YYYY-MM-DD_IMG_####.jpeg`. Raw screenshots the
  task compiled from go in that month's `completed/` subfolder, which the app
  deliberately ignores.

## 3. Grammar

### Preamble

Anything before the first `### ` heading is **never read** by the app. Keep
the title and nursery name there for human readers; don't put facts in it.

```markdown
# Arlo-Minh — Nursery Updates

Bright Horizons — Bank Street Day Nursery And Preschool, Baby Room
```

### Day heading

```markdown
### Tuesday, August 11, 2026
```

Pattern: `### <Weekday>, <Month> <D>, <YYYY>`. Weekday must be one word and
is not otherwise used. Month may be full or three-letter (`August` or `Aug`).
Day is 1–2 digits, no leading zero needed. **Nothing may follow on the line.**

### Inside a day

Blank-line-separated paragraphs. Each is either a **field** — first line is a
bold label — or **free text**, which is kept verbatim as the teacher's
observations and rendered as markdown.

A field's entries are **one markdown bullet each**:

```markdown
**Meals**
- 11:40 Lunch – Cottage Pie (None)
- 11:06 AM Snack – Fresh Peaches (None)
```

The label may be written `**Meals**` or `**Meals:**` — both parse. Bullets
may use `-` with any following whitespace. (Legacy prose form — all entries
on one line, period-separated — still parses, but don't write new files that
way.)

### Recognised labels

Case-insensitive. **An unrecognised label is not an error — it becomes free
text.** That is the single most likely way to break this file, so the task
should emit only these:

| label | becomes | shape of each bullet |
|---|---|---|
| `Arrival & departure` | `signedIn`, `signedOut`, `expectedPickup` | see below |
| `Meals` | `meals[]` | `HH:MM <Type> – <Dish> (<Portion>)[, <Dish> (<Portion>)]` |
| `Nappy changes` (or `Nappy`) | `nappy[]` | `HH:MM: <Wet\|BM\|Wet&BM>[ (Cream)]` |
| `Sleep` | `sleep[]` | `HH:MM – HH:MM: <free text>` |
| `Activity` | `activity[]` | free text |
| `Note` | `notes[]` | free text; `**Note (16:19)**` prefixes the time |
| `Health` | `other[]` | free text |
| `Observation (<Name>, <HH:MM>)` | observations markdown | free text, bold header kept |

### `Arrival & departure`

```markdown
**Arrival & departure**
- Signed into Baby Room: 10:59
- Signed out of Baby Room: 15:26
- Expected pick up – 15:45: Arlo-Minh will be picked up by Linh
```

- Keep the phrases `Signed into`, `Signed out of`, `Expected pick up`. The
  parser matches the phrase and then takes the **first `HH:MM` on that line**.
- The **room name is free** — `Baby Room`, `Toddler Room`, anything. Don't
  build it into the task as a constant either.
- The separator before the time (`:`, `–`, `-`, or plain space) doesn't matter.
- For pickup, a trailing `by <Name>` anywhere on the line is captured and
  shown; without it, just the time is shown.
- Times must be 24-hour `HH:MM`. `3:45pm` will not parse.

### `Meals`

```markdown
- 11:35 Lunch – Salmon Pasta Bake With Sweetcorn (All), Blueberry and Banana Cake (All)
```

- `HH:MM`, then the meal type, then **an en-dash or hyphen**, then the dishes.
- Multiple dishes are comma-separated and **each carries its own portion in
  brackets**. The bracket is what separates dishes, not the comma — so a dish
  name may contain commas (`... with Sweet Potato Mash, Peas, Sweetcorn and
  Tomato Sauce (All)`) and still parses as one dish. **Always emit the
  portion**, or the dish gets no portion badge.
- Write the dish as the menu words it. Don't abbreviate or translate — the
  icon table keys off words like `salmon`, `chicken`, `pasta`, `yoghurt`.

### `Nappy changes`

```markdown
- 14:46: Wet
- 11:20: Wet&BM
- 09:30: Wet (Cream)
```

Use `Wet`, `BM`, `Wet&BM`. Add `(Cream)` when barrier cream was applied.

## 4. Vocabulary the app maps to emoji

Write these words and the icons follow. Anything unknown still renders — with
a neutral icon and the text intact — so an unrecognised dish is cosmetic, not
a failure.

**Meal type** (first match wins, so `Tea Pudding` is pudding, not tea):
`Breakfast` 🥣 · any `Snack` 🍎 · `Lunch` 🍽️ · `Pudding` 🍮 · `Tea` 🫖 ·
`Bottle` 🍼 · anything else 🍽️

**Portion** — use exactly these words:
`All` / `All+` / `Most` 🟢 · `Half` 🟡 · `Little` / `Some` 🟠 · `None` ⚪️ ·
anything else shows the word with no dot

**Nappy:** `Wet` 💧 · `BM` 💩 · `Wet&BM` 💧💩 · `(Cream)` adds 🧴

**Dish** — keyword match in priority order, so the dish's *form* wins over its
ingredients (a "Blueberry and Banana Cake" is 🧁, not 🫐) and its protein wins
over its staple ("Salmon Pasta Bake" is 🐟, not 🍝):

1. form — custard 🍮, yoghurt 🍨, cake/tray bake/muffin 🧁, scone 🥯, soup 🍲, pie 🥧, sandwich 🥪, cracker 🍘, toast 🍞, pitta/bread/naan 🫓, weetabix/porridge/cereal/oats 🥣
2. protein — salmon/fish/tuna/cod 🐟, chicken 🍗, beef/lamb/chilli/pork/mince 🥩, egg 🥚, cheese 🧀, beans 🫘, stir-fry 🥡
3. staple — pasta/spaghetti/lasagne 🍝, noodle 🍜, rice/risotto/couscous 🍚, potato/mash/jacket 🥔
4. fruit — apple 🍎, banana 🍌, melon 🍉, orange 🍊, peach/apricot 🍑, pineapple 🍍, berries 🫐, mango 🥭, pear 🍐, grape 🍇, strawberry 🍓
5. veg — cauliflower/broccoli/courgette/vegetable 🥦, sweetcorn 🌽, peas 🫛, carrot 🥕, tomato 🍅
6. drink — milk 🥛, juice 🧃, water 💧
7. fallback — 🍴

The table lives in `FOOD_ICONS` in `components/ArloNurseryGallery.tsx`. Add to
it there, not here — and not in the data.

**Derived, not written:** time-at-nursery (⏱️) is computed from the two
sign-in/out stamps. Don't write a duration; it would only go stale against
the stamps.

## 5. Canonical example

A complete, conforming day. The task can be pointed at this as its output
template.

```markdown
# Arlo-Minh — Nursery Updates

Bright Horizons — Bank Street Day Nursery And Preschool, Baby Room

### Tuesday, August 11, 2026

**Arrival & departure**
- Signed into Baby Room: 10:59
- Signed out of Baby Room: 15:26
- Expected pick up – 15:45: Arlo-Minh will be picked up by Linh

**Meals**
- 11:06 AM Snack – Fresh Peaches (None)
- 11:40 Lunch – Cottage Pie (None), Fresh Apple (All)
- 13:03 Bottle – Soya Milk (All)

**Nappy changes**
- 10:59: Wet
- 14:46: Wet (Cream)

**Sleep**
- 12:05 – 12:45: Arlo-Minh slept for 40 minutes

**Activity**
- ZooLab Rainforest Animal Experience, 14:00 – 15:30

**Note (16:19)**
- Please bring more spare socks.

**Health**
- Arlo-Minh was sick — Sick

**Observation (Wendy A, 14:04)**
Arlo explored the water tray this morning, pouring between two cups
and laughing each time it splashed.
```

## 6. Checklist for the task

- [ ] One file per month, in `<YYYY>/<M> MonthName>/`, days from that month only
- [ ] Every fact under one of the eight labels in §3 — never invent a label
- [ ] One bullet per entry
- [ ] 24-hour `HH:MM` everywhere
- [ ] Every dish carries a bracketed portion, from the fixed word list
- [ ] Dish names as written on the menu, not abbreviated
- [ ] No emoji anywhere in the file
- [ ] No durations, totals or counts the app can derive itself
- [ ] Teacher observations left as prose under their `**Observation (...)**` header
