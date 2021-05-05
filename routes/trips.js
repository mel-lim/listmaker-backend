const express = require('express');

// IMPORT DB ACCESS DETAILS
const db = require('../db');

// Create a new express-promise-router (which has same API as the normal express router)
const tripsRouter = express.Router();

// Export the router - TRIPSROUTER IS MOUNTED ON APIROUTER AT '/trips'
module.exports = tripsRouter;

// IMPORT HELPER FUNCTIONS AND CUSTOM MIDDLEWARE
const { newTripValidation, getTripsValidation, editTripDetailsValidation, deleteTripValidation } = require('../validation');
const verifyToken = require('../verifyToken');

// Import js libraries 
const dayjs = require('dayjs'); // For manipulating date/time
const localizedFormat = require('dayjs/plugin/localizedFormat'); // Import and use dayjs plugin
dayjs.extend(localizedFormat);

// MOUNT THE AUTHENTICATION MIDDLEWARE - all routes in this router requires the user to be authenticated
tripsRouter.use(verifyToken);
// THIS WORKS, BUT SHOULD THIS BE tripsRouter.all? I think they would work equivalently in this case, so I will leave this as is for now.

// IMPORT LISTS ROUTER
const listsRouter = require('./lists');

// FETCH ALL TRIPS FOR THE LOGGED IN USER
tripsRouter.get('/alltrips', async (req, res, next) => {
    // Get the app user id from req.appUserId (set by the verifyToken middleware)
    const appUserId = req.appUserId;

    // Validate the data before we create a new trip
    const { error } = getTripsValidation({ appUserId });
    if (error) {
        return res.status(400).send({ 'message': error.details[0].message });
    }

    // Fetch all the trips for this user
    try {

        const { rows } = await db.query(
            "WITH trip_master AS (SELECT * FROM trip INNER JOIN app_users_trips ON trip.id = app_users_trips.trip_id ) SELECT id, name, category, duration FROM trip_master WHERE app_user_id = $1",
            [appUserId]);

            console.log(rows);

        return res.status(200).json({ "trips": rows });
    }

    catch (err) {
        console.log(err);
        next(err);
    }
});

// CREATE A NEW TRIP AND GENERATE NEW LISTS
tripsRouter.post('/newtrip', async (req, res) => {

    // Destructure new trip details from the req body
    let { tripName, tripCategory, tripDuration, requestTemplate } = req.body;
    if (!tripName) {
        tripName = 'Unnamed Trip';
    }

    // Get the app user id from req.appUserId (set by the verifyToken middleware)
    const appUserId = req.appUserId;

    // Validate the data for creating a new trip
    const { error } = newTripValidation({ tripName, tripCategory, tripDuration, requestTemplate, appUserId });
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

        // Insert new trip into the trip table and return the trip id
        const insertTripText = 'INSERT INTO trip (name, category, duration) VALUES($1, $2, $3) RETURNING id';
        const insertTripValues = [tripName, tripCategory, tripDuration];
        const tripIdResult = await client.query(insertTripText, insertTripValues);

        // Extract the trip id returned from this query
        const tripId = tripIdResult.rows[0].id;

        // Record the relationship in the app_users_trips junction table
        const insertAppUserTripText = 'INSERT INTO app_users_trips(app_user_id, trip_id) VALUES ($1, $2)';
        const insertAppUserTripValues = [appUserId, tripId];
        await client.query(insertAppUserTripText, insertAppUserTripValues);

        // Get the template list titles
        const getListTitleText = "SELECT id, title FROM template_list WHERE trip_category = $1 AND (trip_duration = 'any' OR trip_duration = $2)"
        const getListTitleValues = [tripCategory, tripDuration];
        const listsResults = await client.query(getListTitleText, getListTitleValues);

        // Save the resulting array of lists
        const lists = listsResults.rows; // each item in the 'lists' array is an object e.g. { "id": 1, "title": "Gear" }

        // Initialise empty array to hold list item data
        const allListItems = [];

        // If user does not want their lists to be generated with template/suggested list items
        if (requestTemplate === "no") {

            // Iterate through the array of lists to add an 'edit me' item for each list
            lists.forEach(async (list, index, lists) => {

                allListItems.push([{ name: 'Edit me', list_id: list.id }]);

                // On the last iteration, commit the changes and return the client to the pool
                if (index === lists.length - 1) {
                    await client.query('COMMIT');

                    res.status(201).json({ 'tripId': tripId, 'lists': lists, 'allListItems': allListItems });
                }
            });

        } else { // If the user does want their lists to be generated with template / suggested list items

            // Iterate through the array of lists to get the template list items for each list
            lists.forEach(async (list, index, lists) => {
                const getListItemsText = "SELECT * FROM template_list_item WHERE list_id = $1";
                const getListItemsValue = [list.id];
                const listItemsResults = await client.query(getListItemsText, getListItemsValue);

                const listItems = listItemsResults.rows;
                console.log(listItems);
                allListItems.push(listItems);

                // On the last iteration, commit the changes and return the client to the pool
                if (index === lists.length - 1) {
                    await client.query('COMMIT');

                    res.status(201).json({ 'tripId': tripId, 'lists': lists, 'allListItems': allListItems });
                }
            });
        }
    }

    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in transaction', error.stack);
        res.status(500).send({ 'message': 'Lists could not be generated' });
    }

    finally {
        client.release();
    }
});

