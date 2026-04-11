import { auth, db, ref, get, child } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

let userData = null;
let prices = {};

const PRICE_CACHE_KEY = "crypto_prices";
const PRICE_TIME_KEY = "crypto_prices_time";
const TWELVE_HOURS = 1000 * 60 * 60 * 12;

// ================= AUTH =================
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    const snap = await get(child(ref(db), "users/" + user.uid));
    if (!snap.exists()) return;

    userData = snap.val();
    
    // Check for firstName/lastName from your previous signup requirement
    const fullName = userData.firstName ? `${userData.firstName} ${userData.lastName}` : userData.name;
    document.getElementById("userName").innerText = "Hello, " + fullName;

    await loadPrices();
    renderAssets();
    renderNFTs();
    renderActivity();
    updateBalance();
});

// ================= LOAD PRICES =================
async function loadPrices() {
    const last = localStorage.getItem(PRICE_TIME_KEY);
    const cached = localStorage.getItem(PRICE_CACHE_KEY);

    if (last && cached && Date.now() - last < TWELVE_HOURS) {
        prices = JSON.parse(cached);
        return;
    }

    try {
        const res = await fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,tron,solana,dogecoin,cardano");
        const data = await res.json();
        prices = {};
        data.forEach(coin => {
            const symbol = coin.symbol.toLowerCase();
            prices[symbol] = {
                price: coin.current_price || 0,
                change: coin.price_change_percentage_24h || 0
            };
        });
        localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(prices));
        localStorage.setItem(PRICE_TIME_KEY, Date.now());
    } catch (e) {
        console.error("Price fetch failed", e);
    }
}

// ================= ASSETS =================
function renderAssets() {
    const container = document.getElementById("asset-list-container");
    if (!container) return;

    const logos = {
        btc: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png",
        eth: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
        trx: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron/info/logo.png",
        sol: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png",
        doge: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/doge/info/logo.png",
        ada: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/cardano/info/logo.png"
    };

    container.innerHTML = "";
    if (!userData.portfolio) return;

    Object.entries(userData.portfolio).forEach(([coinKey, amount]) => {
        // NORMALIZATION: Ensure 'BTC' becomes 'btc' to match prices and logos objects
        const coin = coinKey.toLowerCase();
        const coinData = prices[coin];
        
        if (!coinData) return;

        const price = coinData.price || 0;
        const change = coinData.change || 0;
        const value = amount * price;
        const isUp = change >= 0;

        container.innerHTML += `
            <div class="asset-item">
                <div class="asset-left">
                    <img src="${logos[coin] || ''}" class="coin-logo" alt="${coin}" />
                    <div>
                        <h4>${coin.toUpperCase()}</h4>
                        <small>
                            $${price.toLocaleString()} 
                            <span class="${isUp ? 'pos' : 'neg'}">
                                ${isUp ? '+' : ''}${change.toFixed(2)}%
                            </span>
                        </small>
                    </div>
                </div>
                <div class="asset-right">
                    <p>$${value.toFixed(2)}</p>
                    <small>${Number(amount).toFixed(6)} ${coin.toUpperCase()}</small>
                </div>
            </div>
        `;
    });
}

// ================= BALANCE =================
function updateBalance() {
    const display = document.getElementById("total-display");
    if (!userData || !userData.portfolio) {
        display.innerText = "$ 0.00";
        return;
    }

    let total = 0;
    Object.entries(userData.portfolio).forEach(([coinKey, amt]) => {
        const coin = coinKey.toLowerCase();
        const coinData = prices[coin];
        const amount = Number(amt) || 0;
        const price = coinData?.price || 0;
        total += amount * price;
    });

    display.innerText = "$ " + total.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
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