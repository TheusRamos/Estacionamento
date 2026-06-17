import { db } from '../config/firebase.js';
import { ocuparVagaAtomico, updateStatusVaga, STATUS_VAGA } from './vagas.js';
import { calcularValorSessao } from './tarifas.js';
import {
  collection, doc, addDoc, getDocs, getDoc, updateDoc,
  query, where, orderBy, onSnapshot, Timestamp, limit
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const COL = 'sessoes';

export const STATUS_SESSAO = {
  EM_ANDAMENTO: 'em andamento',
  FINALIZADA:   'finalizada',
  PAGA:         'paga'
};

/** Registra entrada atomicamente. Lança erro se vaga já ocupada. */
export async function registrarEntrada({ usuarioId, veiculoId, vagaId, tarifaId }) {
  const vagaOk = await ocuparVagaAtomico(vagaId);
  if (!vagaOk) throw new Error('A vaga selecionada já está ocupada.');

  return addDoc(collection(db, COL), {
    usuarioId,
    veiculoId,
    vagaId,
    tarifaId,
    entrada: Timestamp.now(),
    saida:   null,
    valor:   0,
    status:  STATUS_SESSAO.EM_ANDAMENTO
  });
}

/** Registra saída, calcula valor, libera vaga. */
export async function registrarSaida(sessaoId, tarifa) {
  const sessaoRef  = doc(db, COL, sessaoId);
  const sessaoSnap = await getDoc(sessaoRef);
  if (!sessaoSnap.exists()) throw new Error('Sessão não encontrada.');

  const sessao = sessaoSnap.data();
  if (sessao.status !== STATUS_SESSAO.EM_ANDAMENTO) throw new Error('Sessão não está em andamento.');

  const saida   = Timestamp.now();
  const minutos = Math.round((saida.toMillis() - sessao.entrada.toMillis()) / 60000);
  const valor   = calcularValorSessao(tarifa, minutos);

  await updateDoc(sessaoRef, { saida, valor, status: STATUS_SESSAO.FINALIZADA });
  await updateStatusVaga(sessao.vagaId, STATUS_VAGA.LIVRE);

  return { sessaoId, valor, minutos };
}

export async function getSessaoEmAndamentoPorPlaca(placa) {
  const vSnap = await getDocs(
    query(collection(db, 'veiculos'), where('placa', '==', placa.toUpperCase().trim()))
  );
  if (vSnap.empty) return null;

  const veiculoId = vSnap.docs[0].id;
  const q = query(
    collection(db, COL),
    where('veiculoId', '==', veiculoId),
    where('status', '==', STATUS_SESSAO.EM_ANDAMENTO),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, veiculoId, ...d.data() };
}

export async function getSessaoAtivaDoUsuario(usuarioId) {
  const q = query(
    collection(db, COL),
    where('usuarioId', '==', usuarioId),
    where('status', '==', STATUS_SESSAO.EM_ANDAMENTO),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function getSessoesDoUsuario(usuarioId) {
  const q = query(
    collection(db, COL),
    where('usuarioId', '==', usuarioId),
    orderBy('entrada', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getAllSessoes(statusFilter) {
  const q = statusFilter
    ? query(collection(db, COL), where('status', '==', statusFilter), orderBy('entrada', 'desc'))
    : query(collection(db, COL), orderBy('entrada', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getSessoesHoje() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const q = query(
    collection(db, COL),
    where('entrada', '>=', Timestamp.fromDate(hoje)),
    orderBy('entrada', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function onSessoesAtivasChange(callback) {
  const q = query(
    collection(db, COL),
    where('status', '==', STATUS_SESSAO.EM_ANDAMENTO),
    orderBy('entrada', 'desc')
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}
