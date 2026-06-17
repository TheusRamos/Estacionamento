import { db } from '../config/firebase.js';
import {
  collection, addDoc, getDocs, query, where, orderBy, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const COL = 'pagamentos';

export const STATUS_PAGAMENTO  = { PENDENTE: 'pendente', APROVADO: 'aprovado', RECUSADO: 'recusado' };
export const METODO_PAGAMENTO  = { PIX: 'pix', CARTAO: 'cartao', DINHEIRO: 'dinheiro' };

export async function registrarPagamento({ sessaoId, usuarioId, valor, metodo }) {
  return addDoc(collection(db, COL), {
    sessaoId,
    usuarioId,
    valor: parseFloat(valor),
    metodo,
    status: STATUS_PAGAMENTO.APROVADO,
    criadoEm: Timestamp.now()
  });
}

export async function getPagamentosDoUsuario(usuarioId) {
  const q = query(
    collection(db, COL),
    where('usuarioId', '==', usuarioId),
    orderBy('criadoEm', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getFaturamentoHoje() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const q = query(
    collection(db, COL),
    where('criadoEm', '>=', Timestamp.fromDate(hoje)),
    where('status', '==', STATUS_PAGAMENTO.APROVADO)
  );
  const snap = await getDocs(q);
  return snap.docs.reduce((sum, d) => sum + (d.data().valor || 0), 0);
}
