document.addEventListener('DOMContentLoaded', () => {
    // This script will run on the main index.html page.
    // We wait for the database to be initialized before trying to load any data.
    document.addEventListener('dbInitialized', () => {
        // These functions are defined in db.js, but we call them here
        // to ensure they run at the right time on the right page.
        if (document.getElementById('selectExercise')) {
            loadMovesFromDatabase().then(() => {
                populateSelect(document.getElementById('selectExercise'), null);
            });
        }
        if (document.getElementById('histTableBody')) {
            refreshData();
        }
        if (document.getElementById('quickAddMoveForm')) {
            setupQuickAddForm();
        }
    });
}); 