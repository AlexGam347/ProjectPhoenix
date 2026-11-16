# Project Phoenix

Educational browser game for ages 7 to 14 (about 30 minutes), made for the NASA Space Apps Challenge.
You are the commander of a base on Mars. At night you keep water, oxygen, food and energy up.
During the day you build upgrades. Four nights, a dust storm and a final solar storm.

**Flow:** Dream 1 → Night 1 (tutorial) → Question → Result → Day → Night → Question → Dream → Result … → Night 4 → Ending video → Result → Final.

## Use of AI

Project Phoenix was designed and directed by our team: the concept, story, characters, game design and balance, the 3D base and room renders (Blender), the scripts and direction of the dream videos and the finale cinematic, and the choice of NASA data. The programming code of the game was entirely AI generated: Claude (Anthropic) generated all of it from our design document and our step-by-step instructions. Claude also drafted the in-game English text. Claude also helped generate the dream videos and the finale cinematic from our scripts and art direction, and Kokoro-82M (open-source text-to-speech) generated the voices in the dream videos. We tested every change and asked for corrections until it worked as we designed. The dream videos and the finale cinematic are marked "AI assisted" in the game. No NASA logos or branding are used.

Details, with what the team did and what the AI did: [`docs/RESOURCES.md`](docs/RESOURCES.md#use-of-ai).

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

**Continuous storage.** The night engine keeps a live reserve: production and consumption run at the same time and only
what really does not fit (full bar) is lost. Bars and dawn are the same number. The simulator uses the nightly equivalent
`max(0, min(cap, reserve + production·uptime + tasks(+) − crew − upkeep − tasks(−) − storm))`.
The dossier capped storage *before* subtracting the night's consumption; with the 30 water tank that limited dawn water
to 30 − 8 = 22 (exactly the Night 2 goal) and wasted water with a half-empty bar, so it was changed on purpose.

**Balance.** `tests/simulate.test.ts` holds the balance table (balanced plan good at every skill, machines only bad,
storage only good only when playing very well, no upgrades bad). `tests/bot.test.ts` plays the real engine with a bot and
checks the endings and the design lessons; `tests/storage.test.ts` checks every night that nothing is lost while a bar is
not full. **Run `npm test` after changing numbers in `src/data/`.**

**Text rule.** `tests/text.test.ts` fails if any player-facing text contains long dashes or separator dots.

## Art

Until renders arrive, the game uses the dossier sketches. Drop PNGs in `art-src/` with the names in
`docs/ART_CONTRACT.md`, run `npm run images`, then redraw the zones with `?zones=edit`.

### Team renders (day set)

`node scripts/import-renders.mjs art-src/dia` imports renders named like `C2_AGUA_dia_base.webp` and
`C2_AGUA_dia_upg_C1_DepositoI.webp` (the name table is in the script) and writes `public/assets/rooms/manifest.json`.
`node scripts/check-renders.mjs` composes every room with all its layers and compares it with `*_dia_completa.webp`.
Rooms with a render use the zones in `render.zones` of `src/data/rooms/*.json`; the sketches keep their own zones.

## NASA data

- **DONKI** (NASA Open APIs / CCMC): Night 4 shows a real solar flare, downloaded at build time
  (`npm run donki`, key in the `NASA_API_KEY` repository secret). The client never sees the key.
  If the API fails, `src/data/donki-fallback.json` is used.
- Credits list the sources and the notice: "NASA does not endorse any non-U.S. Government entity and is not responsible
  for information contained on non-U.S. Government websites." No NASA logos or insignia.

## Deploy

`.github/workflows/deploy.yml` publishes to GitHub Pages on every push to `main` (tests, DONKI, build).
Repository settings: *Settings → Pages → Source: GitHub Actions*.
