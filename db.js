let db;
let moves = new Set(['Deadlift', 'Benchpress', 'Squat']);
let dbReq = indexedDB.open('Workouts', 1);
let movesDrop = document.getElementById("selectNumber");

dbReq.onupgradeneeded = function(event) {
  // Set the db variable to our database so we can use it!  
  db = event.target.result;

  // Create an object store named notes. Object stores
  // in databases are where data are stored.
  // let moves = db.createObjectStore('moves', {autoIncrement: true});
  // let workouts = db.createObjectStore('workouts', {autoIncrement: true});
  let moveHist = db.createObjectStore('history', {autoIncrement: true});

}
dbReq.onsuccess = function(event) {
  db = event.target.result;
  // moves.add(db);
  // moves.set()
}

dbReq.onerror = function(event) {
  alert('error opening database ' + event.target.errorCode);
}

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


  //add workout to database
  let set = {reps: repCount, kg: weight, moveKey: move};
  store.add(set);

  //wait for transaction to be done
  tx.oncomplete = function() {console.log('New set saved!')}
  tx.onerror = function(event){
    alert('Error saving set.');
  }
}
function submitMove(){
  let message = document.getElementById("newmessage");
  moves.add(message.value);
  // remove everything in the dropdown
  movesDrop.innerHTML = "";

  //Loop over each element and add it to the dropdown
  for (let option of moves){
    let newOption = document.createElement("option");
    newOption.value = option;
    newOption.text = option;
    movesDrop.appendChild(newOption);
  }

}
function submitSet(){
  let message = document.getElementById("newmessage");
  addMove(db,message.value);
  message.value = '';
}
function createWorkout(){
  //Adds a new workout and creates a key for it
}