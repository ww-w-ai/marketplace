# Steps to start a new deck

English | [한국어](CUSTOMIZE.ko.md)

Copy this whole folder to a new path.

## 1. Project setup

In `deck.config.json`, change the following:

- `deckTitle`: the browser title.
- `footerBrand`: the text for every `{{footerBrand}}` slot.
- `storageKey`: a distinct value per project, e.g. `acme-intro-v1`.
- `exportFilename`: the filename downloaded after editing in the browser.
- `output`: the build output filename, `deck.html` by default.
- `slides`: the actual slide order. Each item is either `{"file":"pages/01-cover.html"}` or `{"img":"../assets/full-page.png"}`.
- `stylesheets`: keep the `theme.css → components.css → pages.css` order.
- `uiLang`: `"auto"` (default; Korean when the browser language is Korean, otherwise English), `"en"`, or `"ko"`. Affects the editor UI only, not slide content.

The canvas is fixed at 1920×1080. Adding a canvas value to the JSON does not change the engine resolution.

## 2. Define the design system

Follow the [design system guide](docs/design-system-guide.md) to extract color, typeface, size, spacing, and layout rules from an approved mockup. Edit the [default definition](docs/design-system.md) into your project's definition, then put the same values into `html/theme.css`. The document records the reasoning; the CSS is the source of the values that actually run.

`html/themes/cobalt.css` is included as a working example of changing colors and spacing. To apply a cobalt cover, lime accent, 96px margins, and 12px corners instead of the default yellow and teal, change only the list in the config.

```json
"stylesheets": ["theme.css", "themes/cobalt.css", "components.css", "pages.css"]
```

This approach inherits the base fonts and tokens and overrides only what differs. For a new brand, you can copy this override file or edit `theme.css` directly. The card, table, and image frame positions in the reference sample follow `--page-margin`. The drawing and colors baked into an already-generated background image are not changed by CSS, however.

## 3. Add a slide

Copy `templates/blank-slide.html` to `html/pages/07-new-page.html`. Give the section a unique ID, write the content, then register it in the config's `slides`. The builder fills in `data-idx` and `.s-pagenum` with the actual order.

Source files are HTML fragments. They must start with `<section class="slide …" id="…">`, and sections must not nest. `<style>` blocks are not extracted, so write CSS in `pages.css`. Keep shared class names like `s-title` and the `#track > .slide` contract. To move individual text or images independently, keep them as direct children of the section. Elements inside a card move together as one group.

Image paths are relative to the final `html/` location. Even when the page file lives inside `pages/`, use `../assets/screenshot.png`. Keep the double quotes in `<img src="…">`. The current builder does not support srcset, picture source, or self-contained conversion of video and iframe elements. Put CSS backgrounds in `pages.css` as `url('../assets/art.png')`. Avoid URLs in inline styles.

An image-only slide (`img`) is placed with `.s-bg`, using contain sizing within the 1920×1080 area. It keeps the original aspect ratio, so a mismatched ratio leaves margins. Text baked into an image this way is not editable, so restructure the final slide as `.art` plus HTML text where needed.

## 4. Build and check

```sh
node /absolute/path/my-deck/scripts/build-deck.js
npm --prefix /absolute/path/my-deck test
open /absolute/path/my-deck/html/deck.html      # macOS
start /absolute/path/my-deck/html/deck.html     # Windows
xdg-open /absolute/path/my-deck/html/deck.html  # Linux
```

Images and fonts must still show up when the file is copied to another folder and opened there. Missing assets and external URLs are reported as build failures. Several large images inflate the HTML size, so use copies downscaled for the final purpose.

### Verify in a browser

Open `html/deck.html` in any browser. If the browser blocks `file://` access, serve the folder locally and open it from that address instead.

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory /absolute/path/my-deck
```

Open `http://127.0.0.1:8765/html/deck.html` in your browser. Stop the server with Ctrl+C in that terminal. Do not bind to `0.0.0.0` or serve the whole Documents folder as the server root. This is an optional preview method for environments with Python 3; the HTML build itself does not need Python.

## 5. Browser edits vs. source edits

Download an edited copy with E → double-click text → edit → Esc → Cmd/Ctrl+S. The downloaded HTML is an independent file holding the edit result; it does not automatically modify `html/pages/`. The same applies to order changes made with M.

For a project you will keep building, keep the downloaded copy, apply the changed text, styles, and order back to the original pages/CSS/config, then rebuild. When an agent applies the changes, it should first read the live DOM or the downloaded copy, then diff only the affected slide against the original. Reloading without checking first discards unsaved edits. This template does not include an automatic source reverse-conversion tool.

## 6. Delivery

Deliver `html/deck.html` for static HTML, or the downloaded HTML for a live-edited copy. For a PDF, press **P** to print the whole deck, save as PDF, and check every page. Cmd+P prints only the current slide. Delivering only the generated image output fixes the text into the image, so reconstruct the final text in HTML.
Official workflow: [Compare originals, then create a separate final deck](docs/comparison-workflow.md). Preserve the comparison deck. Run `npm run build:final` to create a published-only clone.
