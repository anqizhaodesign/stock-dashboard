// --- State Management ---
const State = {
    tabs: [], // Array of { id, name, stocks: [ {c, n, p, i, a:[]} ] }
    activeTabId: 'favorites', // 'favorites' or tab-id
    favorites: new Set(),
    pagination: {
        current: 1,
        size: 20
    },
    filters: {
        concept: new Set(), // Set of strings
        agency: new Set()   // Set of strings
    },
    viewMode: 'grid', // 'grid' or 'list'
    viewMode: 'grid', // 'grid' or 'list'
    gridColumns: 'auto', // 'auto', 3, 4, 5, 6
    klinePeriod: 'W' // 'D' (Daily), 'W' (Weekly), 'M' (Monthly)
};

// --- IndexedDB Helper ---
const DB = {
    name: 'StockDashboardDB',
    version: 1,
    db: null,

    open: function () {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.name, this.version);
            request.onerror = (e) => reject(e.target.error);
            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
            };
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('favorites')) {
                    db.createObjectStore('favorites', { keyPath: 'code' });
                }
                if (!db.objectStoreNames.contains('uploads')) {
                    db.createObjectStore('uploads', { keyPath: 'id' });
                }
            };
        });
    },

    getAll: function (storeName) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    put: function (storeName, data) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            // Handle both single object and array of objects
            if (Array.isArray(data)) {
                data.forEach(item => store.put(item));
            } else {
                store.put(data);
            }
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    clear: function (storeName) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            store.clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    delete: function (storeName, key) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            store.delete(key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
};

// --- Initialization ---
let isInitialized = false;
async function init() {
    if (isInitialized) return;
    isInitialized = true;

    try {
        await DB.open();

        // --- Migration Logic ---
        // Check if we have localStorage data but empty DB
        const savedFavs = localStorage.getItem('stock_favorites');
        const savedTabs = localStorage.getItem('stock_tabs');

        // If LS exists, migrate it
        if (savedFavs || savedTabs) {
            console.log("Migrating data from LocalStorage to IndexedDB...");

            if (savedFavs) {
                const favCodes = JSON.parse(savedFavs); // Array of strings
                // Convert to object array for store: { code: '...' }
                const favObjects = favCodes.map(c => ({ code: c }));
                await DB.put('favorites', favObjects);
                localStorage.removeItem('stock_favorites');
            }

            if (savedTabs) {
                const tabs = JSON.parse(savedTabs);
                await DB.put('uploads', tabs);
                localStorage.removeItem('stock_tabs');
            }
            console.log("Migration complete.");
        }

        // --- Load from DB ---
        const favs = await DB.getAll('favorites');
        State.favorites = new Set(favs.map(f => f.code));

        const tabs = await DB.getAll('uploads');
        State.tabs = tabs || [];

    } catch (e) {
        console.error("Init/Migration failed:", e);
        alert("Failed to initialize database. see console.");
    }

    // Bind Search Input Enter Key
    const searchInput = document.getElementById('add-stock-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') addStockFromInput();
        });
    }

    // Bind History Tabs Click Delegation
    const tabsList = document.getElementById('tabs-list');
    if (tabsList) {
        tabsList.addEventListener('click', (e) => {
            // Ensure we handle text nodes if clicked directly
            const target = e.target.nodeType === 3 ? e.target.parentNode : e.target;
            console.log('Tab Click:', target, target.className);

            const removeBtn = target.closest ? target.closest('.tab-remove-btn') : null;
            const navItem = target.closest ? target.closest('.nav-item') : null;

            if (removeBtn && navItem) {
                e.stopPropagation();
                console.log('Triggering Remove for:', navItem.dataset.id);
                removeTab(navItem.dataset.id);
                return;
            }

            if (navItem) {
                switchTab(navItem.dataset.id);
            }
        });
    }

    renderApp();
}

function toggleConceptExpand() {
    const container = document.getElementById('concept-filter-container');
    const btn = document.getElementById('concept-expand-btn');
    if (!container || !btn) return;

    container.classList.toggle('expanded');

    if (container.classList.contains('expanded')) {
        btn.textContent = '[Collapse]';
    } else {
        btn.textContent = '[Expand]';
    }
}

// --- Core Rendering ---
function renderApp() {
    renderSidebar();
    renderHeader();
    renderFilters();
    renderViewToggle();

    if (State.viewMode === 'list') {
        renderList();
    } else {
        renderGrid();
    }

    renderPagination();
}

function switchView(mode) {
    State.viewMode = mode;
    State.pagination.current = 1; // Reset page on view switch
    renderApp();
}

function updatePageSize(size) {
    State.pagination.size = parseInt(size);
    State.pagination.current = 1;
    renderApp();
}

function updateGridColumns(cols) {
    State.gridColumns = cols;
    renderGrid();
}

function updateKlinePeriod(period) {
    State.klinePeriod = period;
    renderGrid(); // Only affects grid
}

