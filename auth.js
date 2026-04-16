import {
auth,
db,
createUserWithEmailAndPassword,
signInWithEmailAndPassword,
set,
ref
} from "./firebase.js";

document.addEventListener("DOMContentLoaded", () => {

// ================= PASSWORD TOGGLE =================

const login = document.getElementById("loginPassword")
const signupPass = document.getElementById("signupPassword")

const toggleLogin = document.getElementById("toggleLoginPassword")
const toggleSignup = document.getElementById("toggleSignupPassword")

toggleLogin.onclick = () => {
loginPass.type =
loginPass.type === "password" ? "text" : "password"
}

toggleSignup.onclick = () => {
signupPass.type =
signupPass.type === "password" ? "text" : "password"
}


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

});