# Chiarline folder + `updates.md` format contract

The days the boys spend with Chiarline (their nanny) come from two sources
that are deliberately different in kind:

| source | what it gives | who decides |
|---|---|---|
| `updates.md` | what she wrote about the boys | **a person**, by reading the chat |
| the WhatsApp export | the photos and videos she sent | automatic |

That split is the design, not an accident. Whether a message reports on the
boys or just arranges the day is a judgement call — "I am happy to drop Milo
off to nursery with Arlo so we can go straight to the playground" mentions
both boys, nursery and a playground, and still says nothing about how they
were. Judgement calls don't belong in a regex, so the picking is done once
and written down. Attributing a photo to whoever sent it and dating it from
its filename *is* mechanical, so that stays automatic and a re-export picks
up new pictures with no curation step.

Read alongside `ARLO-UPDATES-FORMAT.md`, which covers the nursery side.

## 1. `CHIARLINE_DIR` must be the PARENT folder

This has broken twice, so it goes first.

```
CHIARLINE_DIR=.../Photos/Chiarline - Milo - Arlo        <- the parent
├── Milo & Arlo updates/                                 <- curated set
│   ├── updates.md
│   ├── 2026-05-18_00000887-PHOTO-2026-05-18-11-48-18.jpg   (kept photos)
│   └── archive/                                         (rejected - ignored)
└── 2026-09-16 WhatsApp Chat - Chiarline - Milo - Arlo/   <- raw export
    ├── _chat.txt                                        (REQUIRED)
    ├── 00000103-VIDEO-2025-01-20-16-58-04.mp4
    └── not relevant/                                    (rejected - ignored)
```

Point `CHIARLINE_DIR` at the **folder that contains both**, never at the
updates folder itself. Pointing it at `Milo & Arlo updates/` produces the
most confusing possible symptom: **notes appear and photos silently don't.**
`updates.md` is in there, so the notes parse fine — but `_chat.txt` isn't,
and without the chat log nothing can be attributed to Chiarline, so every
photo is discarded as unprovable. Notes-but-no-photos is the signature of a
`CHIARLINE_DIR` that can't see `_chat.txt`.

**The scan is one level deep and never recursive, and that is load-bearing.**
`archive/` and `not relevant/` hold the pictures that were reviewed and
rejected; not recursing is exactly what keeps them off the page. Two
consequences: nesting kept photos deeper (`Milo & Arlo updates/2026/…`)
makes them vanish, and flattening a rejects folder up a level puts the
rejects back on the page.

Within that, the layout is free. `updates.md` is found at the parent or in
any immediate subfolder; media is found in any of them; `_chat.txt` is found
wherever it is, and several exports can coexist — their sender maps merge.

## 2. Renaming media: keep the original export name

The task renames kept photos with a `YYYY-MM-DD_` prefix so they sort by day
in Finder. That's fine, and supported — but only because the original name
survives underneath:

```
2026-05-18_00000887-PHOTO-2026-05-18-11-48-18.jpg
^^^^^^^^^^^ prefix, cosmetic    ^^^^^^^^^^^^^^^^^^ what _chat.txt calls it
```

`_chat.txt` records attachments under the names WhatsApp exported, and that
lookup is the *only* thing distinguishing Chiarline's photos from the ones
Linh and Timm sent into the same group. So the rule is: **stripping a
leading `YYYY-MM-DD_` must recover the export name byte for byte.** When
that broke, 0 of 149 photos were attributable and the page went blank with
no error.

Corollaries: don't renumber, don't re-encode, don't drop the `-PHOTO-`
segment, and never delete `_chat.txt` — it is not a leftover, it's the
provenance record. Videos are currently left unrenamed, which is fine; the
prefix is optional, not required.

Filenames the reader accepts:

```
[YYYY-MM-DD_]<id>-PHOTO-YYYY-MM-DD-HH-MM-SS.jpg
             <id>-VIDEO-YYYY-MM-DD-HH-MM-SS.mp4
```

The **embedded** timestamp dates the item, not the prefix — the prefix is
the task's convenience, the embedded one is WhatsApp's own record. A
negative `<id>` is tolerated (the export numbers a few of the oldest items
that way). Anything else is ignored without comment.

