import { onReady } from '../utils.js';
import { initLayout } from '../layout.js';
import { initAdminEntry } from '../pages/admin/entry.js';
onReady(() => {
  initLayout({ title: 'Entrada / Saída' }).then(user => initAdminEntry(user)).catch(() => {});
});
