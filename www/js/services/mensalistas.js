import { db } from '../config/firebase.js';
import {
  collection, doc, addDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const COL = 'mensalistas';

export const STATUS_MENSALISTA = {
  ATIVO:     'ativo',
  VENCIDO:   'vencido',
  CANCELADO: 'cancelado'
};

export async function addMensalista({ usuarioId, veiculoId, plano, vencimento }) {
  return addDoc(collection(db, COL), {
    usuarioId,
    veiculoId,
    plano,
    vencimento: Timestamp.fromDate(new Date(vencimento)),
    status: STATUS_MENSALISTA.ATIVO
  });
}

export async function getMensalistas(statusFilter) {
  const q = (statusFilter && statusFilter !== 'all')
    ? query(collection(db, COL), where('status', '==', statusFilter), orderBy('vencimento'))
    : query(collection(db, COL), orderBy('vencimento'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateMensalista(id, data) {
  if (data.vencimento) data.vencimento = Timestamp.fromDate(new Date(data.vencimento));
  return updateDoc(doc(db, COL, id), data);
}

export async function deleteMensalista(id) {
  return deleteDoc(doc(db, COL, id));
}

export async function countMensalistasAtivos() {
  const q = query(collection(db, COL), where('status', '==', STATUS_MENSALISTA.ATIVO));
  const snap = await getDocs(q);
  return snap.size;
}

/** Verifica e marca mensalistas vencidos */
export async function verificarVencimentos() {
  const agora = Timestamp.now();
  const q = query(
    collection(db, COL),
    where('status', '==', STATUS_MENSALISTA.ATIVO),
    where('vencimento', '<', agora)
  );
  const snap = await getDocs(q);
  await Promise.all(
    snap.docs.map(d => updateDoc(doc(db, COL, d.id), { status: STATUS_MENSALISTA.VENCIDO }))
  );
  return snap.size;
}

export function onMensalistasChange(callback) {
  const q = query(collection(db, COL), orderBy('vencimento'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}
