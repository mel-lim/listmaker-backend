const express = require('express');
const listsRouter = express.Router();

// LISTSROUTER IS MOUNTED ON TRIPSROUTER
// Complete route: '/trips/:tripId/lists'
module.exports = listsRouter;

// IMPORT DB ACCESS DETAILS
const db = require('../db');

// Import helper functions and custom middleware
const { saveListsValidation } = require('../validation');

// EVERYTHING COMING THROUGH LISTSROUTER WILL HAVE ALREADY BEEN AUTHENTICATED (using verifyToken function mounted on tripsRouter)
// TRIPID WILL HAVE ALREADY BEEN VALIDATED AND THE USER AUTHORISED (using the param method on /:tripId in trips.js)

// SAVE LISTS
listsRouter.post('/savelists', (req, res, next) => {

    // Get the tripId from the trip details object attached to the request body by the trip id param validation
    const tripId = req.tripDetails.id;

    // Get the other data from the request body sent by the client
    const { lists, allListItems } = req.body;

    const listTitles = lists.map(list => list.title); // This should give us an array of strings, being the list titles

    const listIds = lists.map(list => list.id); // This should be an array of numbers, being the list ids

    const listItemNames = allListItems.map(listItems => {
        return listItems.map(listItem => listItem.name);
    }); // This should give us an array of subarrays. Each subarray carries the list item names of one list. The index of the list in listTitles should match up with the index of the subarray.

    // Get the app user id from req.appUserId (set by the verifyToken middleware)
    const appUserId = req.appUserId;

    // Validate the data before we generate new lists
    const { error } = saveListsValidation({ listTitles, listIds, tripId, listItemNames, appUserId });
    if (error) {
        return res.status(400).send({ 'message': error.details[0].message });
    }

    // Checkout/reserve a client for our transaction
    db.getClient((err, client, done) => {

        // Define an error catcher
        const shouldAbort = err => {
            if (err) {
                console.error('Error in transaction', err.stack);
                client.query('ROLLBACK', err => {
                    if (err) {
                        console.error('Error rolling back client', err.stack);
                    }
                    // release the client back to the pool
                    done();
                })
            }
            return !!err; // this is a double negation - therefore calling shouldAbort(err) will return boolean false if there is no error
        }

        // Start the transaction on our checked out client 
        client.query('BEGIN', err => {
            console.log("transaction has begun");
            if (shouldAbort(err)) return;

            // 'MOVE' THE OLD LISTS TO THE DELETED_LIST TABLE
            const moveOldListsText = "INSERT INTO deleted_list (list_id, title, app_user_id, trip_id) SELECT id, title, app_user_id, trip_id FROM list WHERE trip_id = $1";
            const moveOldListsValues = [tripId];

            client.query(moveOldListsText, moveOldListsValues, (err, results) => {
                if (shouldAbort(err)) return;
                console.log("old lists have been moved into deleted_list table");

                // 'MOVE' ALL THE OLD LIST ITEMS TO THE DELETED_LIST_ITEM TABLE
                listIds.forEach((listId, index, listIds) => {
                    const moveOldListItemsText = "INSERT INTO deleted_list_item (name, list_id) SELECT name, list_id FROM list_item WHERE list_id = $1";
                    const moveOldListItemsValues = [listId];

                    client.query(moveOldListItemsText, moveOldListItemsValues, (err, results) => {
                        if (shouldAbort(err)) return;
                        console.log("old list items have been moved into deleted_list_item table", index);

                        // Once we reach the last iteration of this loop, we will call the next nested query
                        if (index === listIds.length - 1) {
                            console.log("last loop interation");

                            // DELETE THE OLD LIST ITEMS FROM THE LIST_ITEM TABLE
                            listIds.forEach((listId, index, listIds) => {
                                const deleteOldListItemsText = "DELETE FROM list_item WHERE list_id = $1";
                                const deleteOldListItemsValues = [listId];

                                client.query(deleteOldListItemsText, deleteOldListItemsValues, (err, results) => {
                                    if (shouldAbort(err)) return;
                                    console.log("old list items have been deleted from list_item table", listId);

                                    // Once we reach the last iteration of this loop, we will call the next nested query
                                    if (index === listIds.length - 1) {
                                        console.log("last loop interation");

                                        // DELETE THE OLD LISTS FROM THE LIST TABLE
                                        const deleteOldListsText = "DELETE FROM list WHERE trip_id = $1";
                                        const deleteOldListsValues = [tripId];

                                        client.query(deleteOldListsText, deleteOldListsValues, (err, results) => {
                                            if (shouldAbort(err)) return;
                                            console.log("old lists have been deleted from list table");

                                            const newListIds = []; // To hold our new list ids once we add the lists to the list table

                                            // ADD NEW LISTS TO THE LIST TABLE
                                            listTitles.forEach((listTitle, outerIndex, listTitles) => {
                                                const insertNewListText = "INSERT INTO list (title, trip_id, app_user_id) VALUES ($1, $2, $3) RETURNING id";
                                                const insertNewListValues = [listTitle, tripId, appUserId];

                                                client.query(insertNewListText, insertNewListValues, (err, results) => {
                                                    if (shouldAbort(err)) return;
                                                    console.log("new lists have been inserted into list table", index);
                                                    const newListId = results.rows[0].id;

                                                    // ADD NEW LIST ITEMS FOR THIS LIST TO THE LIST_ITEM TABLE
                                                    const thisListItemNames = listItemNames[outerIndex]; // Remember the indices match up between the listTitles array and the outside listItemNames array
                                                    console.log(thisListItemNames)

                                                    // Iterate through each list item name and add it to the list_item_table, linked to the list by its new list id
                                                    thisListItemNames.forEach((itemName, innerIndex, thisListItemNames) => {
                                                        const insertNewListItemText = "INSERT INTO list_item (name, list_id) VALUES ($1, $2)";
                                                        const insertNewListItemValues = [itemName, newListId];

                                                        client.query(insertNewListItemText, insertNewListItemValues, (err, results) => {
                                                            if (shouldAbort(err)) return;

                                                            console.log("new list item has been inserted into list table", outerIndex, innerIndex);

                                                            // Once we reach the last iteration of the outside and inside loop, we will call the commit command
                                                            if (outerIndex === listIds.length - 1 && innerIndex === thisListItemNames.length - 1) {
                                                                console.log("last loop interation");
                                                                // Commit the changes and return the client to the pool
                                                                client.query('COMMIT', err => {
                                                                    if (err) {
                                                                        console.error('Error committing transaction', err.stack);
                                                                        res.status(400).send({ 'message': 'Lists could not be saved' });
                                                                    }
                                                                    res.status(201).send({ 'message': 'Lists successfully saved' });
                                                                    done();
                                                                });
                                                            }
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    }
                                });
                            });
                        }
                    });
                });
            });
        });
    });
});

