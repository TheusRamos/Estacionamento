import { onReady } from '../utils.js';
import { initLayout } from '../layout.js';
import { initClientDashboard } from '../pages/client/dashboard.js';
onReady(() => {
  initLayout({ title: 'Início' }).then(user => initClientDashboard(user)).catch(() => {});
});