function renderViewToggle() {
    const toggleContainer = document.getElementById('view-toggle-container');
    if (!toggleContainer) return;

    // Show Grid Column option only in Grid mode
    const showGridCols = State.viewMode === 'grid';

    toggleContainer.innerHTML = `
        <div style="display:flex; gap:12px; align-items:center;">
            <!-- View Switcher -->
            <div class="view-toggle">
                <button class="toggle-btn ${State.viewMode === 'grid' ? 'active' : ''}" onclick="switchView('grid')">
                    Grid View
                </button>
                <button class="toggle-btn ${State.viewMode === 'list' ? 'active' : ''}" onclick="switchView('list')">
                    List View
                </button>
            </div>

            <!-- Page Size Control -->
            <div class="control-group" style="display:flex; align-items:center; gap:6px; font-size:13px; color:var(--text-secondary);">
                <span>Per Page:</span>
                <select onchange="updatePageSize(this.value)" style="padding:4px; border-radius:4px; border:1px solid #ddd;">
                    <option value="20" ${State.pagination.size == 20 ? 'selected' : ''}>20</option>
                    <option value="50" ${State.pagination.size == 50 ? 'selected' : ''}>50</option>
                    <option value="100" ${State.pagination.size == 100 ? 'selected' : ''}>100</option>
                    <option value="200" ${State.pagination.size == 200 ? 'selected' : ''}>200</option>
                    <option value="500" ${State.pagination.size == 500 ? 'selected' : ''}>500</option>
                    <option value="1000" ${State.pagination.size == 1000 ? 'selected' : ''}>1000</option>
                </select>
            </div>

             <!-- Grid Mode Controls -->
            ${showGridCols ? `
            <div class="control-group" style="display:flex; align-items:center; gap:6px; font-size:13px; color:var(--text-secondary); margin-right: 12px; padding-right: 12px; border-right: 1px solid #ddd;">
                <span>Period:</span>
                <select onchange="updateKlinePeriod(this.value)" style="padding:4px; border-radius:4px; border:1px solid #ddd; font-weight:600; color: #333;">
                    <option value="D" ${State.klinePeriod === 'D' ? 'selected' : ''}>Day</option>
                    <option value="W" ${State.klinePeriod === 'W' ? 'selected' : ''}>Week</option>
                    <option value="M" ${State.klinePeriod === 'M' ? 'selected' : ''}>Month</option>
                </select>
            </div>
            
            <div class="control-group" style="display:flex; align-items:center; gap:6px; font-size:13px; color:var(--text-secondary);">
                <span>Columns:</span>
                <select onchange="updateGridColumns(this.value)" style="padding:4px; border-radius:4px; border:1px solid #ddd;">
                    <option value="auto" ${State.gridColumns === 'auto' ? 'selected' : ''}>Auto</option>
                    <option value="3" ${State.gridColumns == 3 ? 'selected' : ''}>3</option>
                    <option value="4" ${State.gridColumns == 4 ? 'selected' : ''}>4</option>
                    <option value="5" ${State.gridColumns == 5 ? 'selected' : ''}>5</option>
                    <option value="6" ${State.gridColumns == 6 ? 'selected' : ''}>6</option>
                </select>
            </div>
            ` : ''}
        </div>
    `;
}

