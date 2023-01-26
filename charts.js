const ctx = document.getElementById('historyChart');
let chr =   new Chart(
    ctx,
    {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: "Total Weight Lifted",
                data: [],
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                beginAtZero: true
                }
            }
            }
    })


//Gather the data to make a chart
function getData(db, moveType){
    let tx = db.transaction(['history'], 'readonly'); //Access the database
    let store = tx.objectStore('history');

    let req = store.openCursor();
    let reps = [];
    let kgs = [];
    let total = [];

    req.onsuccess = function(event){
        //if the cursor request succeds...

        let cursor = event.target.result;

        if (cursor != null){
            //if there is a cursor, add item to array and keep looping
            if (moveType == null){
                reps.push(cursor.value['reps']);
                kgs.push(cursor.value['kg']);
                total.push(cursor.value['kg']*cursor.value['reps']);
            }
            else if(cursor.value['exer'] == moveType){
                reps.push(cursor.value['reps']);
                kgs.push(cursor.value['kg']);
                total.push(cursor.value['kg']*cursor.value['reps']);
            }
            cursor.continue();

        }
        else {
            //if the cursor is empty, then all of history is up to date. Print.
            getChart(chr,reps,kgs,total, moveType);
            // console.log(total)
        }
    }
}
function getChart(chart,data1,data2,totalData, type){
    console.log(totalData);
    chart.data.datasets[0].data = totalData;
    chart.data.labels = [...Array(totalData.length).keys()]
    chart.update();
}


