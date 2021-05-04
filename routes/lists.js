const express = require('express');
const listsRouter = express.Router();

// LISTSROUTER IS MOUNTED ON TRIPSROUTER
// Complete route: 'api/trips/:tripId/lists'
module.exports = listsRouter;

// IMPORT DB ACCESS DETAILS
const db = require('../db');

// Import helper functions and custom middleware
const { saveListsValidation, editListTitleValidation, newListValidation, deleteListValidation, saveEditedListItemValidation, saveNewListItemValidation, deleteListItemValidation, fetchListsValidation } = require('../validation');

// Import js libraries 
const dayjs = require('dayjs'); // For manipulating date/time
const localizedFormat = require('dayjs/plugin/localizedFormat'); // Import and use dayjs plugin
dayjs.extend(localizedFormat);

// EVERYTHING COMING THROUGH LISTSROUTER WILL HAVE ALREADY BEEN AUTHENTICATED (using verifyToken function mounted on tripsRouter)
// TRIPID WILL HAVE ALREADY BEEN VALIDATED AND THE USER AUTHORISED (using the param method on /:tripId in trips.js)

// IMPORT LIST ITEMS ROUTER
const listItemsRouter = require('./listItems');

// FETCH LISTS AND SEND TO CLIENT
listsRouter.get('/fetchlists', async (req, res) => {

    // Get the tripId from the trip details object attached to the request body by the trip id param validation
    const tripId = req.tripDetails.id;

    // Get the app user id from req.appUserId (set by the verifyToken middleware)
    const appUserId = req.appUserId;

    // Validate the data
    const { error } = fetchListsValidation({ tripId, appUserId });
    if (error) {
        return res.status(400).send({ 'message': error.details[0].message });
    }

    // Get the list titles
    const getListTitleText = "SELECT id, title FROM list WHERE trip_id = $1 AND app_user_id = $2"
    const getListTitleValues = [tripId, appUserId];

    const listTitlesResults = await db.query(getListTitleText, getListTitleValues);
    console.log("list table queried");

    // If there are no lists, send 404 status and message
    if (!listTitlesResults.rows || listTitlesResults.rows.length === 0) {
        return res.status(404).json({ "message": "Lists cannot be found" });
    }

    // Assign the resulting array of lists to the variable lists
    const lists = listTitlesResults.rows; // each item in the 'lists' array is an object e.g. { "id": 1, "title": "Gear" }

    // Generate an empty array for each list to hold the list items
    const allListItems = lists.map(list => []);
    let counter = 0;

    // Iterate through the array of lists to get the list items for each list
    lists.forEach(async (list, index, lists) => {
        const getListItemsText = "SELECT * FROM list_item WHERE list_id = $1 AND is_deleted = false";
        const getListItemsValue = [list.id];

        const listItemsResults = await db.query(getListItemsText, getListItemsValue);
        console.log("list item table queried");

        const listItems = listItemsResults.rows;
        allListItems[index] = listItems;
        counter += 1;

        // Once we reach the final iteration, we send the lists and list items back to the front end
        if (counter === lists.length) {
            return res.status(200).json({ 'lists': lists, 'allListItems': allListItems });
        }
    });
});

// CREATE NEW LIST
listsRouter.post('/createnew', async (req, res) => {

    // Get the tripId from the trip details object attached to the request body by the trip id param validation
    const tripId = req.tripDetails.id;

    // Get the app user id from req.appUserId (set by the verifyToken middleware)
    const appUserId = req.appUserId;

    // Validate the data
    const { error } = newListValidation({ tripId, appUserId });
    if (error) {
        return res.status(400).send({ 'message': error.details[0].message });
    }

    try {
        // Insert a new list into the db titled, 'Untitled'
        const result = await db.query(
            "INSERT INTO list (title, app_user_id, trip_id) VALUES ($1, $2, $3) RETURNING id",
            ['Untitled', appUserId, tripId]
        );

        if (!result || !result.rowCount) {
            return res.status(500).send({ 'message': 'New list could not be created E0' });
        }

        // Send the new id back to the front end
        return res.status(201).json(result.rows[0]);
    }

    catch (error) {
        console.error(error.stack);
        return res.status(500).send({ 'message': 'New list could not be created E1' });
    }
});