function renderList() {
    const grid = document.getElementById('grid');
    if (!grid) return;

    // Change container class/style for table view if needed
    grid.className = 'list-container';

    const filteredStocks = getFilteredList();

    // Pagination logic (Shared)
    const { current, size } = State.pagination;
    const startIndex = (current - 1) * size;
    const pageStocks = filteredStocks.slice(startIndex, startIndex + parseInt(size));

    if (pageStocks.length === 0) {
        grid.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--text-secondary);">No stocks match your filters</div>';
        return;
    }

    let html = `
        <table class="stock-table">
            <thead>
                <tr>
                    <th style="width: 40px;">#</th>
                    <th style="width: 40px; text-align:center;">Fav</th>
                    <th style="width: 80px;">Code</th>
                    <th style="min-width: 100px;">Name</th> <!-- Auto width with min limit -->
                    <th>Concept</th>
                    <th>Agency (Research)</th>
                    <th style="width: 80px; text-align:right;">Price</th>
                </tr>
            </thead>
            <tbody>
    `;

    pageStocks.forEach((item, index) => {
        const globalIndex = startIndex + index + 1;
        const code = item.c;
        const name = item.n || '-';
        const price = item.p || '-';
        const concept = item.i || '-';
        const agencies = item.a || [];
        const agencyStr = agencies.join('; ');

        const isFav = State.favorites.has(code);

        html += `
            <tr>
                <td>${globalIndex}</td>
                <td style="text-align:center;">
                    <button class="star-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite('${code}')">
                        ${isFav ? '★' : '☆'}
                    </button>
                </td>
                <td><span class="stock-code">${code}</span></td>
                <td><span class="stock-name">${name}</span></td>
                <td><div class="cell-concept" title="${concept}">${concept}</div></td>
                <td><div class="cell-agency" title="${agencyStr}">${agencyStr}</div></td>
                <td class="price-val" style="text-align:right;">${price}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    grid.innerHTML = html;
}

function renderSidebar() {
    const list = document.getElementById('tabs-list');
    if (!list) return;

    // Update Favorites Badge
    const favCount = State.favorites.size;
    const badge = document.getElementById('fav-count-badge');
    if (badge) badge.textContent = favCount;

    // Highlight Favorites Tab
    const favTab = document.getElementById('nav-fav-item');
    if (favTab) {
        if (State.activeTabId === 'favorites') {
            favTab.classList.add('active');
        } else {
            favTab.classList.remove('active');
        }
    }

    // Generate History Tabs
    let html = '';
    State.tabs.forEach((tab) => {
        const isActive = State.activeTabId === tab.id ? 'active' : '';
        html += `
            <div class="nav-item ${isActive}" data-id="${tab.id}">
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;" title="${tab.name}">📁 ${tab.name}</span>
                <span class="badge tab-remove-btn" title="Remove Tab">×</span>
            </div>
        `;
    });

    list.innerHTML = html;
}

function renderHeader() {
    const titleEl = document.getElementById('page-title');
    if (!titleEl) return;

    if (State.activeTabId === 'favorites') {
        titleEl.textContent = '⭐ Favorites Watchlist';
    } else {
        const tab = State.tabs.find(t => t.id === State.activeTabId);
        titleEl.textContent = tab ? `📁 ${tab.name}` : 'Dashboard';
    }
}

function renderFilters() {
    const conceptContainer = document.getElementById('concept-filter-container');
    const agencySelect = document.getElementById('agency-select');

    // Only show filters for imported tabs, not favorites (unless we want to filter favorites too?)
    // Let's support filtering for everything.

    // 1. Collect unique concepts and agencies from current dataset (ignoring current filters to show full options)
    const allStocks = getRawCurrentList();
    const concepts = new Set();
    const agencies = new Set();

    allStocks.forEach(stock => {
        // Concepts (i)
        if (stock.i) {
            // Split by comma or semicolon if multiple concepts? Usually it's one string or pre-split.
            // Assuming string for now, maybe split? "ConceptA, ConceptB"
            // For now treat as single string or look for separators
            const cList = stock.i.split(/;|；/);
            cList.forEach(c => {
                const clean = c.trim();
                if (clean) concepts.add(clean);
            });
        }
        // Agencies (a) - Array
        if (Array.isArray(stock.a)) {
            stock.a.forEach(ag => agencies.add(ag));
        }
    });

    // Render Concepts
    // Render Concepts
    if (conceptContainer) {
        // Concept Search Input
        let html = `
            <div style="width: 100%; margin-bottom: 0;">
                <input type="text" id="concept-search" placeholder="Search concepts..." 
                    oninput="filterConcepts(this.value)"
                    style="width: 100%; padding: 6px 10px; font-size: 13px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div id="concept-tags-list" class="tags-content-scroll">
        `;

        // "All" button clears the set
        const isAllActive = State.filters.concept.size === 0;
        html += `<span class="filter-tag ${isAllActive ? 'active' : ''}" onclick="applyFilter('concept', 'ALL')">All</span>`;

        Array.from(concepts).sort().forEach(c => {
            const isActive = State.filters.concept.has(c) ? 'active' : '';
            html += `<span class="filter-tag ${isActive}" onclick="applyFilter('concept', '${c}')">${c}</span>`;
        });
        html += '</div>';
        conceptContainer.innerHTML = html;
    }

    // Render Agencies
    const agencyContainer = document.getElementById('agency-filter-container'); // Corrected ID usage
    if (agencyContainer) {
        // Agency Search Input
        let html = `
            <div style="width: 100%; margin-bottom: 0;">
                <input type="text" id="agency-search" placeholder="Search agencies..." 
                    oninput="filterAgencies(this.value)"
                    style="width: 100%; padding: 6px 10px; font-size: 13px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div id="agency-tags-list" class="tags-content-scroll">
        `;

        const isAllActive = State.filters.agency.size === 0;
        html += `<span class="filter-tag ${isAllActive ? 'active' : ''}" onclick="applyFilter('agency', 'ALL')">All</span>`;

        Array.from(agencies).sort().forEach(a => {
            const isActive = State.filters.agency.has(a) ? 'active' : '';
            html += `<span class="filter-tag ${isActive}" onclick="applyFilter('agency', '${a}')">${a}</span>`;
        });
        html += '</div>';
        agencyContainer.innerHTML = html;
    }
}

function getRawCurrentList() {
    if (State.activeTabId === 'favorites') {
        // Favorites might only store Code. To support filtering, we ideally need metadata.
        // But our Favorites storage only has Codes. 
        // We can try to hydrate data from existing tabs if available, or just render minimal.
        // For Filter logic: if we only have codes, we can't filter by Agency/Concept unless we find that stock in loaded tabs.
        // Let's iterate all tabs to find data for favorite codes.
        const favCodes = Array.from(State.favorites);
        return favCodes.map(code => {
            // Find data in any tab
            for (const tab of State.tabs) {
                const found = tab.stocks.find(s => s.c === code);
                if (found) return found;
            }
            return { c: code }; // Fallback with just code
        });
    }
    const tab = State.tabs.find(t => t.id === State.activeTabId);
    return tab ? tab.stocks : [];
}

function getFilteredList() {
    let list = getRawCurrentList();

    if (State.filters.concept.size > 0) {
        list = list.filter(s => {
            if (!s.i) return false;
            // Check if stock has ANY of the selected concepts
            // Optimization: Create a Set from stock concepts? Or just simple check.
            const stockConcepts = s.i.split(/;|；/); // Array
            for (const c of stockConcepts) {
                if (State.filters.concept.has(c.trim())) return true;
            }
            return false;
        });
    }
    if (State.filters.agency.size > 0) {
        list = list.filter(s => {
            if (!Array.isArray(s.a)) return false;
            // Check if stock has ANY of the selected agencies
            for (const a of s.a) {
                if (State.filters.agency.has(a)) return true;
            }
            return false;
        });
    }
    return list;
}

function renderGrid() {
    const grid = document.getElementById('grid');
    if (!grid) return;

    // Reset to grid layout
    grid.className = 'grid-container';
    grid.innerHTML = '';

    // Apply column override
    if (State.gridColumns !== 'auto') {
        grid.style.gridTemplateColumns = `repeat(${State.gridColumns}, 1fr)`;
    } else {
        grid.style.gridTemplateColumns = ''; // Reset to CSS default (auto-fill)
    }

    const filteredStocks = getFilteredList();

    // Pagination logic
    const { current, size } = State.pagination;
    const startIndex = (current - 1) * size;
    const pageStocks = filteredStocks.slice(startIndex, startIndex + parseInt(size));

    if (pageStocks.length === 0) {
        grid.innerHTML = '<div style="color: #666; grid-column: 1/-1; text-align: center; padding: 50px;">No stocks match your filters</div>';
        return;
    }

    pageStocks.forEach((item) => {
        const code = item.c;
        const name = item.n || '-';
        const price = item.p || '-';
        const agencies = item.a || [];
        const concept = item.i || '';

        const card = document.createElement('div');
        card.className = 'chart-card';

        const { prefix } = getStockInfo(code);
        // Link logic kept for title click
        const linkUrl = prefix === 'bj'
            ? `https://quote.eastmoney.com/bj/${code}.html`
            : `https://quote.eastmoney.com/${prefix}${code}.html`;

        const isFav = State.favorites.has(code);
        const starClass = isFav ? 'star-btn active' : 'star-btn';
        const starIcon = isFav ? '★' : '☆';

        const agencyText = agencies.length > 0 ? agencies.join(', ') : '';

        card.innerHTML = `
            <div class="card-header">
                <div style="display:flex; align-items:center;">
                    <span class="${starClass}" onclick="toggleFavorite('${code}')" title="Toggle Favorite">${starIcon}</span>
                    <div style="display:flex; flex-direction:column; margin-left: 5px;">
                        <div>
                             <a href="${linkUrl}" target="_blank" style="color: inherit; text-decoration: none; font-weight:600;">
                                ${name}
                            </a>
                            <span class="stock-code">${prefix.toUpperCase()}${code}</span>
                        </div>
                    </div>
                </div>
                <div class="price-val" style="color: ${parseFloat(price) > 0 ? '#d00' : '#333'}">
                    ¥${price}
                </div>
            </div>
            <div class="card-body" style="height: 300px; padding: 0;">
                 <div class="chart-container" style="width:100%; height:100%;"></div>
            </div>
            <div class="card-footer">
                <div class="agency-list" title="${agencyText || 'No Agency Data'}">
                     ${agencyText ? '🏢 ' + agencyText : '<span style="opacity:0.5">No Agency</span>'}
                </div>
                ${concept ? `<div class="agency-list" style="font-size:10px; color:#999;" title="${concept}">🏷️ ${concept}</div>` : ''}
            </div>
        `;
        grid.appendChild(card);

        // Trigger ECharts Render
        const chartDiv = card.querySelector('.chart-container');

        Promise.all([
            fetchKlineData(code),
            fetchStockNews(code, prefix === 'sh' ? '1' : '2') // 1=SH, 2=SZ/BJ roughly
        ]).then(([klineData, newsData]) => {
            if (!klineData || klineData.error) {
                chartDiv.innerHTML = `<div style="display:flex;justify-content:center;align-items:center;height:100%;color:#999;font-size:12px;">${klineData?.error || 'No Data'}</div>`;
                return;
            }
            // Pass news data to renderChart
            renderChart(chartDiv, klineData, newsData);
        }).catch(err => {
            chartDiv.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100%;color:red;font-size:12px;">Load Error</div>';
        });
    });
}

