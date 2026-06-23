import { auth, db } from '../config/firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  query,
  collection,
  where,
  getDocs
} from 'firebase/firestore';

export async function registerUser({ nome, email, telefone, senha }) {
  const q = query(collection(db, 'usuarios'), where('telefone', '==', telefone));
  const snap = await getDocs(q);
  if (!snap.empty) throw new Error('Este telefone já está cadastrado.');

  const credential = await createUserWithEmailAndPassword(auth, email, senha);
  const uid = credential.user.uid;

  await setDoc(doc(db, 'usuarios', uid), {
    nome,
    email,
    telefone,
    tipo: 'cliente'
  });

  return credential.user;
}

export async function loginUser(email, senha) {
  const credential = await signInWithEmailAndPassword(auth, email, senha);
  const uid = credential.user.uid;
  const userDoc = await getDoc(doc(db, 'usuarios', uid));
  if (!userDoc.exists()) throw new Error('Usuário não encontrado no sistema.');
  return { uid, ...userDoc.data() };
}

export async function logoutUser() {
  await signOut(auth);
}

export async function getCurrentUserData() {
  const user = auth.currentUser;
  if (!user) return null;
  const snap = await getDoc(doc(db, 'usuarios', user.uid));
  if (!snap.exists()) return null;
  return { uid: user.uid, ...snap.data() };
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function getClientes() {
  const snap = await getDocs(query(collection(db, 'usuarios'), where('tipo', '==', 'cliente')));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

export async function loginWithGoogle() {
  if (typeof window.cordova !== 'undefined') {
    throw new Error('Login com Google não está disponível na versão mobile.');
  }
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  const user = credential.user;
  const userRef = doc(db, 'usuarios', user.uid);
  const userDoc = await getDoc(userRef);
  if (!userDoc.exists()) {
    await setDoc(userRef, {
      nome: user.displayName || 'Usuário Google',
      email: user.email,
      telefone: '',
      tipo: 'cliente'
    });
    return { uid: user.uid, nome: user.displayName || 'Usuário Google', email: user.email, telefone: '', tipo: 'cliente' };
  }
  return { uid: user.uid, ...userDoc.data() };
}
