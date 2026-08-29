// --- Global State & Configuration ---
const SUPPORTED_CURRENCIES = [
    { code: 'AED', name: 'UAE Dirham' },
    { code: 'AUD', name: 'Australian Dollar' },
    { code: 'BRL', name: 'Brazilian Real' },
    { code: 'CAD', name: 'Canadian Dollar' },
    { code: 'CHF', name: 'Swiss Franc' },
    { code: 'CNY', name: 'Chinese Yuan' },
    { code: 'DKK', name: 'Danish Krone' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'British Pound' },
    { code: 'HKD', name: 'Hong Kong Dollar' },
    { code: 'INR', name: 'Indian Rupee' },
    { code: 'JPY', name: 'Japanese Yen' },
    { code: 'KRW', name: 'South Korean Won' },
    { code: 'MXN', name: 'Mexican Peso' },
    { code: 'NGN', name: 'Nigerian Naira' },
    { code: 'NOK', name: 'Norwegian Krone' },
    { code: 'NZD', name: 'New Zealand Dollar' },
    { code: 'SAR', name: 'Saudi Riyal' },
    { code: 'SEK', name: 'Swedish Krona' },
    { code: 'SGD', name: 'Singapore Dollar' },
    { code: 'THB', name: 'Thai Baht' },
    { code: 'USD', name: 'US Dollar' },
    { code: 'ZAR', name: 'South African Rand' }
];

let baseCurrency = 'USD';
let currentRates = null;
let charts = {};

// DOM Elements
const dashboardView = document.getElementById('dashboard-view');
const baseCurrencySelector = document.getElementById('base-currency-selector');
const navExchange = document.getElementById('nav-exchange');
const navDashboard = document.getElementById('nav-dashboard');

const converterForm = document.getElementById('converter-form');
const amountInput = document.getElementById('amount');
const amountError = document.getElementById('amount-error');
const fromCurrencySelect = document.getElementById('from-currency');
const toCurrencySelect = document.getElementById('to-currency');
const swapBtn = document.getElementById('swap-btn');
const convertBtn = document.getElementById('convert-btn');
const btnText = document.querySelector('.btn-text');
const spinner = document.querySelector('.spinner');
const resultSection = document.getElementById('result-section');
const convertedResult = document.getElementById('converted-result');
const exchangeRateInfo = document.getElementById('exchange-rate-info');

// Formatter
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

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    initCharts();
    populateCurrencies();
    setupEventListeners();
    await updateDashboard(baseCurrency);
});

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
        return null; // Fallback handled by UI
    }
}

// --- Dashboard Logic ---
async function updateDashboard(base) {
    const data = await fetchRates(base);
    if (!data) return; // Silent fail if offline, keeps previous data
    
    currentRates = data.rates;
    
    // We want specific pairs, but relative to our new base. 
    // The mockup had hardcoded pairs like USD/NGN, USD/EUR, EUR/USD, JPY/EUR
    // Let's make them dynamic based on the selected base currency!
    
    // Define some target currencies for the 4 mini cards
    const targets = ['NGN', 'EUR', 'GBP', 'JPY']; 
    // Ensure base doesn't overlap with targets
    const displayTargets = targets.filter(t => t !== base);
    if (displayTargets.length < 4) displayTargets.push(base === 'CAD' ? 'CHF' : 'CAD');
    
    // Update Mini Cards
    for (let i = 1; i <= 4; i++) {
        const target = displayTargets[i-1];
        const rate = currentRates[target] || 0;
        
        document.getElementById(`pair${i}-title`).textContent = `${base}/${target}`;
        
        // Split amount and decimals for styling
        const formatted = rate.toFixed(3); // e.g. 312.723
        const parts = formatted.split('.');
        document.getElementById(`rate-${i === 1 ? 'usd-ngn' : i === 2 ? 'usd-eur' : i === 3 ? 'eur-usd' : 'jpy-eur'}`).innerHTML = 
            `${parts[0]}<span class="decimals">.${parts[1]}</span>`;
    }
    
    // Update Account Balance (Assuming 20,000 USD is the base portfolio value)
    // Convert 20000 USD to the selected base currency
    let portfolioBase = 20000;
    if (base !== 'USD') {
        const usdData = await fetchRates('USD');
        if(usdData) {
            portfolioBase = 20000 * usdData.rates[base];
        }
    }
    document.getElementById('account-balance-total').textContent = formatCurrency(portfolioBase, base);
    
    // Update Table
    const tableTarget1 = 'EUR';
    const tableTarget2 = 'GBP';
    document.getElementById('table-pair1-name').textContent = `${base}/${tableTarget1}`;
    document.getElementById('table-pair2-name').textContent = `${base}/${tableTarget2}`;
    
    const rate1 = currentRates[tableTarget1] || 0;
    const parts1 = rate1.toFixed(3).split('.');
    document.getElementById('table-rate-usd-eur').innerHTML = `${parts1[0]}<span class="decimals">.${parts1[1]}</span>`;
    
    const rate2 = currentRates[tableTarget2] || 0;
    const parts2 = rate2.toFixed(3).split('.');
    document.getElementById('table-rate-eur-usd').innerHTML = `${parts2[0]}<span class="decimals">.${parts2[1]}</span>`;
}

