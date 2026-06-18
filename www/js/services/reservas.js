import { db } from '../config/firebase.js';
import { reservarVagaAtomico, updateStatusVaga, STATUS_VAGA } from './vagas.js';
import {
  collection, doc, addDoc, getDocs, updateDoc,
  query, where, onSnapshot, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const COL = 'reservas';
const EXPIRACAO_MINUTOS = 30;

export const STATUS_RESERVA = {
  ATIVA:     'ativa',
  EXPIRADA:  'expirada',
  CONCLUIDA: 'concluida',
  CANCELADA: 'cancelada'
};

/** Cria reserva atomicamente. Lança erro se vaga não disponível. */
export async function criarReserva({ usuarioId, vagaId, veiculoId }) {
  const vagaOk = await reservarVagaAtomico(vagaId);
  if (!vagaOk) throw new Error('Esta vaga não está mais disponível. Selecione outra.');

  const agora = Timestamp.now();
  const expira = Timestamp.fromMillis(agora.toMillis() + EXPIRACAO_MINUTOS * 60 * 1000);

  return addDoc(collection(db, COL), {
    usuarioId,
    vagaId,
    veiculoId,
    status: STATUS_RESERVA.ATIVA,
    criadoEm: agora,
    expiraEm: expira
  });
}

export async function getReservaAtivaDoUsuario(usuarioId) {
  const snap = await getDocs(query(collection(db, COL), where('usuarioId', '==', usuarioId)));
  const ativa = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .find(d => d.status === STATUS_RESERVA.ATIVA);
  return ativa ?? null;
}

export async function getReservasDoUsuario(usuarioId) {
  const snap = await getDocs(query(collection(db, COL), where('usuarioId', '==', usuarioId)));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.criadoEm?.toMillis?.() ?? 0) - (a.criadoEm?.toMillis?.() ?? 0));
}

export async function cancelarReserva(reservaId, vagaId) {
  await updateDoc(doc(db, COL, reservaId), { status: STATUS_RESERVA.CANCELADA });
  await updateStatusVaga(vagaId, STATUS_VAGA.LIVRE);
}

export async function concluirReserva(reservaId) {
  await updateDoc(doc(db, COL, reservaId), { status: STATUS_RESERVA.CONCLUIDA });
}

export async function expirarReserva(reservaId, vagaId) {
  await updateDoc(doc(db, COL, reservaId), { status: STATUS_RESERVA.EXPIRADA });
  await updateStatusVaga(vagaId, STATUS_VAGA.LIVRE);
}

export async function countReservasAtivas() {
  const q = query(collection(db, COL), where('status', '==', STATUS_RESERVA.ATIVA));
  const snap = await getDocs(q);
  return snap.size;
}

export function onReservasAtivasChange(callback) {
  const q = query(collection(db, COL), where('status', '==', STATUS_RESERVA.ATIVA));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}
