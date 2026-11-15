# Contrato de recursos con el equipo de arte

**Render:** EEVEE (o Cycles con pocas muestras y denoiser). Misma cámara y misma resolución para todas las capas de una sala.

**Formato:** PNG 8 bits, **1920×1080**. Si queréis el giro de cámara estilo FNAF, renderizad la sala a **2880×1080**
con más campo de visión: el juego desplaza la vista con el ratón. El motor detecta el tamaño solo; no hace falta decidirlo antes.

**Nombres:** `C{n}_{SALA}_{tipo}[_{detalle}].png` con los id del catálogo.
Salas: `C1_CONTROL`, `C2_AGUA`, `C3_OXIGENO`, `C4_INVERNADERO`, `C5_ENERGIA`.

| Prioridad | Qué | Archivos | Si no llega |
|---|---|---|---|
| **P0** | Fondo de las 5 salas con la luz interior encendida | `C1_CONTROL_base.png` … `C5_ENERGIA_base.png` | Boceto del dossier |
| **P0** | Captura de cada render con los objetos interactivos señalados | (para dibujar las zonas) | Zonas sobre el boceto |
| **P1** | Capa transparente de cada mejora de nivel I (15) | `C2_AGUA_upg_dep1`, `_tal1`, `_rec1` · `C3_OXIGENO_upg_tan1`, `_ele1`, `_mox1` · `C4_INVERNADERO_upg_des1`, `_est1`, `_led1` · `C5_ENERGIA_upg_bat1`, `_pan1`, `_rea1`, `_rob1` · `C1_CONTROL_upg_bli1`, `_pre1` | Lista de mejoras instaladas |
| **P1** | Versión en rojo de emergencia de las 5 salas | `C1_CONTROL_base_tormenta_solar.png` … | Capa roja en CSS |
| **P2** | Capas de nivel II/III (11) | `C2_AGUA_upg_dep2.png` … | Se reutiliza la del nivel I |

**Capas de mejora:** *Film → Transparent*; renderizad solo el objeto con el resto de la sala como *holdout*.

**Averías:** no se renderizan. Alarma, escarcha, humo y polvo se pintan en 2D.

**Objetos interactivos que necesitan verse en el render** (las zonas clicables):
- Control: 4 puertas (Agua, Energía, Oxígeno, Invernadero), kiosco del catálogo, pantalla de la Tierra, YANA.
- Agua: fundidor de hielo, filtro, válvula de calor.
- Oxígeno: electrolizador, filtro de CO₂.
- Invernadero: estante de lechugas, filtro de aire.
- Energía: ventanal al campo solar, cuadro eléctrico, baterías.

**Vídeos:** MP4 H.264 1280×720 o 1920×1080, < 15 MB, < 90 s: `prologo`, `sueno1`, `sueno2`, `sueno3`,
`final_bueno`, `final_justo`, `final_malo`. Pasadnos el texto de lo que se dice para los subtítulos.
Si vienen en otro formato:

```bash
ffmpeg -i entrada.mov -c:v libx264 -crf 23 -preset slow -c:a aac -b:a 128k -movflags +faststart sueno1.mp4
```

**Audio (opcional):** ambiente por sala, alarma, compuertas, botones, música de tormenta (OGG o MP3).
Ahora el juego usa sonidos sintetizados.
