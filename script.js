import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

// 1. Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAKBOMRiNdLnkctLWMrxaKX1J3_kGDYcCg",
    authDomain: "crestonwallet.firebaseapp.com",
    projectId: "crestonwallet",
    storageBucket: "crestonwallet.firebasestorage.app",
    messagingSenderId: "239942367536",
    appId: "1:239942367536:web:a1110501538188914af0f5",
    measurementId: "G-1VN3ZHMV01",
    databaseURL: "https://crestonwallet-default-rtdb.firebaseio.com"
};

// 2. Initialize
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// 3. Auth Listener (Redirect if already logged in)
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User already logged in. Redirecting...");
        window.location.assign("dashboard.html");
    }
});

// 4. Sign-In Logic
let isSigningIn = false;

async function signInWithGoogle() {
    if (isSigningIn) return;
    isSigningIn = true;

    try {
        const result = await signInWithPopup(auth, provider);
        console.log("Success! Welcome", result.user.displayName);
        // The onAuthStateChanged above will handle the redirection automatically
    } catch (error) {
        if (error.code === 'auth/popup-closed-by-user') {
            console.warn("User closed the popup.");
        } else {
            console.error("Sign-in Error:", error.code);
            alert("Login failed. Check your internet or firewall.");
        }
    } finally {
        isSigningIn = false;
    }
}

// 5. Event Listeners
const googleBtn = document.getElementById("googleBtn");
if (googleBtn) {
    googleBtn.addEventListener("click", signInWithGoogle);
}

// 6. Navigation / UI Logic (Smooth Scroll)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
});




// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
    if (this.getAttribute('href') !== '#') {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
        target.scrollIntoView({
            behavior: 'smooth'
        });
        }
    }
    });
});

// Close mobile menu when clicking a link
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
    const navMenu = document.querySelector('.nav-menu');
    if (navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
    }
    });
});

// Keyboard escape for mobile menu
document.addEventListener('keydown', (e) => {
    if (e.key === "Escape") {
    const navMenu = document.querySelector('.nav-menu');
    if (navMenu.classList.contains('active')) navMenu.classList.remove('active');
    }
});



//DASHBOARD.JS

// This file would contain the logic for the dashboard page, such as fetching user data, displaying mining stats, etc.
// For now, it's just a placeholder to show where that code would go.


import { getDatabase, ref, get, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const db = getDatabase();

// --- 1. THE POPULATOR (Check if exists, if not, create) ---
async function handleUserLogin(user) {
    const db = getDatabase();
    const userRef = ref(db, 'users/' + user.uid);

    // 1. Check if the user already exists in the database
    const snapshot = await get(userRef);

    if (!snapshot.exists()) {
        // 2. If they DON'T exist, this is their first time!
        console.log("New user detected! Granting $230 bonus...");
        
        await set(userRef, {
            username: user.displayName,
            email: user.email,
            balance_usd: 230.00, // The starting bonus
            mining_power: 1.0,    // Default mining speed
            join_date: new Date().toISOString()
        });
        
        alert("Welcome! A $230 starter bonus has been added to your wallet.");
    } else {
        console.log("Returning user. Loading existing balance.");
    }
    
    // Proceed to load dashboard...
}
// --- 3. THE UI UPDATER (Inject data into HTML) ---
function updateDashboardUI(data) {
  // Use the new nested structure: data.balances.xxx
  const b = data.balances;

  // Update USD
  document.getElementById('display-usd').innerText = b.usd.toLocaleString('en-US', {minimumFractionDigits: 2});

  // Update Cryptos
  document.getElementById('display-btc').innerText = `${b.btc.toFixed(6)} BTC`;
  document.getElementById('display-eth').innerText = `${b.eth.toFixed(6)} ETH`;
  document.getElementById('display-trx').innerText = `${b.trx.toFixed(2)} TRX`;
  document.getElementById('display-doge').innerText = `${b.doge.toFixed(2)} DOGE`;

  // Update Username
  document.getElementById('display-username').innerText = `${data.username} 👋`;
}