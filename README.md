# Seriaura

A static personal website. Serve this folder with `python -m http.server 4173` and open `http://localhost:4173`. No build step is required.

## Writing

Your introduction stays in `index.html`, inside `#intro-copy`. It is never copied into the later sections.

The two later reading areas are independent HTML fields near the top of `content.js`:

```js
continuationCopy: [
  `<p>Your first paragraph under Listening to the world.</p>
   <p>Your next paragraph.</p>`,
  `<p>Your writing under For all the little things.</p>`
],
```

The first entry appears under “Listening to the world.”; the second under “For all the little things.” They start empty. Replace each empty pair of quotes with your HTML inside backticks, keeping the comma between entries. Each `<p>...</p>` makes a paragraph. Use `<em>...</em>` for italics, `<strong>...</strong>` for bold, `<a href="https://example.com">link text</a>` for links, or `<ul><li>First item</li><li>Second item</li></ul>` for a list. Save `content.js` and refresh the page to preview. The existing curved text wrapping remains. Other collections can have their own `continuationCopy` array. Their headings and opening paragraphs are under `collections`.

`assets/text-art.txt` contains the small words on the ribbon itself, separately from all body copy.

## Footnotes

Add an empty `<sup>` after the words you want to annotate:

```html
<p>A sentence worth a little more explanation<sup data-footnote="Your extra explanation goes here."></sup>.</p>
```

`footnotes.js` numbers the notes automatically in reading order. Hover over a number to read its note in a small box; you can move the pointer onto the box to keep reading. Keyboard focus also opens it, and Escape closes it. On a touchscreen, tap the number to open the box and tap again or elsewhere to close it. There is no footnotes section at the bottom of the page. Existing footnote URLs still lead to the number in the text. A live example is the footnote after “Seriaura” in the introduction; it contains the former parenthetical “Occasionally shortened to Seri.” No other introduction text has moved.

Use this same HTML in `index.html`, either `continuationCopy` field in `content.js`, or any standalone page. Keep the note as plain text inside the attribute; use `&quot;` for double quotes and `&amp;` for an ampersand. Notes update when switching collections, so only the current collection's notes appear. All existing pages load `footnotes.css` and `footnotes.js`; include both when creating another page.

The “Josh-isms” link now opens `josh-isms/index.html`. Add its writing below the heading, where the HTML comment marks the space for content.

## Moving the Polaroids

All 14 supplied photographs are configured in the `polaroids` list in `content.js`. Each entry has a readable `id` and the original filename in its `src`, so it is easy to find a particular picture. The video frame has been removed from the collage.

Every frame belongs to one skewed, overlapping collage on the upper right of the desktop page. The whole collage moves below the introduction on phones and tablets. The desktop canvas is 480 × 1660 design pixels and scales with the page. Frames are absolutely positioned, so moving a photograph does not move the ribbon or writing.

| Field | What to edit |
| --- | --- |
| `gallery` | `opening`, the single collage |
| `x` | Horizontal position as a percentage of the gallery. Increase to move right. |
| `y` | Vertical position as a percentage of the gallery. Increase to move down. |
| `width`, `height` | Outer frame size in design pixels; scaled automatically for the screen |
| `rotation` | Degrees; negative tilts left, positive tilts right |
| `crop` | Image focal point, e.g. `'50% 35%'` keeps more of the upper part visible |
| `cropBox` | `[left, top, width, height]` of the selected rectangle, as percentages of the original image; leave out for ordinary `crop` positioning |
| `layer` | Higher values place a frame above overlapping neighbours; group photos and SIRI LIFE use `2` |
| `alt` | A short description for screen readers |

For example, to move the sunset photo right and down, find `id: 'sunset'` and increase its `x` and `y`. To show more sky, add `crop: '50% 25%'`.

To move the whole desktop collage, edit `.scrapbook` in `style.css`. Its default position is `left: 71.35%; top: 0` with `width: 25%`. `.polaroids` defines the canvas height; smaller-screen scaling is in `mediaqueries.css`.

The group photos use larger frames with crops that retain everyone. SIRI LIFE uses a 300 × 234 frame focused on the sheet. Dune is cropped to the tabletop to exclude feet. These are display crops; the source photographs are untouched. When changing frame sizes with `cropBox`, keep the inner image area's proportions close to the selected crop. The frame has 12px top/side borders and a 43px bottom border in design units.

## Media

Optimised, orientation-correct WebP copies are in `assets/photos`; originals are untouched. `python tools/prepare-photos.py S:/Downloads` recreates them with Pillow installed. Their crop is controlled by CSS, so changing `crop` does not require re-exporting the files.

The unused film and its poster remain in `assets/photos` for safekeeping; the website no longer renders or loads them.

## Layout and motion

There are two compositions: above 1100px the bowed ribbon, typography, sidebar spacing, photos and footer scale together from a 1920px-wide design; at 1100px and below the separate mobile/tablet layout keeps a horizontal ribbon above the reading column. The desktop ribbon uses one smooth periodic formula with an analytic slope, rather than joined curve segments. It has one inflection per sweep and its shape is independent of text length and viewport rounding. Its broad left bend clears the existing introduction, so no body text needs to move below the curve. Lists use outside markers and hanging indentation so wrapped lines align with their text.

Only the ribbon depth needed for the page is generated, rather than an 18,000px path. The entrance animation releases its whole-page opacity layer once complete. Polaroid images remain mounted and eagerly loaded; changing scroll position does not remove them. Footer icons use ordinary SVG images instead of transformed CSS masks, and the navigation flower is a vector asset, so controls do not depend on emoji rendering.

The Home heading starts with posterity and cycles through `headingWords` in `script.js`, including posterity and blog posts. Scrambles last 520ms; the resting interval is 3.8–5 seconds. The word box reserves space so changes do not move the ribbon. Reduced-motion preferences skip scrambling and flower rotation.

`footer.js` and `footer.css` provide the same footer, social links and text copy controls on every page, including `brand-guidelines/`, `payment/`, `contact/`, and `josh-isms/`. Equal spacing centers the logo between the rules. On narrow screens the links and copyright sit below the logo's lower rule. The sidebar logo is 4% larger and centered, with a pure-white neutral state; the orange hover artwork is unchanged. Font and logo assets remain local; icon attribution is in `assets/icons/README.md`.

## Verification

With a local server on port 4173 and Playwright installed:

- `node tools/verify-responsive.cjs` checks desktop, tablet and phone widths in Chromium and WebKit, photo loading, ribbon/text clearance, and footer icon hover. It saves previews in `.preview-refresh/`.
- `node tools/verify-proportions.cjs` compares normalized desktop geometry in Chromium and WebKit down to phone sizes.
- `node tools/verify.cjs` checks navigation, ribbon geometry, heading animation, the photo-only collage and reduced motion.
- `node tools/verify-footer.cjs` checks links, clipboard controls and standalone pages.
- `node tools/verify-page-features.cjs` compares all five page footers, checks exact logo centering, curve inflections and track safety, and exercises footnote hover, keyboard and touch interaction, existing note URLs and Josh-isms in Chromium and WebKit.

WebKit with tablet viewports is a useful Safari compatibility check; it does not reproduce a physical iPad's memory limits or Low Power Mode.
