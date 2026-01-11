// Gold Portfolio Tracker - Main Application JS
const API_BASE = '';

// State
let currentPrices = null;
let portfolioData = null;

// DOM Elements
const elements = {
    refreshBtn: document.getElementById('refreshBtn'),
    lastUpdate: document.getElementById('lastUpdate'),
    totalValue: document.getElementById('totalValue'),
    totalChange: document.getElementById('totalChange'),
    totalWeight: document.getElementById('totalWeight'),
    totalCost: document.getElementById('totalCost'),
    holdingsList: document.getElementById('holdingsList'),
    pricesList: document.getElementById('pricesList'),
    historyList: document.getElementById('historyList'),
    fabAdd: document.getElementById('fabAdd'),
    modalOverlay: document.getElementById('modalOverlay'),
    modalTitle: document.getElementById('modalTitle'),
    modalClose: document.getElementById('modalClose'),
    holdingForm: document.getElementById('holdingForm'),
    holdingId: document.getElementById('holdingId'),
    weight: document.getElementById('weight'),
    purchasePrice: document.getElementById('purchasePrice'),
    purchaseDate: document.getElementById('purchaseDate'),
    notes: document.getElementById('notes'),
    cancelBtn: document.getElementById('cancelBtn'),
    submitBtn: document.getElementById('submitBtn'),
    priceSuggestion: document.getElementById('priceSuggestion'),
    sellModalOverlay: document.getElementById('sellModalOverlay'),
    sellForm: document.getElementById('sellForm'),
    sellHoldingId: document.getElementById('sellHoldingId'),
    sellPrice: document.getElementById('sellPrice'),
    sellInfo: document.getElementById('sellInfo'),
    sellModalClose: document.getElementById('sellModalClose'),
    cancelSellBtn: document.getElementById('cancelSellBtn'),
    toastContainer: document.getElementById('toastContainer'),
    // Import elements
    fabImport: document.getElementById('fabImport'),
    importModalOverlay: document.getElementById('importModalOverlay'),
    importModalClose: document.getElementById('importModalClose'),
    importFile: document.getElementById('importFile'),
    fileUploadArea: document.getElementById('fileUploadArea'),
    selectedFile: document.getElementById('selectedFile'),
    fileName: document.getElementById('fileName'),
    removeFile: document.getElementById('removeFile'),
    cancelImportBtn: document.getElementById('cancelImportBtn'),
    submitImportBtn: document.getElementById('submitImportBtn')
};

// Format currency
function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> ${message}`;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Tab navigation
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
    });
});

// Fetch prices from API
async function fetchPrices() {
    elements.refreshBtn.classList.add('spinning');
    try {
        const res = await fetch(`${API_BASE}/api/prices`);
        const data = await res.json();
        if (data.success) {
            currentPrices = data;
            elements.lastUpdate.textContent = `Updated: ${data.last_update}`;
            renderPrices(data.data);
        } else {
            showToast('Failed to fetch prices', 'error');
        }
    } catch (e) {
        showToast('Network error', 'error');
    }
    elements.refreshBtn.classList.remove('spinning');
}

// Render prices list
function renderPrices(prices) {
    const sortedPrices = Object.values(prices).sort((a, b) => a.weight - b.weight);
    elements.pricesList.innerHTML = sortedPrices.map(p => `
        <div class="price-card">
            <div class="price-weight">${p.weight} gr</div>
            <div class="price-value sell">
                <span class="label">Sell</span>
                <span class="amount">${formatRupiah(p.sell)}</span>
            </div>
            <div class="price-value buy">
                <span class="label">Buyback</span>
                <span class="amount">${formatRupiah(p.buy)}</span>
            </div>
            <div class="price-spread">${p.spread_pct}%</div>
        </div>
    `).join('');
}

// Fetch portfolio summary
async function fetchPortfolio() {
    try {
        const res = await fetch(`${API_BASE}/api/portfolio/summary`);
        const data = await res.json();
        if (data.success) {
            portfolioData = data;
            renderSummary(data.summary);
            renderHoldings(data.holdings);
            renderHistory(data.transactions);
        }
    } catch (e) {
        console.error('Failed to fetch portfolio', e);
    }
}

// Render summary cards
function renderSummary(summary) {
    elements.totalValue.textContent = formatRupiah(summary.total_current_value);
    elements.totalWeight.textContent = `${summary.total_weight} gr`;
    elements.totalCost.textContent = formatRupiah(summary.total_cost);

    const changeEl = elements.totalChange;
    const isPositive = summary.total_profit_loss >= 0;
    changeEl.className = `summary-change ${isPositive ? 'positive' : 'negative'}`;
    changeEl.innerHTML = `
        <span class="change-value">${isPositive ? '+' : ''}${formatRupiah(summary.total_profit_loss)}</span>
        <span class="change-percent">(${isPositive ? '+' : ''}${summary.total_profit_loss_pct}%)</span>
    `;
}

// Render holdings list
function renderHoldings(holdings) {
    if (!holdings || holdings.length === 0) {
        elements.holdingsList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🪙</span>
                <p>No gold holdings yet</p>
                <span class="empty-hint">Tap + to add your first gold</span>
            </div>
        `;
        return;
    }

    elements.holdingsList.innerHTML = holdings.map(h => {
        const isPositive = h.profit_loss >= 0;
        return `
        <div class="holding-card" data-id="${h.id}">
            <div class="holding-header">
                <span class="holding-weight">${h.weight} gram</span>
                <span class="holding-badge">${h.notes || 'Gold'}</span>
            </div>
            <div class="holding-details">
                <div class="holding-detail">
                    <span class="label">Cost</span>
                    <span class="value">${formatRupiah(h.purchase_price)}</span>
                </div>
                <div class="holding-detail">
                    <span class="label">Current Value</span>
                    <span class="value">${formatRupiah(h.current_buy)}</span>
                </div>
                <div class="holding-detail">
                    <span class="label">Profit/Loss</span>
                    <span class="value ${isPositive ? 'positive' : 'negative'}">${isPositive ? '+' : ''}${formatRupiah(h.profit_loss)}</span>
                </div>
                <div class="holding-detail">
                    <span class="label">Return</span>
                    <span class="value ${isPositive ? 'positive' : 'negative'}">${isPositive ? '+' : ''}${h.profit_loss_pct}%</span>
                </div>
            </div>
            <div class="holding-actions">
                <button class="holding-action-btn edit" onclick="editHolding('${h.id}')">Edit</button>
                <button class="holding-action-btn sell" onclick="openSellModal('${h.id}')">Sell</button>
            </div>
        </div>
        `;
    }).join('');
}

