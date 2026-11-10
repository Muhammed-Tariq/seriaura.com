# Event identities

## Bath Half background film

`bath-half-loop.mp4` is a silent, 20-second excerpt (00:08–00:28) from **Bath Half 2022**, the official event film by Suited & Booted Studios: https://www.youtube.com/watch?v=ZixL16g_TWg. It shows the race through Bath, rather than generic running footage. Retrieved 10 November 2026; original footage remains copyright Suited & Booted/the event rights holders, not covered by this repository's licence. Source attribution is retained here; the visible source link was removed at the owner's request. `bath-half-poster.webp` is a still from the same excerpt. The smaller clip is 1280×720; `bath-half-loop-1080.mp4` is a separate 1920×1080 encode from the original full-HD source, selected above 1100px viewport width. Both use H.264 at 25fps, without audio, with fast-start metadata. Only these excerpts and the poster are shipped, not the complete source film.

The background is tied to the Bath event's `film` configuration and removed when another event becomes featured. Reduced-motion and data-saving preferences use the poster without fetching the video; playback pauses when offscreen or the tab is hidden. The play/pause icon controls playback independently of the countdown and retains an accessible action label. Straight gradients fade the video into the page along the full height of either side. Timer-colon opacity follows the device clock, reaching zero at each seconds tick.

## Logos

Local transparent assets used as links to the corresponding event/organisation.

- `tmua.svg`: vector reconstruction of the rings and dot in the supplied TMUA artwork, with thicker, constant-width strokes for smooth rendering at any size. The complete mark is contained within its logo slot, including when featured.
- `tmua.png`: original user-provided `TMUA-Masthead-Icon.png`, preserved unchanged as the reference.
- `uat-uk.svg`: previous header identity from https://esat-tmua.ac.uk/about-the-tests/tmua-test/, retained but no longer displayed. Dark text lightened for this site's background; coloured identity retained.
- `bath.svg`: inline header identity from https://www.londonmarathonevents.co.uk/bath-half. Black lettering changed to off-white for this site's background.
- `bath-stacked.svg`: the same original vector paths rearranged with GetPRO centred above Bath Half, allowing larger event lettering. The horizontal source is preserved in `bath.svg`.
- `brighton.svg`: inline header identity from https://www.londonmarathonevents.co.uk/brighton-marathon-weekend.
- `ironman-wales.png`: transparent negative logo from https://www.ironman.com/sites/default/files/2026-09/IM_Wales_Anniversary_LogoNeg%20%281%29.png, linked from the Wales race page.
- `oxford.svg`: https://commons.wikimedia.org/wiki/File:University_of_Oxford.svg (University of Oxford; vector version by Moonrivers). Displayed in white via CSS for the dark background. Links to Oxford's interview guidance.

Retrieved 30 September 2026. Logo ownership remains with the respective organisations. The official Brighton Marathon Weekend identity is retained because a suitable transparent 2027-specific marathon logo was not found.

The countdown page uses Space Grotesk at weight 600 for numbers (including TBC) and weight 500 for labels and units. Static font files are served locally. The Space Grotesk OFL licence is alongside the fonts in `assets/fonts/`.

Updated 17 October 2026:

- `ironman-france.png`: official reversed Ramify IRONMAN France Nice logo, from https://www.ironman.com/sites/default/files/styles/logo/public/2026-01/IM25_IRONMAN_Nice_Ramify_Logo_251023_Neg_0.png?itok=WCILrCo5
- `ironman-703-tallinn.png`: official reversed IRONMAN 70.3 Tallinn logo, from https://www.ironman.com/sites/default/files/styles/logo/public/2024-10/IM%2070.3%20Tallinn%20Event%20logo%20reversed.png?itok=3Mjh8XD1
- Race dates verified against the visible dates and SportsEvent metadata on https://www.ironman.com/races/im-france (12 September 2027) and https://www.ironman.com/races/im703-tallinn (8 August 2027). Start times are not confirmed: these date-only counters target midnight in the host city and omit the hours/minutes/seconds clock.
