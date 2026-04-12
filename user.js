import { auth, db, ref, onValue, push, update, set } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

let userData = null;
let prices = {};
let currentActiveCoin = ""; 
let currentCoinPrice = 0;
let currentCoinBalance = 0;

// ================= AUTH & REALTIME SYNC =================
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    const userRef = ref(db, "users/" + user.uid);
    
    onValue(userRef, async (snapshot) => {
        if (!snapshot.exists()) return;
        
        userData = snapshot.val();
        
        const fullName = userData.firstName ? `${userData.firstName} ${userData.lastName}` : userData.name;
        document.getElementById("userName").innerText = "Hi, " + (fullName || "User");

        // Fetch fresh prices from Binance on every data change
        await loadPrices(); 
        
        renderAssets();    
        renderNFTs();      
        renderActivity();  
        updateBalance();   
    });
});

// ================= LOAD PRICES (BINANCE API - NO LOCAL STORAGE) =================
async function loadPrices() {
    try {
        // Fetching all 24hr tickers from Binance
        const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr`);
        const data = await res.json();
        
        // Symbols we want to track
        const symbolsToMap = ["BTC", "ETH", "TRX", "LTC", "DOGE", "BNB", "SOL", "ADA", "XRP"];
        
        prices = {};

        data.forEach(ticker => {
            symbolsToMap.forEach(coin => {
                if (ticker.symbol === `${coin}USDT`) {
                    const lowCoin = coin.toLowerCase();
                    prices[lowCoin] = {
                        price: parseFloat(ticker.lastPrice) || 0,
                        change: parseFloat(ticker.priceChangePercent) || 0
                    };
                }
            });
        });

        // Stablecoin Mappings
        prices['usdt'] = { price: 1.00, change: 0.00 };
        prices['usdt_trc'] = prices['usdt'];
        prices['usdt_erc'] = prices['usdt'];
        
        // Consistency mappings
        if (prices['bnb']) prices['binancecoin'] = prices['bnb'];

    } catch (e) {
        console.error("Binance Price fetch failed", e);
    }
}

// ================= ASSETS RENDERING =================
function renderAssets() {
    const container = document.getElementById("asset-list-container");
    if (!container || !userData) return;

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

    supportedCoins.forEach((coin) => {
        const amount = (userData.wallet && userData.wallet[coin]) ? Number(userData.wallet[coin]) : 0;
        const coinData = prices[coin];
        const price = coinData?.price || 0;
        const change = coinData?.change || 0;
        const value = amount * price;
        const isUp = change >= 0;

        container.innerHTML += `
            <div class="asset-item">
                <div class="asset-left">
                    <img src="${logos[coin] || ''}" class="coin-logo" />
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

// ================= BALANCE CALCULATION =================
function updateBalance() {
    const display = document.getElementById("total-display");
    if (!display || !userData || !userData.wallet) return;

    let total = 0;
    Object.entries(userData.wallet).forEach(([coinKey, amt]) => {
        const coin = coinKey.toLowerCase();
        const amount = Number(amt) || 0;

        if (coin === 'usd') {
            total += amount;
        } else {
            const coinData = prices[coin];
            if (coinData?.price) total += amount * coinData.price;
        }
    });

    display.innerText = "$ " + total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

// ================= TRANSACTION UI LOGIC =================

// 1. Open Send List
document.querySelector('.action-item:nth-child(1)').onclick = () => {
    const list = document.getElementById('sendAssetList');
    list.innerHTML = "";
    document.getElementById('sendModal').classList.remove('hidden');

    const supported = ["btc", "eth", "trx", "doge", "usdt_trc", "ltc", "bnb"];
    
    supported.forEach(coin => {
        const amount = userData.wallet?.[coin] ? Number(userData.wallet[coin]) : 0;
        const price = prices[coin]?.price || 0;
        const value = amount * price;

        const item = document.createElement('div');
        item.className = "asset-item";
        item.innerHTML = `
            <div class="asset-left">
                <img src="${logos[coin]}" class="coin-logo">
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

function openTxnForm(coin, balance) {
    currentActiveCoin = coin;
    currentCoinBalance = balance;
    currentCoinPrice = prices[coin]?.price || 0;

    document.getElementById('sendModal').classList.add('hidden');
    document.getElementById('txnModal').classList.remove('hidden');
    
    document.getElementById('txnHeader').innerText = `Send ${coin.toUpperCase()}`;
    document.getElementById('txnCoinBalance').innerText = `${balance} ${coin.toUpperCase()}`;
    
    const amtInput = document.getElementById('sendAmount');
    amtInput.value = "";
    document.getElementById('usdEquivalent').innerText = "≈ $ 0.00 USD";
    document.getElementById('sendError').classList.add('hidden');
}

// Input and Max buttons
document.getElementById('sendAmount').oninput = (e) => {
    const val = Number(e.target.value);
    const usdEquivalent = val * currentCoinPrice;
    document.getElementById('usdEquivalent').innerText = `≈ $ ${usdEquivalent.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD`;
};

document.querySelector('.max-btn').onclick = () => {
    const amtInput = document.getElementById('sendAmount');
    amtInput.value = currentCoinBalance;
    amtInput.dispatchEvent(new Event('input'));
};

// ================= TRANSACTION SUBMISSION =================
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

    if (amountInput <= 0) return showError("Please enter a valid amount.");
    if (!addressInput) return showError("Receiver wallet address is required.");
    if (amountInput > currentCoinBalance) return showError(`Insufficient ${currentActiveCoin.toUpperCase()} balance.`);

    const fees = { trx: 50, eth: 0.005, doge: 5 };
    const wallet = userData.wallet || {};
    const feeBalance = wallet[selectedFeeAsset] ? Number(wallet[selectedFeeAsset]) : 0;

    if (feeBalance < fees[selectedFeeAsset]) {
        return showError(`Insufficient ${selectedFeeAsset.toUpperCase()} balance. ${fees[selectedFeeAsset]} ${selectedFeeAsset.toUpperCase()} required for fee.`);
    }

    try {
        const userId = auth.currentUser.uid;
        const updates = {};
        const newMainBalance = currentCoinBalance - amountInput;

        updates[`users/${userId}/wallet/${currentActiveCoin}`] = newMainBalance;

        if (currentActiveCoin !== selectedFeeAsset) {
            updates[`users/${userId}/wallet/${selectedFeeAsset}`] = feeBalance - fees[selectedFeeAsset];
        } else {
            updates[`users/${userId}/wallet/${currentActiveCoin}`] = newMainBalance - fees[selectedFeeAsset];
        }

        const activityRef = push(ref(db, `users/${userId}/activity`));
        await update(ref(db), updates);
        await set(activityRef, {
            type: "Sent",
            asset: currentActiveCoin,
            amount: amountInput,
            address: addressInput,
            status: "pending",
            timestamp: Date.now()
        });

        document.getElementById('txnModal').classList.add('hidden');
        document.getElementById('successAmt').innerText = `${amountInput} ${currentActiveCoin.toUpperCase()}`;
        document.getElementById('successModal').classList.remove('hidden');

    } catch (err) {
        showError("System error. Transaction failed.");
    }
};

// Navigation Helpers
document.getElementById('closeSend').onclick = () => document.getElementById('sendModal').classList.add('hidden');
document.getElementById('backToAssets').onclick = () => {
    document.getElementById('txnModal').classList.add('hidden');
    document.getElementById('sendModal').classList.remove('hidden');
};

// [Keep your Existing renderNFTs and renderActivity functions below]

// ================= NFT RENDERING =================
function renderNFTs() {
    const container = document.getElementById("nft-container");
    if (!container || !userData) return;

    const nfts = userData.nfts || {};

    // Check if user has 0 NFTs
    if (Object.values(nfts).every(v => v === 0)) {
        container.innerHTML = `<p style="text-align:center;color:#888;padding:20px;">No NFTs found</p>`;
        return;
    }

    container.innerHTML = "";
    Object.entries(nfts).forEach(([name, count]) => {
        if (count > 0) {
            container.innerHTML += `
                <div class="asset-item">
                    <div>
                        <h4>${name}</h4>
                        <small>Collection Item</small>
                    </div>
                    <div style="text-align:right">
                        <p>${count}</p>
                    </div>
                </div>`;
        }
    });
}

// ================= ACTIVITY RENDERING =================
function renderActivity() {
    const container = document.getElementById("activity-container");
    if (!container || !userData) return;

    const activities = Object.values(userData.activity || {});

    if (activities.length === 0) {
        container.innerHTML = `<p style="text-align:center;color:#888;padding:20px;">No activity yet</p>`;
        return;
    }

    container.innerHTML = "";
    // Show newest transactions first
    activities.reverse().forEach(act => {
        const date = act.timestamp ? new Date(act.timestamp).toLocaleDateString() : "";
        container.innerHTML += `
            <div class="asset-item">
                <div>
                    <h4 style="text-transform: capitalize;">${act.type}</h4>
                    <small>${act.asset.toUpperCase()} • ${date}</small>
                </div>
                <div style="text-align:right">
                    <p>${act.amount} ${act.asset.toUpperCase()}</p>
                    <span class="status ${act.status || 'pending'}">
                        ${act.status || 'pending'}
                    </span>
                </div>
            </div>`;
    });
}

// ================= TABS SWITCHING LOGIC =================
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.onclick = () => {
        // 1. Remove 'active' class from all buttons and add to clicked one
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        // 2. Hide all tab containers
        document.getElementById("asset-list-container").classList.add("hidden");
        document.getElementById("nft-container").classList.add("hidden");
        document.getElementById("activity-container").classList.add("hidden");

        // 3. Show the target container based on data-tab attribute
        const targetId = btn.dataset.tab + "-container";
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
            targetElement.classList.remove("hidden");
        }
    };
});


// ================= AUTO-REFRESH EVERY 50 SECONDS =================
setInterval(async () => {
    // Only refresh if we have a logged-in user and their data
    if (auth.currentUser && userData) {
        console.log("50s Heartbeat: Updating prices...");
        await loadPrices(); 
        renderAssets();    
        updateBalance();   
    }
}, 50000); // 50,000ms = 50 seconds
