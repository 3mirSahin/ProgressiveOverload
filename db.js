let db;
let moves = new Set(JSON.parse(localStorage.getItem("movesSet")) || ['Deadlift', 'Benchpress', 'Squat']);
let dbReq = indexedDB.open('Workouts', 1);
let movesDrop = document.getElementById("selectExercise");
let setForm = document.getElementById("Set Form");
let formButton = document.getElementById("buttonSetForm")


//add the current options to the moves list
function populateSelect(selectElement, id){
  for (let option of moves){
    let newOption = document.createElement("option");
    newOption.value = option;
    newOption.text = option;
    if (option == id){
      newOption.setAttribute('selected','selected');
    }
    selectElement.appendChild(newOption);
  }
}

populateSelect(movesDrop, null);

dbReq.onupgradeneeded = function(event) {
  // Set the db variable to our database so we can use it!  
  db = event.target.result;

  // Create an object store named notes. Object stores
  // in databases are where data are stored.
  // let moves = db.createObjectStore('moves', {autoIncrement: true});
  // let workouts = db.createObjectStore('workouts', {autoIncrement: true});
  let moveHist = db.createObjectStore('history', {keyPath: 'created'});
  // FOR THE FUTURE, IMPLEMENT AN ITERATING KEY THAT YOU CAN USE TO SLICE BY WORKOUT!!!
}

dbReq.onsuccess = function(event) {
  db = event.target.result;
  // moves.add(db);
  // moves.set()
  getAllHistory(db);
  getData(db,null);

}


dbReq.onerror = function(event) {
  alert('error opening database ' + event.target.errorCode);
}

formButton.addEventListener("click", function(event) {
  event.preventDefault();
  if (!setForm.reportValidity()){
    event.preventDefault();
    alert("Fill in the required fields.")
  }
  else{
    submitSet();
  }
  getData(db,null);
});

// function addMove(db, message){
//     //Start transaction and get workouts storage
//     let tx = db.transaction(['moves'], 'readwrite');
//     let store = tx.objectStore('moves');


//     //add the move to the database
//     let move = {name: message};
//     store.add(move);

//     //wait for transaction to be done
//     tx.oncomplete = function() {console.log('New move saved!')}
//     tx.onerror = function(event) {
//         alert('error saving move ' + event.target.errorCode);
//     }
// }


function addHist(db, repCount, weight, move){
  //Start transaction and get workouts storage
  let tx = db.transaction(['history'], 'readwrite');
  let store = tx.objectStore('history');

  //add set to database
  let moveSet = {
    exer : move,
    reps : repCount,
    kg : weight,
    created: new Date().getTime(),
  };
  store.add(moveSet);


  //wait for transaction to be done
  tx.oncomplete = function() {console.log('New set saved!'); getAllHistory(db); }
  tx.onerror = function(event){
    alert('Error saving set.');
  }
}

function submitMove(){
  let message = document.getElementById("newMove");
  if (!moves.has(message.value)) {
    moves.add(message.value);
    //add the move to the moves dropdown
    let newOption = document.createElement("option");
    newOption.value = message.value;
    newOption.text = message.value;
    movesDrop.appendChild(newOption);
    localStorage.setItem("movesSet",JSON.stringify([...moves]))
    alert("Added move.")
  }
  else{
    alert("Move is a duplicate.")
  }
  
}

function submitSet(){
  let move = document.getElementById("selectExercise").value;
  let wgh = document.getElementById("weightIn").value;
  let rep = document.getElementById("repIn").value;
  if (!move == ""){
    addHist(db, rep,wgh,move);

  }
}

function getAllHistory(db){
  let tx = db.transaction(['history'], 'readonly'); //Access the database
  let store = tx.objectStore('history');

  //Use cursor to get all history
  let req = store.openCursor();
  let allHist = [];

  req.onsuccess = function(event){
    //if the cursor request succeds...

    let cursor = event.target.result;

    if (cursor != null){
      //if there is a cursor, add item to array and keep looping

      allHist.push(cursor.value);
      cursor.continue();
    }
    else {
      //if the cursor is empty, then all of history is up to date. Print.
      displayHist(allHist);
    }
  }

  req.onerror = function(event){
    alert("Error in cursor request" + event.target.errorCode);
  }
}

// function displayHist (setHist){
//   let listHTML = '<legend>Set History</legend><ul>';
//   for (let i = setHist.length-1; i > -1; i--){ //View in reverse order
//     let aSet = setHist[i];
//     listHTML += '<li>' + aSet.exer + ' ' + aSet.reps.toString() +  ' ' + aSet.kg.toString() + ' ' + new Date(aSet.created).toString() + '</li>';
//   }
//   document.getElementById('historyField').innerHTML = listHTML;
// }

function displayHist (setHist){
  //Display the data in a table
  let table = document.getElementById('histTableBody')
  table.innerHTML = "";
  for (let i = setHist.length-1; i > -1; i--){
    let aSet = setHist[i];
    let row = table.insertRow();

    let cellExec = row.insertCell(0);
    let cellKG = row.insertCell(1);
    let cellRep = row.insertCell(2);
    let cellDate = row.insertCell(3);
    let cellAction = row.insertCell(4);

    // cellExec.innerHTML = '<input type="text" id="exer' + aSet.created + '" value="' + aSet.exer + '">';
    cellExec.innerHTML = '<select id="exer' + aSet.created + '"> </select>';
    let currExec = document.getElementById("exer"+aSet.created)
    populateSelect(currExec,aSet.exer);
    cellKG.innerHTML = '<input type="number" id="weight' + aSet.created + '" value="' + aSet.kg + '">';
    cellRep.innerHTML = '<input type="number" id="rep' + aSet.created + '" value="' + aSet.reps + '">';
    cellDate.innerHTML = new Date(aSet.created);
    cellAction.innerHTML = '<button onclick="updateData(' + aSet.created + ')">Update</button><button onclick="deleteData(' + aSet.created + ')">Delete</button>';
  }
}

function deleteData(id) {
  var transaction = db.transaction(["history"], "readwrite");
  var objectStore = transaction.objectStore("history");
  objectStore.delete(id);

  // Remove the row from the HTML table
  var table = document.getElementById("histTableBody");
  for (var i = 0, row; row = table.rows[i]; i++) {
    // console.log(row.cells[3], id)
    if (row.cells[3].innerHTML == new Date(id).toString()) {
      table.deleteRow(i);
      break;
    }
  }
  //update the table
  getData(db,null)
}

function updateData(id){
  //access the db
  var transaction = db.transaction(["history"], "readwrite");
  var objectStore = transaction.objectStore("history");

  //get the values
  var exer = document.getElementById("exer"+id).value;
  var kg = document.getElementById("weight"+id).value;
  var reps = document.getElementById("rep"+id).value;

  var request = objectStore.get(id); //get the entry
  request.onsuccess = function(event){
    var data = event.target.result;
    data.exer = exer;
    data.kg = kg;
    data.reps = reps;
    objectStore.put(data);
  };

  //update the table
  getData(db,null);
}

