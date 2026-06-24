import { onReady } from '../utils.js';
import { initLayout } from '../layout.js';
import { initAdminClients } from '../pages/admin/clients.js';
onReady(() => {
  initLayout({ title: 'Clientes' }).then(user => initAdminClients(user)).catch(() => {});
});
