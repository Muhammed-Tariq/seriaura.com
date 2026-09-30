# Seriaura

A static personal website. Serve this folder with `python -m http.server 4173` and open `http://localhost:4173`. No build step is required.

## Writing

Your opening paragraphs are in `index.html`, inside `#intro-copy`. The “I really like” list is in `.intro-likes`, below “Listening to the world.”, so it clears the first bend. Neither is duplicated.

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

`footnotes.js` numbers the notes automatically in reading order. Hover over a number to read its note in a small box; you can move the pointer onto the box to keep reading. Keyboard focus also opens it, and Escape closes it. On a touchscreen, tap the number to open the box and tap again or elsewhere to close it. There is no footnotes section at the bottom of the page. Existing footnote URLs still lead to the number in the text. A live example is the footnote after “Seriaura” in the introduction; it contains the former parenthetical “Occasionally shortened to Seri.”

Use this same HTML in `index.html`, either `continuationCopy` field in `content.js`, or any standalone page. Keep the note as plain text inside the attribute; use `&quot;` for double quotes and `&amp;` for an ampersand. Notes update when switching collections, so only the current collection's notes appear. All existing pages load `footnotes.css` and `footnotes.js`; include both when creating another page.

The “Josh-isms” link now opens `josh-isms/index.html`. Add its writing below the heading, where the HTML comment marks the space for content.

## Moving the Polaroids

All 20 displayed photographs are configured in the `polaroids` list in `content.js`. Each entry has a readable `id` and the original filename in its `src`, so it is easy to find a particular picture. The video frame has been removed from the collage.

Every frame belongs to one skewed, overlapping collage on the upper right of the desktop page. The whole collage moves below the introduction on phones and tablets. The desktop canvas is 480 × 2120 design pixels and scales with the page. Frames are absolutely positioned, so moving a photograph does not move the ribbon or writing.

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
| `quarterTurn` | Image-only rotation in quarter turns; `-1` turns the Liquicity tent photo upright counterclockwise. Use without `cropBox`. |
| `alt` | A short description for screen readers |

For example, to move the sunset photo right and down, find `id: 'sunset'` and increase its `x` and `y`. To show more sky, add `crop: '50% 25%'`.

To move the whole desktop collage, edit `.scrapbook` in `style.css`. Its default position is `left: 71.35%; top: 0` with `width: 25%`. `.polaroids` defines the canvas height; smaller-screen scaling is in `mediaqueries.css`.

The group photos use larger frames with crops that retain everyone. SIRI LIFE uses a 300 × 234 frame focused on the sheet. Dune is cropped to the tabletop to exclude feet. These are display crops; the source photographs are untouched. When changing frame sizes with `cropBox`, keep the inner image area's proportions close to the selected crop. The frame has 12px top/side borders and a 43px bottom border in design units.

## Media

Optimised WebP copies are in `assets/photos`; originals are untouched. `python tools/prepare-photos.py S:/Downloads` recreates them with Pillow installed. Append original filenames after the source folder to prepare only selected additions. Crops and the Liquicity tent photo's quarter-turn are controlled by CSS, so changing these does not require re-exporting the files.

The unused film and its poster remain in `assets/photos` for safekeeping; the website no longer renders or loads them.

## Layout and motion


There are two compositions: above 1100px the bowed ribbon, typography, sidebar spacing, photos and footer scale together from a 1920px-wide design; at 1100px and below the separate mobile/tablet layout keeps a horizontal ribbon above the reading column. The permanent design is the leaning wave: an asymmetric sweep that spends more time on the left. Its analytic slope drives the lettering and text clearance, and its shape is independent of text length and viewport rounding. The comparison designs and picker have been removed; earlier saved preview selections have no effect. The interests list sits below the first bend to leave room for the curve. Lists use outside markers and hanging indentation so wrapped lines align with their text.

Only the ribbon depth needed for the page is generated, rather than an 18,000px path. The entrance animation releases its whole-page opacity layer once complete. Polaroid images remain mounted and eagerly loaded; changing scroll position does not remove them. Footer icons use ordinary SVG images instead of transformed CSS masks, and the navigation flower is a vector asset, so controls do not depend on emoji rendering.

The ribbon gradually widens towards its middle, then narrows towards the end. Every track uses the same off-white colour throughout, with no darkening gradient. The default `ribbonStyle: 'warped'` in `content.js` keeps the characters distorted around the bends but controls their height separately from row spacing. Letter height varies from 90% to 114% of the original font height; rows are 9.75–16.5 design pixels apart on desktop (about 69% widening). This keeps the ribbon compact without tall letters or large gaps. The existing text clearance is preserved. Each page's visible length determines the taper, while desktop dimensions still scale together. On phones and tablets the taper runs from left to right along the horizontal ribbon.

To restore the previous appearance, change `ribbonStyle: 'warped'` to `ribbonStyle: 'spacing'` in `content.js` and refresh. That renderer is retained: it varies the spacing between tracks while keeping each character's original shape. Switch back to `'warped'` at any time; both styles use the same curve and colour.

The warped lettering drifts slowly along the fixed curve, with all rows moving downwards on desktop (leftwards on mobile), at slightly different speeds. Set `ribbonMovement: 'alternating'` in `content.js` and refresh to restore the previous opposite-direction movement; the default is `'together'`. `ribbon-renderer.js` draws an immutable curved mesh using a cached font atlas and a repeating character lookup texture. Animation only updates the shader clock; it does not change thousands of SVG text nodes or upload new geometry each frame. It follows the screen's refresh rate. The transparent canvas covers only the viewport plus a small scroll buffer, at up to 2× pixel density. Desktop rows extend 240 design pixels above the page and are clipped by the page boundary, so they run off the top edge. Motion pauses in a hidden tab and stops when reduced motion is requested; resizing preserves its elapsed phase. Offscreen artwork skips drawing. Browsers without WebGL, or with a lost graphics context, receive the same lettering as a static SVG. The optional spacing renderer also stays static.

