let db;
let moves = new Set(JSON.parse(localStorage.getItem("movesSet")) || ['Deadlift', 'Benchpress', 'Squat']);
let dbReq = indexedDB.open('Workouts', 1);
let movesDrop = document.getElementById("selectExercise");
let setForm = document.getElementById("Set Form");
let formButton = document.getElementById("buttonSetForm")


//add the current options to the moves list
for (let option of moves){
  let newOption = document.createElement("option");
  newOption.value = option;
  newOption.text = option;
  movesDrop.appendChild(newOption);
}

dbReq.onupgradeneeded = function(event) {
  // Set the db variable to our database so we can use it!  
  db = event.target.result;

  // Create an object store named notes. Object stores
  // in databases are where data are stored.
  // let moves = db.createObjectStore('moves', {autoIncrement: true});
  // let workouts = db.createObjectStore('workouts', {autoIncrement: true});
  let moveHist = db.createObjectStore('history', {keyPath: 'id', autoIncrement: true});
}

dbReq.onsuccess = function(event) {
  db = event.target.result;
  // moves.add(db);
  // moves.set()
  getAllHistory(db);
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

function displayHist (setHist){
  let listHTML = '<legend>Set History</legend><ul>';
  for (let i = 0; i < setHist.length; i++){
    let aSet = setHist[i];
    listHTML += '<li>' + aSet.exer + ' ' + aSet.reps.toString() +  ' ' + aSet.kg.toString() + ' ' + new Date(aSet.created).toString() + '</li>';
  }
  document.getElementById('historyField').innerHTML = listHTML;
}