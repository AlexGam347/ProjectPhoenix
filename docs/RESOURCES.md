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
- Dream videos: ideas, scripts and art direction by the team; generated with AI assistance (see Use of AI): `public/assets/video`.
- Dream video subtitles: `art-src/subs`.
- YANA sprites: `public/assets/yana`.
- Menu background: the team's Mars image (`art-src/menu/mars.webp`), pixelated by `scripts/pixelate-menu.mjs`.
- Story, characters, base design and game design.

## Use of AI

Project Phoenix was designed and directed by our team: the concept, story, characters, game design and balance, the 3D base and room renders (Blender), the scripts and direction of the dream videos, and the choice of NASA data. The programming code of the game was entirely AI generated: Claude (Anthropic) generated all of it from our design document and our step-by-step instructions. Claude also drafted the in-game English text. Claude also helped generate the dream videos from our scripts and art direction, and Kokoro-82M (open-source text-to-speech) generated the voices in them. We tested every change and asked for corrections until it worked as we designed. The dream videos are marked "AI assisted" in the game. No NASA logos or branding are used.

| Part | Team | AI |
|---|---|---|
| Concept, story, characters | All | None |
| Game design and balance (rules, numbers, upgrades, nights) | All | None |
| Programming code (game, tests, build scripts) | Design document and step-by-step instructions; testing and requested corrections | **Entirely AI generated** by Claude (Anthropic) |
| In-game English text (YANA lines, tasks, questions) | Content and facts chosen by the team; reviewed | Drafted by Claude |
| 3D base and room renders | All, made in Blender | None |
| Dream videos | Ideas, scripts and art direction | Generated with Claude's assistance; voices by Kokoro-82M. Marked "AI assisted" in the game |
| Menu background | Original Mars image | None (pixelated by a script) |
| Menu music | Chosen by the team | None (public domain track by Ruskerdax) |
| Choice and use of NASA data | All | None |

How the AI was used: Claude Code was given the team's design dossier and asked, step by step, to build each part of the game. The team played every version, reported problems and asked for changes; nothing was merged without the team's approval. No NASA logos or branding are used, and no AI content is presented as NASA material.

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
| Claude Code (Anthropic) | Generated all of the game's programming code and drafted in-game text, from the team's instructions; helped generate the dream videos | Anthropic service |
| Kokoro-82M | Open-source text-to-speech: voices in the dream videos | Apache 2.0 |
