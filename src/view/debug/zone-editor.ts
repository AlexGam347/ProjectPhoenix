// Editor de zonas (?zones=edit): clic sobre la sala para añadir puntos y copiar el JSON de la zona.
// Coordenadas relativas (0–1) sobre la imagen, para que funcionen a cualquier tamaño.
import { h } from '../dom';

export function mountZoneEditor(stage: HTMLElement) {
  stage.classList.add('show-zones');
  let pts: number[][] = [];
  const out = h('textarea', { readonly: true }) as HTMLTextAreaElement;
  const id = h('input', { value: 'nueva_zona', style: 'width:100%' }) as HTMLInputElement;
  const NS = 'http://www.w3.org/2000/svg';
  const draw = document.createElementNS(NS, 'svg');
  draw.setAttribute('viewBox', '0 0 1 1');
  draw.setAttribute('preserveAspectRatio', 'none');
  draw.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:8');
  const line = document.createElementNS(NS, 'polygon');
  line.setAttribute('style', 'fill:rgba(255,0,200,.2);stroke:#f0c;stroke-width:3;vector-effect:non-scaling-stroke');
  draw.appendChild(line);
  const render = () => {
    line.setAttribute('points', pts.map((p) => p.join(',')).join(' '));
    out.value = JSON.stringify({ id: id.value, label: id.value, poly: pts });
    const scene = stage.querySelector('.scene');
    if (scene && draw.parentElement !== scene) scene.appendChild(draw);
  };
  stage.addEventListener('click', (e) => {
    if (!e.altKey && !editing) return;
    const scene = stage.querySelector('.scene') as HTMLElement | null;
    if (!scene) return;
    const r = scene.getBoundingClientRect();
    pts.push([+((e.clientX - r.left) / r.width).toFixed(3), +((e.clientY - r.top) / r.height).toFixed(3)]);
    e.stopPropagation();
    e.preventDefault();
    render();
  }, true);
  let editing = false;
  const toggle = h('button', { class: '', onclick: () => { editing = !editing; toggle.textContent = editing ? 'Dibujando (clic añade punto)' : 'Empezar a dibujar'; } }, 'Empezar a dibujar');
  const el = h('div', { class: 'zone-editor' },
    h('b', {}, 'Editor de zonas'),
    h('div', {}, 'Ve a la sala, pulsa «Empezar a dibujar» y haz clic en el contorno del objeto (o Alt+clic).'),
    id, toggle,
    h('div', { style: 'display:flex;gap:4px' },
      h('button', { onclick: () => { pts.pop(); render(); } }, 'Quitar punto'),
      h('button', { onclick: () => { pts = []; render(); } }, 'Nueva zona'),
      h('button', { onclick: () => { void navigator.clipboard?.writeText(out.value); } }, 'Copiar JSON')),
    out);
  id.addEventListener('input', render);
  document.body.append(el);
}
