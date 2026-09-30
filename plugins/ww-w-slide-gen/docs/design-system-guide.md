# How to define a deck design system

English | [한국어](design-system-guide.ko.md)

Authority: a reusable production guide. The default sample's aesthetics are a proposal; a client's approved mockup and brand rules take priority.

## First, decide the reference slides

Use the cover, a text-heavy content slide, and a real-screenshot evidence slide as your reference. Extract the rules that repeat across the three. Do not promote a decoration that appears on only one slide into a shared rule. First write the direction in one sentence, for example: "Warm bright background, dark ink text, a yellow emphasis area, and a teal accent, describing a clear operational flow."

## 1. Foundations: fill in the values

| Decision | Default sample | Criterion for changing it |
|---|---|---|
| Base background / surface | `#FFFEFA` / `#F8F5EB` | How cool or warm the brand is |
| Body / secondary text | `#151208` / `#5A5340` | A lightness difference that still reads when scaled down |
| Key accent / emphasis area | `#005E57` / `#FFDC3D` | Accent colors whose roles do not overlap |
| Font | Pretendard 400/700/900 | Korean and numeral legibility, license that includes local use |
| Cover / title / subtitle | 132 / 80 / 44px | Test with the longest real sentence |
| Body / secondary / label | 32 / 24 / 22px | Sizes still legible when the 16:9 screen is scaled down |
| Canvas / safe margin | 1920×1080 / 72px | Keep this engine's fixed canvas |
| Body start / bottom clearance | y290 / 150px | Prevent title/body/footer collisions |
| Spacing | 8 / 16 / 24 / 32 / 48 / 72px | Wider between groups than within a group |
| Corner radius / shadow | 24px / `0 18px 48px #15120812` | Same texture across evidence images and cards |
| Layers | art 0 / content 1 / note 2 | Keep text above artwork |
| Motion | Engine transitions only, removed under reduced-motion | The static output must always be complete |
| Icons | Simple linear, inherit text color | No mixing styles across slides |

Name colors by role first. `--accent` over `--yellow`, `--primary` over `--dark-green` — this is better for brand swaps. Convert the color space to OKLCH if needed, but do not convert the current hex values to approximations without a reason. The contrast target is 4.5:1 for small text and 3:1 for large titles. Do not use a bright decorative color as a small body-text color.

Do not reflow inside a slide the way an app does. The whole canvas scales down to fit the screen. If it looks too small on a phone, design a separate reading-format handout.

## 2. Components: define the repeating grammar

| Component | Composition / role | Default rule |
|---|---|---|
| TitleBlock | eyebrow + title + lead | One claim per slide; adjust lead position for a two-line title |
| Card | ordinal + heading + body | Same height and inner padding on the same page |
| Evidence | Real capture + caption | Preserve image aspect ratio, never alter figures |
| Process | Step cards + connecting lines + feedback note | Explain order and direction in words too |
| Comparison | Criteria + options for the same item | Unify the measurement basis across columns |
| ArtLayer | Text-free artwork + separate text | Remove any title/label baked into the artwork |
| Footer | Brand + page number | The builder fills in the number automatically |

For each component, record "when to use it, which tokens it uses, the maximum amount of content, and its variants." Start the cover with the cover variant and the body with only the default variant. There is no need to add app-style hover/loading states to a stateless static card. Editing, selection, and print states belong to the existing engine.

## 3. Patterns: define the slide types

Cover → key claim, three-column body → parallel reasons, evidence → real screen and commentary, process → step-by-step change, comparison → differences on the same basis, art → a strong visual message. Do not force a page that needs to show a table into a card layout. Rather than making every page the same layout, keep the title, spacing, and color roles the same.

## 4. Guidelines: record production judgment

The title is the conclusion, the body is the reasoning, and the caption is the source or necessary context. Do not add unrequested badges, English labels, or decorative source lines. Do not replace a real screen with a generated image. Separate the original data from the explanatory sentence, and do not fabricate unverified figures.

Compare the mockup and the final HTML at the same size. Check for clipping with a long title, a long company name, and long table cells. Adjust font size only after shortening the text or changing the layout. Fixing this with per-page `!important` overrides breaks the shared rules.

## From document to code

Record the decisions and the reasoning in `docs/design-system.md`, and put the values into `html/theme.css`. `components.css` references role-based tokens. Put coordinate exceptions under a page ID in `pages.css`. Real examples and anti-patterns live in the [CSS guide](css-customization.md).

Review brand changes in this order: cover → body → evidence → remaining pages. Changing HTML colors does not change the colors baked into already-generated artwork, so also re-review image prompts and background assets for the new brand.
