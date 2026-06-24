import { db } from '../config/firebase.js';
import {
  collection, addDoc, getDocs, query, where, Timestamp
} from 'firebase/firestore';

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
  const snap = await getDocs(query(collection(db, COL), where('usuarioId', '==', usuarioId)));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.criadoEm?.toMillis?.() ?? 0) - (a.criadoEm?.toMillis?.() ?? 0));
}

export async function getFaturamentoHoje() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const q = query(collection(db, COL), where('criadoEm', '>=', Timestamp.fromDate(hoje)));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => d.data())
    .filter(d => d.status === STATUS_PAGAMENTO.APROVADO)
    .reduce((sum, d) => sum + (d.valor || 0), 0);
}