If a high-density graphics surface produces sustained slow frames, the ribbon gradually reduces its own pixel density towards 1×. Page text, photographs, geometry and movement speed remain unchanged. Geometry is built only after the ribbon font loads, and visible buffer ranges are drawn without rebuilding the mesh when scrolling.

The Home heading starts with posterity and cycles through `headingWords` in `script.js`, including posterity and blog posts. Scrambles last 520ms; the resting interval is 3.8–5 seconds. The word box reserves space so changes do not move the ribbon. Reduced-motion preferences skip scrambling and flower rotation.

`footer.js` and `footer.css` provide the same footer, social links and text copy controls on every page, including `brand-guidelines/`, `payment/`, `contact/`, and `josh-isms/`. Equal spacing centers the logo between the rules. On narrow screens the links and copyright sit below the logo's lower rule. The sidebar logo is 4% larger and centered, with a pure-white neutral state; the orange hover artwork is unchanged. Font and logo assets remain local; icon attribution is in `assets/icons/README.md`.

## Time notes

The countdown page (`counting/index.html`), linked by “counting” in the Home page’s interests list, is configured in `siteContent.time` in `content.js`, rendered by `time.js`, and styled by `time.css`. It uses the shared subpage layout and footer, with a left-aligned “Countdowns” heading. Stats and countdowns span the content width. The nearest event occupies a prominent full-width row; the remaining events form four columns on desktop and two on smaller screens. Countdown squares and logos scale down for phones. Day numbers (including TBC) fit their square using container-relative font sizes and character count, with a cap and comfortable padding; hours, minutes and seconds keep their fixed size. A smooth vector rendering of the supplied TMUA artwork fills the featured logo area, with thicker strokes and its upper arcs cropped at the top divider. The countdown page is slightly wider to give this feature room. Full dates are available in hover titles. Both age and gap-year percentage use seven decimal places and Space Grotesk 600 with tabular digits; labels use Reddit Sans 500. The percentage updates on animation frames for fine, continuous increments. Dates use explicit UK UTC offsets, regardless of the visitor's location. The gap year includes all of 30 September 2027; age is completed birthday years plus the fraction between the previous and next birthday (including leap years). Both use the visitor's device clock.

Event names are transparent linked logos, with source notes in `assets/events/README.md`. Each scheduled event has a red gradient with symmetric fade-in and fade-out circling a stationary square: once every three seconds for the nearest event and every five seconds for the others. Only the nearest future event shows hours, minutes and seconds; past events show zero days and “started”. Events with `at: null` (IRONMAN Wales and Oxford Interview) show “TBC” in a static grey square. Timers and border motion pause offscreen or in a hidden tab. Reduced motion freezes the borders and updates the numbers once a second. Three decorative colons in the nearest countdown fade in and out once per second; the “Pulsing colons” checkbox hides them without shifting the layout and saves the preference locally. Colon animation also pauses offscreen and becomes static with reduced motion.

All six pages load `links.js`: external hyperlinks open in a new tab, while local pages and anchors remain in the current tab. Dynamically rendered content follows the same rule.

Brighton's 09:45 UK start is provisional, from the [organiser's 2027 entry listing](https://www.letsdothis.com/gb/e/2027-brighton-marathon-weekend-244393?occurrenceId=21111174386), checked 30 September 2026. A separate 2027 Wave 1 time has not been confirmed. Update the event's `at` value and remove `provisional` when confirmed.

## Verification

With a local server on port 4173 and Playwright installed:

- `node tools/verify-time.cjs` checks birthday and gap-year boundaries, leap years, UK daylight-saving offsets, the nearest-event handover, responsive placement, border motion and offscreen/reduced-motion behaviour in Chromium and WebKit.
- `node tools/verify-links.cjs` checks external tabs, local navigation, logo links and dynamically inserted links on all six pages in Chromium and WebKit.
- `node tools/verify-responsive.cjs` checks desktop, tablet and phone widths in Chromium and WebKit, photo loading, ribbon/text clearance, and footer icon hover. It saves previews in `.preview-refresh/`.
- `node tools/verify-proportions.cjs` compares normalized desktop geometry in Chromium and WebKit down to phone sizes.
- `node tools/verify-ribbon-styles.cjs` checks static-fallback character stretching, skew, text clearance, and restoration of both ribbon styles in Chromium and WebKit.
- `node tools/verify-ribbon-motion.cjs` measures real browser frame cadence alongside photo loading and heading scrambling, checks that animation causes no SVG mutations or mesh uploads, and verifies rendered pixels, alternating rows, top overscan, resizing, scrolling, reduced motion and the static fallback in Chromium and WebKit.
- `node tools/verify.cjs` checks navigation, ribbon geometry, heading animation, the photo-only collage and reduced motion.
- `node tools/verify-footer.cjs` checks links, clipboard controls and standalone pages.
- `node tools/verify-page-features.cjs` compares all five page footers, checks exact logo centering, curve inflections and track safety, and exercises footnote hover, keyboard and touch interaction, existing note URLs and Josh-isms in Chromium and WebKit.

WebKit with tablet viewports is a useful Safari compatibility check; it does not reproduce a physical iPad's memory limits or Low Power Mode.
