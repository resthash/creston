// Add this to your existing script.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Existing render function
    renderWallet();

    // 2. Connect Wallet Toggle
    const connectBtn = document.getElementById('connect-wallet');
    let isConnected = false;

    connectBtn.addEventListener('click', () => {
        isConnected = !isConnected;
        if (isConnected) {
            connectBtn.innerText = "0x7a...4e2"; // Simulated Wallet Address
            connectBtn.classList.add('connected');
        } else {
            connectBtn.innerText = "Connect Wallet";
            connectBtn.classList.remove('connected');
        }
    });

    // 3. Chat Icon Action
    const chatBtn = document.getElementById('chat-trigger');
    chatBtn.addEventListener('click', () => {
        alert("Support Chat: How can we help you today?");
        // You can replace this with a modal or a new div for a real chat window
    });
});

// Current Market Prices (Simulated for April 2026)
const marketPrices = {
    btc: 73450.50,
    eth: 3820.15,
    trx: 0.3150,
    sol: 188.40,
    doge: 0.175,
    ada: 0.58
};

// Portfolio Setup
const config = {
    totalGoal: 750.00,
    tronAllocation: 10.00
};

// Asset Definitions
const assets = [
    { id: 'btc', name: 'BITCOIN', symbol: 'BTC', icon: '₿', color: '#f59e0b', change: '+1.2%', funded: true },
    { id: 'eth', name: 'ETHEREUM', symbol: 'ETH', icon: 'Ξ', color: '#627eea', change: '-0.4%', funded: false },
    { id: 'trx', name: 'TRON', symbol: 'TRX', icon: '▼', color: '#dc2626', change: '+0.1%', funded: true },
    { id: 'sol', name: 'SOLANA', symbol: 'SOL', icon: 'S', color: '#14f195', change: '+5.4%', funded: false },
    { id: 'doge', name: 'DOGECOIN', symbol: 'DOGE', icon: 'Ð', color: '#c2a633', change: '-1.8%', funded: false },
    { id: 'ada', name: 'CARDANO', symbol: 'ADA', icon: 'A', color: '#0033ad', change: '+0.2%', funded: false }
];

function renderWallet() {
    const listContainer = document.getElementById('asset-list-container');
    const totalDisplay = document.getElementById('total-display');
    
    // Math Logic
    const btcValue = config.totalGoal - config.tronAllocation;
    const btcUnits = btcValue / marketPrices.btc;
    const trxUnits = config.tronAllocation / marketPrices.trx;

    // Update Header
    totalDisplay.innerText = `$ ${config.totalGoal.toLocaleString(undefined, {minimumFractionDigits: 2})}`;

    // Clear and build list
    listContainer.innerHTML = '';
    
    assets.forEach(asset => {
        let displayUsd = 0;
        let displayUnits = 0;

        if (asset.id === 'btc') {
            displayUsd = btcValue;
            displayUnits = btcUnits;
        } else if (asset.id === 'trx') {
            displayUsd = config.tronAllocation;
            displayUnits = trxUnits;
        }

        const isPositive = asset.change.includes('+');
        
        const row = `
            <div class="asset-item ${!asset.funded ? 'unfunded' : ''}">
                <div class="asset-left">
                    <div class="icon" style="background: ${asset.color}">${asset.icon}</div>
                    <div class="meta">
                        <span class="name">${asset.name}</span>
                        <span class="price-info">
                            $${marketPrices[asset.id].toLocaleString()} 
                            <small class="${isPositive ? 'pos' : 'neg'}">${asset.change}</small>
                        </span>
                    </div>
                </div>
                <div class="asset-right">
                    <span class="usd-val">$${displayUsd.toFixed(2)}</span>
                    <span class="unit-amt">${displayUnits.toFixed(asset.id === 'btc' ? 6 : 2)} ${asset.symbol}</span>
                </div>
            </div>
        `;
        listContainer.innerHTML += row;
    });
}

// Initial Run
document.addEventListener('DOMContentLoaded', renderWallet);

//login
function switchTab(type) {
    const loginBtn = document.querySelectorAll('.tab-btn');
    const signupBtn = document.querySelectorAll('.tab-btn');
    const submitBtn = document.getElementById('submitBtn');
    const footerText = document.getElementById('footerText');
    const footerLink = document.getElementById('footerLink');
    const nameField = document.getElementById('nameFieldGroup'); // The new field

    if (type === 'signup') {
        loginBtn.classList.remove('active');
        signupBtn.classList.add('active');
        submitBtn.innerText = 'Create Account'; // More specific text
        footerText.innerText = 'Already have an account?';
        footerLink.innerText = 'Log In';
        footerLink.setAttribute('onclick', "switchTab('login')");
        
        // Show the Name field for Sign Up
        nameField.style.display = 'block'; 
    } else {
        signupBtn.classList.remove('active');
        loginBtn.classList.add('active');
        submitBtn.innerText = 'Log In';
        footerText.innerText = "Don't have an account?";
        footerLink.innerText = 'Sign Up';
        footerLink.setAttribute('onclick', "switchTab('signup')");
        
        // Hide the Name field for Login
        nameField.style.display = 'none';
    }
}