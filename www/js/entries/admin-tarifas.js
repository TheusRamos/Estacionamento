import { onReady } from '../utils.js';
import { initLayout } from '../layout.js';
import { initAdminRates } from '../pages/admin/rates.js';
onReady(() => {
  initLayout({ title: 'Tarifas' }).then(user => {
    document.getElementById('topbar-actions').innerHTML =
      `<button class="icon-btn" id="btn-add-rate" title="Nova tarifa">
        <span class="material-symbols-rounded">add</span>
      </button>`;
    initAdminRates(user);
  }).catch(() => {});
});
