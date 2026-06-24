import { db } from '../config/firebase.js';
import {
  collection, doc, addDoc, getDocs, updateDoc, deleteDoc,
  onSnapshot, query, orderBy
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const COL = 'setores';

export async function addSetor({ nome, totalVagas }) {
  return addDoc(collection(db, COL), { nome, totalVagas: Number(totalVagas) });
}

export async function getSetores() {
  const q = query(collection(db, COL), orderBy('nome'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateSetor(id, data) {
  if (data.totalVagas !== undefined) data.totalVagas = Number(data.totalVagas);
  return updateDoc(doc(db, COL, id), data);
}

export async function deleteSetor(id) {
  return deleteDoc(doc(db, COL, id));
}

export function onSetoresChange(callback) {
  const q = query(collection(db, COL), orderBy('nome'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}
