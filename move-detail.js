// This file will handle the logic for the move-detail.html page

document.addEventListener('DOMContentLoaded', () => {
    // Wait for the database to be initialized
    document.addEventListener('dbInitialized', loadMoveDetails);
});

let currentMove = null;
// let allLabels = []; // REMOVED: This global variable was causing state management issues.

function getMoveId() {
    const params = new URLSearchParams(window.location.search);
    return parseInt(params.get('id'), 10);
}

async function loadMoveDetails() {
    if (!currentDB) {
        console.error("DB not initialized");
        return;
    }
    const moveId = getMoveId();
    if (isNaN(moveId)) {
        alert('No move ID provided.');
        window.location.href = 'moves.html';
        return;
    }

    try {
        currentMove = await currentDB.getMoveById(moveId);
        // allLabels = await currentDB.getAllLabels(); // REMOVED: We will fetch this fresh inside the display function.
        
        if (!currentMove) {
            alert('Move not found.');
            window.location.href = 'moves.html';
            return;
        }

        populateForm();
        await loadAndDisplayMoveLabels();
        setupEventListeners();
    } catch (error) {
        console.error('Failed to load move details:', error);
        alert('Could not load move details.');
    }
}

function populateForm() {
    document.getElementById('moveName').value = currentMove.name;
    document.getElementById('moveDescription').value = currentMove.description || '';
    document.getElementById('moveYoutubeLink').value = currentMove.youtube_link || '';
    document.getElementById('moveIsActive').checked = currentMove.is_active;
    document.getElementById('moveColor').value = currentMove.color || '#000000';
    document.querySelector('h1').textContent = `Edit Move: ${currentMove.name}`;
}

async function loadAndDisplayMoveLabels() {
    // Fetch fresh data every time to ensure the UI is in sync with the database.
    const moveLabels = await currentDB.getLabelsForMove(currentMove.id);
    const allLabels = await currentDB.getAllLabels(); // ADDED: Fetch all labels fresh.

    const labelsContainer = document.getElementById('labelsContainer');
    labelsContainer.innerHTML = '';
    moveLabels.forEach(label => {
        const el = document.createElement('div');
        el.className = 'label-pill';
        
        const text = document.createElement('span');
        text.textContent = label.name;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-label-btn';
        removeBtn.textContent = '×'; // A nice 'x' character
        removeBtn.onclick = (e) => {
            e.stopPropagation(); // Prevent the whole pill from being clicked
            removeLabel(label.move_label_id);
        };

        el.appendChild(text);
        el.appendChild(removeBtn);
        labelsContainer.appendChild(el);
    });

    const untaggedLabels = allLabels.filter(l => !moveLabels.some(ml => ml.id === l.id));
    const addLabelSelect = document.getElementById('addLabelSelect');
    addLabelSelect.innerHTML = '<option value="">Add a label...</option>';
    untaggedLabels.forEach(label => {
        const option = document.createElement('option');
        option.value = label.id;
        option.textContent = label.name;
        addLabelSelect.appendChild(option);
    });
}

function setupEventListeners() {
    // Form submission
    document.getElementById('moveDetailForm').addEventListener('submit', saveMoveDetails);

    // Color randomization
    document.getElementById('randomizeColor').addEventListener('click', async () => {
        try {
            const color = await currentDB.generateUniqueColor();
            document.getElementById('moveColor').value = color;
        } catch (error) {
            console.error('Failed to generate unique color:', error);
            alert(error.message);
        }
    });

    // Label management
    document.getElementById('addLabelButton').addEventListener('click', addLabel);
    document.getElementById('createLabelButton').addEventListener('click', createLabel);

    // Danger zone
    document.getElementById('deleteMoveButton').addEventListener('click', deleteMove);
}

async function saveMoveDetails(e) {
    e.preventDefault();
    const name = document.getElementById('moveName').value;
    const description = document.getElementById('moveDescription').value;
    const youtube_link = document.getElementById('moveYoutubeLink').value;
    const is_active = document.getElementById('moveIsActive').checked;
    const color = document.getElementById('moveColor').value;
    
    try {
        await currentDB.updateMove(currentMove.id, name, description, youtube_link, is_active, color);
        alert('Move updated successfully!');
        document.querySelector('h1').textContent = `Edit Move: ${name}`;
    } catch (error) {
        console.error('Failed to update move:', error);
        alert(`Error: ${error.message}`);
    }
}

async function addLabel() {
    const addLabelButton = document.getElementById('addLabelButton');
    const labelId = document.getElementById('addLabelSelect').value;
    if (!labelId) return;
    
    addLabelButton.disabled = true;
    try {
        await currentDB.addLabelToMove(currentMove.id, parseInt(labelId));
        await loadAndDisplayMoveLabels();
    } catch (error) {
        console.error('Failed to add label:', error);
        alert(`Error adding label: ${error.message}`);
    } finally {
        addLabelButton.disabled = false;
    }
}

async function createLabel() {
    const createLabelButton = document.getElementById('createLabelButton');
    const newLabelName = document.getElementById('newLabelName').value.trim();
    if (!newLabelName) return;

    createLabelButton.disabled = true;
    try {
        await currentDB.addLabel(newLabelName);
        // After creating, just refresh the UI. The user can now select the new label from the dropdown.
        await loadAndDisplayMoveLabels();
        document.getElementById('newLabelName').value = '';
    } catch (error) {
        console.error('Failed to create new label:', error);
        alert(`Error creating label: ${error.message}`);
    } finally {
        createLabelButton.disabled = false;
    }
}

async function removeLabel(move_label_id) {
    if (!confirm('Are you sure you want to remove this label?')) return;
    try {
        await currentDB.removeLabelFromMove(move_label_id);
        await loadAndDisplayMoveLabels();
    } catch (error) {
        console.error('Failed to remove label:', error);
        alert(`Error removing label: ${error.message}`);
    }
}

async function deleteMove() {
    if (!confirm('ARE YOU SURE you want to permanently delete this move? This cannot be undone.')) return;
    try {
        await currentDB.deleteMove(currentMove.id);
        alert('Move deleted successfully.');
        window.location.href = 'moves.html';
    } catch (error) {
        console.error('Failed to delete move:', error);
        // Simplified error message
        alert(`Error deleting move: ${error.message}. Note: Moves with history entries cannot be deleted.`);
    }
} 