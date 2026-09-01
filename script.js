// --- Global State & Configuration ---
const SUPPORTED_CURRENCIES = [
    { code: 'AED', name: 'UAE Dirham', region: 'asia' },
    { code: 'AUD', name: 'Australian Dollar', region: 'americas' },
    { code: 'BRL', name: 'Brazilian Real', region: 'americas' },
    { code: 'CAD', name: 'Canadian Dollar', region: 'americas' },
    { code: 'CHF', name: 'Swiss Franc', region: 'major' },
    { code: 'CNY', name: 'Chinese Yuan', region: 'asia' },
    { code: 'DKK', name: 'Danish Krone', region: 'major' },
    { code: 'EUR', name: 'Euro', region: 'major' },
    { code: 'GBP', name: 'British Pound', region: 'major' },
    { code: 'HKD', name: 'Hong Kong Dollar', region: 'asia' },
    { code: 'INR', name: 'Indian Rupee', region: 'asia' },
    { code: 'JPY', name: 'Japanese Yen', region: 'asia' },
    { code: 'KRW', name: 'South Korean Won', region: 'asia' },
    { code: 'MXN', name: 'Mexican Peso', region: 'americas' },
    { code: 'NGN', name: 'Nigerian Naira', region: 'asia' },
    { code: 'NOK', name: 'Norwegian Krone', region: 'major' },
    { code: 'NZD', name: 'New Zealand Dollar', region: 'americas' },
    { code: 'SAR', name: 'Saudi Riyal', region: 'asia' },
    { code: 'SEK', name: 'Swedish Krona', region: 'major' },
    { code: 'SGD', name: 'Singapore Dollar', region: 'asia' },
    { code: 'THB', name: 'Thai Baht', region: 'asia' },
    { code: 'USD', name: 'US Dollar', region: 'major' },
    { code: 'ZAR', name: 'South African Rand', region: 'americas' }
];

// App State
let appState = {
    baseCurrency: 'USD',
    isLoggedIn: false,
    userName: '',
    userEmail: '',
    darkMode: false,
    toastNotifications: true,
    wallets: {
        'USD': 9000.00,
        'EUR': 3150.00,
        'GBP': 2800.00,
        'NGN': 3500000.00,
        'JPY': 500000.00,
        'CAD': 2400.00
    },
    transactions: [
        { id: 'tx_1', date: new Date().toLocaleString(), type: 'Deposit', details: 'Initial Deposit USD', amount: '+ $5,000.00', status: 'Completed' },
        { id: 'tx_2', date: new Date(Date.now() - 86400000).toLocaleString(), type: 'Exchange', details: 'USD to EUR Swap', amount: '- $1,000.00', status: 'Completed' },
        { id: 'tx_3', date: new Date(Date.now() - 172800000).toLocaleString(), type: 'Deposit', details: 'Bank Wire NGN', amount: '+ ₦1,500,000.00', status: 'Completed' }
    ],
    alerts: [
        { id: 'alt_1', from: 'USD', to: 'EUR', condition: 'above', targetRate: 0.95, note: 'Target Euro Dip', active: true },
        { id: 'alt_2', from: 'EUR', to: 'USD', condition: 'above', targetRate: 1.10, note: 'Sell Euro threshold', active: true }
    ]
};

let currentRates = null;
let charts = {};
let currentView = 'dashboard';

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    loadStateFromStorage();
    initTheme();
    initCharts();
    populateCurrencies();
    setupEventListeners();
    renderProfileUI();
    await updateDashboard(appState.baseCurrency);
    renderMarketPlace();
    renderWallet();
    renderAlerts();
    initExchangeSuite();
    renderSettings();
});

// --- LocalStorage Persistence ---
function loadStateFromStorage() {
    const saved = localStorage.getItem('curr_conv_app_state');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            appState = { ...appState, ...parsed };
        } catch(e) {
            console.error("Could not parse saved app state", e);
        }
    }
}

function saveStateToStorage() {
    localStorage.setItem('curr_conv_app_state', JSON.stringify(appState));
}

// --- Theme Management ---
function initTheme() {
    if (appState.darkMode) {
        document.body.classList.add('dark-mode');
        const themeIcon = document.getElementById('theme-icon');
        if (themeIcon) themeIcon.className = 'ph ph-moon';
    }
}

// --- Formatters ---
const formatNumber = (val, maxDecimals = 4) => {
    return new Intl.NumberFormat(navigator.language, {
        maximumFractionDigits: maxDecimals,
        minimumFractionDigits: 2
    }).format(val);
};

const formatCurrency = (val, currency) => {
    try {
        return new Intl.NumberFormat(navigator.language, {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 2
        }).format(val);
    } catch(e) {
        return `${val.toFixed(2)} ${currency}`;
    }
};

