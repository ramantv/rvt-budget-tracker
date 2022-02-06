const indexedDB =
  window.indexedDB ||
  window.mozIndexedDB ||
  window.webkitIndexedDB ||
  window.msIndexedDB ||
  window.shimIndexedDB;

let db;
const request = indexedDB.open('budget-tracker', 1);

// this event will fire if the database version changes 
request.onupgradeneeded = function(event) {
    // save a reference to the database 
    const db = event.target.result;
    db.createObjectStore('new_budget_data', { autoIncrement: true });
  };

// upon a successful 
request.onsuccess = function(event) {
    // when db is successfully created or connection is established, save reference to db in global variable
    db = event.target.result;
  
    // check if app is online, if yes run uploadBudgetData() to push local data to remote DB.
    if (navigator.onLine) {
    uploadBudgetData();
    }
  };

// To log errors
request.onerror = function(event) {
    console.log(event.target.errorCode);
};

// To Save data locally when attempt is made to submit a record when there is no network connection
function saveRecord(record) {
    // open a new transaction with the database with read and write permissions 
    const transaction = db.transaction(['new_budget_data'], 'readwrite');
  
    // access the object store for new_budget_data and add record 
    const budgetObjectStore = transaction.objectStore('new_budget_data');
    budgetObjectStore.add(record);
  }

function uploadBudgetData() {
        // open a new transaction with the database with read and write permissions 
        const transaction = db.transaction(['new_budget_data'], 'readwrite');
  
        // access the object store for `new_budget_data
        const budgetObjectStore = transaction.objectStore('new_budget_data');
      
        //get all records from store and set to a variable
        const getAll = budgetObjectStore.getAll

        // upon a successful .getAll() execution, run this function
        getAll.onsuccess = function() {
        // if there was data in indexedDb's store, let's send it to the api server
        if (getAll.result.length > 0) {
          console.log("idb.js")
            fetch('/api/transaction/bulk', {
            method: 'POST',
            body: JSON.stringify(getAll.result),
            headers: {
                Accept: 'application/json, text/plain, */*',
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(serverResponse => {
          if (serverResponse.message) {
            throw new Error(serverResponse);
          }
          // open one more transaction
          const transaction = db.transaction(['new_budget_data'], 'readwrite');
          // access the new_budget_data object store
          const budgetObjectStore = transaction.objectStore('new_budget_data');
          // clear all items in your store
          budgetObjectStore.clear();

          alert('All saved budget data has been submitted!');
        })
        .catch(err => {
          console.log(err);
        });
    }
  };
}

// listen for app coming back online
window.addEventListener('online', uploadBudgetData);