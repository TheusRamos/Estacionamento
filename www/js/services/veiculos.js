import { db } from '../config/firebase.js';
import {
  collection, doc, addDoc, getDocs, updateDoc, deleteDoc,
  query, where, onSnapshot
} from 'firebase/firestore';

const COL = 'veiculos';

export async function addVeiculo(usuarioId, { placa, modelo, cor }) {
  placa = placa.toUpperCase().trim();
  const q = query(collection(db, COL), where('usuarioId', '==', usuarioId), where('placa', '==', placa));
  const snap = await getDocs(q);
  if (!snap.empty) throw new Error('Este veículo já está cadastrado na sua conta.');
  return addDoc(collection(db, COL), { placa, modelo, cor, usuarioId });
}

export async function getVeiculosDoUsuario(usuarioId) {
  const q = query(collection(db, COL), where('usuarioId', '==', usuarioId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateVeiculo(id, data) {
  if (data.placa) data.placa = data.placa.toUpperCase().trim();
  return updateDoc(doc(db, COL, id), data);
}

export async function deleteVeiculo(id) {
  return deleteDoc(doc(db, COL, id));
}

export function onVeiculosChange(usuarioId, callback) {
  const q = query(collection(db, COL), where('usuarioId', '==', usuarioId));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}
