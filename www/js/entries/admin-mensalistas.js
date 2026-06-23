import { onReady } from '../utils.js';
import { initLayout } from '../layout.js';
import { initAdminSubscribers } from '../pages/admin/subscribers.js';
onReady(() => {
  initLayout({ title: 'Mensalistas' }).then(user => initAdminSubscribers(user)).catch(() => {});
});
