import { db } from '../config/firebase.js';
import {
  collection, doc, addDoc, getDocs, updateDoc, deleteDoc,
  onSnapshot, query, orderBy
} from 'firebase/firestore';

const COL = 'tarifas';

export const TIPO_TARIFA = { HORA: 'hora', DIARIA: 'diaria', MENSAL: 'mensal' };

export async function addTarifa({ nome, tipo, valor }) {
  valor = parseFloat(valor);
  if (isNaN(valor) || valor <= 0) throw new Error('O valor da tarifa deve ser positivo.');
  return addDoc(collection(db, COL), { nome, tipo, valor });
}

export async function getTarifas() {
  const q = query(collection(db, COL), orderBy('nome'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateTarifa(id, data) {
  if (data.valor !== undefined) {
    data.valor = parseFloat(data.valor);
    if (isNaN(data.valor) || data.valor <= 0) throw new Error('O valor da tarifa deve ser positivo.');
  }
  return updateDoc(doc(db, COL, id), data);
}

export async function deleteTarifa(id) {
  return deleteDoc(doc(db, COL, id));
}

export function onTarifasChange(callback) {
  const q = query(collection(db, COL), orderBy('nome'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

/**
 * Calcula o valor com base na tarifa e no tempo decorrido.
 */
export function calcularValorSessao(tarifa, minutos) {
  if (!tarifa) return 0;
  switch (tarifa.tipo) {
    case TIPO_TARIFA.HORA:   return Math.ceil(minutos / 60) * tarifa.valor;
    case TIPO_TARIFA.DIARIA: return tarifa.valor;
    case TIPO_TARIFA.MENSAL: return tarifa.valor;
    default: return 0;
  }
}
