import './styles/main.css';
import { App } from './view/app';

const stage = document.getElementById('stage')!;
const app = new App(stage);
void app.boot().then(async () => {
  const q = new URLSearchParams(location.search);
  if (q.has('debug')) (await import('./view/debug/panel')).mountDebug(app);
  if (q.get('zones') === 'edit') (await import('./view/debug/zone-editor')).mountZoneEditor(stage);
});
