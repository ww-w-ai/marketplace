# How to write custom CSS

English | [한국어](css-customization.ko.md)

## Where to edit

| What you're changing | File | Example |
|---|---|---|
| Whole brand | `theme.css` | Fonts, colors, font sizes, safe margins |
| Repeated component | `components.css` | Padding and border of every card |
| One slide's layout | `pages.css` | A two-line title on one slide, an image size |
| Copy and order | Page HTML / config | Never generate text with CSS |

The load order is theme → components → pages. The build embeds all three files inside the HTML. Fixed runtime editor UI styles stay owned by the builder, so only style inside `.slide`.

## Example: apply a different brand to the same engine

Edit the corresponding values in `theme.css`.

```css
:root {
  --bg: #ffffff;
  --surface: #f1f4fb;
  --text: #101828;
  --muted: #475467;
  --primary: #1536b8;
  --primary-soft: #eaf0ff;
  --accent: #b6e600;
  --on-accent: #101828;
  --cover-bg: #1536b8;
  --cover-text: #ffffff;
  --radius: 12px;
}
```

This change applies to HTML components. Colors baked into SVGs, photos, or generated-image backgrounds live in the asset itself, so they need to be changed or regenerated separately.

`html/themes/cobalt.css` is a runnable example in the same family. Add it after `theme.css` in `deck.config.json` to apply it. Remove it from the list to go back to the original palette. The example also changes margins to 96px, showing how shared titles, footers, cards, and tables move together.

## Example: reuse a card

```css
.card {
  background: var(--surface);
  color: var(--text);
  padding: var(--space-6);
  border-radius: var(--radius);
}
```

Other slides use the same `.card`. Repeating hex colors on each card means the theme swap misses them.

## Example: a two-line title slide

```css
#customer-story .s-title { max-width: 1450px; }
#customer-story .s-lead { top: 318px; }
#customer-story .s-body { top: 414px; }
```

The lead under the default title is positioned assuming a one-line title. When it wraps to two lines, shift the area below it down instead of only shrinking the title size, to resolve the overlap. The builder does not import `<style>` blocks from individual page files.

## Aligning coordinates over an image

If the mockup's actual width is W and height is H, convert the x coordinate with `x * 1920 / W` and the y coordinate with `y * 1080 / H`. For an image with a different aspect ratio, decide on crop or contain first, then adjust the coordinates by the resulting margin or crop. Do not assume the output is necessarily 1920×1080.

```css
#launch .art { object-fit: cover; }
#launch .s-title { left: 80px; top: 180px; width: 1100px; }
```

Keep the reference mockup and the text-removed background stored separately. If covering with a white rectangle would break a pattern or gradient, remove the text with inpainting instead. Titles, body text, badges, and arrow labels are all editable elements.

## Patterns to avoid

```css
/* Rejected: every slide changes, and the theme stops controlling color. */
h1 { color: red !important; font-size: 46px !important; }

/* Accepted: one page owns its layout exception. */
#customer-story .s-title { max-width: 1450px; }
```

The size and transform of `#track` and `#viewport` belong to the engine. Editing them while changing a slide design breaks navigation, editing coordinates, and printing together. Use px coordinates based on 1920×1080, and avoid vw/vh inside a slide. Do not generate text content with `::before { content: ... }`, so the actual text remains selectable for editing, copying, and printing.

## Verification

After changing a theme, view every sample slide. Check long sentences, screenshot-evidence aspect ratios, the footer, and page numbers. Edit a title in E mode and reopen the downloaded copy. Print the full PDF and check the last page and tables, not just the first page. Node tests do not judge rendering.
