import {
auth,
db,
createUserWithEmailAndPassword,
signInWithEmailAndPassword,
set,
ref,
onAuthStateChanged
} from "./firebase.js";



document.addEventListener("DOMContentLoaded", () => {
    // 1. Get elements inside the loader
    const loginPass = document.getElementById("loginPassword");
    const toggleLogin = document.getElementById("toggleLoginPassword");

    // 2. ONLY set the onclick if the element actually exists
    if (toggleLogin && loginPass) {
        toggleLogin.onclick = () => {
            const isPassword = loginPass.type === "password";
            loginPass.type = isPassword ? "text" : "password";
            
            // Swap icons (Make sure Font Awesome is linked in your <head>)
            toggleLogin.className = isPassword ? "fas fa-eye-slash" : "fas fa-eye";
        };
    } else {
        console.warn("Login password toggle elements not found on this page.");
    }
});
document.addEventListener("DOMContentLoaded", () => {
    // 1. DEFINE the elements (Crucial Step)
    const signupPass = document.getElementById("signupPassword");
    const toggleSignup = document.getElementById("toggleSignupPassword");

    // 2. CHECK if they exist before adding the click
    if (toggleSignup && signupPass) {
        toggleSignup.onclick = () => {
            const isPassword = signupPass.type === "password";
            signupPass.type = isPassword ? "text" : "password";
            
            // 3. TOGGLE the icon classes (Cleaner than using .innerHTML)
            toggleSignup.className = isPassword ? "fas fa-eye-slash" : "fas fa-eye";
        };
    }
});

// ================= SIGNUP =================

const signupBtn = document.getElementById("createAccountBtn")

signupBtn.onclick = async () => {

const name = document.getElementById("signupName").value
const email = document.getElementById("signupEmail").value
const password = document.getElementById("signupPassword").value

const message = document.getElementById("signupMessage")

// loading
signupBtn.classList.add("loading")
signupBtn.innerHTML =
`<div class="auth-loading">
<div class="spinner"></div>
Creating...
</div>`

try{

const userCred =
await createUserWithEmailAndPassword(auth,email,password)

await set(ref(db,"users/"+userCred.user.uid),{
name:name,
email:email,
portfolio:{
btc:0,
eth:0,
sol:0,
trx:0
},
nfts:{
genesis:0
},
activity:{}
})

message.innerText="Account created successfully"
message.className="auth-message success"

setTimeout(()=>{
window.location.href="user.html"
},1500)

}catch(err){

message.innerText = err.message
message.className="auth-message error"

signupBtn.classList.remove("loading")
signupBtn.innerText="Create account"

}
}
// ================= LOGIN =================

const loginBtn = document.getElementById("loginBtn")

loginBtn.onclick = async () => {

const email = document.getElementById("loginEmail").value
const password = document.getElementById("loginPassword").value

const message = document.getElementById("loginMessage")

loginBtn.classList.add("loading")
loginBtn.innerHTML =
`<div class="auth-loading">
<div class="spinner"></div>
Signing in...
</div>`

try{

await signInWithEmailAndPassword(auth,email,password)

message.innerText="Login successful"
message.className="auth-message success"

setTimeout(()=>{
window.location.href="user.html"
},1000)

}catch(err){

message.innerText="Invalid email or password"
message.className="auth-message error"

loginBtn.classList.remove("loading")
loginBtn.innerText="Sign in"

}

}
