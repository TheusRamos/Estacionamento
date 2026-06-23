import { onReady } from '../utils.js';
import { initLayout } from '../layout.js';
import { initClientVehicles } from '../pages/client/vehicles.js';
onReady(() => {
  initLayout({ title: 'Meus veículos' }).then(user => initClientVehicles(user)).catch(() => {});
});
