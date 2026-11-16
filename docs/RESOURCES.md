# Project Phoenix: resources and programs used

Everything the game uses or was made with, with its source and licence. Kept up to date with the code.

## Music

| What | Author | Licence | In the game |
|---|---|---|---|
| "Pondering the Cosmos" (2017) | Ruskerdax | **Public domain.** Author's note: "This music is released to the public domain, which means you are free to use, modify, and distribute it in any form as you see fit. I would appreciate being credited and notified if you use this music for something, however you are not required to do so." | Menu music, looping. Credited in the game's Credits screen. |

- Original file: `art-src/audio/pondering-the-cosmos.mp3` (320 kbps, 5:08).
- Encoded with ffmpeg to `public/assets/audio/menu.ogg` (Opus, 96 kbps) and `menu.mp3` (128 kbps, fallback for older Safari).
- The author appreciates being notified (optional).

## NASA Space Apps Challenge resources

| Resource | How the game uses it |
|---|---|
| [DONKI Space Weather Database (NASA CCMC)](https://ccmc.gsfc.nasa.gov/tools/DONKI/) | **Data in the game.** The strongest solar flare of the last 12 months is downloaded when the game is built and shown on the Control screen on Night 4. In the story it happens in 2071 (same day and month); the screen also shows the real date. Backup copy: X9.0, 3 October 2024. |
| [NASA Open APIs](https://api.nasa.gov/) | How the build reaches DONKI (`scripts/fetch-donki.mjs`). |
| [RadLab (OSDR)](https://visualization.osdr.nasa.gov/radlab/gui/data-api/) | Radiation doses on the ISS: why the Equipment Shielding upgrade exists. |
| [Mars Trek](https://trek.nasa.gov/mars/) | Real Mars terrain for the base site. |
| [OSDR Open Science Data Repository](https://osdr.nasa.gov/bio/repo/) | Lettuce grown in space (OSD-385, OSD-723): the greenhouse. |
| [Canadian Space Agency: Food production](https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/) | Veggie experiment and growing food in space. |
| [Canadian Space Agency: STEM resources for youth](https://www.asc-csa.gc.ca/eng/youth-educators/resources-stem-and-youth-organizations.asp) | Tone and activities for ages 7 to 14. |

Other NASA references: [ECLSS](https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/) (air and water recycling on the ISS) and [NASA 3D Resources](https://science.nasa.gov/3d-resources/) (reference models).
Required notice, shown in Credits: "NASA does not endorse any non-U.S. Government entity and is not responsible for information contained on non-U.S. Government websites."

## Team's own work

- 3D base, room renders (day and night) and upgrade layers, made in Blender: `art-src/dia`, `art-src/sala`.
- Dream videos and their subtitles: `public/assets/video`, `art-src/subs`.
- YANA sprites: `public/assets/yana`.
- Menu background: the team's Mars image (`art-src/menu/mars.webp`), pixelated by `scripts/pixelate-menu.mjs`.
- Story, characters, base design and game design.

## Font

- [VT323](https://fonts.google.com/specimen/VT323) by Peter Hull, SIL Open Font License 1.1, through the `@fontsource/vt323` package.

## Programs and libraries

| Program | Used for | Licence |
|---|---|---|
| Blender | 3D base and renders (team) | GPL |
| TypeScript 5.9 | Game code | Apache 2.0 |
| Vite 6 | Dev server and build | MIT |
| Vitest 3 | Automated tests (rules, balance, storage, text) | MIT |
| sharp 0.34 | Image import, resizing, menu pixel art | Apache 2.0 |
| ffmpeg 6 | Video and audio encoding, subtitles check | LGPL/GPL |
| Playwright | Automated checks and screenshots in a real browser | Apache 2.0 |
| GitHub Pages and GitHub Actions | Hosting and automatic build and deploy | GitHub service |
| Claude Code (Anthropic) | AI assistant that wrote the code with the team | Anthropic service |
