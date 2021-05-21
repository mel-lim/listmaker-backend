const express = require('express');

// IMPORT DB ACCESS DETAILS
const db = require('../db');

// Create a new express-promise-router (which has same API as the normal express router)
const tripsRouter = express.Router();

// Export the router - TRIPSROUTER IS MOUNTED ON APIROUTER AT '/trips'
module.exports = tripsRouter;

// IMPORT HELPER FUNCTIONS AND CUSTOM MIDDLEWARE
const { newTripValidation, editTripDetailsValidation } = require('../validation');
const verifyToken = require('../verifyToken');
const { deleteTrip } = require('../helperFunctions');

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
    // Get the app user id from req.authorisedAppUserId (set by the verifyToken middleware)
    const appUserId = req.authorisedAppUserId;

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

    // Get the app user id from req.authorisedAppUserId (set by the verifyToken middleware)
    const appUserId = req.authorisedAppUserId;

    // Validate the data for creating a new trip
    const { error } = newTripValidation({ tripName, tripCategory, tripDuration, requestTemplate });
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

        // Insert new trip into the trip table and return the trip id
        const tripIdResult = await client.query(
            'INSERT INTO trip (name, category, duration) VALUES($1, $2, $3) RETURNING id',
            [tripName, tripCategory, tripDuration]
        );
        console.log("new trip has been inserted");

        // Extract the trip id returned from this query
        const tripId = tripIdResult.rows[0].id;

        // Record the relationship in the app_users_trips junction table
        await client.query(
            'INSERT INTO app_users_trips(app_user_id, trip_id) VALUES ($1, $2)',
            [appUserId, tripId]
        );
        console.log("relationship has been recorded in app_users_trips");

        // Get the template list titles
        let templateListResults;
        if (tripCategory === 'other') { // If user selected 'other' for tripCategory, populate with the hiking template list items
            templateListResults = await client.query(
                "SELECT id, title FROM template_list WHERE trip_category = $1 AND (trip_duration = 'any' OR trip_duration = $2)",
                ['hiking', tripDuration]
            );
        } else {
            templateListResults = await client.query(
                "SELECT id, title FROM template_list WHERE trip_category = $1 AND (trip_duration = 'any' OR trip_duration = $2)",
                [tripCategory, tripDuration]
            );
        }
        
        // Save the resulting array of lists
        const templateLists = templateListResults.rows; // each item in the 'templateLists' array is an object e.g. { "id": 1, "title": "Gear" }

        console.log("template lists have been obtained");

        // Initialise an empty array to hold the lists
        const lists = [];
        const allListItems = [];

        // Iterate through the array of template lists, insert each list into the list table
        await Promise.all(
            templateLists.map(
                async templateList => {
                    // Insert each template list into the list table
                    const listResult = await client.query(
                        "INSERT INTO list (title, app_user_id, trip_id) VALUES ($1, $2, $3) RETURNING id, title",
                        [templateList.title, appUserId, tripId]
                    );
                    // Add the list {id: XX, title: XX} to the lists array
                    const list = listResult.rows[0];
                    console.log(list);
                    // Add the list to the lists array
                    lists.push(list);

                    // Initialise an empty array to hold the template list items
                    let templateListItems = [];

                    if (requestTemplate === "no") { // If user does not want their lists to be generated with template/suggested list items

                        // Add a placeholder list item named 'Edit me' to each list
                        templateListItems = [{ name: 'Edit me', list_id: list.id }];

                    } else { // If the user wants their lists to be generated with template / suggested list items

                        // Get the template list items for each list
                        const templateListItemResults = await client.query(
                            "SELECT * FROM template_list_item WHERE list_id = $1",
                            [templateList.id]
                        );
                        templateListItems = templateListItemResults.rows;
                    }

                    console.log("templateListItems have been obtained");

                    // Iterate through the template list items and insert each template list item into the list_item table
                    const listItems = await Promise.all(
                        templateListItems.map(
                            async templateListItem => {
                                const listItemResults = await client.query(
                                    "INSERT INTO list_item (name, list_id) VALUES ($1, $2) RETURNING *",
                                    [templateListItem.name, list.id]
                                );
                                const listItem = listItemResults.rows[0];
                                // [{id: XX, title: XX, list_id: XX, is_checked: XX, is_deleted: XX}, {...}, {...}, ...]
                                return listItem;
                            }
                        )
                    );

                    // Add the listItems to the allListItems array
                    allListItems.push(listItems);

                    console.log("templateListItems have been inserted into the list_item table");
                }
            )
        );

        //Might need to sort the lists later - let's see

        await client.query('COMMIT');
        console.log("commited");

        res.status(201).json({ 'tripId': tripId, 'lists': lists, 'allListItems': allListItems });
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
            console.log(tripIdResult.rows);
            return res.status(404).send({ 'message': 'Trip not found' });
        }
        console.log("tripId validated to exist in db");

        // Make sure the user making the request is the user who is associated with the trip
        const appUserIdResult = await db.query('SELECT app_user_id FROM app_users_trips WHERE trip_id = $1', [tripId]);

        // Get the app user id from req.authorisedAppUserId (set by the verifyToken middleware)
        const appUserId = req.authorisedAppUserId;

        // Compare the app user id - if they match, attach the tripDetails to the req and call next()
        if (appUserId === appUserIdResult.rows[0].app_user_id) {
            req.validatedTripDetails = tripIdResult.rows[0];
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


// EDIT TRIP DETAILS
tripsRouter.put('/:tripId/edittripdetails', async (req, res) => {

    // Get the tripId from the trip details object attached to the request body by the trip id param validation
    const tripId = req.validatedTripDetails.id;

    // Get the other data from the request body sent by the client
    const { editedTripName } = req.body;

    // Validate the data
    const { error } = editTripDetailsValidation({ editedTripName });
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
    const tripId = req.validatedTripDetails.id;

    try {
        await deleteTrip(tripId);
        console.log('delete trip transaction completed');
        return res.sendStatus(204);
    }

    catch (error) {
        console.error(error.stack);
        return res.status(500).json({ 'message': 'Trip could not be deleted' });
    }
});

// MOUNT THE LISTS ROUTER AT THE LISTS ENDPOINT
tripsRouter.use('/:tripId/lists', listsRouter);