// VALIDATE LIST ID PARAM
listsRouter.param('listId', async (req, res, next, listId) => {

    try {
        const listIdResult = await db.query('SELECT app_user_id, trip_id FROM list WHERE id = $1', [listId]);

        // Make sure list exists
        if (!listIdResult.rows.length) {
            return res.status(404).send({ 'message': 'List not found' });
        }
        console.log("listId validated to exist in db");

        // Make sure the list being queried is associated with the user and the trip
        // The app user id is in req.appUserId (set by the verifyToken middleware)
        // The param trip id is in req.tripDetails (set by trip id param validation)
        if (
            listIdResult.rows[0].app_user_id !== req.appUserId
            || listIdResult.rows[0].trip_id !== req.tripDetails.id
        ) {
            return res.status(403).send({ 'message': 'This request is not allowed' }); // Forbidden
        }

        req.listId = listId;
        console.log("list id validated");
        next();
    }

    catch (error) {
        next(error);
    }
});

// EDIT LIST TITLE
listsRouter.put('/:listId/edit', async (req, res) => {

    // From the list id param validation
    const listId = req.listId;

    // Get the edited list title from the request body sent by the client
    const { editedListTitle } = req.body;

    // Validate the data
    const { error } = editListTitleValidation(editedListTitle);
    if (error) {
        return res.status(400).send({ 'message': error.details[0].message });
    }

    try {
        // Update the list title
        const result = await db.query(
            "UPDATE list SET title = $1 WHERE id = $2",
            [editedListTitle, listId]
        );

        if (!result || !result.rowCount) {
            return res.status(500).send({ 'message': 'Edited list title could not be updated' });
        }

        return res.status(200).send({ 'message': 'List title updated' });
    }

    catch (error) {
        console.error(error.stack);
        return res.status(500).send({ 'message': 'Edited list title could not be saved' });
    }
});

// DELETE LIST
listsRouter.delete('/:listId/delete', async (req, res) => {

    // From the list id param validation
    const listId = req.listId;

    // Validate the data
    const { error } = deleteListValidation(listId);
    if (error) {
        return res.status(400).send({ 'message': error.details[0].message });
    }

    // Checkout/reserve a client for our transaction
    const client = await db.getClient();
    // note: we don't try/catch this because if connecting throws an exception
    // we don't need to dispose of the client (it will be undefined)

    try {
        // Start the transaction on our checked out client 
        await client.query('BEGIN');
        console.log("transaction has begun");

        // Delete the list items
        await client.query("DELETE FROM list_item WHERE list_id = $1", [listId]);
        console.log("list items have been deleted from list_item table");

        // Delete the list
        await client.query("DELETE FROM list WHERE id = $1", [listId]);
        console.log("list has been deleted from list table");

        await client.query('COMMIT');

        return res.sendStatus(204);
    }

    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in transaction', error.stack);
        return res.status(500).send({ 'message': 'List could not be deleted' });
    }

    finally {
        client.release();
    }
});

// MOUNT THE LIST ITEMS ROUTER AT THE LIST ITEMS ENDPOINT
listsRouter.use('/:listId/listitems', listItemsRouter);







