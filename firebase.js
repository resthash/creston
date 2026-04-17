import { initializeApp } 
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import { 
getAuth,
createUserWithEmailAndPassword,
signInWithEmailAndPassword,
onAuthStateChanged
} 
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { 
getDatabase,
ref,
set,
onValue,
push,
update,
child,
serverTimestamp,
onChildAdded
} 
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";


const firebaseConfig = {
  apiKey: "AIzaSyB9FhVg5fzw18luwnrvu-X9pDdyl_SanP4",
  authDomain: "revoutpaywallet.firebaseapp.com",
  databaseURL: "https://revoutpaywallet-default-rtdb.firebaseio.com",
  projectId: "revoutpaywallet",
  storageBucket: "revoutpaywallet.firebasestorage.app",
  messagingSenderId: "161385768191",
  appId: "1:161385768191:web:2ee1779a4af28dd36158ca",
  measurementId: "G-FE3ZYY0HLN"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);

// export auth functions
export {
createUserWithEmailAndPassword,
signInWithEmailAndPassword,
onAuthStateChanged
};

// export realtime db functions
export {
ref,
set,
onValue,
push,
update,
child,
serverTimestamp,
onChildAdded
};


