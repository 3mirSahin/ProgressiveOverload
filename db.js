// IMPORTANT: DATABASE SCHEMA V2
// The database schema has been updated to support detailed move management.
// This is a breaking change and will reset your existing data in IndexedDB.
// For SQLite, you should create a new database file to use these new features.

// --- GLOBAL STATE ---
let currentDB = null;
let moves = new Map(); // Use a Map for efficient lookups by ID
let dbType = localStorage.getItem('dbType') || 'indexeddb';

// --- DOM ELEMENTS ---
// These might not exist on all pages, so we check for them.
const movesDrop = document.getElementById("selectExercise");
const setForm = document.getElementById("Set Form");
const formButton = document.getElementById("buttonSetForm");
const sqliteControls = document.getElementById('sqliteControls');
const dbTypeSelect = document.getElementById('dbType');


// --- UTILITY/VALIDATION FUNCTIONS ---
function debounce(func, delay = 750) { // Increased from 500ms to 750ms
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

function validateExerciseName(input) {
  if (typeof input !== 'string' || !input.trim()) throw new Error('Exercise name cannot be empty.');
  const trimmed = input.trim();
  if (trimmed.length > 50) throw new Error('Exercise name cannot exceed 50 characters.');
  if (validator && !validator.matches(trimmed, /^[a-zA-Z0-9\s\-_()]+$/)) {
    throw new Error('Exercise name has invalid characters.');
  }
  return trimmed;
}

function validateWeight(input) {
  const num = parseFloat(input);
  if (isNaN(num) || num < 0 || num > 9999) throw new Error('Invalid weight: must be a number between 0 and 9999.');
  return num;
}

function validateReps(input) {
  const num = parseInt(input, 10);
  if (isNaN(num) || num < 0 || num > 9999) throw new Error('Invalid reps: must be an integer between 0 and 9999.');
  return num;
}

// --- DATABASE INTERFACE ---
class DatabaseInterface {
  async init() { throw new Error("Not implemented"); }
  async addHistory(repCount, weight, move_id) { throw new Error("Not implemented"); }
  async getAllHistory() { throw new Error("Not implemented"); }
  async updateHistory(id, kg, reps) { throw new Error("Not implemented"); }
  async deleteHistory(id) { throw new Error("Not implemented"); }
  async getHistoryByMove(move_id) { throw new Error("Not implemented"); }
  async addMove(name) { throw new Error("Not implemented"); }
  async getMoveById(id) { throw new Error("Not implemented"); }
  async getAllMoves(activeOnly = true) { throw new Error("Not implemented"); }
  async updateMove(id, name, description, youtube_link, is_active) { throw new Error("Not implemented"); }
  async deleteMove(id) { throw new Error("Not implemented"); }
  async addLabel(name) { throw new Error("Not implemented"); }
  async getAllLabels() { throw new Error("Not implemented"); }
  async addLabelToMove(move_id, label_id) { throw new Error("Not implemented"); }
  async getLabelsForMove(move_id) { throw new Error("Not implemented"); }
  async removeLabelFromMove(move_label_id) { throw new Error("Not implemented"); }
}

// --- INDEXEDDB IMPLEMENTATION ---
class IndexedDBInterface extends DatabaseInterface {
    constructor() { super(); this.db = null; }
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('Workouts', 3);
            request.onupgradeneeded = (e) => {
                this.db = e.target.result;
                const oldVersion = e.oldVersion;

                // Handle upgrade based on old version
                if (oldVersion < 2) {
                    // First create/recreate all stores if coming from version 1
                    const stores = ['moves', 'history', 'labels', 'move_labels'];
                    stores.forEach(s => { if (this.db.objectStoreNames.contains(s)) this.db.deleteObjectStore(s); });

                    const movesStore = this.db.createObjectStore('moves', { keyPath: 'id', autoIncrement: true });
                    movesStore.createIndex('name', 'name', { unique: true });
                    movesStore.createIndex('is_active', 'is_active');

                    const historyStore = this.db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
                    historyStore.createIndex('move_id', 'move_id');

                    const labelsStore = this.db.createObjectStore('labels', { keyPath: 'id', autoIncrement: true });
                    labelsStore.createIndex('name', 'name', { unique: true });

                    const moveLabelsStore = this.db.createObjectStore('move_labels', { keyPath: 'id', autoIncrement: true });
                    moveLabelsStore.createIndex('move_label', ['move_id', 'label_id'], { unique: true });
                }

                // If upgrading to version 3, add color field and index
                if (oldVersion < 3) {
                    if (!this.db.objectStoreNames.contains('moves')) {
                        const movesStore = this.db.createObjectStore('moves', { keyPath: 'id', autoIncrement: true });
                        movesStore.createIndex('name', 'name', { unique: true });
                        movesStore.createIndex('is_active', 'is_active');
                    }
                    const movesStore = request.transaction.objectStore('moves');
                    if (!movesStore.indexNames.contains('color')) {
                        movesStore.createIndex('color', 'color', { unique: true });
                    }
                }
            };
            request.onsuccess = async (e) => {
                this.db = e.target.result;
                // After successful upgrade, assign colors to existing moves if needed
                if (e.oldVersion < 3) {
                    await this.assignColorsToExistingMoves();
                }
                resolve();
            };
            request.onerror = (e) => reject('Failed to open IndexedDB: ' + e.target.errorCode);
        });
    }
    _promisify(request) { return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
    async addHistory(repCount, weight, move_id) {
        const tx = this.db.transaction('history', 'readwrite');
        const store = tx.objectStore('history');
        const request = store.add({ move_id: parseInt(move_id), reps: validateReps(repCount), kg: validateWeight(weight), created: Date.now() });
        return new Promise((resolve, reject) => {
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }
    async getAllHistory() {
        const tx = this.db.transaction('history', 'readonly');
        const history = await this._promisify(tx.objectStore('history').getAll());
        // OPTIMIZATION: Use the global 'moves' Map instead of re-querying the database.
        return history.map(h => ({ ...h, moveName: moves.get(h.move_id)?.name || 'Unknown' })).sort((a, b) => a.created - b.created);
    }
    async updateHistory(id, kg, reps) { const tx = this.db.transaction('history', 'readwrite'); const store = tx.objectStore('history'); const record = await this._promisify(store.get(id)); if (!record) throw new Error('Record not found'); record.kg = validateWeight(kg); record.reps = validateReps(reps); return this._promisify(store.put(record)); }
    async deleteHistory(id) { const tx = this.db.transaction('history', 'readwrite'); return this._promisify(tx.objectStore('history').delete(id)); }
    async getHistoryByMove(move_id) { return this._promisify(this.db.transaction('history').objectStore('history').index('move_id').getAll(move_id));}
    async addMove(name) {
        const color = await this.generateUniqueColor();
        const tx = this.db.transaction('moves', 'readwrite');
        return this._promisify(tx.objectStore('moves').add({
            name: validateExerciseName(name),
            description: '',
            youtube_link: '',
            is_active: 1,
            color: color
        }));
    }
    async getMoveById(id) { return this._promisify(this.db.transaction('moves').objectStore('moves').get(id)); }
    async getAllMoves(activeOnly = true) { const store = this.db.transaction('moves').objectStore('moves'); return activeOnly ? this._promisify(store.index('is_active').getAll(1)) : this._promisify(store.getAll()); }
    async updateMove(id, name, description, youtube_link, is_active, color) {
        const tx = this.db.transaction('moves', 'readwrite');
        const store = tx.objectStore('moves');
        const move = await this._promisify(store.get(id));
        if (!move) throw new Error('Move not found');

        // If color is being changed, ensure it's unique
        if (color && color !== move.color) {
            const isColorUnique = await this.isColorUnique(color);
            if (!isColorUnique) throw new Error('This color is already in use by another exercise');
        }

        move.name = validateExerciseName(name);
        move.description = description;
        move.youtube_link = youtube_link;
        move.is_active = is_active ? 1 : 0;
        if (color) move.color = color;
        
        return this._promisify(store.put(move));
    }
    async deleteMove(id) { const history = await this.getHistoryByMove(id); if (history.length > 0) throw new Error('Cannot delete move with history entries.'); const tx = this.db.transaction(['moves', 'move_labels'], 'readwrite'); await this._promisify(tx.objectStore('moves').delete(id)); const mlStore = tx.objectStore('move_labels'); const labelsToDelete = await this._promisify(mlStore.index('move_id').getAll(id)); await Promise.all(labelsToDelete.map(label => this._promisify(mlStore.delete(label.id)))); }
    async addLabel(name) { const tx = this.db.transaction('labels', 'readwrite'); return this._promisify(tx.objectStore('labels').add({ name: validateExerciseName(name) })); }
    async getAllLabels() { return this._promisify(this.db.transaction('labels').objectStore('labels').getAll()); }
    async addLabelToMove(move_id, label_id) { const tx = this.db.transaction('move_labels', 'readwrite'); return this._promisify(tx.objectStore('move_labels').add({ move_id, label_id })); }
    async getLabelsForMove(move_id) { const tx = this.db.transaction(['move_labels', 'labels'], 'readonly'); const moveLabels = await this._promisify(tx.objectStore('move_labels').index('move_id').getAll(move_id)); const labelIds = moveLabels.map(ml => ml.label_id); const labels = await Promise.all(labelIds.map(id => this._promisify(tx.objectStore('labels').get(id)))); return labels.map((label, i) => ({ ...label, move_label_id: moveLabels[i].id })); }
    async removeLabelFromMove(move_label_id) { const tx = this.db.transaction('move_labels', 'readwrite'); return this._promisify(tx.objectStore('move_labels').delete(move_label_id)); }

    async generateUniqueColor() {
        const generateRandomColor = () => {
            const hue = Math.floor(Math.random() * 360);
            return `hsl(${hue}, 70%, 50%)`; // Using HSL for better color distribution
        };

        let color;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 50;

        while (!isUnique && attempts < maxAttempts) {
            color = generateRandomColor();
            isUnique = await this.isColorUnique(color);
            attempts++;
        }

        if (!isUnique) {
            throw new Error('Could not generate a unique color after multiple attempts');
        }

        return color;
    }

    async isColorUnique(color) {
        const tx = this.db.transaction('moves', 'readonly');
        const store = tx.objectStore('moves');
        const index = store.index('color');
        const request = index.get(color);
        const result = await this._promisify(request);
        return !result;
    }

    async assignColorsToExistingMoves() {
        const tx = this.db.transaction('moves', 'readwrite');
        const store = tx.objectStore('moves');
        const moves = await this._promisify(store.getAll());
        
        for (const move of moves) {
            if (!move.color) {
                move.color = await this.generateUniqueColor();
                await this._promisify(store.put(move));
            }
        }
    }
}

// --- SQLITE IMPLEMENTATION ---
class SQLiteInterface extends DatabaseInterface {
    constructor() { super(); this.db = null; this.sql = null; }
    async init() { try { this.sql = await initSqlJs({ locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${f}` }); const data = sessionStorage.getItem('sqliteDB'); if (data) { this.db = new this.sql.Database(new Uint8Array(JSON.parse(data))); } else { this.db = new this.sql.Database(); this._persistToSession(); } this.db.exec('PRAGMA foreign_keys = ON;'); await this._runMigrations(); } catch (e) { console.error("SQLite Init Error:", e); sessionStorage.removeItem('sqliteDB'); throw new Error("Failed to initialize SQLite."); } }
    _persistToSession() { const data = this.db.export(); sessionStorage.setItem('sqliteDB', JSON.stringify(Array.from(data))); }
    _runMigrations() {
        // First ensure base tables exist
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS moves (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                youtube_link TEXT,
                is_active BOOLEAN DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY,
                move_id INTEGER NOT NULL,
                reps INTEGER NOT NULL,
                kg REAL NOT NULL,
                created INTEGER NOT NULL,
                FOREIGN KEY (move_id) REFERENCES moves(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS labels (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL UNIQUE
            );

            CREATE TABLE IF NOT EXISTS move_labels (
                id INTEGER PRIMARY KEY,
                move_id INTEGER NOT NULL,
                label_id INTEGER NOT NULL,
                FOREIGN KEY (move_id) REFERENCES moves(id) ON DELETE CASCADE,
                FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE,
                UNIQUE(move_id, label_id)
            );
        `);

        // Now check if color column exists
        const tableInfo = this.db.exec("PRAGMA table_info(moves)");
        const hasColorColumn = tableInfo[0]?.values.some(col => col[1] === 'color');

        if (!hasColorColumn) {
            try {
                // Add color column and make it unique
                this.db.exec(`
                    BEGIN TRANSACTION;
                    ALTER TABLE moves ADD COLUMN color TEXT;
                    CREATE UNIQUE INDEX IF NOT EXISTS idx_moves_color ON moves(color) WHERE color IS NOT NULL;
                    COMMIT;
                `);

                // Assign colors to existing moves
                const moves = this._dbExec('SELECT id FROM moves WHERE color IS NULL');
                for (const move of moves) {
                    const color = this.generateUniqueColor();
                    this.db.run('UPDATE moves SET color = ? WHERE id = ?', [color, move.id]);
                }
                this._persistToSession();
            } catch (error) {
                console.error('Migration error:', error);
                // If something goes wrong, try to rollback
                this.db.exec('ROLLBACK');
                throw error;
            }
        }

        // Verify foreign key constraints are enabled
        this.db.exec('PRAGMA foreign_keys = ON;');

        // Verify table structure
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS moves_backup (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                youtube_link TEXT,
                is_active BOOLEAN DEFAULT 1,
                color TEXT UNIQUE
            );

            INSERT OR IGNORE INTO moves_backup 
            SELECT id, name, description, youtube_link, is_active, color 
            FROM moves;

            DROP TABLE IF EXISTS moves;

            CREATE TABLE moves (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                youtube_link TEXT,
                is_active BOOLEAN DEFAULT 1,
                color TEXT UNIQUE
            );

            INSERT OR IGNORE INTO moves 
            SELECT id, name, description, youtube_link, is_active, color 
            FROM moves_backup;

            DROP TABLE moves_backup;

            -- Recreate indices
            CREATE UNIQUE INDEX IF NOT EXISTS idx_moves_name ON moves(name);
            CREATE INDEX IF NOT EXISTS idx_moves_active ON moves(is_active);
            CREATE UNIQUE INDEX IF NOT EXISTS idx_moves_color ON moves(color) WHERE color IS NOT NULL;
        `);
    }
    _dbExec(sql, params = []) { const res = this.db.exec(sql, params); if (!res || res.length === 0) return []; const cols = res[0].columns; return res[0].values.map(row => row.reduce((acc, val, i) => { acc[cols[i]] = val; return acc; }, {}));}
    saveToFile() { const data = this.db.export(); const blob = new Blob([data], { type: 'application/octet-stream' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'workouts.db'; a.click(); URL.revokeObjectURL(a.href); }
    async loadFromFile(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = (e) => { try { const uInt8Array = new Uint8Array(e.target.result); const tempDb = new this.sql.Database(uInt8Array); if (!this.validateDatabaseSchema(tempDb).isValid) throw new Error("Invalid DB file."); this.db = tempDb; this._persistToSession(); resolve(); } catch (err) { reject(err); } }; reader.onerror = reject; reader.readAsArrayBuffer(file); }); }
    validateDatabaseSchema(db) {
        try {
            const required = ['moves', 'history', 'labels', 'move_labels'];
            const res = db.exec(`
                SELECT name, sql FROM sqlite_master 
                WHERE type='table' AND name IN ('moves', 'history', 'labels', 'move_labels')
            `);
            
            if (!res[0] || res[0].values.length !== required.length) {
                return { isValid: false };
            }

            // Verify moves table has color column
            const movesInfo = db.exec("PRAGMA table_info(moves)");
            const hasRequiredColumns = movesInfo[0]?.values.some(col => 
                col[1] === 'name' && col[3] === 1 // NOT NULL name
            ) && movesInfo[0]?.values.some(col => 
                col[1] === 'color' // has color column
            );

            if (!hasRequiredColumns) {
                return { isValid: false };
            }

            // Verify foreign key constraints
            const historyInfo = db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='history'")[0];
            if (!historyInfo.values[0][0].includes('FOREIGN KEY')) {
                return { isValid: false };
            }

            return { isValid: true };
        } catch (e) {
            console.error('Schema validation error:', e);
            return { isValid: false };
        }
    }
    async addHistory(repCount, weight, move_id) {
        const validatedReps = validateReps(repCount);
        const validatedWeight = validateWeight(weight);
        const validatedMoveId = parseInt(move_id, 10);

        if (isNaN(validatedMoveId)) {
            throw new Error("Invalid Move ID provided.");
        }

        this.db.run(
            'INSERT INTO history (move_id, reps, kg, created) VALUES (?,?,?,?)',
            [validatedMoveId, validatedReps, validatedWeight, Date.now()]
        );
        this._persistToSession();
        const res = this.db.exec("SELECT last_insert_rowid()");
        return res[0].values[0][0];
    }
    async getAllHistory() { return this._dbExec(`SELECT h.*, m.name as moveName FROM history h JOIN moves m ON h.move_id = m.id ORDER BY h.created ASC`); }
    async updateHistory(id, kg, reps) { this.db.run('UPDATE history SET kg = ?, reps = ? WHERE id = ?', [validateWeight(kg), validateReps(reps), id]); this._persistToSession(); }
    async deleteHistory(id) { this.db.run('DELETE FROM history WHERE id = ?', [id]); this._persistToSession(); }
    async getHistoryByMove(move_id) { return this._dbExec('SELECT * FROM history WHERE move_id = ?', [move_id]); }
    async addMove(name) {
        const color = await this.generateUniqueColor();
        this.db.run(
            'INSERT INTO moves (name, description, youtube_link, is_active, color) VALUES (?,?,?,?,?)',
            [validateExerciseName(name), '', '', 1, color]
        );
        this._persistToSession();
    }
    async getMoveById(id) { return this._dbExec('SELECT * FROM moves WHERE id = ?', [id])[0] || null; }
    async getAllMoves(activeOnly = true) { return this._dbExec(`SELECT * FROM moves ${activeOnly ? 'WHERE is_active = 1' : ''} ORDER BY name`); }
    async updateMove(id, name, description, youtube_link, is_active, color) {
        if (color) {
            // Check if color is unique (excluding current move)
            const existing = this._dbExec(
                'SELECT id FROM moves WHERE color = ? AND id != ?',
                [color, id]
            );
            if (existing.length > 0) {
                throw new Error('This color is already in use by another exercise');
            }
        }

        this.db.run(
            'UPDATE moves SET name = ?, description = ?, youtube_link = ?, is_active = ?, color = ? WHERE id = ?',
            [validateExerciseName(name), description, youtube_link, is_active ? 1 : 0, color, id]
        );
        this._persistToSession();
    }
    async deleteMove(id) { const history = await this.getHistoryByMove(id); if (history.length > 0) throw new Error('Cannot delete move with history entries.'); this.db.run('BEGIN; DELETE FROM move_labels WHERE move_id = ?; DELETE FROM moves WHERE id = ?; COMMIT;', [id, id]); this._persistToSession(); }
    async addLabel(name) {
        this.db.run('INSERT INTO labels (name) VALUES (?)', [validateExerciseName(name)]);
        this._persistToSession();
        const res = this.db.exec("SELECT last_insert_rowid()");
        return res[0].values[0][0];
    }
    async getAllLabels() { return this._dbExec('SELECT * FROM labels ORDER BY name'); }
    async addLabelToMove(move_id, label_id) { this.db.run('INSERT INTO move_labels (move_id, label_id) VALUES (?,?)', [move_id, label_id]); this._persistToSession(); }
    async getLabelsForMove(move_id) { return this._dbExec('SELECT l.*, ml.id as move_label_id FROM labels l JOIN move_labels ml ON l.id = ml.label_id WHERE ml.move_id = ?', [move_id]); }
    async removeLabelFromMove(move_label_id) { this.db.run('DELETE FROM move_labels WHERE id = ?', [move_label_id]); this._persistToSession(); }

    async generateUniqueColor() {
        const generateRandomColor = () => {
            const hue = Math.floor(Math.random() * 360);
            return `hsl(${hue}, 70%, 50%)`;
        };

        let color;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 50;

        while (!attempts < maxAttempts) {
            color = generateRandomColor();
            const existing = this._dbExec('SELECT id FROM moves WHERE color = ?', [color]);
            if (existing.length === 0) {
                isUnique = true;
                break;
            }
            attempts++;
        }

        if (!isUnique) {
            throw new Error('Could not generate a unique color after multiple attempts');
        }

        return color;
    }
}

// --- CORE APP LOGIC ---
async function initializeDBAndLoadData() {
    addNavigation();
    if(dbTypeSelect) dbTypeSelect.value = dbType;
    if(sqliteControls) sqliteControls.style.display = dbType === 'sqlite' ? 'block' : 'none';

    currentDB = dbType === 'sqlite' ? new SQLiteInterface() : new IndexedDBInterface();

    try {
        await currentDB.init();
        // Dispatch the custom event to let other scripts know the DB is ready
        document.dispatchEvent(new CustomEvent('dbInitialized'));
    } catch (error) {
        alert(error.message);
        if(dbType === 'sqlite') { localStorage.setItem('dbType', 'indexeddb'); window.location.reload(); }
    }
}

function addNavigation() {
    const navHtml = `<nav><a href="index.html">Tracker</a> | <a href="moves.html">Manage Moves</a></nav>`;
    const h1 = document.querySelector('h1');
    if (h1) h1.insertAdjacentHTML('afterend', navHtml);
}

async function switchDatabase() {
    const newDbType = dbTypeSelect.value;
    localStorage.setItem('dbType', newDbType);
    if (newDbType === 'indexeddb') sessionStorage.removeItem('sqliteDB');
    window.location.reload();
}

async function loadMovesFromDatabase() {
    if (!currentDB) return;
    try {
        const dbMoves = await currentDB.getAllMoves(false); // Get active and inactive for management
        moves = new Map(dbMoves.map(m => [m.id, m])); // Store moves in the map by their ID
    } catch (error) {
        console.error('Error loading moves:', error);
    }
}

async function refreshData() {
    if (!currentDB) return;
    const history = await currentDB.getAllHistory();
    displayHist(history);
    if (typeof getData === 'function') getData(history);
}

function populateSelect(selectElement, selectedId) {
    if (!selectElement) return;
    const activeMoves = Array.from(moves.values()).filter(m => m.is_active);
    selectElement.innerHTML = '<option value="" disabled selected hidden>Choose exercise.</option>';
    activeMoves.forEach(m => {
        const option = document.createElement('option');
        option.value = m.id;
        option.textContent = m.name;
        if (m.id == selectedId) option.selected = true;
        selectElement.appendChild(option);
    });
}

function setupQuickAddForm() {
    document.getElementById('quickAddMoveForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('quickAddMoveName');
        try {
            await currentDB.addMove(input.value);
            alert(`Move "${input.value}" added!`);
            input.value = '';
            await loadMovesFromDatabase();
            populateSelect(movesDrop, null);
        } catch (error) { alert("Failed to add move: " + error.message); }
    });
}

// Add pagination state
let currentPage = 1;
let pageSize = 100;
let allHistory = [];

function updatePageSize() {
    const select = document.getElementById('pageSize');
    pageSize = select.value === 'all' ? Infinity : parseInt(select.value);
    currentPage = 1;
    displayHist(allHistory);
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        displayHist(allHistory);
    }
}

function nextPage() {
    const maxPage = Math.ceil(allHistory.length / pageSize);
    if (currentPage < maxPage) {
        currentPage++;
        displayHist(allHistory);
    }
}

function displayHist(setHist) {
    const tableBody = document.getElementById('histTableBody');
    if (!tableBody) return;

    // Store full history for pagination
    allHistory = setHist;

    // Calculate pagination
    const start = (currentPage - 1) * pageSize;
    const end = pageSize === Infinity ? setHist.length : Math.min(start + pageSize, setHist.length);
    const maxPage = Math.ceil(setHist.length / pageSize);

    // Update pagination controls
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === maxPage || pageSize === Infinity;
    if (pageInfo) pageInfo.textContent = pageSize === Infinity ? 
        `Showing all ${setHist.length} sets` : 
        `Page ${currentPage} of ${maxPage} (${setHist.length} total sets)`;

    // Store the listener function on the element to remove it before adding a new one
    if (tableBody.changeListener) {
        tableBody.removeEventListener('change', tableBody.changeListener);
    }

    tableBody.innerHTML = "";
    const fragment = document.createDocumentFragment();

    // Only render visible rows
    setHist.slice(start, end).forEach(aSet => {
        const row = document.createElement('tr');
        row.dataset.id = aSet.id;
        row.dataset.moveName = aSet.moveName;
        row.innerHTML = `
            <td>${aSet.moveName}</td>
            <td><input type="number" step="0.25" class="kg-input" value="${aSet.kg}" data-original="${aSet.kg}"></td>
            <td><input type="number" class="reps-input" value="${aSet.reps}" data-original="${aSet.reps}"></td>
            <td>${new Date(aSet.created).toLocaleString()}</td>
            <td><button class="danger" onclick="deleteData(${aSet.id})">Delete</button></td>
        `;
        fragment.appendChild(row);
    });

    tableBody.appendChild(fragment);

    const updateHandler = async (event) => {
        const target = event.target;
        if (target.tagName !== 'INPUT' || !target.closest) return;

        const row = target.closest('tr');
        if (!row || !row.dataset.id) return;

        const id = parseInt(row.dataset.id, 10);
        const kgInput = row.querySelector('.kg-input');
        const repsInput = row.querySelector('.reps-input');
        const kg = kgInput.value;
        const reps = repsInput.value;

        try {
            await currentDB.updateHistory(id, kg, reps);
            
            // Update the data-original attributes to reflect the new values
            kgInput.dataset.original = kg;
            repsInput.dataset.original = reps;
            
            // Update chart without full table refresh
            if (typeof updateChartForRow === 'function') {
                updateChartForRow(row.dataset.moveName, parseFloat(kg) * parseInt(reps), id);
            }
        } catch (error) {
            // Revert inputs to their original values on error
            kgInput.value = kgInput.dataset.original;
            repsInput.value = repsInput.dataset.original;
            alert("Failed to update entry: " + error.message);
        }
    };

    const debouncedHandleChange = debounce(updateHandler);
    tableBody.addEventListener('change', debouncedHandleChange);
    tableBody.changeListener = debouncedHandleChange;
}

async function deleteData(id) {
    if (confirm('Are you sure you want to delete this entry?')) {
        try {
            await currentDB.deleteHistory(id);

            // Remove the row from the DOM
            const rowToRemove = document.querySelector(`tr[data-id='${id}']`);
            if (rowToRemove) {
                const moveName = rowToRemove.dataset.moveName;
                rowToRemove.remove();
                
                // Update chart without table refresh
                if (typeof removeChartEntry === 'function') {
                    removeChartEntry(moveName, id);
                }
            }
        } catch (error) {
            alert("Failed to delete entry: " + error.message);
        }
    }
}

async function addHist() {
    try {
        const moveId = movesDrop.value;
        if (!moveId) {
            alert('Please select an exercise.');
            return;
        }
        const weight = document.getElementById('weightIn').value;
        const reps = document.getElementById('repIn').value;
        
        // Add to DB first
        const newId = await currentDB.addHistory(reps, weight, moveId);

        // Then, update the UI directly instead of calling refreshData()
        const tableBody = document.getElementById('histTableBody');
        const moveName = moves.get(parseInt(moveId))?.name || 'Unknown';
        
        const row = document.createElement('tr');
        row.dataset.id = newId;
        row.dataset.moveName = moveName; // Store move name for chart updates
        row.innerHTML = `
            <td>${moveName}</td>
            <td><input type="number" step="0.25" class="kg-input" value="${weight}" data-original="${weight}"></td>
            <td><input type="number" class="reps-input" value="${reps}" data-original="${reps}"></td>
            <td>${new Date().toLocaleString()}</td>
            <td><button class="danger" onclick="deleteData(${newId})">Delete</button></td>
        `;
        // Prepend to the top of the table for immediate visibility
        tableBody.prepend(row);

        // Finally, update the chart
        const history = await currentDB.getAllHistory();
        if (typeof getData === 'function') {
            getData(history);
        }

        // Clear inputs
        document.getElementById('weightIn').value = '';
        document.getElementById('repIn').value = '';
        movesDrop.selectedIndex = 0;
    } catch (error) {
        console.error("Critical error in addHist:", error);
        alert('Failed to add set. See console for details.');
    }
}

async function loadSQLiteFile() {
    const fileInput = document.getElementById('sqliteFile');
    const file = fileInput.files[0];
    if (!file) return;
    if (currentDB instanceof SQLiteInterface) {
        try { await currentDB.loadFromFile(file); alert("Database loaded!"); window.location.reload(); }
        catch (error) { alert("Error loading file: " + error.message); }
        finally { fileInput.value = ''; }
    }
}

function saveSQLiteFile() {
    if (currentDB instanceof SQLiteInterface) {
        currentDB.saveToFile();
    } else {
        alert("This function is only available for SQLite databases.");
    }
}

if (formButton) {
    formButton.addEventListener("click", (e) => {
        e.preventDefault();
        if (setForm.reportValidity()) addHist();
    });
}

// Universal entry point
document.addEventListener('DOMContentLoaded', initializeDBAndLoadData);