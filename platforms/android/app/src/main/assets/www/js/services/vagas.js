import { db } from '../config/firebase.js';
import {
  collection, doc, addDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, runTransaction
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const COL = 'vagas';

export const STATUS_VAGA = {
  LIVRE:      'livre',
  OCUPADA:    'ocupada',
  RESERVADA:  'reservada',
  MANUTENCAO: 'manutencao'
};

export async function addVaga({ codigo, setorId, tipo }) {
  codigo = codigo.toUpperCase().trim();
  const q = query(collection(db, COL), where('codigo', '==', codigo));
  const snap = await getDocs(q);
  if (!snap.empty) throw new Error(`Já existe uma vaga com o código "${codigo}".`);
  return addDoc(collection(db, COL), { codigo, setorId, tipo, status: STATUS_VAGA.LIVRE });
}

export async function getVagas() {
  const q = query(collection(db, COL), orderBy('codigo'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getVagasBySetor(setorId) {
  const q = query(collection(db, COL), where('setorId', '==', setorId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.codigo.localeCompare(b.codigo));
}

export async function getVagasLivres() {
  const q = query(collection(db, COL), where('status', '==', STATUS_VAGA.LIVRE));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.codigo.localeCompare(b.codigo));
}

export async function updateVaga(id, data) {
  return updateDoc(doc(db, COL, id), data);
}

export async function updateStatusVaga(id, status) {
  return updateDoc(doc(db, COL, id), { status });
}

export async function deleteVaga(id) {
  return deleteDoc(doc(db, COL, id));
}

/** Reserva atomicamente. Retorna false se não estiver mais livre. */
export async function reservarVagaAtomico(vagaId) {
  const vagaRef = doc(db, COL, vagaId);
  return runTransaction(db, async tx => {
    const snap = await tx.get(vagaRef);
    if (!snap.exists() || snap.data().status !== STATUS_VAGA.LIVRE) return false;
    tx.update(vagaRef, { status: STATUS_VAGA.RESERVADA });
    return true;
  });
}

/** Ocupa atomicamente (aceita livre ou reservada). */
export async function ocuparVagaAtomico(vagaId) {
  const vagaRef = doc(db, COL, vagaId);
  return runTransaction(db, async tx => {
    const snap = await tx.get(vagaRef);
    if (!snap.exists() || snap.data().status === STATUS_VAGA.OCUPADA) return false;
    tx.update(vagaRef, { status: STATUS_VAGA.OCUPADA });
    return true;
  });
}

export function onVagasChange(callback) {
  const q = query(collection(db, COL), orderBy('codigo'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}
