import '@fontsource/vt323/400.css';
import './styles/main.css';
import { App } from './view/app';

// Hoja de sprites de YANA (pixel art del equipo), con la ruta base del sitio.
// URL absoluta: en una variable CSS una ruta relativa se resolvería respecto a la carpeta del CSS.
document.documentElement.style.setProperty('--yana-img', `url(${new URL(`${import.meta.env.BASE_URL}assets/yana/yana.png`, location.href).href})`);
const stage = document.getElementById('stage')!;
const app = new App(stage);
void app.boot().then(async () => {
  const q = new URLSearchParams(location.search);
  if (q.has('debug')) (await import('./view/debug/panel')).mountDebug(app);
  if (q.get('zones') === 'edit') (await import('./view/debug/zone-editor')).mountZoneEditor(stage);
});
