import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth }       from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore }  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            "AIzaSyA3KSrOpU3FW_ektyPLD7ChPcETR6LOb3M",
  authDomain:        "estacionamento-fbcee.firebaseapp.com",
  projectId:         "estacionamento-fbcee",
  storageBucket:     "estacionamento-fbcee.firebasestorage.app",
  messagingSenderId: "102641635598",
  appId:             "1:102641635598:web:0f72152ff0cb86fe16475f"
};

export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
