const indexedDB =
  window.indexedDB ||
  window.mozIndexedDB ||
  window.webkitIndexedDB ||
  window.msIndexedDB ||
  window.shimIndexedDB;

let db;
const request = indexedDB.open("budget-tracker", 1);

// this event will fire if the database version changes
request.onupgradeneeded = function (event) {
  // save a reference to the database
  const db = event.target.result;
  db.createObjectStore("new_budget_data", { autoIncrement: true });
};

request.onsuccess = function (event) {
  // when db is successfully created or connection is established, save reference to db in global variable
  db = event.target.result;

  // check if app is online, if yes run uploadBudgetData() to push local data to remote DB.
  if (navigator.onLine) {
    uploadBudgetData();
  }
};

// To log errors
request.onerror = function (event) {
  console.log(event.target.errorCode);
};

// To Save data locally when attempt is made to submit a record when there is no network connection
function saveRecord(record) {
  // create a new DB transaction with read and write permissions
  const transaction = db.transaction(["new_budget_data"], "readwrite");

  // access the object store for new_budget_data and add record
  const budgetObjectStore = transaction.objectStore("new_budget_data");
  budgetObjectStore.add(record);
}

function uploadBudgetData() {
  // create a new DB transaction with read and write permissions
  const transaction = db.transaction(["new_budget_data"], "readwrite");

  // access the object store and get all records from store
  const budgetObjectStore = transaction.objectStore("new_budget_data");
  const getAll = budgetObjectStore.getAll;

  getAll.onsuccess = function () {
    console.log("getAll.onsuccess");
    // getAll succeeded, check if there is data in indexedDb, and send it to the API server
    if (getAll.result.length > 0) {
      console.log("idb.js");
      fetch("/api/transaction/bulk", {
        method: "POST",
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
        },
      })
        .then((response) => response.json())
        .then((serverResponse) => {
          if (serverResponse.message) {
            throw new Error(serverResponse);
          }
          // open local data store again and clear all items
          const transaction = db.transaction(["new_budget_data"], "readwrite");
          const budgetObjectStore = transaction.objectStore("new_budget_data");
          budgetObjectStore.clear();

          alert("All saved budget data has been submitted!");
        })
        .catch((err) => {
          console.log(err);
        });
    }
  };
}

// listen for app coming back online
window.addEventListener("online", uploadBudgetData);