// --- Event Listeners ---
function setupEventListeners() {
    // Base Currency Selector (Top Nav)
    // For simplicity in UI interaction without a real dropdown component, clicking it swaps between USD, EUR, GBP
    const bases = ['USD', 'EUR', 'GBP'];
    let baseIndex = 0;
    
    baseCurrencySelector.addEventListener('click', () => {
        baseIndex = (baseIndex + 1) % bases.length;
        baseCurrency = bases[baseIndex];
        baseCurrencySelector.innerHTML = `${baseCurrency} <i class="ph ph-caret-down"></i>`;
        updateDashboard(baseCurrency);
    });
    
    // Sidebar Navigation
    navExchange.addEventListener('click', (e) => {
        e.preventDefault();
        navExchange.classList.add('active');
        navDashboard.classList.remove('active');
        // Scroll to the converter card
        document.querySelector('.quick-convert-card').scrollIntoView({ behavior: 'smooth' });
    });
    
    navDashboard.addEventListener('click', (e) => {
        e.preventDefault();
        navDashboard.classList.add('active');
        navExchange.classList.remove('active');
    });
    
    // Converter Form
    converterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleConversion();
    });
    swapBtn.addEventListener('click', swapCurrencies);
    amountInput.addEventListener('input', () => { amountInput.parentElement.classList.remove('has-error'); amountError.style.display = 'none'; });
}

// --- Converter Logic (Modal) ---
function populateCurrencies() {
    const optionsHtml = SUPPORTED_CURRENCIES.map(currency => 
        `<option value="${currency.code}">${currency.code} - ${currency.name}</option>`
    ).join('');
    
    fromCurrencySelect.innerHTML = optionsHtml;
    toCurrencySelect.innerHTML = optionsHtml;
    
    fromCurrencySelect.value = 'USD';
    toCurrencySelect.value = 'EUR';
}

function swapCurrencies() {
    const temp = fromCurrencySelect.value;
    fromCurrencySelect.value = toCurrencySelect.value;
    toCurrencySelect.value = temp;
    if (resultSection.classList.contains('hidden') === false) {
        handleConversion();
    }
}

async function handleConversion() {
    const val = amountInput.value.trim();
    const amount = parseFloat(val);
    
    if (val === '' || isNaN(amount) || amount < 0) {
        amountInput.parentElement.classList.add('has-error');
        amountError.textContent = 'Please enter a valid positive amount.';
        amountError.style.display = 'block';
        return;
    }
    
    const from = fromCurrencySelect.value;
    const to = toCurrencySelect.value;
    
    // Show Loading
    convertBtn.disabled = true;
    btnText.textContent = 'Converting...';
    spinner.style.display = 'block';
    
    try {
        const data = await fetchRates(from);
        if (!data || !data.rates || !data.rates[to]) {
            throw new Error('Rate unavailable');
        }
        
        const rate = data.rates[to];
        const converted = amount * rate;
        
        convertedResult.innerHTML = `${formatCurrency(amount, from)} = <br>${formatCurrency(converted, to)}`;
        exchangeRateInfo.textContent = `1 ${from} = ${formatNumber(rate)} ${to}`;
        
        resultSection.classList.remove('hidden');
    } catch(e) {
        alert("Failed to fetch exchange rates. Please check your connection.");
        resultSection.classList.add('hidden');
    } finally {
        convertBtn.disabled = false;
        btnText.textContent = 'Convert Currency';
        spinner.style.display = 'none';
    }
}

// --- Charts Initialization ---
function initCharts() {
    // --- Line Chart (Statistics) ---
    // Note: We use mocked history data because the free tier API doesn't provide historical data.
    const lineCtx = document.getElementById('lineChart').getContext('2d');
    charts.line = new Chart(lineCtx, {
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
            plugins: {
                legend: { display: false },
                tooltip: { mode: 'index', intersect: false, }
            },
            scales: {
                x: {
                    grid: { display: false, drawBorder: false },
                    ticks: { font: { size: 10, family: 'Inter', weight: '600' }, color: '#8b8b9b' }
                },
                y: {
                    min: 100, max: 1000,
                    ticks: { stepSize: 100, font: { size: 9, family: 'Inter', weight: '600' }, color: '#8b8b9b' },
                    grid: { color: '#f0f0f0', drawBorder: false, }
                }
            }
        },
        plugins: [{
            id: 'x-axis-title',
            afterDraw: (chart) => {
                const ctx = chart.ctx; ctx.save(); ctx.font = 'bold 11px Inter'; ctx.fillStyle = '#1e1e78';
                ctx.textAlign = 'right'; ctx.fillText('Months', chart.width, chart.height - 5); ctx.restore();
            }
        }, {
             id: 'y-axis-title',
             afterDraw: (chart) => {
                 const ctx = chart.ctx; ctx.save(); ctx.font = 'bold 11px Inter'; ctx.fillStyle = '#1e1e78';
                 ctx.textAlign = 'left'; ctx.fillText('Rate', 0, 15); ctx.restore();
             }
        }]
    });

    // --- Donut Chart (Balance Details) ---
    const donutCtx = document.getElementById('donutChart').getContext('2d');
    charts.donut = new Chart(donutCtx, {
        type: 'doughnut',
        data: {
            labels: ['USD', 'Euro', 'Pounds', 'Naira'],
            datasets: [{
                data: [45, 30, 20, 5], 
                backgroundColor: ['#2a2a72', '#0052cc', '#5c2e91', '#d1d5db'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: { legend: { display: false }, tooltip: { enabled: false } }
        }
    });
}