function renderPagination() {
    const footer = document.getElementById('pagination-footer');
    if (!footer) return;

    const filteredTotal = getFilteredList().length;

    if (filteredTotal === 0) {
        footer.style.display = 'none';
        return;
    }
    footer.style.display = 'flex';

    const { current, size } = State.pagination;
    const maxPage = Math.ceil(filteredTotal / size);

    // Safety check
    if (current > maxPage && maxPage > 0) State.pagination.current = maxPage;

    const start = (State.pagination.current - 1) * size + 1;
    const end = Math.min(State.pagination.current * size, filteredTotal);

    const infoEl = document.getElementById('page-info');
    if (infoEl) infoEl.textContent = `Showing ${start}-${end} of ${filteredTotal}`;

    document.getElementById('current-page-num').textContent = `${State.pagination.current} / ${maxPage}`;

    // Disable buttons
    const btns = footer.querySelectorAll('button');
    if (btns.length >= 2) {
        btns[0].disabled = State.pagination.current <= 1; // Prev
        btns[1].disabled = State.pagination.current >= maxPage; // Next
    }
}


// --- Actions ---

function switchTab(id) {
    State.activeTabId = id;
    State.pagination.current = 1;

    // Reset filters when switching tabs? Users usually expect this.
    State.filters.concept.clear();
    State.filters.agency.clear();

    renderApp();
}

