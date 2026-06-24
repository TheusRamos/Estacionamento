import { onReady } from '../utils.js';
import { initLayout } from '../layout.js';
import { initAdminSectors } from '../pages/admin/sectors.js';
onReady(() => {
  initLayout({ title: 'Setores e Vagas' }).then(user => {
    document.getElementById('topbar-actions').innerHTML = `
      <button class="icon-btn" id="btn-seed-matrix" title="Gerar matriz padrão (3 fileiras × 16 vagas)">
        <span class="material-symbols-rounded">auto_awesome</span>
      </button>
      <button class="icon-btn" id="btn-add-sector" title="Novo setor">
        <span class="material-symbols-rounded">add_box</span>
      </button>`;
    initAdminSectors(user);
  }).catch(() => {});
});
