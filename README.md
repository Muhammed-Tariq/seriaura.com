# Quintessentially Seri

A static personal website. Serve this folder with `python -m http.server 4173` and open `http://localhost:4173`. No build step is required.

## Writing

Your introduction stays in `index.html`, inside `#intro-copy`. It is never copied into the later sections.

The two later reading areas are independent HTML fields near the top of `content.js`:

```js
continuationCopy: [
  '<p>Your writing under Listening to the world.</p>',
  '<p>Your writing under For all the little things.</p>'
],
```

They start empty so no biography or placeholder prose is invented. Keep the surrounding quotes; use backticks for multiline HTML. The existing curved text wrapping remains. Other collections can have their own `continuationCopy` array. Their headings and opening paragraphs are under `collections`.

`assets/text-art.txt` contains the small words on the ribbon itself, separately from all body copy.

## Moving the Polaroids

All 14 supplied photographs and the film are configured in the `polaroids` list in `content.js`. Each entry has a readable `id` and the original filename in its `src`, so it is easy to find a particular picture. The supplied website screenshot is a placement reference, not a photograph in the collage.

The first seven frames preserve the original cluster. The eight added frames are in the `listening` gallery, below the ribbon in the Listening section. They are absolutely positioned: adding or moving them cannot push the ribbon, headings, paragraphs, cards, or other sections around. They are layered independently of the ribbon.

| Field | What to edit |
| --- | --- |
| `gallery` | `opening` for the original cluster; `listening` for the lower cluster |
| `x` | Horizontal position as a percentage of the gallery. Increase to move right. |
| `y` | Vertical position as a percentage of the gallery. Increase to move down. |
| `width`, `height` | Outer frame size in design pixels; scaled automatically for the screen |
| `rotation` | Degrees; negative tilts left, positive tilts right |
| `crop` | Image focal point, e.g. `'50% 35%'` keeps more of the upper part visible |
| `alt` | A short description for screen readers |

For example, to move the sunset photo right and down, find `id: 'sunset'` and change `x: 2, y: 2` to `x: 12, y: 12`. To show more sky, add `crop: '50% 25%'`.

To move the entire lower gallery, edit `.listening-polaroids` in `style.css`: `left` moves it sideways and `top` moves it vertically relative to the start of the Listening section. The default desktop position is `left: 1%; top: 620px`. The smaller-screen overrides are in `mediaqueries.css` (`top: 240px`). `width` and `height` define the canvas used by each photo's percentage coordinates. Change an individual photo's `x`/`y` for individual moves; change the gallery's `left`/`top` to move the group.

Because the photos do not reflow the page, preview your placement after adding text to ensure they do not cover your writing. The video is the largest frame. There is no enlarged-photo viewer.

## Media

Optimised, orientation-correct WebP copies are in `assets/photos`; originals are untouched. `python tools/prepare-photos.py S:/Downloads` recreates them with Pillow installed. Their crop is controlled by CSS, so changing `crop` does not require re-exporting the files.

The muted H.264 film `IMG_0908-loop.mp4` contains a 0.6-second crossfade from its ending into its opening. This gives a continuous native loop with only one video decoder, rather than synchronising two playing videos on an iPad. It autoplays inline where the browser permits; a text-only Play/Pause film button handles manual control and blocked autoplay. Reduced-motion preferences initially pause the film. It pauses in hidden tabs and other collections, retaining loaded media.

## Substack posts

`assets/substack-posts.json` stores the latest three public posts from `https://muhammedtariq.substack.com/feed`, including titles, descriptions, links and images. Three fixed-size outlined cards display them without changing ribbon geometry. Longer titles and descriptions are clipped visually; the card links to the complete post.

Refresh manually with:

```sh
python tools/update-substack.py
```

The script uses Python's standard library and leaves the previous snapshot intact if fetching or validation fails. It can also read a saved feed: `python tools/update-substack.py path/to/feed.xml`.

`.github/workflows/refresh-substack.yml` refreshes the snapshot hourly and when manually run through GitHub Actions. **This becomes active after the workflow and these files are pushed to the repository's default branch, with Actions enabled and permitted to write repository contents.** Scheduled runs can be delayed by GitHub. No workflow or publication has been triggered by the local edits.

The page first loads the deployed snapshot, then checks the public snapshot on the repository's `main` branch. It checks again every 15 minutes while the tab is visible. This lets a static deployment receive newer posts and RSS-visible post edits without rebuilding the site. If the remote check fails, the existing cards remain. It is periodic refresh, not a real-time Substack webhook. Change `substack.liveSnapshot` in `content.js` if the repository or branch changes. Images are served from the URLs supplied by Substack.

## Layout and motion

There are two compositions: the broad sweeping desktop ribbon above 1100px, and the horizontal ribbon above the reading column at 1100px and below. Typography and spacing adapt within each. The former narrow vertical tablet ribbon is removed. The phone heading is larger and the horizontal ribbon is closer to it.

Only the ribbon depth needed for the page is generated, rather than an 18,000px path. The entrance animation releases its whole-page opacity layer once complete. Polaroid images remain mounted and eagerly loaded; changing scroll position does not remove them. Footer icons use ordinary SVG images instead of transformed CSS masks, and the navigation flower is a vector asset, so controls do not depend on emoji rendering.

The Home heading starts with posterity and cycles through `headingWords` in `script.js`, including posterity and blog posts. Scrambles last 520ms; the resting interval is 3.8–5 seconds. The word box reserves space so changes do not move the ribbon. Reduced-motion preferences skip scrambling and flower rotation.

`footer.js` and `footer.css` provide the shared footer, social links and text copy controls. Standalone pages are in `brand-guidelines/`, `payment/`, and `contact/`. Font and logo assets remain local; icon attribution is in `assets/icons/README.md`.

## Verification

With a local server on port 4173 and Playwright installed:

- `node tools/verify-responsive.cjs` checks desktop, tablet and phone widths in Chromium and WebKit, photo loading, ribbon/text clearance, and footer icon hover. It saves previews in `.preview-refresh/`.
- `node tools/verify.cjs` checks navigation, ribbon geometry, heading animation, video autoplay/looping and reduced motion.
- `node tools/verify-footer.cjs` checks links, clipboard controls and standalone pages.

WebKit with tablet viewports is a useful Safari compatibility check; it does not reproduce a physical iPad's memory limits or Low Power Mode.
