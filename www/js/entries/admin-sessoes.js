import { onReady } from '../utils.js';
import { initLayout } from '../layout.js';
import { initAdminSessions } from '../pages/admin/sessions.js';
onReady(() => {
  initLayout({ title: 'Sessões' }).then(user => initAdminSessions(user)).catch(() => {});
});
