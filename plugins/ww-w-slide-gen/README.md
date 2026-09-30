# ww-w Slide Gen

English | [한국어](README.ko.md)

**Tell Claude or Codex what your deck has to say, and get back one `deck.html` you can present,
edit in place and print to PDF: one claim per slide, your brand as design tokens, generated art
with every word kept as editable HTML.** ww-w Slide Gen is a Claude Code and Codex plugin plus the
slide engine it builds on. The engine has zero npm dependencies, builds a 6-slide sample in 0.06 s
on Node 20, and packs fonts and images into a single self-contained HTML file.

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
5. generates art only where a slide needs it, with no text baked in;
6. builds `deck.html`, looks at every slide, fixes and rebuilds;
7. reports the deck path, the slide list, and anything still unverified.

The steps and their gates are in [`skills/ww-w-slide-gen/SKILL.md`](skills/ww-w-slide-gen/SKILL.md).

## Why

We make our own pitch, product and proposal decks, and hit the same three problems every time:

1. **Generated slides can't be edited.** An image model draws a good-looking slide, but the text is
   pixels. Fixing one typo means generating the slide again.
2. **Every deck restarts the design.** Colors, margins and title sizes drift from deck to deck
   because nothing carries them over.
3. **Editing tools lock the file.** The deck lives in an app, not in files an agent can read,
   diff and rebuild.

So we built the engine around plain files: slides are HTML pages, the brand is CSS tokens, and the
build turns them into one HTML file you can open anywhere.

## Key features

1. [Art and text stay separate](#1-art-and-text-stay-separate): images carry the picture, HTML carries every word.
2. [Your brand is a set of tokens](#2-your-brand-is-a-set-of-tokens): change one file, every slide follows.
3. [Edit in the browser](#3-edit-in-the-browser): text, position, size, page order, without opening an app.
4. [One file out](#4-one-file-out): fonts and images packed in; present, share or print to PDF.
5. [English and Korean editor](#5-english-and-korean-editor): the editor follows the browser language.

### 1. Art and text stay separate

The skill designs a full page, generates the mockup, keeps the art, removes its text, and places
editable HTML on top at the same position. Real product screens are original captures, never
generated. In Codex it uses the built-in `image_gen`; in Claude Code it hands the same job to the
Codex CLI when installed, or to any image tool you have. The build itself never calls an image API.
([`docs/image-workflow.md`](docs/image-workflow.md), sample: [`html/pages/06-artwork.html`](html/pages/06-artwork.html))

### 2. Your brand is a set of tokens

Colors, type, spacing and surfaces live in [`html/theme.css`](html/theme.css). Components and page
layouts only read tokens. Add [`html/themes/cobalt.css`](html/themes/cobalt.css) after `theme.css`
to see a second direction on the same slides. To define a brand from scratch, follow the
[design-system guide](docs/design-system-guide.md).

### 3. Edit in the browser

Open the deck and press **E**: click any text to edit it, drag to move, pull a corner to resize,
**G** to group, **D** to duplicate, **L** for layout guides, **X** to cover a leftover with a solid
patch. **M** reorders pages. Edits save in the browser under the deck's own `storageKey`, so two
decks never mix. Press **?** for the full list.

### 4. One file out

[`scripts/build-deck.js`](scripts/build-deck.js) reads `deck.config.json`, inlines every stylesheet,
font and image as data URLs, and writes `html/deck.html`. The tests check that the output has no
external stylesheet or image reference and that a copied folder builds without the original paths
([`tests/build.test.js`](tests/build.test.js)). Print from the browser for a PDF.

### 5. English and Korean editor

The editor's 65 UI strings live in one table with English and Korean entries. `"uiLang": "auto"`
shows Korean when the browser language is Korean and English otherwise; set `"en"` or `"ko"` to fix
it. A test fails if the two tables drift apart ([`tests/i18n.test.js`](tests/i18n.test.js)).

## Also in the box

- **Six sample layouts**: cover, three-column content, screenshot evidence, process, comparison,
  artwork with editable text ([`html/pages/`](html/pages/)).
- **Reference-vs-published review**: build a deck that alternates the generated mockup with the
  HTML version, then a clean final deck with `npm run build:final`
  ([`docs/comparison-workflow.md`](docs/comparison-workflow.md)).
- **Image brief template** for consistent generation across pages
  ([`templates/image-brief.md`](templates/image-brief.md)).

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
