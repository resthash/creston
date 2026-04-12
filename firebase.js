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
update
} 
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";


const firebaseConfig = { 
  apiKey: "AIzaSyAxm4GyDY2RSJXUI1iFpIHUGiPfiEQX9l8",
  authDomain: "cryptwallet360.firebaseapp.com",
  // ADD THIS LINE BELOW
  databaseURL: "https://cryptwallet360-default-rtdb.firebaseio.com/", 
  projectId: "cryptwallet360",
  storageBucket: "cryptwallet360.firebasestorage.app",
  messagingSenderId: "464447906680",
  appId: "1:464447906680:web:471b3482cf21557437de8d"    
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
update
};


