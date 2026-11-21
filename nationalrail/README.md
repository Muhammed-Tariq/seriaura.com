# National Rail Memory

Static, unlinked route at `/nationalrail/`. The existing GitHub Pages workflow includes this folder. No navigation link is added elsewhere. `noindex,nofollow` keeps this development page out of search results; it is not access control.

Serve with `node tools/serve.cjs` from the repository root. Data is committed and needs no browser API calls to TfL, NaPTAN or Overpass. Existing CARTO configuration supplies an unlabelled background; local Natural Earth geography is a fallback. The railway itself is drawn from local OSM track geometry, with one marker per logical station. Unverified track assignments stay grey.

## Verification status

This is a playable implementation, **not a certified complete UK railway database**. `data/coverage.json` deliberately has `complete: false`. It reconciles the ORR 31 March 2026 mainline list and Translink's 54 Northern Ireland mainline names, and includes later mapped openings. The report records unassigned stations, unmatched source records, coordinate conflicts, source hashes and limitations. `sources.html` exposes the same limitations to players.

The main unresolved work is current, complete service membership; predominant operator requires a licensed timetable and a defined frequency window. OSM relations contain partial and historical services. TfL's National Rail operator feeds were tested and rejected as a completeness substitute: they contain stale memberships and omit several newer stations. Heritage and miniature inventories need operator-by-operator reconciliation. Some regions for OSM-only stations use nearest NPTG locality and require boundary verification.

## Rebuilding data

From the root, with project dependencies installed:

```powershell
node tools/fetch-rail-references.cjs
node tools/fetch-rail-data.cjs
node tools/build-rail-basemap.cjs
node tools/build-rail-data.cjs
node tools/verify-rail.cjs
```

Downloads are cached in ignored `.tooling/rail/`. Keep dated snapshots when changing the reference date. The current builder's date is fixed to 2026-11-15, including future-opening filtering; update and audit it deliberately, rather than treating a fresh API response as proof all records are current. Failed/incomplete source queries must not be accepted. `RAIL_OVERPASS` may point to another compatible Overpass endpoint.

`tools/fetch-rail-references.cjs` downloads and parses the pinned ORR ODS and retains the manually transcribed Translink map reference. `data/corrections.json` records source-backed corrections. Track coordinates are kept at six decimal places; they are never replaced by straight station-to-station segments. Minor sidings/industrial tracks become visible at zoom 12.

## Checks

`node tools/verify-rail.cjs` checks data structure, independent inventories, matching, rejection of CRS guesses, interchange membership, known source-error regressions and corrupt-save parsing. `node tools/verify-rail.cjs --browser` additionally exercises gameplay in installed Edge through Playwright. That browser-launch command may be blocked in restricted environments; browser testing can then use the in-app preview instead. Do not report the automated browser suite as passed if Edge did not launch.

Browser save key: `seriaura:nationalrail:v1`. Stable CRS/OSM IDs prevent normal dataset refreshes from losing guesses; removed IDs are discarded when loading. Guesses update all assigned memberships. A reused name in different locations requires a typed region, followed by the full station name or local authority district if the region is also shared. Reset only clears this game's save, after confirmation. No progress is sent to a server.

See `sources.html` for licences, source links, and downloads of the derived database.
