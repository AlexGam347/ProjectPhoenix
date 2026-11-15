# Project Phoenix

Educational browser game for ages 7 to 14 (about 30 minutes), made for the NASA Space Apps Challenge.
You are the commander of a base on Mars. At night you keep water, oxygen, food and energy up.
During the day you build upgrades. Four nights, a dust storm and a final solar storm.

**Flow:** Dream 1 → Night 1 (tutorial) → Question → Result → Day → Night → Question → Dream → Result … → Night 4 → Ending video → Result → Final.

## Run

```bash
npm install
npm run dev
npm test
npm run build
```

- `?debug=1` debug panel: jump to any night or day, clock x10, show zones, go to the ending.
- `?zones=edit` click zone editor, to draw zones over the real renders.

## Structure

| Folder | Contents |
|---|---|
| `src/rules/` | Pure rules with no DOM: `economy.ts` (dawn formula, purchases), `night.ts` (night engine), `simulate.ts` (literal port of the dossier balance simulator), `bot.ts` (automatic player used for calibration) |
| `src/state/` | Game state machine (`game.ts`) and `localStorage` saves (`save.ts`) |
| `src/view/` | Screens, layered rooms, HUD, YANA, mini games, day blueprint and catalog, debug tools |
| `src/data/` | **All editable content as JSON**: numbers, upgrades, tasks, faults, nights, rooms and zones, YANA lines, questions, story, credits |
| `scripts/` | `convert-images.mjs` (PNG to WebP), `fetch-donki.mjs` (real solar flare at build time), `placeholder-zones.mjs` |

**One formula.** Bars animate with `display(t)` and dawn uses `display(6)`, which is exactly
`max(0, min(cap, reserve + production·uptime + tasks(+)) − crew − upkeep − tasks(−) − storm)`. A test checks it.

**Balance.** `tests/simulate.test.ts` reproduces the dossier table. `tests/bot.test.ts` plays the real engine with a bot
and checks it gives the same endings. **Run `npm test` after changing numbers in `src/data/`.**

**Text rule.** `tests/text.test.ts` fails if any player-facing text contains long dashes or separator dots.

## Art

Until renders arrive, the game uses the dossier sketches. Drop PNGs in `art-src/` with the names in
`docs/ART_CONTRACT.md`, run `npm run images`, then redraw the zones with `?zones=edit`.

## NASA data

- **DONKI** (NASA Open APIs / CCMC): Night 4 shows a real solar flare, downloaded at build time
  (`npm run donki`, key in the `NASA_API_KEY` repository secret). The client never sees the key.
  If the API fails, `src/data/donki-fallback.json` is used.
- Credits list the sources and the notice: "NASA does not endorse any non-U.S. Government entity and is not responsible
  for information contained on non-U.S. Government websites." No NASA logos or insignia.

## Deploy

`.github/workflows/deploy.yml` publishes to GitHub Pages on every push to `main` (tests, DONKI, build).
Repository settings: *Settings → Pages → Source: GitHub Actions*.
