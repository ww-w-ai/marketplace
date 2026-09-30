# ww-w Slide Gen

English | [한국어](README.ko.md)

**Image models now design better slides than most templates, but every word they draw is pixels.
You can't fix a typo, swap a number or change a font. ww-w Slide Gen keeps the model's design and
rebuilds every word as editable HTML on top of it.** The result is one `deck.html` you can present
(**F**), edit in place (**E**) and print to PDF (**P**); press **?** for every shortcut. It ships as a
Claude Code and Codex plugin together with the slide engine it drives. The engine has zero npm
dependencies, builds the 6-slide sample in 0.06 s (Node 24, Apple M2), and packs fonts and images
into that single HTML file.

## How a slide is made

The skill runs the same five steps for every slide that needs art:

1. **Fix the frame.** A design system sets the header, footer and body zones, so every slide lines
   up with the others.
2. **Generate the whole slide as one image.** Codex (or ChatGPT, see [Images](#images)) draws the
   finished slide with the real copy, so the composition is built around the actual words.
3. **You check the content.** Wording and structure are cheap to fix while the slide is still one
   picture.
4. **Generate it again without the copy.** Only the slide text is removed. Text that is part of the
   artwork, such as a label on a drawn device, stays.
5. **Claude rebuilds the text in HTML** at the same positions, then shrinks or moves anything that
   falls outside the design-system zones.

## Why the slides come out well

- **Each tool does the part it is good at.** The image model handles composition, color,
  illustration and mood. HTML handles exact letters, brand fonts, Korean typography and editing.
- **The model designs with the real copy.** Layout is sized around your words, not placeholder text,
  so nothing has to be squeezed in afterwards.
- **The frame keeps a 30-slide deck consistent.** Titles, margins and footers are re-snapped to the
  design system in step 5, so drift between generated images is corrected before the final deck.
- **Evidence stays real.** Product screens are original captures placed as images, never generated.
- **Every word stays fixable.** A typo found five minutes before the meeting is one click in the
  browser, not another generation.

## Why we built it

We make our own pitch, product and proposal decks, and hit the same three problems every time:

1. **Generated slides look good but can't be edited.** Fixing one word means generating the slide
   again, and the new version rarely matches the old one.
2. **Every deck restarts the design.** Colors, margins and title sizes drift from deck to deck
   because nothing carries them over.
3. **Slide apps lock the deck away from the agent.** Claude and Codex work best with plain files
   they can read, diff and rebuild.

So we built the engine around plain files: slides are HTML pages, the brand is CSS tokens, generated
images carry only the art, and the build turns it all into one HTML file you can open anywhere.

| | Image-only slides | Slide apps (PowerPoint, Google Slides) | ww-w Slide Gen |
|---|---|---|---|
| Design | Generated per slide | Template | Generated, snapped to your design system |
| Fix a typo | Generate again | Edit | Edit in the browser (**E**) |
| Brand kept across decks | No | Per template | CSS tokens in one file |
| Agent can read and diff it | No | Binary or API | Plain HTML and CSS |
| Output | Images | App file | One self-contained `deck.html`, PDF with **P** |

## Use

Install it first ([Install](#install)). Then ask for a deck in plain words:

```
Make a 10-slide pitch deck from these notes. Brand: Acme, navy and orange.
```

The skill (`/ww-w-slide-gen`) also starts on requests like "IR 덱 만들어줘" or "turn this proposal
into a company intro". It then:

1. writes a numbered outline — one claim, its evidence and a layout per slide — and shows it to you;
2. creates a new deck folder from the template ([`scripts/new-deck.js`](scripts/new-deck.js));
3. sets your brand in `deck.config.json` and `html/theme.css`;
4. writes each slide as an HTML page, starting from the six sample layouts;
5. runs the five image steps above for slides that need art;
6. builds `deck.html`, looks at every slide, fixes and rebuilds;
7. reports the deck path, the slide list, and anything still unverified.

The steps and their gates are in [`skills/ww-w-slide-gen/SKILL.md`](skills/ww-w-slide-gen/SKILL.md).

## Keys

Open `html/deck.html` in a desktop browser.

| Key | Action |
|---|---|
| ← → · Space · PgUp/PgDn | Previous / next slide |
| 0-9 then Enter | Jump to a slide |
| Home / End | First / last slide |
| **F** | Fullscreen |
| **P** | Print the whole deck, one page per slide and animation step (save as PDF) |
| **E** | Edit mode: click to select, drag to move, pull a corner to resize, double-click text to edit |
| **D** · **G** · Del (in edit mode) | Duplicate · group or ungroup · delete |
| **X** (in edit mode) | Cover a leftover with a solid patch |
| ⌘Z · ⇧⌘Z | Undo · redo |
| **M** | Reorder slides (← → move, Enter apply, Esc cancel) |
| **L** | Layout guides |
| ⌘S | Download the edited deck as one self-contained HTML file |
| **?** | Show all shortcuts |

Edits are saved in the browser under the deck's own `storageKey`, so two decks never mix.
Cmd+P prints only the current slide; use **P** for the full deck.

## How it is built

- **Slides** are plain HTML sections on a fixed 1920×1080 canvas, scaled to the window
  ([`html/pages/`](html/pages/)).
- **Brand** is CSS custom properties in [`html/theme.css`](html/theme.css). Components and layouts
  read only tokens. Add [`html/themes/cobalt.css`](html/themes/cobalt.css) after it to see a second
  direction on the same slides; the [design-system guide](docs/design-system-guide.md) defines a
  brand from scratch.
- **Build** is one Node script, [`scripts/build-deck.js`](scripts/build-deck.js). It reads
  `deck.config.json`, inlines every stylesheet, font and image as data URLs, and writes
  `html/deck.html`. Tests check that the output has no external stylesheet or image reference and
  that a copied folder builds without the original paths ([`tests/build.test.js`](tests/build.test.js)).
- **Editor** is plain JavaScript inside the built file. No server, no account.
- **Print** uses a 16:9 `@page`; **P** lays out every slide and every animation step as its own
  page before opening the print dialog.
- **Editor language**: 71 UI strings in one English and Korean table. `"uiLang": "auto"` shows Korean
  when the browser language is Korean and English otherwise. Tests fail if the two tables drift apart
  or a help label skips the table ([`tests/i18n.test.js`](tests/i18n.test.js)).

### Images

The build never calls an image API. The skill picks the first tool that is available:

1. **Codex** — the built-in `image_gen`, one call per asset.
2. **Codex CLI from Claude Code** — `codex exec` hands the same job to Codex non-interactively.
3. **ChatGPT in your browser** — with no Codex, a browser automation tool (browser-use, Claude in
   Chrome) opens chatgpt.com in your logged-in session, sends the same prompt, and saves the image
   into `assets/`.
4. **Any image tool the host provides**, or images you supply.

Details and the per-page brief: [`docs/image-workflow.md`](docs/image-workflow.md) ·
[`templates/image-brief.md`](templates/image-brief.md) · sample slide
[`html/pages/06-artwork.html`](html/pages/06-artwork.html).

## Also in the box

- **Six sample layouts**: cover, three-column content, screenshot evidence, process, comparison,
  artwork with editable text ([`html/pages/`](html/pages/)).
- **Reference-vs-published review**: build a deck that alternates the generated mockup with the
  HTML version, then a clean final deck with `npm run build:final`
  ([`docs/comparison-workflow.md`](docs/comparison-workflow.md)).

## Install

Requires Node.js 20 or later. No `npm install` step.

**As a Claude Code plugin:**

```
/plugin marketplace add ww-w-ai/marketplace
/plugin install ww-w-slide-gen@ww-w-ai
```

**As a Codex plugin:**

```bash
codex plugin marketplace add ww-w-ai/marketplace
codex plugin add ww-w-slide-gen@ww-w-ai
```

To update, run `codex plugin marketplace upgrade ww-w-ai`, then the same `add` command again.

**As a template, without an agent:**

```bash
git clone https://github.com/ww-w-ai/ww-w-slide-gen /tmp/ww-w-slide-gen
node /tmp/ww-w-slide-gen/scripts/new-deck.js /absolute/path/my-deck
node /absolute/path/my-deck/scripts/build-deck.js
```

Open `/absolute/path/my-deck/html/deck.html` in a desktop browser (macOS `open`, Windows `start`,
Linux `xdg-open`). Then follow [CUSTOMIZE.md](CUSTOMIZE.md) to set the title, footer, brand and
page order.

| Edit | Purpose |
|---|---|
| `deck.config.json` | Title, footer, export filename, page order, `storageKey`, `uiLang` |
| `html/theme.css` | Brand colors, typography, spacing, surfaces |
| `html/components.css` | Shared title, card, screenshot and footer components |
| `html/pages.css` | Page-specific layouts |
| `html/pages/*.html` | Slide content |
| `templates/blank-slide.html` | Starting point for a new page |
| `assets/` | Fonts, screenshots, text-free artwork |

## Credits

The engine started as the slide deck for [ww-w-ai/ax-lecture](https://github.com/ww-w-ai/ax-lecture).
Pretendard is bundled under the SIL Open Font License; see
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

Built by [DubDubDub Corp.](https://ww-w.ai) · Code (scripts, CSS, HTML) under [MIT](LICENSE),
documentation prose under [CC BY 4.0](LICENSE-CONTENT.md).
