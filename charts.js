const ctx = document.getElementById('historyChart');
let chr =   new Chart(
    ctx,
    {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: "",
                data: [],
                borderWidth: 1,
                borderColor: 'rgba(0,255,0,1)',
                backgroundColor: 'rgba(0,255,0,1)'
                
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
function getData(db, dates){
    let tx = db.transaction(['history'], 'readonly'); //Access the database
    let store = tx.objectStore('history');

    let req = store.openCursor();
    let total = {};

    req.onsuccess = function(event){
        //if the cursor request succeds...

        let cursor = event.target.result;

        if (cursor != null){
            //if there is a cursor, add item to array and keep looping
            // if (moveType == null){
            //     reps.push(cursor.value['reps']);
            //     kgs.push(cursor.value['kg']);
            //     total.push(cursor.value['kg']*cursor.value['reps']);
            // }
            // else if(cursor.value['exer'] == moveType){
            //     reps.push(cursor.value['reps']);
            //     kgs.push(cursor.value['kg']);
            //     total.push(cursor.value['kg']*cursor.value['reps']);
            // }
            //Populate the hashmap with moveType

            //Let's ignore type for now and we can implement date restrictions with it later
            if (!(cursor.value['exer'] in total)){
                total[cursor.value['exer']] = []
            }
            total[cursor.value['exer']].push(cursor.value['kg']*cursor.value['reps']);
            cursor.continue();

        }
        else {
            //if the cursor is empty, then all of history is up to date. Print.
            getChart(chr,total, dates);
            // console.log(total)
        }
    }
}
function getChart(chart,totalData, type){
    console.log(totalData);
    let yLen = 0;
    let counter = 0;
    var dynamicColors = function() {
        var r = Math.floor(Math.random() * 255);
        var g = Math.floor(Math.random() * 255);
        var b = Math.floor(Math.random() * 255);
        return "rgb(" + r + "," + g + "," + b + ")";
     };
    for (const exec in totalData){
        if (counter < chart.data.datasets.length){
            // console.log(totalData[exec], counter)
            chart.data.datasets[counter].data = totalData[exec];
            chart.data.datasets[counter].label = exec;
        }
        else{
            let colorVar = dynamicColors();
            chart.data.datasets[counter] = {
                label: exec,
                data: totalData[exec],
                borderWidth: 1,
                borderColor: colorVar,
                backgroundColor: colorVar
            }
            // console.log("Datasets len: " + chart.data.datasets.length)
        }

        yLen = Math.max(yLen, totalData[exec].length);
        counter++;
    }
    chart.data.labels = [...Array(yLen).keys()]
    // chart.data.datasets[0].data = totalData;
    // chart.data.labels = [...Array(totalData.length).keys()]
    chart.update();
}