// --- Toast Notifications ---
function showToast(message, type = 'info') {
    if (!appState.toastNotifications && type !== 'warning') return;
    
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconClass = type === 'success' ? 'ph-check-circle' : type === 'warning' ? 'ph-warning' : 'ph-info';
    toast.innerHTML = `<i class="ph ${iconClass} icon-lg"></i> <span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// --- API & Caching ---
async function fetchRates(base) {
    const cacheKey = `rates_${base}`;
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
        return JSON.parse(cached);
    }
    
    try {
        const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
        if (!res.ok) throw new Error('API request failed');
        const data = await res.json();
        
        if (data.result === 'error') throw new Error(data['error-type']);
        
        sessionStorage.setItem(cacheKey, JSON.stringify(data));
        return data;
    } catch(e) {
        console.error("Error fetching rates:", e);
        return null;
    }
}

// --- Navigation Engine ---
function switchView(viewName) {
    currentView = viewName;
    const views = ['dashboard', 'marketplace', 'wallet', 'alert', 'exchange', 'settings'];
    
    views.forEach(v => {
        const el = document.getElementById(`${v}-view`);
        const navEl = document.getElementById(`nav-${v}`);
        if (el) {
            if (v === viewName) {
                el.classList.remove('hidden');
                el.classList.add('active');
            } else {
                el.classList.add('hidden');
                el.classList.remove('active');
            }
        }
        if (navEl) {
            if (v === viewName) navEl.classList.add('active');
            else navEl.classList.remove('active');
        }
    });

    // Update Header Title
    const titleEl = document.getElementById('current-view-title');
    if (titleEl) {
        const titles = {
            dashboard: 'Dashboard Overview',
            marketplace: 'Market Place',
            wallet: 'Multi-Currency Wallet',
            alert: 'Rate Alert Engine',
            exchange: 'Currency Exchange',
            settings: 'Settings'
        };
        titleEl.textContent = titles[viewName] || 'Dashboard';
    }

    // Trigger View Specific Re-renders
    if (viewName === 'marketplace') renderMarketPlace();
    if (viewName === 'wallet') renderWallet();
    if (viewName === 'alert') renderAlerts();
    if (viewName === 'exchange') updateExchangeRates();
}

// --- Dashboard Logic ---
async function updateDashboard(base) {
    const data = await fetchRates(base);
    if (!data) return;
    
    currentRates = data.rates;
    appState.baseCurrency = base;
    
    const baseSelector = document.getElementById('base-currency-selector');
    if (baseSelector) {
        baseSelector.textContent = base;
    }
    
    const targets = ['NGN', 'EUR', 'GBP', 'JPY']; 
    const displayTargets = targets.filter(t => t !== base);
    if (displayTargets.length < 4) displayTargets.push(base === 'CAD' ? 'CHF' : 'CAD');
    
    for (let i = 1; i <= 4; i++) {
        const target = displayTargets[i-1];
        const rate = currentRates[target] || 0;
        
        const titleEl = document.getElementById(`pair${i}-title`);
        if (titleEl) titleEl.textContent = `${base}/${target}`;
        
        const formatted = rate.toFixed(3);
        const parts = formatted.split('.');
        const targetRateId = i === 1 ? 'rate-usd-ngn' : i === 2 ? 'rate-usd-eur' : i === 3 ? 'rate-eur-usd' : 'rate-jpy-eur';
        const rateEl = document.getElementById(targetRateId);
        if (rateEl) {
            rateEl.innerHTML = `${parts[0]}<span class="decimals">.${parts[1]}</span>`;
        }
    }
    
    // Account Balance Calculation
    let totalPortfolioUSD = 0;
    for (let [curr, amount] of Object.entries(appState.wallets)) {
        if (curr === 'USD') {
            totalPortfolioUSD += amount;
        } else if (currentRates[curr]) {
            totalPortfolioUSD += amount / currentRates[curr];
        }
    }
    
    let totalInBase = totalPortfolioUSD;
    if (base !== 'USD' && currentRates[base]) {
        totalInBase = totalPortfolioUSD * currentRates[base];
    }
    
    const balanceTotalEl = document.getElementById('account-balance-total');
    if (balanceTotalEl) balanceTotalEl.textContent = formatCurrency(totalInBase, base);
    
    // Table pairs
    const tableTarget1 = 'EUR';
    const tableTarget2 = 'GBP';
    const p1 = document.getElementById('table-pair1-name');
    const p2 = document.getElementById('table-pair2-name');
    if (p1) p1.textContent = `${base}/${tableTarget1}`;
    if (p2) p2.textContent = `${base}/${tableTarget2}`;
    
    const rate1 = currentRates[tableTarget1] || 0;
    const parts1 = rate1.toFixed(3).split('.');
    const r1 = document.getElementById('table-rate-usd-eur');
    if (r1) r1.innerHTML = `${parts1[0]}<span class="decimals">.${parts1[1]}</span>`;
    
    const rate2 = currentRates[tableTarget2] || 0;
    const parts2 = rate2.toFixed(3).split('.');
    const r2 = document.getElementById('table-rate-eur-usd');
    if (r2) r2.innerHTML = `${parts2[0]}<span class="decimals">.${parts2[1]}</span>`;

    checkRateAlerts();
}

// --- Market Place Logic ---
function renderMarketPlace() {
    const tbody = document.getElementById('marketplace-table-body');
    if (!tbody || !currentRates) return;
    
    const searchInput = document.getElementById('marketplace-search-input');
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
    
    const activeFilterBtn = document.querySelector('#marketplace-filter-pills .filter-pill.active');
    const activeFilter = activeFilterBtn ? activeFilterBtn.dataset.filter : 'all';

    document.getElementById('market-base-label').textContent = appState.baseCurrency;
    
    let filtered = SUPPORTED_CURRENCIES.filter(item => item.code !== appState.baseCurrency);
    
    if (activeFilter !== 'all') {
        filtered = filtered.filter(item => item.region === activeFilter);
    }
    
    if (searchTerm) {
        filtered = filtered.filter(item => item.code.toLowerCase().includes(searchTerm) || item.name.toLowerCase().includes(searchTerm));
    }
    
    tbody.innerHTML = filtered.map(item => {
        const rate = currentRates[item.code] || 1.0;
        const changePercent = ((Math.sin(item.code.charCodeAt(0)) * 5)).toFixed(2);
        const isPositive = parseFloat(changePercent) >= 0;
        const high = (rate * 1.025).toFixed(4);
        const low = (rate * 0.975).toFixed(4);

        return `
            <tr>
                <td><strong>${item.name}</strong></td>
                <td><span class="badge blue">${item.code}</span></td>
                <td><strong>${formatNumber(rate)}</strong></td>
                <td>${high}</td>
                <td>${low}</td>
                <td><span class="change ${isPositive ? 'positive' : 'negative'}">${isPositive ? '+' : ''}${changePercent}%</span></td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="tradePair('${item.code}')">
                        <i class="ph ph-arrows-down-up"></i> Trade
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function tradePair(targetCode) {
    switchView('exchange');
    const fromSelect = document.getElementById('ex-from-currency');
    const toSelect = document.getElementById('ex-to-currency');
    if (fromSelect && toSelect) {
        fromSelect.value = appState.baseCurrency;
        toSelect.value = targetCode;
        updateExchangeRates();
    }
}

// --- Wallet Logic ---
function renderWallet() {
    // Balances Grid
    const grid = document.getElementById('wallet-balances-grid');
    if (!grid) return;
    
    let netWorthUSD = 0;
    
    grid.innerHTML = Object.entries(appState.wallets).map(([code, amount]) => {
        let valInUSD = amount;
        if (code !== 'USD' && currentRates && currentRates[code]) {
            valInUSD = amount / currentRates[code];
        }
        netWorthUSD += valInUSD;

        return `
            <div class="balance-wallet-card">
                <div class="balance-wallet-header">
                    <div class="currency-flag-badge">
                        <i class="ph ph-coins icon-lg blue"></i>
                        <span>${code} Wallet</span>
                    </div>
                    <span class="badge green">Active</span>
                </div>
                <div class="balance-wallet-body">
                    <h3>${formatCurrency(amount, code)}</h3>
                    <p class="balance-converted">≈ ${formatCurrency(valInUSD, 'USD')}</p>
                </div>
                <div class="balance-card-actions">
                    <button class="btn btn-secondary btn-sm" onclick="openWalletModal('deposit', '${code}')"><i class="ph ph-plus"></i> Add</button>
                    <button class="btn btn-outline btn-sm" onclick="openWalletModal('withdraw', '${code}')"><i class="ph ph-minus"></i> Withdraw</button>
                    <button class="btn btn-outline btn-sm" onclick="tradePair('${code}')"><i class="ph ph-arrows-down-up"></i> Swap</button>
                </div>
            </div>
        `;
    }).join('');

    let netWorthInBase = netWorthUSD;
    if (appState.baseCurrency !== 'USD' && currentRates && currentRates[appState.baseCurrency]) {
        netWorthInBase = netWorthUSD * currentRates[appState.baseCurrency];
    }
    
    const totalNetWorthEl = document.getElementById('wallet-total-networth');
    if (totalNetWorthEl) totalNetWorthEl.textContent = formatCurrency(netWorthInBase, appState.baseCurrency);

    // Dashboard Legend Values
    const dUsd = document.getElementById('dash-bal-usd');
    const dEur = document.getElementById('dash-bal-eur');
    const dGbp = document.getElementById('dash-bal-gbp');
    const dNgn = document.getElementById('dash-bal-ngn');
    if (dUsd) dUsd.textContent = formatNumber(appState.wallets.USD || 0);
    if (dEur) dEur.textContent = formatNumber(appState.wallets.EUR || 0);
    if (dGbp) dGbp.textContent = formatNumber(appState.wallets.GBP || 0);
    if (dNgn) dNgn.textContent = formatNumber(appState.wallets.NGN || 0);

    // Render Transactions Table
    renderTransactions();
}

function renderTransactions() {
    const tbody = document.getElementById('wallet-transactions-tbody');
    if (!tbody) return;
    
    const activeFilterBtn = document.querySelector('#transaction-filter-pills .filter-pill.active');
    const filter = activeFilterBtn ? activeFilterBtn.dataset.txFilter : 'all';

    let txs = appState.transactions;
    if (filter !== 'all') {
        txs = txs.filter(t => t.type.toLowerCase() === filter.toLowerCase());
    }

    tbody.innerHTML = txs.map(tx => `
        <tr>
            <td>${tx.date}</td>
            <td><span class="badge ${tx.type === 'Deposit' ? 'green' : 'blue'}">${tx.type}</span></td>
            <td>${tx.details}</td>
            <td><strong>${tx.amount}</strong></td>
            <td><span class="status-badge completed">${tx.status}</span></td>
        </tr>
    `).join('');
}

// Wallet Modal Handlers
function openWalletModal(action = 'deposit', currency = 'USD') {
    const modal = document.getElementById('wallet-action-modal');
    const title = document.getElementById('wallet-modal-title');
    const actionInput = document.getElementById('wallet-modal-action-type');
    const select = document.getElementById('wallet-modal-currency');
    
    if (!modal) return;
    
    actionInput.value = action;
    title.textContent = action === 'deposit' ? 'Deposit Funds' : 'Withdraw Funds';
    
    select.innerHTML = Object.keys(appState.wallets).map(c => `<option value="${c}" ${c === currency ? 'selected' : ''}>${c}</option>`).join('');
    
    modal.classList.remove('hidden');
}

function closeWalletModal() {
    const modal = document.getElementById('wallet-action-modal');
    if (modal) modal.classList.add('hidden');
}

function handleWalletModalSubmit(e) {
    e.preventDefault();
    const action = document.getElementById('wallet-modal-action-type').value;
    const currency = document.getElementById('wallet-modal-currency').value;
    const amount = parseFloat(document.getElementById('wallet-modal-amount').value);
    const note = document.getElementById('wallet-modal-note').value.trim() || `${action === 'deposit' ? 'Deposit' : 'Withdrawal'} ${currency}`;

    if (isNaN(amount) || amount <= 0) {
        showToast('Please enter a valid amount', 'warning');
        return;
    }

    if (action === 'withdraw' && (appState.wallets[currency] || 0) < amount) {
        showToast(`Insufficient balance in ${currency} wallet`, 'warning');
        return;
    }

    if (action === 'deposit') {
        appState.wallets[currency] = (appState.wallets[currency] || 0) + amount;
    } else {
        appState.wallets[currency] = (appState.wallets[currency] || 0) - amount;
    }

    // Add transaction log
    appState.transactions.unshift({
        id: `tx_${Date.now()}`,
        date: new Date().toLocaleString(),
        type: action === 'deposit' ? 'Deposit' : 'Withdrawal',
        details: note,
        amount: `${action === 'deposit' ? '+' : '-'} ${formatCurrency(amount, currency)}`,
        status: 'Completed'
    });

    saveStateToStorage();
    closeWalletModal();
    renderWallet();
    updateDashboard(appState.baseCurrency);
    showToast(`Successfully processed ${action} of ${formatCurrency(amount, currency)}`, 'success');
}

// --- Alert Engine Logic ---
function renderAlerts() {
    const list = document.getElementById('active-alerts-list');
    const countEl = document.getElementById('active-alerts-count');
    if (!list) return;

    if (countEl) countEl.textContent = appState.alerts.length;

    if (appState.alerts.length === 0) {
        list.innerHTML = '<p class="muted text-sm text-center" style="padding: 2rem;">No active rate alerts created yet.</p>';
        return;
    }

    list.innerHTML = appState.alerts.map(alt => `
        <div class="alert-item-card">
            <div class="alert-item-info">
                <h4>${alt.from}/${alt.to} ${alt.condition === 'above' ? '≥' : '≤'} ${alt.targetRate}</h4>
                <p class="text-sm muted">${alt.note || 'Custom Price Trigger'}</p>
            </div>
            <div class="alert-item-actions">
                <label class="toggle-switch-input">
                    <input type="checkbox" ${alt.active ? 'checked' : ''} onchange="toggleAlertActive('${alt.id}')">
                    <span class="slider"></span>
                </label>
                <button class="btn-text-action" onclick="deleteAlert('${alt.id}')" title="Delete Alert"><i class="ph ph-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function handleCreateAlert(e) {
    e.preventDefault();
    const from = document.getElementById('alert-pair-from').value;
    const to = document.getElementById('alert-pair-to').value;
    const condition = document.getElementById('alert-condition').value;
    const targetRate = parseFloat(document.getElementById('alert-target-rate').value);
    const note = document.getElementById('alert-note').value.trim();

    if (from === to) {
        showToast('Please select two different currencies', 'warning');
        return;
    }
    if (isNaN(targetRate) || targetRate <= 0) {
        showToast('Please enter a valid target threshold rate', 'warning');
        return;
    }

    const newAlert = {
        id: `alt_${Date.now()}`,
        from, to, condition, targetRate, note, active: true
    };

    appState.alerts.unshift(newAlert);
    saveStateToStorage();
    renderAlerts();
    showToast(`Rate alert set for ${from}/${to} ${condition === 'above' ? '≥' : '≤'} ${targetRate}`, 'success');
    document.getElementById('create-alert-form').reset();
}

function toggleAlertActive(id) {
    const alt = appState.alerts.find(a => a.id === id);
    if (alt) {
        alt.active = !alt.active;
        saveStateToStorage();
        renderAlerts();
    }
}

function deleteAlert(id) {
    appState.alerts = appState.alerts.filter(a => a.id !== id);
    saveStateToStorage();
    renderAlerts();
    showToast('Alert deleted', 'info');
}

function checkRateAlerts() {
    if (!currentRates || !appState.alerts.length) return;
    let hasTriggered = false;

    appState.alerts.forEach(alt => {
        if (!alt.active) return;

        let liveRate = 1.0;
        if (alt.from === appState.baseCurrency) {
            liveRate = currentRates[alt.to] || 1.0;
        } else if (alt.to === appState.baseCurrency) {
            liveRate = 1.0 / (currentRates[alt.from] || 1.0);
        } else if (currentRates[alt.from] && currentRates[alt.to]) {
            liveRate = currentRates[alt.to] / currentRates[alt.from];
        }

        const isTriggered = alt.condition === 'above' ? liveRate >= alt.targetRate : liveRate <= alt.targetRate;
        if (isTriggered) {
            hasTriggered = true;
            showToast(`ALERT TRIGGERED: ${alt.from}/${alt.to} rate reached ${liveRate.toFixed(4)}`, 'warning');
        }
    });

    const badgeDot = document.getElementById('alert-badge-dot');
    if (badgeDot) {
        if (hasTriggered) badgeDot.classList.remove('hidden');
        else badgeDot.classList.add('hidden');
    }
}

// --- Exchange Suite Logic ---
function initExchangeSuite() {
    const fromSelect = document.getElementById('ex-from-currency');
    const toSelect = document.getElementById('ex-to-currency');
    const amountInput = document.getElementById('ex-amount');
    
    if (!fromSelect || !toSelect) return;
    
    const optionsHtml = SUPPORTED_CURRENCIES.map(c => `<option value="${c.code}">${c.code} - ${c.name}</option>`).join('');
    fromSelect.innerHTML = optionsHtml;
    toSelect.innerHTML = optionsHtml;
    
    fromSelect.value = 'USD';
    toSelect.value = 'EUR';
    
    fromSelect.addEventListener('change', updateExchangeRates);
    toSelect.addEventListener('change', updateExchangeRates);
    amountInput.addEventListener('input', updateExchangeRates);
    
    const swapBtn = document.getElementById('ex-swap-btn');
    if (swapBtn) {
        swapBtn.addEventListener('click', () => {
            const temp = fromSelect.value;
            fromSelect.value = toSelect.value;
            toSelect.value = temp;
            updateExchangeRates();
        });
    }

    const exForm = document.getElementById('full-exchange-form');
    if (exForm) {
        exForm.addEventListener('submit', handleExecuteExchange);
    }
    
    updateExchangeRates();
}

async function updateExchangeRates() {
    const from = document.getElementById('ex-from-currency').value;
    const to = document.getElementById('ex-to-currency').value;
    const amountVal = parseFloat(document.getElementById('ex-amount').value) || 0;
    const resultInput = document.getElementById('ex-result-amount');
    const rateDisplay = document.getElementById('ex-rate-display');

    if (from === to) {
        resultInput.value = amountVal.toFixed(2);
        rateDisplay.textContent = `1 ${from} = 1.0000 ${to}`;
        return;
    }

    const ratesData = await fetchRates(from);
    if (ratesData && ratesData.rates && ratesData.rates[to]) {
        const rate = ratesData.rates[to];
        const calculated = amountVal * rate;
        resultInput.value = calculated.toFixed(2);
        rateDisplay.textContent = `1 ${from} = ${rate.toFixed(4)} ${to}`;
    }
}

async function handleExecuteExchange(e) {
    e.preventDefault();
    const from = document.getElementById('ex-from-currency').value;
    const to = document.getElementById('ex-to-currency').value;
    const amount = parseFloat(document.getElementById('ex-amount').value);

    if (isNaN(amount) || amount <= 0) {
        showToast('Please enter a valid exchange amount', 'warning');
        return;
    }

    const currentFromBalance = appState.wallets[from] || 0;
    if (currentFromBalance < amount) {
        showToast(`Insufficient balance in ${from} wallet. You have ${formatCurrency(currentFromBalance, from)}`, 'warning');
        return;
    }

    const data = await fetchRates(from);
    if (!data || !data.rates || !data.rates[to]) {
        showToast('Exchange rate currently unavailable', 'warning');
        return;
    }

    const rate = data.rates[to];
    const receivedAmount = amount * rate;

    // Deduct & Credit
    appState.wallets[from] = currentFromBalance - amount;
    appState.wallets[to] = (appState.wallets[to] || 0) + receivedAmount;

    // Transaction Log
    appState.transactions.unshift({
        id: `tx_${Date.now()}`,
        date: new Date().toLocaleString(),
        type: 'Exchange',
        details: `Swapped ${formatCurrency(amount, from)} to ${to}`,
        amount: `+ ${formatCurrency(receivedAmount, to)}`,
        status: 'Completed'
    });

    saveStateToStorage();
    renderWallet();
    updateDashboard(appState.baseCurrency);
    showToast(`Exchange successful! Received ${formatCurrency(receivedAmount, to)}`, 'success');
}

// --- Profile & Authentication Logic ---
function renderProfileUI() {
    const userPill = document.getElementById('user-avatar-pill');
    const topNavUserName = document.getElementById('top-nav-user-name');
    const logoutBtn = document.getElementById('profile-logout-btn');
    const userIcon = userPill ? userPill.querySelector('i') : null;

    if (appState.isLoggedIn) {
        if (topNavUserName) topNavUserName.textContent = appState.userName || 'User';
        if (userIcon) userIcon.className = 'ph ph-user-circle';
        if (logoutBtn) logoutBtn.classList.remove('hidden');
    } else {
        if (topNavUserName) topNavUserName.textContent = 'Login';
        if (userIcon) userIcon.className = 'ph ph-sign-in';
        if (logoutBtn) logoutBtn.classList.add('hidden');
    }
}

function openLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) {
        const nameInput = document.getElementById('login-user-name');
        const emailInput = document.getElementById('login-user-email');
        const passInput = document.getElementById('login-user-password');
        if (nameInput) nameInput.value = appState.userName || '';
        if (emailInput) emailInput.value = appState.userEmail || '';
        if (passInput) passInput.value = '';
        modal.classList.remove('hidden');
    }
}

function closeLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) modal.classList.add('hidden');
}

function handleLoginSubmit(e) {
    e.preventDefault();
    const nameInput = document.getElementById('login-user-name');
    const emailInput = document.getElementById('login-user-email');
    
    const userName = nameInput ? nameInput.value.trim() : '';
    const userEmail = emailInput ? emailInput.value.trim() : '';

    if (!userName) {
        showToast('Please enter your name to log in', 'warning');
        return;
    }

    appState.isLoggedIn = true;
    appState.userName = userName;
    appState.userEmail = userEmail;

    saveStateToStorage();
    renderProfileUI();
    renderSettings();
    closeLoginModal();
    showToast(`Welcome back, ${userName}!`, 'success');
}

function handleLogout() {
    appState.isLoggedIn = false;
    appState.userName = '';
    appState.userEmail = '';

    saveStateToStorage();
    renderProfileUI();
    renderSettings();
    showToast('Logged out successfully', 'info');
}

// --- Settings Logic ---
function renderSettings() {
    const nameInput = document.getElementById('settings-user-name');
    const emailInput = document.getElementById('settings-user-email');
    const baseSelect = document.getElementById('settings-default-base');
    const darkModeToggle = document.getElementById('settings-dark-mode-toggle');
    const toastToggle = document.getElementById('settings-toast-toggle');

    if (nameInput) nameInput.value = appState.userName || '';
    if (emailInput) emailInput.value = appState.userEmail || '';
    if (baseSelect) baseSelect.value = appState.baseCurrency;
    if (darkModeToggle) darkModeToggle.checked = appState.darkMode;
    if (toastToggle) toastToggle.checked = appState.toastNotifications;
    
    renderProfileUI();
}

// --- Event Listeners Setup ---
function setupEventListeners() {
    // Navigation Tabs
    const navItems = ['dashboard', 'marketplace', 'wallet', 'alert', 'exchange', 'settings'];
    navItems.forEach(item => {
        const btn = document.getElementById(`nav-${item}`);
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                switchView(item);
            });
        }
    });

    // Top Nav Bar Controls
    const baseSelector = document.getElementById('base-currency-selector');
    if (baseSelector) {
        const bases = ['USD', 'EUR', 'GBP', 'NGN', 'JPY'];
        let baseIndex = 0;
        baseSelector.addEventListener('click', () => {
            baseIndex = (baseIndex + 1) % bases.length;
            const newBase = bases[baseIndex];
            updateDashboard(newBase);
        });
    }

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            appState.darkMode = !appState.darkMode;
            document.body.classList.toggle('dark-mode', appState.darkMode);
            const themeIcon = document.getElementById('theme-icon');
            if (themeIcon) themeIcon.className = appState.darkMode ? 'ph ph-moon' : 'ph ph-sun';
            const toggleCheckbox = document.getElementById('settings-dark-mode-toggle');
            if (toggleCheckbox) toggleCheckbox.checked = appState.darkMode;
            saveStateToStorage();
        });
    }

    const refreshBtn = document.getElementById('refresh-rates-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            sessionStorage.clear();
            await updateDashboard(appState.baseCurrency);
            renderMarketPlace();
            showToast('Market rates updated live from server', 'info');
        });
    }

    const alertNavBtn = document.getElementById('top-nav-alert-btn');
    if (alertNavBtn) {
        alertNavBtn.addEventListener('click', () => switchView('alert'));
    }

    const userAvatarPill = document.getElementById('user-avatar-pill');
    if (userAvatarPill) {
        userAvatarPill.addEventListener('click', () => {
            if (appState.isLoggedIn) {
                switchView('settings');
            } else {
                openLoginModal();
            }
        });
    }

    const loginClose = document.getElementById('login-modal-close');
    const loginCancel = document.getElementById('login-modal-cancel');
    if (loginClose) loginClose.addEventListener('click', closeLoginModal);
    if (loginCancel) loginCancel.addEventListener('click', closeLoginModal);

    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLoginSubmit);

    const logoutBtn = document.getElementById('profile-logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    // Dashboard Quick Converter Form
    const converterForm = document.getElementById('converter-form');
    if (converterForm) {
        converterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleDashboardConversion();
        });
    }
    const swapBtn = document.getElementById('swap-btn');
    if (swapBtn) swapBtn.addEventListener('click', swapDashboardCurrencies);

    // Marketplace Search & Filters
    const marketSearch = document.getElementById('marketplace-search-input');
    if (marketSearch) {
        marketSearch.addEventListener('input', renderMarketPlace);
    }
    const marketPills = document.querySelectorAll('#marketplace-filter-pills .filter-pill');
    marketPills.forEach(pill => {
        pill.addEventListener('click', () => {
            marketPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            renderMarketPlace();
        });
    });

    // Wallet Action Triggers & Modal
    const depositBtn = document.getElementById('wallet-deposit-btn');
    const withdrawBtn = document.getElementById('wallet-withdraw-btn');
    const transferBtn = document.getElementById('wallet-transfer-btn');
    if (depositBtn) depositBtn.addEventListener('click', () => openWalletModal('deposit', 'USD'));
    if (withdrawBtn) withdrawBtn.addEventListener('click', () => openWalletModal('withdraw', 'USD'));
    if (transferBtn) transferBtn.addEventListener('click', () => switchView('exchange'));

    const modalClose = document.getElementById('wallet-modal-close');
    const modalCancel = document.getElementById('wallet-modal-cancel');
    if (modalClose) modalClose.addEventListener('click', closeWalletModal);
    if (modalCancel) modalCancel.addEventListener('click', closeWalletModal);

    const walletForm = document.getElementById('wallet-modal-form');
    if (walletForm) walletForm.addEventListener('submit', handleWalletModalSubmit);

    // Transaction Filters
    const txPills = document.querySelectorAll('#transaction-filter-pills .filter-pill');
    txPills.forEach(pill => {
        pill.addEventListener('click', () => {
            txPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            renderTransactions();
        });
    });

    // Alert Form
    const alertForm = document.getElementById('create-alert-form');
    if (alertForm) alertForm.addEventListener('submit', handleCreateAlert);

    const clearAlertsBtn = document.getElementById('clear-all-alerts-btn');
    if (clearAlertsBtn) {
        clearAlertsBtn.addEventListener('click', () => {
            appState.alerts = [];
            saveStateToStorage();
            renderAlerts();
            showToast('All alerts cleared', 'info');
        });
    }

    // Settings Profile Form
    const profileForm = document.getElementById('settings-profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newName = document.getElementById('settings-user-name').value.trim();
            const newEmail = document.getElementById('settings-user-email').value.trim();
            const newBase = document.getElementById('settings-default-base').value;
            
            if (newName) {
                appState.userName = newName;
                appState.userEmail = newEmail;
                appState.isLoggedIn = true;
            }
            
            saveStateToStorage();
            renderSettings();
            renderProfileUI();
            updateDashboard(newBase);
            showToast('Profile settings saved successfully', 'success');
        });
    }

    const darkModeToggle = document.getElementById('settings-dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', (e) => {
            appState.darkMode = e.target.checked;
            document.body.classList.toggle('dark-mode', appState.darkMode);
            saveStateToStorage();
        });
    }

    const toastToggle = document.getElementById('settings-toast-toggle');
    if (toastToggle) {
        toastToggle.addEventListener('change', (e) => {
            appState.toastNotifications = e.target.checked;
            saveStateToStorage();
        });
    }

    const resetBtn = document.getElementById('reset-storage-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all app state and restore defaults?')) {
                localStorage.removeItem('curr_conv_app_state');
                sessionStorage.clear();
                location.reload();
            }
        });
    }
}

// --- Quick Converter Utilities ---
function populateCurrencies() {
    const optionsHtml = SUPPORTED_CURRENCIES.map(currency => 
        `<option value="${currency.code}">${currency.code} - ${currency.name}</option>`
    ).join('');
    
    const fromSelect = document.getElementById('from-currency');
    const toSelect = document.getElementById('to-currency');
    const altFrom = document.getElementById('alert-pair-from');
    const altTo = document.getElementById('alert-pair-to');

    if (fromSelect) fromSelect.innerHTML = optionsHtml;
    if (toSelect) toSelect.innerHTML = optionsHtml;
    if (altFrom) altFrom.innerHTML = optionsHtml;
    if (altTo) altTo.innerHTML = optionsHtml;

    if (fromSelect) fromSelect.value = 'USD';
    if (toSelect) toSelect.value = 'EUR';
    if (altFrom) altFrom.value = 'USD';
    if (altTo) altTo.value = 'EUR';
}

function swapDashboardCurrencies() {
    const fromSelect = document.getElementById('from-currency');
    const toSelect = document.getElementById('to-currency');
    if (fromSelect && toSelect) {
        const temp = fromSelect.value;
        fromSelect.value = toSelect.value;
        toSelect.value = temp;
        const resultSection = document.getElementById('result-section');
        if (resultSection && !resultSection.classList.contains('hidden')) {
            handleDashboardConversion();
        }
    }
}

async function handleDashboardConversion() {
    const amountInput = document.getElementById('amount');
    const amountError = document.getElementById('amount-error');
    const convertBtn = document.getElementById('convert-btn');
    const btnText = document.querySelector('.btn-text');
    const spinner = document.querySelector('.spinner');
    const resultSection = document.getElementById('result-section');
    const convertedResult = document.getElementById('converted-result');
    const exchangeRateInfo = document.getElementById('exchange-rate-info');
    const fromSelect = document.getElementById('from-currency');
    const toSelect = document.getElementById('to-currency');

    const val = amountInput.value.trim();
    const amount = parseFloat(val);
    
    if (val === '' || isNaN(amount) || amount < 0) {
        amountInput.parentElement.classList.add('has-error');
        if (amountError) {
            amountError.textContent = 'Please enter a valid positive amount.';
            amountError.style.display = 'block';
        }
        return;
    }
    
    const from = fromSelect.value;
    const to = toSelect.value;
    
    if (convertBtn) convertBtn.disabled = true;
    if (btnText) btnText.textContent = 'Converting...';
    if (spinner) spinner.style.display = 'block';
    
    try {
        const data = await fetchRates(from);
        if (!data || !data.rates || !data.rates[to]) {
            throw new Error('Rate unavailable');
        }
        
        const rate = data.rates[to];
        const converted = amount * rate;
        
        if (convertedResult) convertedResult.innerHTML = `${formatCurrency(amount, from)} = <br>${formatCurrency(converted, to)}`;
        if (exchangeRateInfo) exchangeRateInfo.textContent = `1 ${from} = ${formatNumber(rate)} ${to}`;
        if (resultSection) resultSection.classList.remove('hidden');
    } catch(e) {
        showToast('Failed to fetch exchange rates. Please check network connection.', 'warning');
        if (resultSection) resultSection.classList.add('hidden');
    } finally {
        if (convertBtn) convertBtn.disabled = false;
        if (btnText) btnText.textContent = 'Convert Currency';
        if (spinner) spinner.style.display = 'none';
    }
}

// --- Chart Setup ---
function initCharts() {
    const lineCtx = document.getElementById('lineChart');
    if (lineCtx) {
        charts.line = new Chart(lineCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [
                    {
                        label: 'USD',
                        data: [260, 270, 230, 420, 650, 600, 520, 750, 650, 700, 800, 820],
                        borderColor: '#1e1e78',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 4
                    },
                    {
                        label: 'EURO',
                        data: [300, 310, 280, 250, 400, 260, 380, 550, 500, 750, 850, 860],
                        borderColor: '#ef4444',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false } },
                    y: { grid: { color: '#f0f0f0' } }
                }
            }
        });
    }

    const donutCtx = document.getElementById('donutChart');
    if (donutCtx) {
        charts.donut = new Chart(donutCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['USD', 'Euro', 'Pounds', 'Naira'],
                datasets: [{
                    data: [45, 30, 20, 5], 
                    backgroundColor: ['#2a2a72', '#0052cc', '#5c2e91', '#d1d5db'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: { legend: { display: false } }
            }
        });
    }
}