function filterConcepts(query) {
    const list = document.getElementById('concept-tags-list');
    if (!list) return;
    const tags = list.getElementsByClassName('filter-tag');
    const q = query.toLowerCase();

    for (let i = 0; i < tags.length; i++) {
        const tag = tags[i];
        if (tag.textContent === 'All') continue; // Always show 'All'
        const text = tag.textContent.toLowerCase();
        tag.style.display = text.includes(q) ? 'inline-block' : 'none';
    }
}

function toggleAgencyExpand() {
    const container = document.getElementById('agency-filter-container');
    const btn = document.getElementById('agency-expand-btn');
    if (!container || !btn) return;

    container.classList.toggle('expanded');

    if (container.classList.contains('expanded')) {
        btn.textContent = '[Collapse]';
    } else {
        btn.textContent = '[Expand]';
    }
}

function filterAgencies(query) {
    const list = document.getElementById('agency-tags-list');
    if (!list) return;
    const tags = list.getElementsByClassName('filter-tag');
    const q = query.toLowerCase();

    for (let i = 0; i < tags.length; i++) {
        const tag = tags[i];
        if (tag.textContent === 'All') continue;
        const text = tag.textContent.toLowerCase();
        tag.style.display = text.includes(q) ? 'inline-block' : 'none';
    }
}

function applyFilter(type, value) {
    const filterSet = type === 'concept' ? State.filters.concept : State.filters.agency;

    if (value === 'ALL') {
        filterSet.clear();
    } else {
        if (filterSet.has(value)) {
            filterSet.delete(value);
        } else {
            filterSet.add(value);
        }
    }

    State.pagination.current = 1;

    // update UI without destroying search input focus
    updateFilterTagsUI(type);

    // Partial Render
    if (State.viewMode === 'list') {
        renderList();
    } else {
        renderGrid();
    }
    renderPagination();
}

function updateFilterTagsUI(type) {
    const listId = type === 'concept' ? 'concept-tags-list' : 'agency-tags-list';
    const list = document.getElementById(listId);
    if (!list) return;

    const filterSet = type === 'concept' ? State.filters.concept : State.filters.agency;
    const tags = list.getElementsByClassName('filter-tag');

    for (let i = 0; i < tags.length; i++) {
        const tag = tags[i];
        const text = tag.textContent;

        if (text === 'All') {
            if (filterSet.size === 0) tag.classList.add('active');
            else tag.classList.remove('active');
        } else {
            if (filterSet.has(text)) tag.classList.add('active');
            else tag.classList.remove('active');
        }
    }
}

// --- Modal Logic ---
let pendingAction = null;

function removeTab(id) {
    pendingAction = () => {
        State.tabs = State.tabs.filter(t => t.id !== id);
        // DB Delete
        DB.delete('uploads', id).catch(console.error);

        if (State.activeTabId === id) {
            switchTab('favorites');
        } else {
            renderApp();
        }
    };
    document.getElementById('confirm-modal').style.display = 'flex';
}

function closeModal(confirmed) {
    document.getElementById('confirm-modal').style.display = 'none';
    if (confirmed && pendingAction) {
        pendingAction();
    }
    pendingAction = null;
}

function clearFavorites() {
    pendingAction = () => {
        State.favorites.clear();
        DB.clear('favorites').catch(console.error);
        renderApp();
    };
    document.getElementById('confirm-modal').style.display = 'flex';
}

function nextPage() {
    const total = getFilteredList().length;
    const maxPage = Math.ceil(total / State.pagination.size);
    if (State.pagination.current < maxPage) {
        State.pagination.current++;
        renderApp();
        const area = document.getElementById('scroll-area');
        if (area) area.scrollTop = 0;
    }
}

function prevPage() {
    if (State.pagination.current > 1) {
        State.pagination.current--;
        renderApp();
        const area = document.getElementById('scroll-area');
        if (area) area.scrollTop = 0;
    }
}

function toggleFavorite(code) {
    if (State.favorites.has(code)) {
        State.favorites.delete(code);
    } else {
        State.favorites.add(code);
    }

    // DB Update: We can just put/delete or rewrite all. 
    // For favorites, simple put/delete is efficient.
    if (State.favorites.has(code)) {
        DB.put('favorites', { code: code }).catch(console.error);
    } else {
        DB.delete('favorites', code).catch(console.error);
    }
    // localStorage.setItem('stock_favorites', JSON.stringify(Array.from(State.favorites)));

    // Helper to refresh UI specifically for stars without full re-render? 
    // For now full re-render is safer and fast enough.
    renderGrid();
    renderSidebar(); // Update count
}

