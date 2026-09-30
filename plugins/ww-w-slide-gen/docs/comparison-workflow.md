# Compare originals, then create a final deck

English | [한국어](comparison-workflow.ko.md)

Authority: production procedure. The original design is made by image generation, and the publisher reproduces the approved composition.

1. Preserve the original images and the original captures.
2. Remove only the text from complex artwork and place editable text over it in HTML/CSS. Build solid-color areas with CSS.
3. Register the pair in `comparison.config.json` with **odd: reference, even: published**, under the same `pair`.
4. Build the comparison deck with `npm run build:compare`. Alternate between the two at the same viewport to compare placement, typeface, color, spacing, and line breaks.
5. Edit only the published slide. Do not scale text non-uniformly. Each annotation line must start from the actual element it describes.
6. Apply live edits back to the source, then run `npm run build:final`.
7. The command clones the comparison config into a separate `final.config.json` and excludes the reference-slide entries **only in the clone**. It builds independent HTML with the existing builder. It does not delete the comparison config, the reference slides, or the reference assets.
8. Confirm the final deck has no reference slides and that order, editing, saving, and printing work normally. Passing comparison does not by itself mean the user has approved the deck.

The final HTML is an independent snapshot that includes its assets. The source HTML/CSS is shared, so a later rebuild picks up the latest edits. To preserve manual edits made in the final deck, move them back to the source before rebuilding.

## Configuration

Copy `templates/comparison.config.json` to the project root and change it to the actual page, style, and brand paths. The template's paths are examples and do not create pages automatically.

```json
{"file":"pages/reference-01.html","role":"reference","pair":"cover"}
{"file":"pages/published-01.html","role":"published","pair":"cover"}
```

Keep the `final` output filename, download filename, and edit-save key different from the comparison deck's. Do not edit the generated `final.config.json` directly. Generating the final deck does not automatically perform design approval or copy changes.
