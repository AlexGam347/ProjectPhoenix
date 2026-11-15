# Project Phoenix · Superbase Central

Juego educativo para el navegador (7–14 años, ~30 min) del NASA Space Apps Challenge.
Eres el comandante de una base en Marte: de noche mantienes el agua, el oxígeno, la comida y la energía;
de día mejoras la base. Cuatro noches, tres días, una tormenta de arena y una tormenta solar final.

## Arrancar

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # reglas, equilibrio, datos y máquina de estados
npm run build      # sitio estático en dist/
```

- `?debug=1` abre el panel de depuración: saltar a cualquier noche o día, reloj ×10, ver zonas, ir al final.
- `?zones=edit` abre el editor de zonas clicables (para dibujar las zonas sobre los renders reales).

## Cómo está hecho

| Carpeta | Qué hay |
|---|---|
| `src/rules/` | Reglas puras sin DOM: `economy.ts` (fórmula del amanecer, compras), `night.ts` (motor de la noche), `simulate.ts` (port literal del simulador del dossier), `bot.ts` (jugador automático para calibrar) |
| `src/state/` | Máquina de estados de la partida (`game.ts`) y guardado en `localStorage` (`save.ts`) |
| `src/view/` | Pantallas, sala por capas, HUD, YANA, minijuegos, depuración |
| `src/data/` | **Todo el contenido editable en JSON**: cifras, mejoras, tareas, averías, noches, salas y zonas, textos de YANA, preguntas, historia, créditos |
| `scripts/` | `convert-images.mjs` (PNG → WebP), `fetch-donki.mjs` (llamarada real en el build), `placeholder-zones.mjs` |

**Una sola fórmula.** Las barras se animan con `display(t)` y el amanecer usa `display(6)`, que es exactamente
`max(0, min(tope, reserva + producción·funcionamiento + tareas(+)) − consumo − mantenimiento − tareas(−) − tormenta)`.
Un test lo comprueba.

**Equilibrio.** `tests/simulate.test.ts` reproduce la tabla del dossier (Equilibrado: bueno/bueno/justo; Solo máquinas:
malo×3; Solo almacén: justo/malo/malo). `tests/bot.test.ts` juega el motor real con un bot y comprueba que da los mismos
finales. **Si cambiáis cifras en `src/data/`, ejecutad `npm test`.**

## Arte: cómo añadir los renders de Blender

Mientras no haya renders, el juego usa los bocetos del dossier. Para sustituirlos:

1. Deja los PNG en `art-src/` con los nombres del contrato (`docs/CONTRATO_ARTE.md`).
2. `npm run images` → crea los WebP y `public/assets/rooms/manifest.json`.
3. Abre `?zones=edit`, redibuja las zonas de esa sala y pega el JSON en `src/data/rooms/<sala>.json`.

Se puede hacer sala a sala: lo que no tenga render sigue con el boceto.

Vídeos: `public/assets/video/prologo.mp4`, `sueno1..3.mp4`, `final_bueno|justo|malo.mp4` (H.264) y sus subtítulos
`*.es.vtt`. Si falta uno, se muestra una tarjeta con texto.

## NASA

- **DONKI** (vía NASA Open APIs / CCMC): la Noche 4 muestra una llamarada solar real. Se descarga en el build
  (`npm run donki`, clave en el secreto `NASA_API_KEY` del repositorio); el cliente nunca ve la clave.
  Si la API falla, se usa `src/data/donki-fallback.json` (X9.0 del 3 de octubre de 2024).
- Créditos con las fuentes y el aviso: «NASA does not endorse any non-U.S. Government entity and is not responsible
  for information contained on non-U.S. Government websites.» Sin logotipos ni insignias de la NASA.

## Despliegue

`.github/workflows/deploy.yml` publica en GitHub Pages en cada push a `main` (tests → DONKI → build).
En el repositorio: *Settings → Pages → Source: GitHub Actions*.
