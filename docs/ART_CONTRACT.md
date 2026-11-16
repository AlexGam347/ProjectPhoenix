# Art contract

**Render:** EEVEE (or Cycles with few samples and denoising). Same camera and resolution for every layer of a room.

**Format:** 8-bit PNG, **1920×1080**. For FNAF-style camera panning, render the room at **2880×1080** with a wider field of view.
The game detects the size by itself.

**Names:** `C{n}_{ROOM}_{type}[_{detail}].png` using the catalog ids.
Rooms: `C1_CONTROL`, `C2_AGUA`, `C3_OXIGENO`, `C4_INVERNADERO`, `C5_ENERGIA`.

| Priority | What | Files | If missing |
|---|---|---|---|
| **P0** | Background of the 5 rooms, interior lights on | `C1_CONTROL_base.png` … `C5_ENERGIA_base.png` | Dossier sketch |
| **P0** | Screenshot of each render with the interactive objects marked | (to draw the click zones) | Zones on the sketch |
| **P1** | Catalog thumbnail per upgrade, transparent 512×512 | `UPG_dep1.png`, `UPG_tal1.png` … (26) | SVG icon |
| **P1** | Transparent layer for each level I upgrade (15) | `C2_AGUA_upg_dep1.png`, `C2_AGUA_upg_tal1.png` … | List of installed upgrades |
| **P1** | Red emergency version of the 5 rooms | `C1_CONTROL_base_tormenta_solar.png` … | CSS red layer |
| **P2** | Top-down orthographic render of the base for the day blueprint | `BLUEPRINT_base.png` (16:9) | Drawn blueprint |
| **P2** | Level II and III layers (11) | `C2_AGUA_upg_dep2.png` … | Level I layer is reused |

**Upgrade layers:** *Film → Transparent*; render only the object, with the rest of the room as *holdout*.

**Faults:** not rendered. Alarm light, frost, smoke and dust are drawn in 2D.

**Interactive objects that must be visible in the render:**
Control: 4 doors, catalog kiosk, Earth screen, YANA. Water: ice melter, filter, heat valve.
Oxygen: electrolyzer, CO₂ filter. Greenhouse: lettuce shelf, air filter. Energy: solar field window, power panel, batteries.

**Videos** (`public/assets/video/`): MP4 H.264, 1280×720 or 1920×1080, under 15 MB.
`dream1.mp4`, `dream2.mp4`, `dream3.mp4` and `finale.mp4` (the same arrival cinematic for all three endings; the epilogue text and the GOOD / MID / BAD ENDING card come after it, from `src/data/story.en.json`), with optional English subtitles
`dream1.en.vtt` … Any missing video shows a placeholder frame and the game continues.

```bash
ffmpeg -i input.mov -c:v libx264 -crf 23 -preset slow -c:a aac -b:a 128k -movflags +faststart dream1.mp4
```
