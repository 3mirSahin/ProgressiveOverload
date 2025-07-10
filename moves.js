document.addEventListener('DOMContentLoaded', () => {
    // This script assumes db.js is loaded and initializeDBAndLoadData has run.
    document.addEventListener('dbInitialized', () => {
        loadMoves();
        setupNewMoveForm();
    });
});

async function loadMoves() {
    if (!currentDB) {
        console.error("DB not initialized");
        return;
    }

    try {
        const moves = await currentDB.getAllMoves(false); // Get all moves, active and inactive
        const movesList = document.getElementById('movesList'); // CORRECTED: from movesTableBody to movesList
        if (!movesList) return;

        movesList.innerHTML = ''; // Clear existing items
        if (moves.length === 0) {
            movesList.innerHTML = '<li>No moves found. Add one!</li>';
            return;
        }

        moves.forEach(move => {
            const li = document.createElement('li');
            li.innerHTML = `
                <a href="move-detail.html?id=${move.id}">
                    ${move.name} ${!move.is_active ? '<span>(Inactive)</span>' : ''}
                </a>
            `;
            movesList.appendChild(li);
        });
    } catch (error) {
        console.error('Failed to load moves:', error);
        alert('Could not load moves.');
    }
}

function setupNewMoveForm() {
    const newMoveForm = document.getElementById('addMoveForm'); // CORRECTED: from newMoveForm to addMoveForm
    if (!newMoveForm) return;

    newMoveForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const moveNameInput = document.getElementById('newMoveName');
        const moveName = moveNameInput.value.trim();

        if (moveName) {
            try {
                await currentDB.addMove(moveName);
                moveNameInput.value = ''; // Clear input
                alert(`Move "${moveName}" added successfully!`);
                loadMoves(); // Refresh the list
            } catch (error) {
                console.error('Failed to add move:', error);
                alert(`Error adding move: ${error.message}`);
            }
        }
    });
} 