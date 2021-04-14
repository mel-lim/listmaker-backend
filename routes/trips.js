const express = require('express');
const tripsRouter = express.Router();

// TRIPSROUTER IS MOUNTED ON APIROUTER AT '/trips'
module.exports = tripsRouter;

// IMPORT DB ACCESS DETAILS
const db = require('../db');

// IMPORT HELPER FUNCTIONS AND CUSTOM MIDDLEWARE
const { newTripValidation, generateNewListsValidation, getTripsValidation } = require('../validation');
const verifyToken = require('../verifyToken');

// MOUNT THE AUTHENTICATION MIDDLEWARE - all routes in this router requires the user to be authenticated
tripsRouter.use(verifyToken);

// IMPORT LISTS ROUTER
const listsRouter = require('../routes/lists');

// FETCH ALL TRIPS FOR THE LOGGED IN USER
tripsRouter.get('/alltrips', (req, res, next) => {
    // Get the app user id from req.appUserId (set by the verifyToken middleware)
    const appUserId = req.appUserId;

    // Validate the data before we create a new trip
    const { error } = getTripsValidation({ appUserId });
    if (error) {
        return res.status(400).send({ 'message': error.details[0].message });
    }

    db.query("WITH trip_master AS (SELECT * FROM trip INNER JOIN app_users_trips ON trip.id = app_users_trips.trip_id ) SELECT id, name, category, duration FROM trip_master WHERE app_user_id = $1", [appUserId], (err, results) => {
        if (err) {
            next(err);
        }
        if (!results.rows) {
            return res.status(404).json({ "message": "No trips found" });
        }

        return res.status(200).json({ "trips": results.rows });
    });

})

// CREATE A NEW TRIP AND GENERATE NEW LISTS
tripsRouter.post('/newtrip', (req, res, next) => {

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

            if (shouldAbort(err)) return;

            // Insert new trip into the trip table and return the trip id
            const insertTripText = 'INSERT INTO trip (name, category, duration) VALUES($1, $2, $3) RETURNING id';
            const insertTripValues = [tripName, tripCategory, tripDuration];

            client.query(insertTripText, insertTripValues, (err, results) => {

                if (shouldAbort(err)) return;

                // Extract the trip id returned from this query
                const tripId = results.rows[0].id;

                // Record the relationship in the app_users_trips junction table
                const insertAppUserTripText = 'INSERT INTO app_users_trips(app_user_id, trip_id) VALUES ($1, $2)';

                const insertAppUserTripValues = [appUserId, tripId];

                client.query(insertAppUserTripText, insertAppUserTripValues, (err, results) => {

                    if (shouldAbort(err)) return;

                    // Get the template list titles
                    const getListTitleText = "SELECT id, title FROM template_list WHERE trip_category = $1 AND (trip_duration = 'any' OR trip_duration = $2)"
                    const getListTitleValues = [tripCategory, tripDuration];

                    client.query(getListTitleText, getListTitleValues, (err, results) => {
                        if (shouldAbort(err)) return;

                        // Save the resulting array of lists
                        const lists = results.rows; // each item in the 'lists' array is an object e.g. { "id": 1, "title": "Gear" }

                        const allListItems = [];

                        // Iterate through the array of lists to get the template list items for each list
                        lists.forEach((list, index, lists) => {

                            const getListItemsText = "SELECT * FROM template_list_item WHERE list_id = $1";
                            const getListItemsValue = [list.id];

                            client.query(getListItemsText, getListItemsValue, (err, results) => {
                                if (shouldAbort(err)) return;

                                const listItems = results.rows;
                                allListItems.push(listItems);
                            });

                            // On the last iteration, commit the changes and return the client to the pool
                            if (index === lists.length - 1) {
                                client.query('COMMIT', err => {
                                    if (err) {
                                        console.error('Error committing transaction', err.stack);
                                        res.status(400).send({ 'message': 'Lists could not be generated' });
                                    }
                                    res.status(201).json({ 'tripId': tripId, 'lists': lists, 'allListItems': allListItems });
                                    done();
                                });
                            }
                        });
                    });
                });
            });
        });
    });
});

// VALIDATE TRIPID PARAM AND AUTHORISE USER
tripsRouter.param('tripId', (req, res, next, tripId) => {

    // Make sure trip exists
    db.query('SELECT * FROM trip WHERE id = $1',
        [tripId],
        (err, results) => {

            if (err) {
                next(err);

            } else if (results.rows.length) {

                const tripDetails = results.rows[0];
                console.log("tripId validated to exist in db");

                // Make sure the user making the request is the user who is associated with the trip
                db.query('SELECT app_user_id FROM app_users_trips WHERE trip_id = $1',
                    [tripId],
                    (err, results) => {

                        if (err) {
                            next(err);
                        }

                        // Get the app user id from req.appUserId (set by the verifyToken middleware)
                        const appUserId = req.appUserId;

                        // Compare the app user id - if they match, attach the tripDetails to the req and call next()
                        if (appUserId === results.rows[0].app_user_id) {
                            req.tripDetails = tripDetails;
                            console.log("user authorised to access this trip");
                            next();
                        } else {
                            res.status(403).send({ 'message': 'User not authorized' });
                        }
                    });
            } else {
                res.status(404).send({ 'message': 'Trip not found' });
            }
        }
    );
});

// MOUNT THE LISTS ROUTER AT THE LISTS ENDPOINT
tripsRouter.use('/:tripId/lists', listsRouter);