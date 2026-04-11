// ============================
// MARKET PRICES
// ============================

const marketPrices = {
    btc: 73450.50,
    eth: 3820.15,
    trx: 0.3150,
    sol: 188.40,
    doge: 0.175,
    ada: 0.58
};

// ============================
// PORTFOLIO CONFIG
// ============================

const config = {
    totalGoal: 750.00,
    tronAllocation: 10.00
};

// ============================
// ASSETS
// ============================

const assets = [
    { id: 'btc', name: 'BITCOIN', symbol: 'BTC', icon: '₿', color: '#f59e0b', change: '+1.2%', funded: true },
    { id: 'eth', name: 'ETHEREUM', symbol: 'ETH', icon: 'Ξ', color: '#627eea', change: '-0.4%', funded: false },
    { id: 'trx', name: 'TRON', symbol: 'TRX', icon: '▼', color: '#dc2626', change: '+0.1%', funded: true },
    { id: 'sol', name: 'SOLANA', symbol: 'SOL', icon: 'S', color: '#14f195', change: '+5.4%', funded: false },
    { id: 'doge', name: 'DOGECOIN', symbol: 'DOGE', icon: 'Ð', color: '#c2a633', change: '-1.8%', funded: false },
    { id: 'ada', name: 'CARDANO', symbol: 'ADA', icon: 'A', color: '#0033ad', change: '+0.2%', funded: false }
];

// ============================
// WALLET RENDER
// ============================

function renderWallet() {

    const listContainer = document.getElementById('asset-list-container');
    const totalDisplay = document.getElementById('total-display');

    // stop if not on user page
    if (!listContainer || !totalDisplay) return;

    const btcValue = config.totalGoal - config.tronAllocation;
    const btcUnits = btcValue / marketPrices.btc;
    const trxUnits = config.tronAllocation / marketPrices.trx;

    totalDisplay.innerText =
        `$ ${config.totalGoal.toLocaleString(undefined,{
            minimumFractionDigits:2
        })}`;

    listContainer.innerHTML = '';

    assets.forEach(asset => {

        let displayUsd = 0;
        let displayUnits = 0;

        if (asset.id === 'btc') {
            displayUsd = btcValue;
            displayUnits = btcUnits;
        }

        else if (asset.id === 'trx') {
            displayUsd = config.tronAllocation;
            displayUnits = trxUnits;
        }

        const isPositive = asset.change.includes('+');

        const row = `
        <div class="asset-item ${!asset.funded ? 'unfunded' : ''}">
            <div class="asset-left">
                <div class="icon" style="background:${asset.color}">
                    ${asset.icon}
                </div>

                <div class="meta">
                    <span class="name">${asset.name}</span>

                    <span class="price-info">
                        $${marketPrices[asset.id].toLocaleString()}
                        <small class="${isPositive ? 'pos' : 'neg'}">
                            ${asset.change}
                        </small>
                    </span>
                </div>
            </div>

            <div class="asset-right">
                <span class="usd-val">$${displayUsd.toFixed(2)}</span>
                <span class="unit-amt">
                    ${displayUnits.toFixed(asset.id === 'btc' ? 6 : 2)}
                    ${asset.symbol}
                </span>
            </div>
        </div>
        `;

        listContainer.innerHTML += row;

    });

}


// ============================
// DOM READY
// ============================

document.addEventListener("DOMContentLoaded", () => {

renderWallet();


// ============================
// NAVBAR SCROLL
// ============================

window.addEventListener("scroll", function() {
    const nav = document.querySelector(".navbar");
    if(!nav) return;

    if(window.scrollY > 50){
        nav.style.boxShadow = "0 2px 10px rgba(0,0,0,0.05)";
    } else {
        nav.style.boxShadow = "none";
    }
});


// ============================
// LOGIN MODAL
// ============================

const modal = document.getElementById("authModal")
const openLogin = document.getElementById("openLogin")
const openSignup = document.getElementById("openSignup")
const closeModal = document.getElementById("closeModal")

const loginForm = document.getElementById("loginForm")
const signupForm = document.getElementById("signupForm")

const showSignup = document.getElementById("showSignup")
const showLogin = document.getElementById("showLogin")

if(openLogin){
openLogin.onclick = () => {
modal.style.display = "flex"
loginForm.classList.remove("hidden")
signupForm.classList.add("hidden")
}
}

if(openSignup){
openSignup.onclick = () => {
modal.style.display = "flex"
signupForm.classList.remove("hidden")
loginForm.classList.add("hidden")
}
}

if(closeModal){
closeModal.onclick = () => modal.style.display = "none"
}

if(showSignup){
showSignup.onclick = () => {
signupForm.classList.remove("hidden")
loginForm.classList.add("hidden")
}
}

if(showLogin){
showLogin.onclick = () => {
loginForm.classList.remove("hidden")
signupForm.classList.add("hidden")
}
}

window.onclick = (e) => {
if(e.target == modal){
modal.style.display = "none"
}
}


// ============================
// PASSWORD STRENGTH
// ============================

const password = document.getElementById("signupPassword")
const toggle = document.getElementById("togglePassword")

const strengthBar = document.getElementById("strengthBar")
const strengthText = document.getElementById("strengthText")

const ruleLength = document.getElementById("rule-length")
const ruleUpper = document.getElementById("rule-upper")
const ruleNumber = document.getElementById("rule-number")
const ruleSymbol = document.getElementById("rule-symbol")

if(toggle && password){
toggle.onclick = () => {
if(password.type === "password"){
password.type = "text"
toggle.innerText = "🙈"
}else{
password.type = "password"
toggle.innerText = "👁"
}
}
}

if(password){
password.addEventListener("input", () => {

let val = password.value
let strength = 0

if(val.length >= 8){ ruleLength?.classList.add("valid"); strength++ }
else{ ruleLength?.classList.remove("valid") }

if(/[A-Z]/.test(val)){ ruleUpper?.classList.add("valid"); strength++ }
else{ ruleUpper?.classList.remove("valid") }

if(/[0-9]/.test(val)){ ruleNumber?.classList.add("valid"); strength++ }
else{ ruleNumber?.classList.remove("valid") }

if(/[^A-Za-z0-9]/.test(val)){ ruleSymbol?.classList.add("valid"); strength++ }
else{ ruleSymbol?.classList.remove("valid") }

if(strengthBar){

if(strength === 1){
strengthBar.style.width="25%"
strengthBar.style.background="red"
strengthText.innerText="Weak"
}

if(strength === 2){
strengthBar.style.width="50%"
strengthBar.style.background="orange"
strengthText.innerText="Medium"
}

if(strength === 3){
strengthBar.style.width="75%"
strengthBar.style.background="#3b82f6"
strengthText.innerText="Strong"
}

if(strength === 4){
strengthBar.style.width="100%"
strengthBar.style.background="green"
strengthText.innerText="Very strong"
}

if(val.length === 0){
strengthBar.style.width="0%"
strengthText.innerText=""
}

}

})
}

});