Only media whose sender in `_chat.txt` starts with `Chiarline` is shown, and
the group's own name (`Chiarline - Milo - Arlo`, which appears as a "sender"
for system messages) is excluded. Nothing before **2026-05-01** is shown at
all — that's the current arrangement's start, applied to photos and notes
alike.

## 3. `updates.md` grammar

### Preamble

Everything before the first day heading is ignored. Keep orienting notes for
human readers there.

### Day heading

```markdown
### Monday, May 18, 2026
```

`### <Weekday>, <Month> <D>, <YYYY>`, matching the nursery file. `##` also
works, as does the older `## 2026-05-18` ISO form. Month may be full or
three-letter. Nothing else on the line.

### Notes

```markdown
**11:48** Finally asleep

**10:56** Super proud of this little boy
He did so well.
He was a little overwhelmed the first 2 minutes and then he enjoyed the whole class
```

`**HH:MM** ` then her words. Continuation lines belong to the note above
until the next note, the next heading, or a `**Photos:**` line — she often
writes one thought per line, and those breaks are preserved on the page.
Times are 24-hour and get zero-padded. Quote her verbatim; don't tidy her
wording or strip her emoji.

### `**Photos:**`

```markdown
**Photos:** 13 (00000887–00000903) — first day picking Milo up from nursery
```

**Skipped entirely, and it also ends the current note.** The count and the
id range are both derivable from the files, and the line isn't something she
said, so rendering it inside her message would be wrong. Harmless to keep
for human readers — it's a useful cross-check that the task and the files
agree — but nothing reads it.

Note the trailing caption after the dash is **currently dropped**. If those
captions are worth showing, that needs a field on `ChiarlineDay` and a line
in `CareTimeline.tsx`; it is not a format problem.

Lines starting with `<!--` are skipped.

## 4. Curation: what to keep out

`updates.md` keeps messages that **say something about the boys**. Excluded:

- **Reactions to something Linh sent** — "Ooohhh perfect!!!! He loves that
  game!!", a bare "🤯". These are about the message, not the day.
- **Arranging hours, pickups, permissions** — "Shall I let him sleep for 2
  hours?", "Hi! Milo would like to open this one, is that okay?" — unless
  the message also records what actually happened, in which case keep it.
- Anything before 2026-05-01 (the reader drops it anyway).

Keep: what they ate, how they slept, what they played, how they seemed,
milestones, anything a parent would want to remember.

### The regeneration hazard

Hand-curation lives in the same file the task rewrites, so **every removal
is undone the next time the task regenerates `updates.md`.** Two ways out,
neither free:

1. Put the exclusion rules above into the task's prompt, so it never writes
   those entries in the first place. Cheap, but relies on the task's
   judgement matching yours each run.
2. Move the curation into a file the task never touches — a list of
   `date + time` entries to drop, applied at parse time. Survives
   regeneration by construction; costs a small parser change.

Until one of those exists, treat any by-hand edit to `updates.md` as
temporary.

## 5. Checklist

- [ ] `CHIARLINE_DIR` is the parent folder, and `_chat.txt` is reachable below it
- [ ] `_chat.txt` kept, never deleted or edited
- [ ] Renamed photos still end with their exact original export name
- [ ] Kept photos one level deep; rejects in a nested `archive/` or `not relevant/`
- [ ] Day headings `### Weekday, Month D, YYYY`
- [ ] One `**HH:MM**` per message, her wording verbatim, 24-hour times
- [ ] No emoji added by the task, and no derived counts other than `**Photos:**`
- [ ] Reactions and arranging messages left out (§4)

## 6. Symptom → cause

| what you see | almost always means |
|---|---|
| notes but no photos | `CHIARLINE_DIR` can't see `_chat.txt` (§1) |
| no photos at all, notes fine | media renamed so `_chat.txt` lookup fails (§2) |
| nothing at all | `updates.md` not found, or day headings in an unrecognised shape |
| rejected photos reappear | a rejects folder got flattened up a level (§1) |
| a photo-count line inside her message | `**Photos:**` written mid-note rather than on its own line |
| photos older than May 2026 missing | the 2026-05-01 cutoff, working as intended |

None of these raise an error. An empty page is the failure mode, which is
why this file exists.