function addStockFromInput() {
    const input = document.getElementById('add-stock-input');
    let code = input.value.trim();
    const match = code.match(/^(?:sz|sh|bj)?(\d{6})$/i);

    if (match) {
        code = match[1];
        if (!State.favorites.has(code)) {
            toggleFavorite(code);
            alert(`Added ${code} to favorites.`);
        } else {
            alert(`${code} is already in favorites.`);
        }
        input.value = '';
    } else {
        alert("Please enter a valid 6-digit stock code.");
    }
}



function exportFavorites() {
    if (State.favorites.size === 0) { alert("No favorites!"); return; }
    // Ideally we export with metadata if we have it
    const data = [["Code", "Name", "Agency Name", "Concept", "Price"]];
    const rawList = getRawCurrentList(); // Logic inside handles looking up favs

    rawList.forEach(stock => {
        const { prefix } = getStockInfo(stock.c);
        let suffix = '.SZ';
        if (prefix === 'sh') suffix = '.SH';
        if (prefix === 'bj') suffix = '.BJ';
        const formattedCode = stock.c + suffix;

        data.push([
            formattedCode,
            stock.n || '',
            (stock.a || []).join('; '),
            stock.i || '',
            stock.p || ''
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Favorites");
    XLSX.writeFile(wb, "favorites.xlsx");
}

function saveTabs() {
    // This is now mainly used when we modify tabs (e.g. rename or update? currently barely used except import)
    // Actually, processFile calls this indirectly via State update? No, processFile pushes to State.tabs then needs to save.
    // We need to verify where saveTabs is called.
    // It's called in removeTab. And likely should be called in processFile.

    // With DB, we usually save individual items.
    // We'll mimic the old behavior: Save all tabs? No, that's inefficient.
    // But State.tabs is in memory.
    // For now, let's keep the function signature but make it async-ish (fire and forget)

    // Actually, checking usages:
    // removeTab calls it.
    // processFile *should* call it.
    // Let's rely on explicit DB puts.
}


// --- File Processing (Enhanced) ---

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        processFile(file);
        event.target.value = ''; // Reset
    }
}

function processFile(file) {
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
        if (!confirm(`File is large (${(file.size / 1024 / 1024).toFixed(1)}MB). Continue?`)) return;
    }

    const reader = new FileReader();
    reader.onerror = () => alert("Failed to read file");

    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            if (!rows || rows.length < 2) {
                alert("File appears empty or invalid.");
                return;
            }

            // 1. Identify Columns
            const header = rows[0];
            const findIdx = (keywords) => header.findIndex(h => keywords.some(k => String(h || '').toLowerCase().includes(k.toLowerCase())));

            const codeIdx = findIdx(['代码', 'Code']);
            const nameIdx = findIdx(['简称', 'Name']);
            const conceptIdx = findIdx(['概念', 'Concept', 'Industry', '行业']);
            const priceIdx = findIdx(['现价', 'Price', 'Close', '最新价']);

            // Agency: Prioritize explicit name columns, avoid "Count" (次数) or "Detail" (明细)
            // 1. Try exact/specific matches first
            let agencyIdx = findIdx(['调研机构名称', '机构名称', 'Agency Name']);

            // 2. Fallback to broader search but exclude "Count"
            if (agencyIdx === -1) {
                agencyIdx = header.findIndex(h => {
                    const str = String(h || '');
                    return (str.includes('机构') || str.includes('Agency')) &&
                        !str.includes('次数') &&
                        !str.includes('明细') &&
                        !str.includes('Count');
                });
            }

            if (codeIdx === -1) {
                alert("Error: No 'Code' (代码) column found.");
                return;
            }

            // 2. Deduplicate & Merge
            const stockMap = new Map(); // Code -> Object

            // Start from row 1
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row) continue;

                const rawCode = String(row[codeIdx] || '');
                const match = rawCode.match(/(\d{6})/);
                if (!match) continue;
                const code = match[1];

                if (!stockMap.has(code)) {
                    stockMap.set(code, {
                        c: code,
                        n: nameIdx > -1 ? String(row[nameIdx] || '').trim() : '',
                        p: priceIdx > -1 ? String(row[priceIdx] || '').trim() : '',
                        i: conceptIdx > -1 ? String(row[conceptIdx] || '').trim() : '',
                        a: new Set()
                    });
                }

                // Merge Agency
                if (agencyIdx > -1) {
                    const agencyRaw = String(row[agencyIdx] || '').trim();
                    if (agencyRaw && agencyRaw !== '--' && agencyRaw.toLowerCase() !== 'null') {
                        // Support splitting by English or Chinese semicolon
                        const parts = agencyRaw.split(/;|；/);
                        parts.forEach(part => {
                            const clean = part.trim();
                            if (clean) stockMap.get(code).a.add(clean);
                        });
                    }
                }
            }

            // 3. Convert to Array
            const stocks = Array.from(stockMap.values()).map(s => ({
                ...s,
                a: Array.from(s.a) // Convert Set to Array
            }));

            console.log(`Parsed ${rows.length} rows -> ${stocks.length} unique stocks.`);

            if (stocks.length > 0) {
                const tabId = 'import_' + Date.now();
                const newTab = {
                    id: tabId,
                    name: file.name.replace('.xlsx', '').substring(0, 20),
                    stocks: stocks
                };

                State.tabs.push(newTab);

                // DB Put
                DB.put('uploads', newTab).then(() => {
                    switchTab(tabId);
                }).catch(err => {
                    console.error("Failed to save imported tab", err);
                    alert("Import successful but failed to save to database.");
                    switchTab(tabId);
                });
            } else {
                alert("No valid stock data found.");
            }

        } catch (err) {
            console.error(err);
            alert("Parse error: " + err.message);
        }
    };
    reader.readAsArrayBuffer(file);
}


