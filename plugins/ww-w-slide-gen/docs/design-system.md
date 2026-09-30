# Default deck design system

English | [한국어](design-system.ko.md)

Authority: editable reference definition. Implementation values live in `html/theme.css`.

## Foundations

Warm white background, dark ink text, deep teal for meaning, yellow for large emphasis. Pretendard is bundled in regular, bold, and black weights. The canvas is 1920×1080 with 72px horizontal margins. Titles use 80px/1.12, body text 32px/1.5, and cover headings 132px. Cards use 24px corners. Space follows 8, 16, 24, 32, 48, and 72px. Artwork sits at z0, content at z1, annotations at z2. Reduced motion disables transitions.

## Components

`.s-title`, `.s-eyebrow`, `.s-lead`, `.s-footer`, `.s-pagenum`, `.card`, `.chip`, `.evidence`, `.art`, `.cover`. Components consume theme tokens. Direct children of `.slide` are independently movable editor objects. Group related elements deliberately.

## Patterns

Cover, three-column content, screenshot evidence, process, comparison table, and image artwork with native text. Examples live in `html/pages/`. Page-only coordinates live in `html/pages.css`.

## Guidelines

One claim per page. Use verified screenshots for evidence. Text remains native HTML except authentic screen content. Preserve screenshot aspect ratio. Avoid tiny captions and decorative labels. Keep baseline spacing consistent. Inspect the longest real copy and the final PDF. The example palette is replaceable; it is not a requirement for every new brand.
