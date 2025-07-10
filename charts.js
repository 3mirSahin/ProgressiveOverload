let chr = null; // Will be initialized after DB is ready
let datasetMap = new Map(); // Store datasets by move name
let colorMap = new Map(); // Store colors by move name

document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('dbInitialized', () => {
        initializeChart();
    });
});

function generateColor() {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    return `rgba(${r}, ${g}, ${b}, 0.7)`;
}

function initializeChart() {
    const ctx = document.getElementById('historyChart');
    if (!ctx) {
        console.log('Chart canvas not found on this page.');
        return;
    }
    
    chr = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Volume (Weight * Reps)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Workout Session'
                    },
                    ticks: {
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 20
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 16/9,
            animation: {
                duration: 0 // Disable animations for better performance
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                }
            },
            elements: {
                line: {
                    tension: 0.4 // Smooth lines slightly
                },
                point: {
                    radius: 4,
                    hitRadius: 8,
                    hoverRadius: 6
                }
            }
        }
    });
}

// Called by refreshData() in db.js
function getData(history) {
    if (!chr) {
        console.log('Chart not initialized, skipping update.');
        return;
    }
    
    // Reset maps when loading full history
    datasetMap.clear();
    
    // Group history by moveName and create datasets
    const setsByMove = history.reduce((acc, set) => {
        if (!acc[set.moveName]) {
            acc[set.moveName] = {
                values: [],
                color: moves.get(set.move_id)?.color || 'hsl(0, 0%, 50%)'  // Get color from moves Map
            };
        }
        acc[set.moveName].values.push({
            value: set.kg * set.reps,
            id: set.id
        });
        return acc;
    }, {});

    // Create datasets and store in map
    Object.keys(setsByMove).forEach(moveName => {
        const moveData = setsByMove[moveName];
        const data = moveData.values.map(item => item.value);
        const dataset = {
            label: moveName,
            data: data,
            borderColor: moveData.color,
            backgroundColor: moveData.color,
            borderWidth: 2,
            fill: false,
            _ids: moveData.values.map(item => item.id)
        };
        datasetMap.set(moveName, dataset);
    });

    // Update chart with all datasets
    chr.data.datasets = Array.from(datasetMap.values());
    chr.data.labels = Array.from(
        { length: Math.max(...chr.data.datasets.map(d => d.data.length)) },
        (_, i) => `Session ${i + 1}`
    );
    chr.update('none');
}

// New function to update a single data point
function updateChartForRow(moveName, newValue, id) {
    if (!chr || !datasetMap.has(moveName)) return;
    
    const dataset = datasetMap.get(moveName);
    const index = dataset._ids.indexOf(id);
    
    if (index !== -1) {
        dataset.data[index] = newValue;
        chr.update('none');
    }
}

// New function to remove a single data point
function removeChartEntry(moveName, id) {
    if (!chr || !datasetMap.has(moveName)) return;
    
    const dataset = datasetMap.get(moveName);
    const index = dataset._ids.indexOf(id);
    
    if (index !== -1) {
        dataset.data.splice(index, 1);
        dataset._ids.splice(index, 1);
        
        // Remove the dataset if it's empty
        if (dataset.data.length === 0) {
            datasetMap.delete(moveName);
            colorMap.delete(moveName);
            chr.data.datasets = Array.from(datasetMap.values());
        }
        
        // Update labels if needed
        const maxLength = Math.max(...chr.data.datasets.map(d => d.data.length));
        chr.data.labels = Array.from({ length: maxLength }, (_, i) => `Session ${i + 1}`);
        
        chr.update('none');
    }
}