// --- Helpers ---
function getStockInfo(code) {
    let prefix = 'sz';
    if (/^6/.test(code)) prefix = 'sh';
    else if (/^900/.test(code)) prefix = 'sh';
    else if (/^(4|8|920)/.test(code)) prefix = 'bj';
    return { prefix };
}

function getEastmoneyUrl(code) {
    const { prefix } = getStockInfo(code);
    const market = (prefix === 'sh') ? 1 : 0; // rough approx, existing logic was handled by prefix
    // Accurate market ID for image api: 1=SH, 0=SZ/BJ roughly
    // Original logic:
    let mkt = '0';
    if (prefix === 'sh') mkt = '1';

    const nid = `${mkt}.${code}`;
    return `https://webquoteklinepic.eastmoney.com/GetPic.aspx?nid=${nid}&type=${State.klinePeriod}&unitWidth=-6&ef=&formula=RSI&AT=1&imageType=KXL&timespan=${Date.now()}`;
}

// Start
document.addEventListener('DOMContentLoaded', init);

// --- ECharts Implementation ---

async function fetchKlineData(code) {
    const { prefix } = getStockInfo(code);
    // Market ID: sh=1, sz=0, bj=0
    let secidPrefix = '0';
    if (prefix === 'sh') secidPrefix = '1';

    // API: https://push2his.eastmoney.com/api/qt/stock/kline/get
    // klt: 101=Day, 102=Week, 103=Month
    let klt = 101;
    if (State.klinePeriod === 'W') klt = 102;
    if (State.klinePeriod === 'M') klt = 103;

    const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secidPrefix}.${code}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f57&klt=${klt}&fqt=1&beg=0&end=20500000&lmt=120&_=${Date.now()}`;

    try {
        const response = await fetch(url);
        const json = await response.json();
        const klines = json?.data?.klines || [];

        // Parse data for ECharts
        // API format: "2024-01-01,Open,Close,High,Low,Vol"
        // ECharts Candlestick: [Open, Close, Lowest, Highest]
        const dates = [];
        const values = []; // [Open, Close, Low, High]
        const volumes = [];

        if (klines.length === 0) {
            console.warn("No klines data for", code);
            return null;
        }

        klines.forEach(item => {
            const parts = item.split(',');
            dates.push(parts[0]);
            // parts: 0=Date, 1=Open, 2=Close, 3=High, 4=Low, 5=Vol
            // ECharts expects: [Open, Close, Low, High]
            values.push([
                parseFloat(parts[1]), // Open
                parseFloat(parts[2]), // Close
                parseFloat(parts[4]), // Low (Lowest)
                parseFloat(parts[3]), // High (Highest)
            ]);
            volumes.push(parseFloat(parts[5]));
        });

        return { dates, values, volumes };
    } catch (e) {
        console.error("Failed to fetch kline data", e);
        return { error: e.message };
    }
}

async function fetchStockNews(code, marketType) {
    // defaults
    if (!marketType) marketType = '2';

    // Date range: Last 2 years to now
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    const startObj = new Date();
    startObj.setFullYear(now.getFullYear() - 2);
    const start = startObj.toISOString().split('T')[0];

    // Use JSONP to bypass CORS
    return new Promise((resolve) => {
        const callbackName = 'jsonp_news_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

        // Timeout
        const timeout = setTimeout(() => {
            cleanup();
            console.warn("News fetch timeout");
            resolve([]);
        }, 5000);

        function cleanup() {
            delete window[callbackName];
            if (script && script.parentNode) script.parentNode.removeChild(script);
            clearTimeout(timeout);
        }

        window[callbackName] = (res) => {
            cleanup();
            if (res && res.Data && Array.isArray(res.Data)) {
                resolve(res.Data);
            } else {
                resolve([]);
            }
        };

        const script = document.createElement('script');
        // Add cb parameter
        script.src = `https://cmsdataapi.eastmoney.com/api/infomine?code=${code}&marketType=${marketType}&types=1,2&startTime=${start}&endTime=${end}&format=yyyy-MM-dd&cb=${callbackName}`;
        script.onerror = () => {
            cleanup();
            console.warn("News fetch script error");
            resolve([]);
        };

        document.body.appendChild(script);
    });
}

