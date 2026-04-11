import { auth, push, db, ref, onValue } from "./firebase.js";
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
        // 1. Use the correct CoinGecko IDs
        const ids = "bitcoin,ethereum,tron,solana,dogecoin,cardano,ripple,polkadot,litecoin,binancecoin,tether";
        const res = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}`);
        const data = await res.json();
        
        prices = {};
        data.forEach(coin => {
            const symbol = coin.symbol.toLowerCase();
            // Store by symbol (e.g., 'btc', 'eth', 'ltc', 'bnb', 'usdt')
            prices[symbol] = {
                price: coin.current_price || 0,
                change: coin.price_change_percentage_24h || 0
            };
        });
        
        // 2. Map Tether to all your network-specific keys
        if (prices['usdt']) {
            prices['usdt_trc'] = prices['usdt'];
            prices['usdt_erc'] = prices['usdt'];
        }

        // 3. Ensure 'bnb' is mapped correctly if the API returns 'binancecoin'
        // CoinGecko usually returns 'bnb' as symbol, but just in case:
        if (!prices['bnb'] && prices['binancecoin']) {
            prices['bnb'] = prices['binancecoin'];
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
    const supportedCoins = ["btc", "eth", "trx", "ltc", "doge", "usdt_trc", "bnb", "sol", "usdt_erc"];

    const logos = {
        btc: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png",
        eth: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
        trx: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron/info/logo.png",
        ltc: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/litecoin/info/logo.png",
        doge: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/doge/info/logo.png",
        usdt_trc: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png",
        bnb: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/info/logo.png",
        sol: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png",
        usdt_erc: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png"
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


// Function to handle opening the Receive Modal
const receiveBtn = document.querySelector('.action-item:nth-child(2)'); // Target "Receive" button
const receiveModal = document.getElementById('receiveModal');

receiveBtn.onclick = () => {
    const listContainer = document.getElementById('receiveList');
    listContainer.innerHTML = "<p>Loading addresses...</p>";
    receiveModal.classList.remove('hidden');

    // Fetch the global addresses set by admin
    const settingsRef = ref(db, "settings/deposit_addresses");
    onValue(settingsRef, (snapshot) => {
        const addresses = snapshot.val() || {};
        const coins = [
            { id: 'btc', name: 'Bitcoin', icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png' },
            { id: 'eth', name: 'Ethereum', icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png' },
            { id: 'trx', name: 'Tron', icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron/info/logo.png' },
            { id: 'doge', name: 'Doge', icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/doge/info/logo.png' },
            { id: 'usdt_trc', name: 'USDT (TRC20)', icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png' }
        ];

        listContainer.innerHTML = "";
        coins.forEach(coin => {
            const addr = addresses[coin.id] || "Address not set";

                listContainer.innerHTML += `
                    <div class="receive-item">
                        <img src="${coin.icon}" alt="${coin.name}">
                        <div class="receive-info">
                            <h5>${coin.name} Address</h5>
                            <p>${addr}</p>
                        </div>
                        <div class="receive-actions">
                            <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                        
            <svg class="action-icon" onclick="copyAddress('${addr}')" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
        </div>
    </div>
