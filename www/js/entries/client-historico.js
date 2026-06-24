import { onReady } from '../utils.js';
import { initLayout } from '../layout.js';
import { initClientSessions } from '../pages/client/sessions.js';
onReady(() => {
  initLayout({ title: 'Histórico' }).then(user => initClientSessions(user)).catch(() => {});
});
