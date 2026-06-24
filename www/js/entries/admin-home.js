import { onReady } from '../utils.js';
import { initLayout } from '../layout.js';
import { initAdminDashboard } from '../pages/admin/dashboard.js';
onReady(() => {
  initLayout({ title: 'Dashboard' }).then(user => initAdminDashboard(user)).catch(() => {});
});
