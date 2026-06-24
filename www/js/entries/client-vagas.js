import { onReady } from '../utils.js';
import { initLayout } from '../layout.js';
import { initClientSpots } from '../pages/client/spots.js';
onReady(() => {
  initLayout({ title: 'Vagas disponíveis' }).then(user => initClientSpots(user)).catch(() => {});
});