// SAVE LISTS - OBSOLETE ENDPOINT - TO BE REPURPOSED OR DELETED SOON
listsRouter.post('/savelists', async (req, res) => {

    // Get the tripId from the trip details object attached to the request body by the trip id param validation
    const tripId = req.tripDetails.id;

    // Get the other data from the request body sent by the client
    const { lists, allListItems } = req.body;
    const listTitles = lists.map(list => list.title); // This should give us an array of strings, being the list titles

    const listItemNames = allListItems.map(listItems => {
        return listItems.map(listItem => listItem.name);
    }); // This should give us an array of subarrays. Each subarray carries the list item names of one list. The index of the list in listTitles should match up with the index of the subarray.

    // Get the app user id from req.appUserId (set by the verifyToken middleware)
    const appUserId = req.appUserId;

    // Validate the data
    const { error } = saveListsValidation({ listTitles, tripId, listItemNames, appUserId });
    if (error) {
        return res.status(400).send({ 'message': error.details[0].message });
    }

    // Checkout/reserve a client for our transaction
    const client = await db.getClient();
    // note: we don't try/catch this because if connecting throws an exception
    // we don't need to dispose of the client (it will be undefined)

    try {
        // Start the transaction on our checked out client 
        await client.query('BEGIN');
        console.log("transaction has begun");

        // GET THE OLD LIST IDS
        const listIdsResults = await client.query("SELECT id FROM list WHERE trip_id = $1", [tripId]);
        console.log("getting old list ids");

        if (listIdsResults.rows.length) { // This will be the scenario if the lists have been saved before and already exist in the list table

            const listIds = listIdsResults.rows.map(row => row.id);
            console.log(listIds);

            // DELETE THE OLD LIST ITEMS FROM THE LIST_ITEM TABLE
            listIds.forEach(async (listId, index, listIds) => {
                const deleteOldListItemsText = "DELETE FROM list_item WHERE list_id = $1";
                const deleteOldListItemsValues = [listId];

                await client.query(deleteOldListItemsText, deleteOldListItemsValues);

                console.log("old list items have been deleted from list_item table", listId);

                // Once we reach the last iteration of this loop, we will call the next nested query
                if (index === listIds.length - 1) {
                    console.log("last loop interation");

                    // DELETE THE OLD LISTS FROM THE LIST TABLE
                    const deleteOldListsText = "DELETE FROM list WHERE trip_id = $1";
                    const deleteOldListsValues = [tripId];

                    await client.query(deleteOldListsText, deleteOldListsValues);
                    console.log("old lists have been deleted from list table");

                    // ADD NEW LISTS TO THE LIST TABLE - iterate through the list titles array and add each list title as a new list
                    listTitles.forEach(async (listTitle, outerIndex, listTitles) => {
                        const insertNewListText = "INSERT INTO list (title, trip_id, app_user_id) VALUES ($1, $2, $3) RETURNING id";
                        const insertNewListValues = [listTitle, tripId, appUserId];

                        const newListIdsResults = await client.query(insertNewListText, insertNewListValues);
                        console.log("new lists have been inserted into list table", outerIndex);
                        const newListId = newListIdsResults.rows[0].id;

                        // ADD NEW LIST ITEMS FOR THIS LIST TO THE LIST_ITEM TABLE
                        const thisListItemNames = listItemNames[outerIndex]; // Remember the indices match up between the listTitles array and the outside listItemNames array
                        console.log(thisListItemNames);

                        // Iterate through each list item name and add it to the list_item_table, linked to the list by its new list id
                        thisListItemNames.forEach(async (itemName, innerIndex, thisListItemNames) => {
                            const insertNewListItemText = "INSERT INTO list_item (name, list_id) VALUES ($1, $2)";
                            const insertNewListItemValues = [itemName, newListId];

                            await client.query(insertNewListItemText, insertNewListItemValues);
                            console.log("new list item has been inserted into list table", outerIndex, innerIndex);

                            // Once we reach the last iteration of the outside and inside loop, we will call the commit command
                            if (outerIndex === listTitles.length - 1 && innerIndex === thisListItemNames.length - 1) {
                                console.log("last loop interation");
                                // Commit the changes and return the client to the pool
                                await client.query('COMMIT');

                                const currentTimeDate = dayjs().format('llll');
                                return res.status(201).send({ 'message': `Lists last saved: ${currentTimeDate}`, 'lastSaved': currentTimeDate });
                            }
                        });
                    });
                }
            });

        } else { // This will run if the lists have not been saved before and therefore do not yet exist in the list table

            // ADD NEW LISTS TO THE LIST TABLE - iterate through the list titles array and add each list title as a new list
            listTitles.forEach(async (listTitle, outerIndex, listTitles) => {
                const insertNewListText = "INSERT INTO list (title, trip_id, app_user_id) VALUES ($1, $2, $3) RETURNING id";
                const insertNewListValues = [listTitle, tripId, appUserId];

                const newListIdsResults = await client.query(insertNewListText, insertNewListValues);
                console.log("new lists have been inserted into list table", outerIndex);
                const newListId = newListIdsResults.rows[0].id;

                // ADD NEW LIST ITEMS FOR THIS LIST TO THE LIST_ITEM TABLE
                const thisListItemNames = listItemNames[outerIndex]; // Remember the indices match up between the listTitles array and the outside listItemNames array
                console.log(thisListItemNames);

                // Iterate through each list item name and add it to the list_item_table, linked to the list by its new list id
                thisListItemNames.forEach(async (itemName, innerIndex, thisListItemNames) => {
                    const insertNewListItemText = "INSERT INTO list_item (name, list_id) VALUES ($1, $2)";
                    const insertNewListItemValues = [itemName, newListId];

                    await client.query(insertNewListItemText, insertNewListItemValues);
                    console.log("new list item has been inserted into list table", outerIndex, innerIndex);

                    // Once we reach the last iteration of the outside and inside loop, we will call the commit command
                    if (outerIndex === listTitles.length - 1 && innerIndex === thisListItemNames.length - 1) {
                        console.log("last loop interation");
                        // Commit the changes and return the client to the pool
                        await client.query('COMMIT');

                        const currentTimeDate = dayjs().format('llll');
                        return res.status(201).send({ 'message': `Lists last saved: ${currentTimeDate}`, 'lastSaved': currentTimeDate });
                    }
                });
            });
        }
    }

    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in transaction', error.stack);
        return res.status(400).send({ 'message': 'Lists could not be saved' });
    }

    finally {
        client.release();
    }
});