// Render history
function renderHistory(transactions) {
    if (!transactions || transactions.length === 0) {
        elements.historyList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📜</span>
                <p>No transactions yet</p>
            </div>
        `;
        return;
    }

    const sorted = [...transactions].reverse();
    elements.historyList.innerHTML = sorted.map(t => `
        <div class="history-card">
            <div class="history-icon ${t.type.toLowerCase()}">${t.type === 'BUY' ? '📥' : '📤'}</div>
            <div class="history-details">
                <div class="history-title">${t.type === 'BUY' ? 'Bought' : 'Sold'} ${t.weight}g Gold</div>
                <div class="history-subtitle">${t.date}</div>
            </div>
            <div class="history-amount ${t.type.toLowerCase()}">
                <div class="price">${t.type === 'BUY' ? '-' : '+'}${formatRupiah(t.price)}</div>
            </div>
        </div>
    `).join('');
}

// Modal handlers
function openAddModal() {
    elements.modalTitle.textContent = 'Add Gold';
    elements.submitBtn.textContent = 'Add Gold';
    elements.holdingId.value = '';
    elements.holdingForm.reset();
    elements.purchaseDate.value = new Date().toISOString().split('T')[0];
    elements.modalOverlay.classList.add('active');
}

function closeModal() {
    elements.modalOverlay.classList.remove('active');
}

function editHolding(id) {
    const holding = portfolioData.holdings.find(h => h.id === id);
    if (!holding) return;

    elements.modalTitle.textContent = 'Edit Gold';
    elements.submitBtn.textContent = 'Save Changes';
    elements.holdingId.value = holding.id;
    elements.weight.value = holding.weight;
    elements.purchasePrice.value = holding.purchase_price;
    elements.purchaseDate.value = holding.purchase_date;
    elements.notes.value = holding.notes || '';
    elements.modalOverlay.classList.add('active');
}

function openSellModal(id) {
    const holding = portfolioData.holdings.find(h => h.id === id);
    if (!holding) return;

    elements.sellHoldingId.value = id;
    elements.sellPrice.value = holding.current_buy || '';
    elements.sellInfo.textContent = `Selling ${holding.weight}g gold (Current buyback: ${formatRupiah(holding.current_buy)})`;
    elements.sellModalOverlay.classList.add('active');
}

function closeSellModal() {
    elements.sellModalOverlay.classList.remove('active');
}

// Weight preset buttons
document.querySelectorAll('.weight-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.weight-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        elements.weight.value = btn.dataset.weight;
        updatePriceSuggestion();
    });
});

// Update price suggestion based on weight
function updatePriceSuggestion() {
    const weight = elements.weight.value;
    if (currentPrices && weight) {
        const priceKey = String(parseFloat(weight));
        const priceData = currentPrices.data[priceKey];
        if (priceData) {
            elements.priceSuggestion.textContent = `Current sell price: ${formatRupiah(priceData.sell)}`;
        } else {
            // Estimate from 1 gram
            const oneGram = currentPrices.data['1.0'] || currentPrices.data['1'];
            if (oneGram) {
                elements.priceSuggestion.textContent = `Estimated: ${formatRupiah(oneGram.sell * parseFloat(weight))}`;
            }
        }
    }
}

elements.weight.addEventListener('input', updatePriceSuggestion);

// Form submission
elements.holdingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const holdingData = {
        weight: parseFloat(elements.weight.value),
        purchase_price: parseFloat(elements.purchasePrice.value),
        purchase_date: elements.purchaseDate.value,
        notes: elements.notes.value
    };

    const id = elements.holdingId.value;
    const isEdit = !!id;

    try {
        const res = await fetch(`${API_BASE}/api/portfolio/holdings${isEdit ? `/${id}` : ''}`, {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(holdingData)
        });

        const data = await res.json();
        if (data.success) {
            showToast(isEdit ? 'Gold updated!' : 'Gold added!');
            closeModal();
            fetchPortfolio();
        } else {
            showToast(data.error || 'Failed', 'error');
        }
    } catch (e) {
        showToast('Network error', 'error');
    }
});

// Sell form submission
elements.sellForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = elements.sellHoldingId.value;
    const sellPrice = parseFloat(elements.sellPrice.value);

    try {
        const res = await fetch(`${API_BASE}/api/portfolio/holdings/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sell_price: sellPrice })
        });

        const data = await res.json();
        if (data.success) {
            showToast('Gold sold successfully!');
            closeSellModal();
            fetchPortfolio();
        } else {
            showToast(data.error || 'Failed to sell', 'error');
        }
    } catch (e) {
        showToast('Network error', 'error');
    }
});

