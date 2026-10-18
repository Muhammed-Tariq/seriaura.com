# Gentle cursor ripple

Moving a mouse or trackpad across the ribbon creates a small ripple. There is
no menu and no stored choice. Old experiment preferences have no effect.

The ripple displaces lettering by at most 1.5px, starts at half the previous
strength, reaches 120–170px from the cursor, and settles in about 0.7 seconds.
Its shader lives in `ribbon-renderer.js`; it uses the existing animation loop
and cached mesh without changing text layout or uploading new geometry.

## Reverting

Set `ENABLED = false` near the top of `ribbon-interaction.js` and refresh.
Alternatively, remove its script tag from `index.html`. Either restores the
original ribbon motion without cursor disturbance. No other files need changing.

Reduced-motion preferences disable the ripple. Touch gestures retain normal
scrolling. Browsers without WebGL keep the existing static ribbon fallback.

Verification (with the site served at port 4173 and Playwright available):
`node tools/verify-ribbon-interaction.cjs` and `node tools/verify-ribbon-motion.cjs`.
