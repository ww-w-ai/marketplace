# How to turn a generated image mockup into an editable slide

English | [한국어](image-workflow.ko.md)

1. Fix the claim, body copy, evidence, and layout for each slide first.
2. Feed in the design system and an approved reference slide together, and generate **a full mockup of each page** individually. Finish the design with the exact copy included.
3. Check the actual pixel width and height of the output image and keep the reference mockup in `assets/reference/`. Do not assume the actual size just because you requested 1920×1080.
4. Remove only the title, body, badges, labels, and page number from the mockup. Keep the layout, background, and illustration. Keep the result in `assets/backgrounds/`.
5. Place it as an `.art` image and put HTML text on top at the same position. See `html/pages/06-artwork.html` for an example.
6. For real product screens, add the original capture stored in `assets/screenshots/` as a separate `<img>`. Do not use figures or text altered during generation as evidence.
7. Compare the reference mockup against the final HTML. Check that no leftover text from the generated image duplicates the HTML text, and that every caption is editable.
8. Check the downloaded live-edited copy and the full PDF.

The default image generation uses Codex's built-in `image_gen`. Claude Code dispatches the same work to Codex non-interactively when the Codex CLI is installed, for example:

```sh
codex exec --skip-git-repo-check -C /absolute/path/my-deck -s workspace-write "<instruction: use built-in image_gen, full prompt, target path>"
```

Call it once per asset, then verify the file exists after each call. If Codex is not available, use whatever image tool the host provides. The build itself never calls an image API.

## Per-page brief template

Copy `templates/image-brief.md`. Include the same design rules in every page's brief and swap out only the per-page content and evidence. For a page that needs a real capture, secure the capture first.

## Legacy AI eraser

The original editor's MI-GAN integration code is kept, but the model weights and the ONNX runtime are not bundled. With the default `features.aiEraser=false`, the button is hidden. Regular text editing, image cropping, and solid-color covers still work.

Only for a project that has confirmed permission to use the weights and needs the feature, prepare `html/vendor/ort/ort.wasm.min.js` with its WASM/MJS dependency files and `html/vendor/migan_pipeline_v2.onnx`, then set the flag to true. Include the corresponding license when deploying. Since the built HTML does not include this optional model, new AI-eraser work in a downloaded copy is not guaranteed. Images already erased are stored as data URLs.

## Required comparison and final delivery

Follow [comparison-workflow.md](comparison-workflow.md). Keep original and published slides alternating in the comparison deck. Preserve it. Generate the separate published-only final clone with `npm run build:final`.
