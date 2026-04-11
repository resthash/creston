import { auth, db, ref, onValue } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

let userData = null;
let prices = {};

const PRICE_CACHE_KEY = "crypto_prices";
const PRICE_TIME_KEY = "crypto_prices_time";
const TWELVE_HOURS = 1000 * 60 * 60 * 12;

// ================= AUTH & REALTIME SYNC =================
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // If no user is logged in, send them to the login page
        window.location.href = "index.html";
        return;
    }

    // Define the reference to this specific user's data in the database
    const userRef = ref(db, "users/" + user.uid);
    
    // This function runs IMMEDIATELY and then RE-RUNS every time 
    // you change something in the Admin Panel
    onValue(userRef, async (snapshot) => {
        if (!snapshot.exists()) return;
        
        userData = snapshot.val();
        
        // Update Name
        const fullName = userData.firstName ? `${userData.firstName} ${userData.lastName}` : userData.name;
        document.getElementById("userName").innerText = "Hello, " + (fullName || "User");

        // CRITICAL: Fetch prices FIRST, then update UI
        await loadPrices(); 
        
        renderAssets();    
        renderNFTs();      
        renderActivity();  
        updateBalance();   
    });
});

// ================= LOAD PRICES (Corrected IDs) =================
async function loadPrices() {
    const last = localStorage.getItem(PRICE_TIME_KEY);
    const cached = localStorage.getItem(PRICE_CACHE_KEY);

    if (last && cached && Date.now() - last < TWELVE_HOURS) {
        prices = JSON.parse(cached);
        return;
    }

    try {
        // Corrected IDs for CoinGecko
        const ids = "bitcoin,ethereum,tron,solana,dogecoin,cardano,ripple,polkadot,polygon-pos,avalanche-2,shiba-inu,chainlink,stellar,cosmos,litecoin,binancecoin,tether";
        const res = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}`);
        const data = await res.json();
        
        prices = {};
        data.forEach(coin => {
            const symbol = coin.symbol.toLowerCase();
            prices[symbol] = {
                price: coin.current_price || 0,
                change: coin.price_change_percentage_24h || 0
            };
        });
        
        // Manual mapping for USDT variations from Admin Panel
        if (prices['usdt']) {
            prices['usdt_trc'] = prices['usdt'];
            prices['usdt_erc'] = prices['usdt'];
        }

        localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(prices));
        localStorage.setItem(PRICE_TIME_KEY, Date.now());
    } catch (e) {
        console.error("Price fetch failed", e);
    }
}

// ================= ASSETS (Fixed Value Calculation) =================
function renderAssets() {
    const container = document.getElementById("asset-list-container");
    if (!container || !userData) return;

    // 1. This is your master list of all coins you want to show
    const supportedCoins = ["btc", "eth", "trx", "ltc", "doge", "usdt_trc", "bnb", "sol", "ada", "xrp"];

    const logos = {
        btc: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png",
        eth: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
        trx: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron/info/logo.png",
        ltc: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/litecoin/info/logo.png",
        doge: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/doge/info/logo.png",
        usdt_trc: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png",
        bnb: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/info/logo.png",
        sol: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png",
        ada: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/cardano/info/logo.png",
        xrp: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ripple/info/logo.png"
    };

    container.innerHTML = "";

    // 2. Loop through the MASTER LIST, not the wallet
    supportedCoins.forEach((coin) => {
        // Get the amount from wallet if it exists, otherwise default to 0
        const amount = (userData.wallet && userData.wallet[coin]) ? Number(userData.wallet[coin]) : 0;
        
        const coinData = prices[coin];
        const price = (coinData && coinData.price) ? coinData.price : 0;
        const change = (coinData && coinData.change) ? coinData.change : 0;
        const value = amount * price;
        const isUp = change >= 0;

        container.innerHTML += `
            <div class="asset-item">
                <div class="asset-left">
                    <img src="${logos[coin] || ''}" class="coin-logo" onerror="this.src='https://via.placeholder.com/30'" />
                    <div>
                        <h4>${coin.toUpperCase()}</h4>
                        <small>
                            $${price.toLocaleString(undefined, {minimumFractionDigits: 2})} 
                            <span class="${isUp ? 'pos' : 'neg'}">
                                ${isUp ? '+' : ''}${change.toFixed(2)}%
                            </span>
                        </small>
                    </div>
                </div>
                <div class="asset-right">
                    <p>$${value.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                    <small>${amount.toFixed(6)} ${coin.toUpperCase()}</small>
                </div>
            </div>
        `;
    });
}
// ================= BALANCE (Fixed Global Total) =================
function updateBalance() {
    const display = document.getElementById("total-display");
    if (!display || !userData || !userData.wallet) return;

    let total = 0;
    Object.entries(userData.wallet).forEach(([coinKey, amt]) => {
        const coin = coinKey.toLowerCase();
        const amount = Number(amt) || 0; // Force to number, default to 0

        if (coin === 'usd') {
            total += amount;
        } else {
            const coinData = prices[coin];
            // Only multiply if coinData and price actually exist
            if (coinData && typeof coinData.price === 'number') {
                total += amount * coinData.price;
            }
        }
    });

    // Check if total is a valid number before displaying
    if (isNaN(total)) {
        display.innerText = "$ 0.00";
    } else {
        display.innerText = "$ " + total.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
}

// ================= NFT =================

function renderNFTs(){

const container =
document.getElementById("nft-container")

const nfts = userData.nfts || {}

if(Object.values(nfts).every(v => v === 0)){
container.innerHTML = `
<p style="text-align:center;color:#888;">
No NFTs
</p>
`
return
}

container.innerHTML=""

Object.entries(nfts).forEach(([name,count])=>{
if(count > 0){
container.innerHTML+=`
<div class="asset-item">
<div>
<h4>${name}</h4>
</div>
<div>
<p>${count}</p>
</div>
</div>
`
}
})

}


// ================= ACTIVITY =================

function renderActivity(){

const container =
document.getElementById("activity-container")

const activities = Object.values(userData.activity || {})

if(activities.length === 0){
container.innerHTML = `
<p style="text-align:center;color:#888;">
No activity yet
</p>
`
return
}

container.innerHTML=""

activities.reverse().forEach(act=>{

container.innerHTML+=`

<div class="asset-item">

<div>
<h4>${act.type}</h4>
<small>${act.asset.toUpperCase()} • $${act.amount}</small>
</div>

<div>
<span class="status ${act.status}">
${act.status}
</span>
</div>

</div>

`

})

}


// ==== PERIODIC PRICE UPDATE (12 hours) ====

setInterval(()=>{
loadPrices().then(()=>{
renderAssets()
updateBalance()
})
}, 1000 * 60 * 60 * 12) // 12 hours



// ================= TABS =================

document.querySelectorAll(".tab-btn").forEach(btn=>{

btn.onclick = ()=>{

document.querySelectorAll(".tab-btn")
.forEach(b=>b.classList.remove("active"))

btn.classList.add("active")

document
.getElementById("asset-list-container")
.classList.add("hidden")

document
.getElementById("nft-container")
.classList.add("hidden")

document
.getElementById("activity-container")
.classList.add("hidden")

const target =
document.getElementById(btn.dataset.tab + "-container")

if(target){
target.classList.remove("hidden")
}

}

})