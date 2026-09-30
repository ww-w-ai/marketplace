---
name: ww-w-slide-gen
description: Build a presentation as editable HTML slides. Use for any deck, slides, pitch/IR deck, company intro, proposal, lecture or report deck — 발표자료·장표·슬라이드·IR덱·소개서·제안서·강의자료 — even when no tool is named. Not for editing .pptx/.key files or Google Slides.
---

# ww-w Slide Gen

**One slide = one claim. Every word on a slide stays editable HTML — generated images carry art only, never text.**

Build a deck from the template that ships with this skill: copy it, brand it, write the story, build one self-contained `deck.html`, and check every slide before you hand it over.

## Paths

- Template root = two directories above this skill's base directory (`<skill base>/../..`). It holds `scripts/`, `html/`, `docs/`, `templates/`.
- Deck root = the new folder you create in step 2. Every later command uses absolute paths into the deck root.

## Steps

Track each step as a todo. Mark it done only when its gate is visibly met. If a gate fails, stop and fix it; do not move on.

### 1. Brief

Read everything the user handed over (documents, notes, links, screenshots). Settle:

- purpose and audience (who decides what after seeing this deck)
- slide count and order, one claim per slide
- language of the slide content (the user's language unless told otherwise)
- brand: name, footer line, colors, typeface, logo if any
- evidence: which slides need real screenshots or numbers, and where they come from

Ask only what you cannot infer. Numbers and quotes on a slide must come from a source you can name; mark anything unverified and tell the user.

**Gate:** a numbered outline — `NN · claim · evidence · layout` — shown to the user.

### 2. Create the deck

```
node <template root>/scripts/new-deck.js <absolute destination folder>
```

Use the folder the user named. Otherwise create it next to the user's other work with a short name (e.g. `acme-intro`). The script refuses a non-empty folder; pick another name rather than clearing a folder.

**Gate:** the script printed JSON and `<deck root>/deck.config.json` exists.

### 3. Brand

- `deck.config.json`: `deckTitle`, `footerBrand`, `exportFilename`, `uiLang` (keep `storageKey` as the script set it).
- Colors, type, spacing: edit tokens in `html/theme.css` only. Follow `docs/css-customization.md`; for a brand without a system yet, fill the steps in `docs/design-system-guide.md` first.
- Do not hard-code colors inside page files; add or reuse tokens.

**Gate:** `theme.css` tokens reflect the brand and no page file contains a raw brand hex value.

### 4. Write the slides

For each outline row:

```
if a sample page in html/pages/ already has the needed layout (cover, 3-column content,
   screenshot evidence, process, comparison, artwork+text)
    copy it to html/pages/NN-<slug>.html and replace the content
else
    start from templates/blank-slide.html and add page styles to html/pages.css
register the file in deck.config.json "slides" in outline order
```

Write the title as the conclusion, the lead as the reason, the body as evidence. Keep every `id` unique. Remove sample pages you did not use from `slides`.

**Gate:** `slides` in `deck.config.json` matches the outline one-to-one.

### 5. Images (only when a slide needs art)

Follow `docs/image-workflow.md`. Brief each image with `templates/image-brief.md`.

1. Generate the full slide as one image, with the exact copy, inside the design-system frame (header, body, footer zones).
2. Show it to the user. Fix content before going further.
3. Generate it again with the copy removed. Keep text that is part of the artwork (a sign, a label inside an illustration).
4. Place the text-free image as `.art` and rebuild every word as HTML on top (`html/pages/06-artwork.html`). Shrink or move anything that falls outside the design-system zones.

```
if running in Codex         → use the built-in image_gen tool, one call per asset
elif Codex CLI is installed → codex exec --skip-git-repo-check -C <deck root> -s workspace-write "<use built-in image_gen; full prompt; save to assets/backgrounds/<id>.png>"
elif a browser automation tool is available (browser-use, Claude in Chrome)
                            → open chatgpt.com in the user's logged-in browser, send the same prompt, download the image into assets/
else                        → use the image tool the host provides, or ask the user for the images
```

Real product screens are original captures in `assets/screenshots/`, never generated.

**Gate:** every referenced image file exists; check its real pixel size before placing it.

### 6. Build and inspect

```
node <deck root>/scripts/build-deck.js
```

Then open `<deck root>/html/deck.html` in a browser and step through every slide at 16:9. Look for: text overflowing its box, overlaps, leftover sample text, text baked into images, wrong page numbers, broken images. Fix in the page files, rebuild, look again.

**Gate:** the build exits 0 and every slide was looked at after the last rebuild.

### 7. Report

```
Deck:      <deck root>/html/deck.html
Slides:    N  (list: NN · claim)
Keys:      E edit in place · F fullscreen · P print the whole deck to PDF · ? all shortcuts
Unverified: <numbers or quotes still marked unverified, or "none">
Not done:  <anything skipped, e.g. images not generated>
```

## Do not

- Put text inside generated images, or use generated figures as evidence.
- Edit `html/deck.html` by hand — it is rebuilt from the page files.
- Reuse another deck's `storageKey`; saved edits in the browser would mix.
- Reload a deck the user is editing in the browser before their edits are saved to source (see `CUSTOMIZE.md`).

| Thought | Reality |
|---|---|
| "The image tool renders Korean text fine now" | Baked text cannot be edited or corrected later. Keep it in HTML. |
| "I'll check the slides after all of them are done" | Overflow found late forces re-layout of many slides. Build and look as you go. |
| "The sample copy is close enough" | Sample text left in a deck reads as unfinished. Replace or delete it. |