// Event listeners
elements.refreshBtn.addEventListener('click', () => { fetchPrices(); fetchPortfolio(); });
elements.fabAdd.addEventListener('click', openAddModal);
elements.modalClose.addEventListener('click', closeModal);
elements.cancelBtn.addEventListener('click', closeModal);
elements.sellModalClose.addEventListener('click', closeSellModal);
elements.cancelSellBtn.addEventListener('click', closeSellModal);
elements.modalOverlay.addEventListener('click', (e) => { if (e.target === elements.modalOverlay) closeModal(); });
elements.sellModalOverlay.addEventListener('click', (e) => { if (e.target === elements.sellModalOverlay) closeSellModal(); });

// Import functionality
function openImportModal() {
    elements.importModalOverlay.classList.add('active');
    resetImportForm();
}

function closeImportModal() {
    elements.importModalOverlay.classList.remove('active');
    resetImportForm();
}

function resetImportForm() {
    elements.importFile.value = '';
    elements.selectedFile.style.display = 'none';
    elements.fileUploadArea.style.display = 'flex';
    elements.submitImportBtn.disabled = true;
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        elements.fileName.textContent = file.name;
        elements.selectedFile.style.display = 'flex';
        elements.fileUploadArea.style.display = 'none';
        elements.submitImportBtn.disabled = false;
    }
}

async function handleImport() {
    const file = elements.importFile.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    elements.submitImportBtn.disabled = true;
    elements.submitImportBtn.textContent = 'Importing...';

    try {
        const res = await fetch(`${API_BASE}/api/portfolio/import`, {
            method: 'POST',
            body: formData
        });

        const data = await res.json();
        if (data.success) {
            showToast(`Imported ${data.imported} holdings!`);
            if (data.errors && data.errors.length > 0) {
                console.warn('Import errors:', data.errors);
            }
            closeImportModal();
            fetchPortfolio();
        } else {
            showToast(data.error || 'Import failed', 'error');
        }
    } catch (e) {
        showToast('Network error', 'error');
    }

    elements.submitImportBtn.disabled = false;
    elements.submitImportBtn.textContent = 'Import';
}

elements.fabImport.addEventListener('click', openImportModal);
elements.importModalClose.addEventListener('click', closeImportModal);
elements.cancelImportBtn.addEventListener('click', closeImportModal);
elements.fileUploadArea.addEventListener('click', () => elements.importFile.click());
elements.importFile.addEventListener('change', handleFileSelect);
elements.removeFile.addEventListener('click', resetImportForm);
elements.submitImportBtn.addEventListener('click', handleImport);
elements.importModalOverlay.addEventListener('click', (e) => { if (e.target === elements.importModalOverlay) closeImportModal(); });

// Initial load
fetchPrices();
fetchPortfolio();

