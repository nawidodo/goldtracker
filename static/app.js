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
    totalPositions: document.getElementById('totalPositions'),
    averageCost: document.getElementById('averageCost'),
    holdingCount: document.getElementById('holdingCount'),
    holdingsList: document.getElementById('holdingsList'),
    allocationList: document.getElementById('allocationList'),
    transactionList: document.getElementById('transactionList'),
    pricesList: document.getElementById('pricesList'),
    priceHistoryList: document.getElementById('priceHistoryList'),
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
    toast.textContent = message;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Tab navigation
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(tabButton => {
            const isActive = tabButton === btn;
            tabButton.classList.toggle('active', isActive);
            tabButton.setAttribute('aria-selected', String(isActive));
            tabButton.tabIndex = isActive ? 0 : -1;
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            const isActive = content.id === `${btn.dataset.tab}-tab`;
            content.classList.toggle('active', isActive);
            content.setAttribute('aria-hidden', String(!isActive));
        });
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
    if (sortedPrices.length === 0) {
        elements.pricesList.innerHTML = '<div class="empty-state"><p>No current prices available</p><span class="empty-hint">Use refresh to request a new quote.</span></div>';
        return;
    }

    elements.pricesList.innerHTML = sortedPrices.map(p => `
        <div class="price-card" role="row">
            <div class="price-weight" role="cell">${p.weight} gr</div>
            <div class="price-value sell" role="cell">
                <span class="label">Sell</span>
                <span class="amount">${formatRupiah(p.sell)}</span>
            </div>
            <div class="price-value buy" role="cell">
                <span class="label">Buyback</span>
                <span class="amount">${formatRupiah(p.buy)}</span>
            </div>
            <div class="price-spread" role="cell" aria-label="Spread ${p.spread_pct} percent">${p.spread_pct}%</div>
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
    elements.totalPositions.textContent = `${portfolioData.holdings.length} ${portfolioData.holdings.length === 1 ? 'lot' : 'lots'}`;
    elements.averageCost.textContent = formatRupiah(summary.total_weight > 0 ? summary.total_cost / summary.total_weight : 0);

    const changeEl = elements.totalChange;
    const isPositive = summary.total_profit_loss >= 0;
    changeEl.className = `summary-change ${isPositive ? 'positive' : 'negative'}`;
    changeEl.innerHTML = `
        <span class="change-value">${isPositive ? '+' : ''}${formatRupiah(summary.total_profit_loss)}</span>
        <span class="change-percent">(${isPositive ? '+' : ''}${summary.total_profit_loss_pct}%)</span>
    `;
}

// Render holdings and weight-based allocation
function renderHoldings(holdings) {
    elements.holdingCount.textContent = `${String(holdings.length).padStart(2, '0')} ${holdings.length === 1 ? 'entry' : 'entries'}`;

    if (holdings.length === 0) {
        elements.holdingsList.innerHTML = `
            <div class="empty-state">
                <p>No gold holdings yet</p>
                <span class="empty-hint">Use Add to open the first position.</span>
            </div>
        `;
        renderAllocation([]);
        return;
    }

    elements.holdingsList.innerHTML = holdings.map(h => {
        const isPositive = h.profit_loss >= 0;
        return `
        <article class="holding-card" data-id="${h.id}" role="row">
            <div class="holding-header" role="cell">
                <span class="holding-weight">${h.weight} gram</span>
                <span class="holding-badge">${h.notes || 'Gold'}</span>
            </div>
            <div class="holding-details">
                <div class="holding-detail" role="cell">
                    <span class="label">Cost</span>
                    <span class="value">${formatRupiah(h.purchase_price)}</span>
                </div>
                <div class="holding-detail" role="cell">
                    <span class="label">Current</span>
                    <span class="value">${formatRupiah(h.current_buy)}</span>
                </div>
                <div class="holding-detail" role="cell">
                    <span class="label">P/L</span>
                    <span class="value ${isPositive ? 'positive' : 'negative'}">${isPositive ? '+' : ''}${formatRupiah(h.profit_loss)}</span>
                </div>
                <div class="holding-detail" role="cell">
                    <span class="label">Return</span>
                    <span class="value ${isPositive ? 'positive' : 'negative'}">${isPositive ? '+' : ''}${h.profit_loss_pct}%</span>
                </div>
            </div>
            <div class="holding-actions" role="cell">
                <button class="holding-action-btn edit" type="button" onclick="editHolding('${h.id}')">Edit</button>
                <button class="holding-action-btn delete" type="button" onclick="deleteHolding('${h.id}')">Delete</button>
                <button class="holding-action-btn sell" type="button" onclick="openSellModal('${h.id}')">Sell</button>
            </div>
        </article>
        `;
    }).join('');

    renderAllocation(holdings);
}

function renderAllocation(holdings) {
    const totalWeight = holdings.reduce((sum, holding) => sum + Number(holding.weight), 0);
    if (totalWeight <= 0) {
        elements.allocationList.innerHTML = '<div class="empty-inline">No allocation data</div>';
        return;
    }

    const allocations = holdings
        .map(holding => ({
            id: holding.id,
            label: holding.notes || `Position ${holding.id}`,
            weight: Number(holding.weight),
            percentage: Number(holding.weight) / totalWeight * 100
        }))
        .sort((a, b) => b.weight - a.weight);

    elements.allocationList.innerHTML = allocations.map(item => `
        <div class="allocation-item">
            <div class="allocation-meta">
                <strong>${item.label}</strong>
                <span>${item.percentage.toFixed(1)}%</span>
            </div>
            <div class="allocation-bar" aria-hidden="true">
                <span style="width: ${item.percentage}%"></span>
            </div>
            <div class="allocation-bar-labels"><span>${item.weight} gr</span><span>WEIGHT</span></div>
        </div>
    `).join('');
}

// Render portfolio transactions separately from market price history
function renderHistory(transactions) {
    if (!transactions || transactions.length === 0) {
        elements.transactionList.innerHTML = '<div class="empty-inline">No activity yet</div>';
        return;
    }

    const sorted = [...transactions].reverse();
    elements.transactionList.innerHTML = sorted.map(t => {
        const isBuy = t.type === 'BUY';
        return `
        <div class="transaction-card ${isBuy ? 'buy' : 'sell'}">
            <div class="transaction-mark" aria-hidden="true">${isBuy ? 'IN' : 'OUT'}</div>
            <div class="transaction-details">
                <strong>${isBuy ? 'Bought' : 'Sold'} ${t.weight}g gold</strong>
                <span>${t.date}</span>
            </div>
            <div class="transaction-amount">
                <strong>${isBuy ? '−' : '+'}${formatRupiah(t.price)}</strong>
                <span>${t.type}</span>
            </div>
        </div>
    `;
    }).join('');
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

// Delete holding (without sell)
async function deleteHolding(id) {
    const holding = portfolioData.holdings.find(h => h.id === id);
    if (!holding) return;

    if (!confirm(`Delete ${holding.weight}g gold (${holding.notes || 'Gold'})?\n\nThis will remove it from your portfolio without recording a sale.`)) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/portfolio/holdings/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}) // No sell price = delete
        });

        const data = await res.json();
        if (data.success) {
            showToast('Holding deleted!');
            fetchPortfolio();
        } else {
            showToast(data.error || 'Failed to delete', 'error');
        }
    } catch (e) {
        showToast('Network error', 'error');
    }
}

// Export portfolio to CSV
function exportPortfolio() {
    window.location.href = `${API_BASE}/api/portfolio/export`;
    showToast('Downloading CSV...');
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
elements.fileUploadArea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        elements.importFile.click();
    }
});
elements.importFile.addEventListener('change', handleFileSelect);
elements.removeFile.addEventListener('click', resetImportForm);
elements.submitImportBtn.addEventListener('click', handleImport);
elements.importModalOverlay.addEventListener('click', (e) => { if (e.target === elements.importModalOverlay) closeImportModal(); });

// ======= PRICE HISTORY FUNCTIONALITY =======

// Load price history from API
async function loadPriceHistory(days = 7) {
    const historyList = elements.priceHistoryList;

    try {
        historyList.innerHTML = '<div class="loading-state"><div class="spinner" aria-hidden="true"></div><p>Loading price history…</p></div>';

        const response = await fetch(`${API_BASE}/api/price-history?days=${days}`);
        const result = await response.json();

        if (result.success) {
            renderPriceHistory(result.data);
        } else {
            historyList.innerHTML = '<div class="empty-state"><p>Failed to load price history</p></div>';
        }
    } catch (error) {
        console.error('Failed to load price history:', error);
        historyList.innerHTML = '<div class="empty-state"><p>Network error</p></div>';
    }
}

// Render price history table
function renderPriceHistory(history) {
    const historyList = elements.priceHistoryList;

    if (!history || history.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <p>No price history yet</p>
                <span class="empty-hint">Prices are recorded hourly. Check back soon.</span>
            </div>
        `;
        return;
    }

    let html = `
        <div class="history-table-wrapper">
            <table class="history-table">
                <thead>
                    <tr>
                        <th>Date & Time</th>
                        <th>Sell Price</th>
                        <th>Buy Price</th>
                        <th>Change</th>
                    </tr>
                </thead>
                <tbody>
    `;

    for (let i = 0; i < history.length; i++) {
        const item = history[i];
        const date = new Date(item.timestamp);
        const formatted = date.toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Calculate change from previous entry
        let changeHtml = '<span class="neutral">-</span>';
        if (i > 0) {
            const prev = history[i - 1];
            const change = item.buy_price - prev.buy_price;
            const changePct = ((change / prev.buy_price) * 100).toFixed(2);

            if (change > 0) {
                changeHtml = `<span class="positive">+${formatRupiah(change)} (+${changePct}%)</span>`;
            } else if (change < 0) {
                changeHtml = `<span class="negative">${formatRupiah(change)} (${changePct}%)</span>`;
            } else {
                changeHtml = '<span class="neutral">No change</span>';
            }
        }

        html += `
            <tr>
                <td>${formatted}</td>
                <td>${formatRupiah(item.sell_price)}</td>
                <td>${formatRupiah(item.buy_price)}</td>
                <td>${changeHtml}</td>
            </tr>
        `;
    }

    html += `
                </tbody>
            </table>
        </div>
    `;

    historyList.innerHTML = html;
}

// Price history filter event listeners
document.querySelectorAll('input[name="days"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        loadPriceHistory(parseInt(e.target.value));
    });
});

// Load price history when history tab is clicked
document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.dataset.tab === 'history') {
        btn.addEventListener('click', () => {
            // Load with default 7 days filter
            const selectedFilter = document.querySelector('input[name="days"]:checked');
            loadPriceHistory(parseInt(selectedFilter.value));
        });
    }
});

// Initial load
fetchPrices();
fetchPortfolio();