function renderChart(container, data, newsList = []) {
    if (!data || data.values.length === 0) {
        container.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100%;color:#999;font-size:12px;">No Data</div>';
        return;
    }

    const myChart = echarts.init(container);

    // Process News for Scatter Series (Fixed at top)
    const newsScatterData = [];
    if (newsList && newsList.length > 0) {
        const newsByDate = {};
        newsList.forEach(item => {
            let dateStr = item.Time;
            if (dateStr.length > 10) dateStr = dateStr.substring(0, 10);
            if (!newsByDate[dateStr]) newsByDate[dateStr] = [];
            newsByDate[dateStr].push(item);
        });

        data.dates.forEach((d) => {
            if (newsByDate[d]) {
                const items = newsByDate[d];
                const distinctTypes = new Set(items.map(i => i.Type));
                // Use Scatter data format: [X, Y, Extras]
                // Y is fixed at '1' (top of secondary axis)
                newsScatterData.push({
                    value: [d, 1],
                    newsItems: items,
                    symbol: 'arrow', // Standard arrow
                    symbolRotate: 180, // Point down
                    itemStyle: { color: distinctTypes.has(2) ? '#333' : '#333' }
                });
            }
        });
    }

    // Determine colors (Red up, Green down for CN market)
    const upColor = '#ef232a';
    const upBorderColor = '#ef232a';
    const downColor = '#14b143';
    const downBorderColor = '#14b143';

    const option = {
        grid: {
            left: '5%',
            right: '2%',
            top: '12%', // Give more space at top for markers
            bottom: '15%',
            containLabel: true
        },
        tooltip: {
            trigger: 'axis',
            // enterable: true, // Only needed for news, but global axis tooltip usually doesn't need interactions
            axisPointer: { type: 'cross' },
            position: function (pos, params, el, elRect, size) {
                const obj = { top: 10 };
                obj[['left', 'right'][+(pos[0] < size.viewSize[0] / 2)]] = 30;
                return obj;
            },
            // Global (Axis) Formatter: ONLY for K-Line and Volume
            formatter: function (params) {
                let result = '';
                let date = '';

                params.forEach(p => {
                    if (!date) date = p.name || p.axisValue;

                    if (p.seriesName === 'K-Line') {
                        const val = p.value; // [index, open, close, low, high]
                        result += `${p.marker} <b>${p.seriesName}</b><br/>
                                   Open: ${val[1]}<br/>
                                   Close: ${val[2]}<br/>
                                   Low: ${val[3]}<br/>
                                   High: ${val[4]}<br/>`;
                    }
                    // Ignore News here
                });

                if (!result) return ''; // Don't show if only news is hovered (though axis usually captures kline too)
                return `<div><b>${date}</b><br/>${result}</div>`;
            }
        },
        // Show only last ~40 candles by default to make granularity obvious
        dataZoom: [
            {
                type: 'inside',
                xAxisIndex: [0],
                startValue: Math.max(0, data.values.length - 40),
                endValue: data.values.length - 1
            }
        ],
        xAxis: {
            type: 'category',
            data: data.dates,
            boundaryGap: false,
            axisLine: { onZero: false },
            splitLine: { show: false },
            min: 'dataMin',
            max: 'dataMax',
            axisLabel: { show: false },
            axisTick: { show: false }
        },
        yAxis: [
            {
                scale: true,
                splitArea: { show: true }
            },
            {
                type: 'value',
                scale: true,
                min: 0,
                max: 1,
                show: false, // Invisible dummy axis
                position: 'right'
            }
        ],
        series: [
            {
                name: 'K-Line',
                type: 'candlestick',
                data: data.values,
                itemStyle: {
                    color: upColor,
                    color0: downColor,
                    borderColor: upBorderColor,
                    borderColor0: downBorderColor
                },
                // Removed markPoint, moved to Scatter
            },
            {
                name: 'News',
                type: 'scatter',
                yAxisIndex: 1, // Use fixed 0-1 axis
                symbolSize: 10,
                data: newsScatterData,
                z: 10, // On top
                // Series-specific Tooltip (Item Trigger)
                tooltip: {
                    show: true,
                    trigger: 'item',
                    enterable: true, // Clickable links
                    position: 'top', // Show above the arrow
                    formatter: function (p) {
                        if (p.data && p.data.newsItems) {
                            let content = `<div style="max-width:300px; white-space:normal;"><b>${p.name} News</b><hr style="margin:5px 0;border:0;border-top:1px solid #ddd;"/>`;
                            p.data.newsItems.forEach(item => {
                                content += `• <a href="${item.Url}" target="_blank" style="color:#007bff;text-decoration:none;">${item.Title}</a><br/>`;
                            });
                            content += '</div>';
                            return content;
                        }
                        return '';
                    }
                }
            },
            // MA Lines (Optional, skipping for minimal load first)
        ]
    };

    myChart.setOption(option);

    // Handle resize
    // We can use ResizeObserver in the main loop if we want perfect resizing, 
    // or just rely on fixed size for now.
}
