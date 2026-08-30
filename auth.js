import {
    auth,
    db,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    set,
    ref,
    onAuthStateChanged
} from "./firebase.js";

// ================= TOGGLE VISIBILITY =================
document.addEventListener("DOMContentLoaded", () => {
    const loginPass = document.getElementById("loginPassword");
    const toggleLogin = document.getElementById("toggleLoginPassword");
    if (toggleLogin && loginPass) {
        toggleLogin.onclick = () => {
            const isPassword = loginPass.type === "password";
            loginPass.type = isPassword ? "text" : "password";
            toggleLogin.className = isPassword ? "fas fa-eye-slash" : "fas fa-eye";
        };
    }

    const signupPass = document.getElementById("signupPassword");
    const toggleSignup = document.getElementById("toggleSignupPassword");
    if (toggleSignup && signupPass) {
        toggleSignup.onclick = () => {
            const isPassword = signupPass.type === "password";
            signupPass.type = isPassword ? "text" : "password";
            toggleSignup.className = isPassword ? "fas fa-eye-slash" : "fas fa-eye";
        };
    }
});

// ================= SIGNUP WITH EMAIL VERIFICATION =================
const signupBtn = document.getElementById("createAccountBtn");

if (signupBtn) {
    signupBtn.onclick = async () => {
        const name = document.getElementById("signupName").value;
        const email = document.getElementById("signupEmail").value;
        const password = document.getElementById("signupPassword").value;
        const message = document.getElementById("signupMessage");

        signupBtn.classList.add("loading");
        signupBtn.innerHTML = `<div class="auth-loading"><div class="spinner"></div>Creating...</div>`;

        try {
            // 1. Create User
            const userCred = await createUserWithEmailAndPassword(auth, email, password);
            
            // 2. Save User Data to Realtime Database
            await set(ref(db, "users/" + userCred.user.uid), {
                name: name,
                email: email,
                portfolio: { btc: 0, eth: 0, sol: 0, trx: 0 },
                nfts: { genesis: 0 },
                activity: {}
            });

            // 3. Send Verification Email (OTP Link)
            await sendEmailVerification(userCred.user);

            // 4. Inform User and Sign Out (Prevent login until verified)
            message.innerText = "Account created! Please check your email inbox to verify your account before logging in.";
            message.className = "auth-message success";
            
            // Sign out until they verify via the email link
            await auth.signOut();

            signupBtn.classList.remove("loading");
            signupBtn.innerText = "Create account";
        } catch (err) {
            message.innerText = err.message;
            message.className = "auth-message error";
            signupBtn.classList.remove("loading");
            signupBtn.innerText = "Create account";
        }
    };
}

// ================= LOGIN WITH EMAIL VERIFICATION CHECK =================
const loginBtn = document.getElementById("loginBtn");

if (loginBtn) {
    loginBtn.onclick = async () => {
        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;
        const message = document.getElementById("loginMessage");

        loginBtn.classList.add("loading");
        loginBtn.innerHTML = `<div class="auth-loading"><div class="spinner"></div>Signing in...</div>`;

        try {
            const userCred = await signInWithEmailAndPassword(auth, email, password);
            
            // Check if email has been verified
            if (!userCred.user.emailVerified) {
                message.innerText = "Please verify your email address before signing in. Check your inbox.";
                message.className = "auth-message error";
                
                await auth.signOut();
                loginBtn.classList.remove("loading");
                loginBtn.innerText = "Sign in";
                return;
            }

            message.innerText = "Login successful";
            message.className = "auth-message success";
            setTimeout(() => { window.location.href = "user.html"; }, 1000);
        } catch (err) {
            message.innerText = "Invalid email or password";
            message.className = "auth-message error";
            loginBtn.classList.remove("loading");
            loginBtn.innerText = "Sign in";
        }
    };
}

// ================= ADMIN & ROUTE GUARD =================
onAuthStateChanged(auth, (user) => {
    if (!user) {
        console.log("Auth: No user logged in.");
        return;
    }

    // Block unverified users if they attempt to access user pages directly
    if (!user.emailVerified) {
        auth.signOut();
        return;
    }

    const adminEmails = ["unveilingnight@gmail.com", "revoutpay@gmail.com"];
    const isAdmin = adminEmails.includes(user.email.toLowerCase());
    const isDashboard = document.getElementById('balanceCard') !== null;

    if (isAdmin && isDashboard) {
        if (!document.getElementById('adminLink')) {
            const btn = document.createElement('button');
            btn.id = 'adminLink';
            btn.innerHTML = 'Admin Panel';
            Object.assign(btn.style, {
                position: 'fixed', bottom: '20px', right: '20px',
                background: '#e11d48', color: 'white', padding: '12px',
                borderRadius: '8px', zIndex: '9999', cursor: 'pointer'
            });
            btn.onclick = () => window.location.href = "admin.html";
            document.body.appendChild(btn);
        }
    }
});