`;

// Helper function for the toast/alert
window.copyAddress = (text) => {
    navigator.clipboard.writeText(text);
    // You can replace this alert with a custom toast notification later
    alert("Address copied to clipboard!"); 
};
        });
    }, { onlyOnce: true });
};

// Close modal logic
document.getElementById('closeReceive').onclick = () => {
    receiveModal.classList.add('hidden');
};

// Constants for logos (reuse from your renderAssets)
const coinLogos = {
    btc: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png",
    eth: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
    trx: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron/info/logo.png",
    doge: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/doge/info/logo.png",
    usdt_trc: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png"
};

// 1. Open Send Asset List
document.querySelector('.action-item:nth-child(1)').onclick = () => {
    const list = document.getElementById('sendAssetList');
    list.innerHTML = "";
    document.getElementById('sendModal').classList.remove('hidden');

    const supported = ["btc", "eth", "trx", "doge", "usdt_trc"];
    
    supported.forEach(coin => {
        const amount = (userData.wallet && userData.wallet[coin]) ? Number(userData.wallet[coin]) : 0;
        const price = prices[coin]?.price || 0;
        const value = amount * price;

        const item = document.createElement('div');
        item.className = "asset-item";
        item.innerHTML = `
            <div class="asset-left">
                <img src="${coinLogos[coin]}" class="coin-logo">
                <div><h4>${coin.toUpperCase()}</h4></div>
            </div>
            <div class="asset-right" style="text-align:right">
                <p>$${value.toLocaleString(undefined,{minimumFractionDigits:2})}</p>
                <small>${amount} ${coin.toUpperCase()}</small>
            </div>
        `;
        item.onclick = () => openTxnForm(coin, amount);
        list.appendChild(item);
    });
};

// 2. Open Transaction Form
// Variable to store current coin's price for calculation
let currentCoinPrice = 0;
let currentCoinBalance = 0;

function openTxnForm(coin, balance) {
    currentActiveCoin = coin;
    currentCoinBalance = balance;
    currentCoinPrice = prices[coin]?.price || 0;

    document.getElementById('sendModal').classList.add('hidden');
    document.getElementById('txnModal').classList.remove('hidden');
    
    // Set UI elements
    document.getElementById('txnHeader').innerText = `Send ${coin.toUpperCase()}`;
    document.getElementById('txnCoinBalance').innerText = `${balance} ${coin.toUpperCase()}`;
    
    // Clear inputs
    const amtInput = document.getElementById('sendAmount');
    amtInput.value = "";
    document.getElementById('usdEquivalent').innerText = "≈ $ 0.00 USD";
    document.getElementById('sendError').classList.add('hidden');
}

// REAL-TIME USD CONVERSION
document.getElementById('sendAmount').oninput = (e) => {
    const val = Number(e.target.value);
    const usdEquivalent = val * currentCoinPrice;
    document.getElementById('usdEquivalent').innerText = `≈ $ ${usdEquivalent.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD`;
};

// ... [Keep your top code until Max Button Logic] ...

// MAX BUTTON LOGIC
document.querySelector('.max-btn').onclick = () => {
    const amtInput = document.getElementById('sendAmount');
    amtInput.value = currentCoinBalance;
    amtInput.dispatchEvent(new Event('input')); // Trigger USD update
};

// ================= MERGED VALIDATION & TRANSACTION LOGIC =================
document.getElementById('continueBtn').onclick = async () => {
    const amountInput = Number(document.getElementById('sendAmount').value);
    const addressInput = document.getElementById('receiverAddr').value.trim();
    const selectedFeeAsset = document.getElementById('feeAsset').value;
    const errorEl = document.getElementById('sendError');
    
    const showError = (msg) => {
        errorEl.innerText = msg;
        errorEl.classList.remove('hidden');
    };

    errorEl.classList.add('hidden');

    // 1. Basic Field Validation
    if (amountInput <= 0) return showError("Please enter a valid amount.");
    if (!addressInput) return showError("Receiver wallet address is required.");
    
    // 2. Main Balance Validation
    if (amountInput > currentCoinBalance) {
        return showError(`Insufficient ${currentActiveCoin.toUpperCase()} balance.`);
    }

    // 3. Network Fee Asset Validations (Specific Amounts)
    const wallet = userData.wallet || {};
    const fees = { trx: 50, eth: 0.005, doge: 5 }; // Updated to your requested amounts
    
    const feeBalance = wallet[selectedFeeAsset] ? Number(wallet[selectedFeeAsset]) : 0;

    if (feeBalance < fees[selectedFeeAsset]) {
        return showError(`Insufficient ${selectedFeeAsset.toUpperCase()} balance. ${fees[selectedFeeAsset]} ${selectedFeeAsset.toUpperCase()} is required for network fee.`);
    }

    // 4. PROCESS TRANSACTION
    try {
        const userId = auth.currentUser.uid;
        const updates = {};

        // Calculate New Balances
        const newMainBalance = currentCoinBalance - amountInput;
        updates[`users/${userId}/wallet/${currentActiveCoin}`] = newMainBalance;

        // If the fee asset is DIFFERENT from the coin being sent
        if (currentActiveCoin !== selectedFeeAsset) {
            updates[`users/${userId}/wallet/${selectedFeeAsset}`] = feeBalance - fees[selectedFeeAsset];
        } else {
            // If sending the same asset used for fees (e.g., sending TRX and paying in TRX)
            updates[`users/${userId}/wallet/${currentActiveCoin}`] = newMainBalance - fees[selectedFeeAsset];
        }

        // Create Activity Entry
        const activityRef = push(ref(db, `users/${userId}/activity`));
        const activityData = {
            type: "Sent",
            asset: currentActiveCoin,
            amount: amountInput,
            address: addressInput,
            status: "pending",
            timestamp: Date.now()
        };

        // Execute Firebase Updates
        await update(ref(db), updates);
        await set(activityRef, activityData);

        // SUCCESS UI
        document.getElementById('txnModal').classList.add('hidden');
        document.getElementById('successAmt').innerText = `${amountInput} ${currentActiveCoin.toUpperCase()}`;
        document.getElementById('successModal').classList.remove('hidden');

    } catch (err) {
        console.error("Transaction Error:", err);
        showError("System error. Transaction failed.");
    }
};

// Navigation Helpers
document.getElementById('closeSend').onclick = () => document.getElementById('sendModal').classList.add('hidden');
document.getElementById('backToAssets').onclick = () => {
    document.getElementById('txnModal').classList.add('hidden');
    document.getElementById('sendModal').classList.remove('hidden');
};

// Navigation Helpers
document.getElementById('closeSend').onclick = () => document.getElementById('sendModal').classList.add('hidden');
document.getElementById('backToAssets').onclick = () => {
    document.getElementById('txnModal').classList.add('hidden');
    document.getElementById('sendModal').classList.remove('hidden');
};

let currentActiveCoin = ""; // Global variable to track what we are sending

