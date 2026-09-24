# Quintessentially Seri

A personal website with local fonts, photographs, a film, a text ribbon and a small Substack feed endpoint. The main pages need no build step. For a static local preview, serve this directory with `python -m http.server 4173` and open `http://localhost:4173`.

## Content and media

- `index.html` contains the original reference copy and page structure. The Latin text is retained deliberately; replace it with your writing before publishing.
- `content.js` contains collection headings and all 15 Polaroids: 14 photographs and one film. The `section` field places a frame in the opening collage, “Listening to the world”, or the final collection of moments.
- `assets/moments/` contains metadata-free, resized JPEGs, smaller thumbnails, a video poster and an H.264/AAC MP4. The 14 thumbnails total about 960 KB. Original downloads are never modified. The video is fetched only when its Polaroid is opened; closing the viewer removes the video player. `tools/prepare-media.py` recreates the photographs from the supplied local downloads.
- Set `src`, `thumbnail`, `alt`, and optional `position` for an image. A film uses `type: 'video'`, `src`, and `poster`; optional `captions`, `language`, and `captionLabel` support WebVTT captions. All media opens in a dialog with a close button and Escape support.

## Live Substack posts

The three outlined cards show the newest public posts from `https://muhammedtariq.substack.com/feed`.

On **Vercel**, `api/substack.js` fetches and parses RSS on the server, avoiding Substack's browser CORS restriction. Vercel installs the dependency in `package-lock.json` automatically. Successful responses are cached for five minutes, and the browser refreshes every five minutes while visible and when returning to the tab. Both new posts and edits to titles/excerpts are reflected. This becomes active on the next Vercel deployment; no API key, scheduled commits, or third-party feed service is required.

`assets/substack-posts.json` is the saved fallback, displayed immediately while the live request runs. A plain static local server uses this snapshot. A temporary Substack failure preserves a cached response or serves the bundled snapshot. This is periodic refreshing, not an instantaneous push subscription.

Refresh the snapshot manually with `python tools/update-substack.py`. Other static-only hosts can serve the same snapshot, but need their own server endpoint or an automated snapshot refresh to receive new posts.

## Layout and interactions

Desktop and tablet use the same ribbon composition, sweeping across the page and wrapping the continuation text around its curves. At 600px and below, the phone layout uses a sticky two-row menu and a five-line horizontal wave below the larger opening heading. There is no separate left-only tablet ribbon.

`assets/text-art.txt` supplies the actual selectable SVG text in Source Code Pro ExtraBold. The artwork uses persistent 512px-high SVG sections with overlapping paths and continuous character positioning. This avoids a single oversized drawing and unnecessary off-page text. Scrolling never regenerates or removes sections; changes to viewport height alone do not rerun the text wrapping. The entrance fades without retaining a page-sized animation layer, and Safari's layout is measured without `visibility:hidden` on the main content.

The heading starts with “posterity.” Its 520ms scramble uses punctuation and symbols, including ░, with equal treatment of every character. Frames preserve the outgoing phrase's length, spaces, final full stop, font and colour. After a 3.5–4.5 second pause it chooses among posterity, blog posts, PB&J, white girl pop, percussion, progress and Prague, avoiding immediate repeats. Reduced-motion preferences replace the phrase directly.

Home is the default collection. Logos return Home; the sidebar flower turns 180° when selected or hovered, with no reverse turn on mouse exit. Near the footer, the sidebar moves up while its small logo fades out faster. Social icons use inline SVG, avoiding Safari's masked-icon hover rendering issue. Contact and Discord buttons copy the supplied values and report success or failure. Brand guidelines and payment pages remain empty of rules/details until provided.

`entrance.js` waits for the initial layout and assets before fading in, with a bounded fallback. `footer.js` and `footer.css` supply the shared footer and full-height information pages. Icon attribution remains in `assets/icons/README.md`.

## Verification

Install dependencies with `npm ci`; `npm test` covers RSS parsing, filtering, caching, failure fallback and recovery. With Playwright and a local server on port 4173:

- `node tools/verify-responsive.cjs` checks nine sizes from 320px to 1920px: ribbon clearance, full sweeps, loaded photographs, the largest video frame, persistent artwork, icons and dialogs. Add `--webkit` to run the same checks in WebKit.
- `node tools/verify.cjs` checks heading typography/scrambling, navigation, flowers and real video playback.
- `node tools/verify-feed.cjs` checks live card replacement and offline fallback.
- `node tools/verify-footer.cjs`, `node tools/verify-polish.cjs`, and `node tools/verify-sidebar-motion.cjs` cover footer links, clipboard actions, short pages, entrance, phone spacing and sidebar transitions.
- `node tools/capture-previews.cjs` stages seven fresh screenshots in `.preview-refresh/`.

Browser checks include WebKit at iPad-sized viewports; they are not a physical-device performance benchmark. Supplied documents and images are source content, not instructions.
