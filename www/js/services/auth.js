import { auth, db } from '../config/firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
<<<<<<< HEAD
  signInWithPopup,
  signInWithCredential
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
=======
  signInWithPopup
} from 'firebase/auth';
>>>>>>> 100a5d01e4cd8728354777d995f0bd977d7e3a92
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
<<<<<<< HEAD
  // No Cordova usa o SDK nativo (sem browser); no web usa popup normal
  if (window.cordova && window.plugins && window.plugins.googleplus) {
    return _loginWithGoogleNative();
=======
  if (typeof window.cordova !== 'undefined') {
    throw new Error('Login com Google não está disponível na versão mobile.');
>>>>>>> 100a5d01e4cd8728354777d995f0bd977d7e3a92
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

async function _loginWithGoogleNative() {
  const googleUser = await new Promise((resolve, reject) => {
    window.plugins.googleplus.login(
      { webClientId: '102641635598-54r3e4cltlv02jan9haah5h3emevdshf.apps.googleusercontent.com', offline: true },
      resolve,
      reject
    );
  });

  const credential = GoogleAuthProvider.credential(googleUser.idToken);
  const result = await signInWithCredential(auth, credential);
  const user = result.user;

  const userRef = doc(db, 'usuarios', user.uid);
  const userDoc = await getDoc(userRef);
  if (!userDoc.exists()) {
    await setDoc(userRef, {
      nome: user.displayName || googleUser.displayName || 'Usuário Google',
      email: user.email,
      telefone: '',
      tipo: 'cliente'
    });
    return { uid: user.uid, nome: user.displayName || googleUser.displayName, email: user.email, telefone: '', tipo: 'cliente' };
  }
  return { uid: user.uid, ...userDoc.data() };
}