// VALIDATE TRIPID PARAM AND AUTHORISE USER
tripsRouter.param('tripId', async (req, res, next, tripId) => {

    // Make sure trip exists
    try {
        const tripIdResult = await db.query('SELECT * FROM trip WHERE id = $1', [tripId]);

        if (!tripIdResult.rows.length) {
            return res.status(404).send({ 'message': 'Trip not found' });
        }
        console.log("tripId validated to exist in db");

        // Make sure the user making the request is the user who is associated with the trip
        const appUserIdResult = await db.query('SELECT app_user_id FROM app_users_trips WHERE trip_id = $1', [tripId]);

        // Get the app user id from req.appUserId (set by the verifyToken middleware)
        const appUserId = req.appUserId;

        // Compare the app user id - if they match, attach the tripDetails to the req and call next()
        if (appUserId === appUserIdResult.rows[0].app_user_id) {
            req.tripDetails = tripIdResult.rows[0];
            console.log("user authorised to access this trip");
            next();
        } else {
            return res.status(403).send({ 'message': 'User not authorized' });
        }
    }

    catch (error) {
        next(error);
    }
});


// SAVE CHANGES TO TRIP DETAILS
tripsRouter.put('/:tripId/edittripdetails', async (req, res) => {

    // Get the tripId from the trip details object attached to the request body by the trip id param validation
    const tripId = req.tripDetails.id;

    // Get the other data from the request body sent by the client
    const { editedTripName } = req.body;

    // Validate the data
    const { error } = editTripDetailsValidation({ tripId, editedTripName });
    if (error) {
        return res.status(400).send({ 'message': error.details[0].message });
    }

    try {
        const { rowCount } = await db.query('UPDATE trip SET name = $1 WHERE id = $2', [editedTripName, tripId]);
        if (rowCount === 1) {
            const currentTimeDate = dayjs().format('llll');
            return res.status(200).json({ "message": `Trip details last saved: ${currentTimeDate}`, 'lastSaved': currentTimeDate });
        } else {
            return res.status(500).json({ 'message': 'Trip details could not be saved' });
        }
    }
    catch (error) {
        console.error('Error committing transaction', error.stack);
        return res.status(400).json({ 'message': 'Trip details could not be saved' });
    }
});

// DELETE TRIP
tripsRouter.delete('/:tripId/deletetrip', async (req, res) => {

    // Get the tripId from the trip details object attached to the request body by the trip id param validation
    const tripId = req.tripDetails.id;

    // Validate the data
    const { error } = deleteTripValidation({ tripId });
    if (error) {
        return res.status(400).send({ 'message': error.details[0].message });
    }

    // Checkout/reserve a client for our transaction
    const client = await db.getClient();

    try {
        // Start the transaction on our checked out client 
        await client.query('BEGIN');

        // Query the list table to find the list ids associated with this trip
        const listIdResults = await client.query('SELECT id from list WHERE trip_id = $1', [tripId]);

        // Extract the list ids returned from this query
        if (listIdResults.rows && listIdResults.rows.length) {
            const listIds = listIdResults.rows.map(item => item.id);
            console.log(listIds);

            // Iterate through the list ids
            listIds.forEach(async (listId, index, listIds) => {

                // DELETE THE OLD LIST ITEMS ASSOCIATED WITH THE LIST ID
                await client.query("DELETE FROM list_item WHERE list_id = $1", [listId]);
                console.log('old list items have been deleted from the list_item table', listId);

                // Once we reach the last iteration of this loop, we will call the next nested query
                if (index === listIds.length - 1) {
                    console.log("last loop interation");

                    // DELETE THE OLD LISTS FROM THE LIST TABLE
                    await client.query("DELETE FROM list WHERE trip_id = $1", [tripId]);
                    console.log("old lists have been deleted from list table");

                    // DELETE THE RELATIONSHIP BETWEEN TRIP AND APP_USER FROM THE APP_USERS_TRIPS TABLE
                    await client.query("DELETE FROM app_users_trips WHERE trip_id = $1", [tripId]);
                    console.log("relationship has been deleted");

                    const deleteTripResults = await client.query("DELETE FROM trip WHERE id = $1", [tripId]);

                    if (deleteTripResults.rowCount === 1) {
                        console.log("trip has been deleted");
                        await client.query('COMMIT');
                        res.sendStatus(204);
                    } else {
                        throw 'trip could not be deleted';
                    }
                }
            });
        }
    }

    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error committing transaction', err.stack);
        res.status(400).send({ 'message': 'Trip could not be deleted' });
    }

    finally {
        client.release();
    }
});

// MOUNT THE LISTS ROUTER AT THE LISTS ENDPOINT
tripsRouter.use('/:tripId/lists', listsRouter);