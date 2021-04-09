const express = require('express');
const tripsRouter = express.Router();
module.exports = tripsRouter;

// IMPORT DB ACCESS DETAILS
const db = require('../db');

// IMPORT HELPER FUNCTIONS AND CUSTOM MIDDLEWARE
const { newTripValidation, generateNewListsValidation } = require('../validation');
const verifyToken = require('../verifyToken');

// AUTHENTICATION MIDDLEWARE
// All routes in this router requires the user to be authenticated
tripsRouter.use(verifyToken);

// CREATE A NEW TRIP
tripsRouter.post('/newtrip', verifyToken, (req, res, next) => {

    // Validate the data before we create a new trip
    const { error } = newTripValidation(req.body);
    if (error) {
        return res.status(400).send({ 'message': error.details[0].message });
    }

    // Destructure new trip details from the req body
    let { tripName, tripCategory, tripDuration } = req.body;
    if (!tripName) {
        tripName = 'Unnamed Trip';
    }

    // Get the app user id from req.appUserId (set by the verifyToken middleware)
    const appUserId = req.appUserId;

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

                // Log the relationship in the app_users_trips junction table
                const insertAppUserTripText = 'INSERT INTO app_users_trips(app_user_id, trip_id) VALUES ($1, $2)';

                const insertAppUserTripValues = [appUserId, tripId];

                client.query(insertAppUserTripText, insertAppUserTripValues, (err, results) => {

                    if (shouldAbort(err)) return;

                    // Commit the changes and close return the client to the pool
                    client.query('COMMIT', err => {
                        if (err) {
                            console.error('Error committing transaction', err.stack);
                            res.status(400).send({ 'message': 'Trip could not be created' });
                        }
                        res.status(201).send({ 'tripId': tripId });
                        done();
                    });
                });
            });
        });
    });
});

// Validate provided tripId to make sure it exists in the db
tripsRouter.param('tripId', (req, res, next, tripId) => {

    db.query('SELECT * FROM trip WHERE id = $1',
        [tripId],
        (err, results) => {

            if (err) {
                next(err);
            } else if (results.rows.length) {
                req.tripDetails = results.rows[0];
                next();
            } else {
                res.status(404).send('Trip not found');
            }
        }
    );
});

// GENERATE NEW LISTS FOR TRIP
tripsRouter.get('/generatenewlists/:tripId', (req, res, next) => {
    console.log("main function commenced");

    // Get the data from the trip details object attached to the request body by the trip id param method validation
    const tripId = req.tripDetails.id;
    const tripCategory = req.tripDetails.category;
    const tripDuration = req.tripDetails.duration;
    const requestTemplate = req.query.requestTemplate;

    // Validate the data before we generate new lists
    const { error } = generateNewListsValidation({ tripId, tripCategory, tripDuration, requestTemplate });
    if (error) {
        return res.status(400).send({ 'message': error.details[0].message });
    }
    console.log("data is validated");

    // Get the app user id from req.appUserId (set by the verifyToken middleware)
    const appUserId = req.appUserId;

    // Checkout/reserve a client for our transaction
    db.getClient((err, client, done) => {
        console.log("client has been checked out");

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

            // Get the template list titles
            const getListTitleText = "SELECT id, title FROM template_list WHERE trip_category = $1 AND (trip_duration = 'any' OR trip_duration = $2)"
            const getListTitleValues = [tripCategory, tripDuration];

            client.query(getListTitleText, getListTitleValues, (err, results) => {
                console.log("we've commenced the query to the db for list titles");
                if (shouldAbort(err)) return;

                // Save the resulting array of lists
                const lists = results.rows; // each item in the 'lists' array is an object e.g. { "id": 1, "title": "Gear" }
                console.log(lists);

                // Iterate through the array of lists to get the template list items for each list
                const allListItems = [];

                lists.forEach(list => {

                    const getListItemsText = "SELECT * FROM template_list_item WHERE list_id = $1";
                    const getListItemsValue = [list.id];

                    client.query(getListItemsText, getListItemsValue, (err, results) => {
                        console.log("we've commenced the query to the db for list items");
                        if (shouldAbort(err)) return;

                        const listItems = results.rows;
                        allListItems.push(listItems);
                        console.log(listItems);
                    });
                });

                // Commit the changes and close return the client to the pool
                client.query('COMMIT', err => {
                    if (err) {
                        console.error('Error committing transaction', err.stack);
                        res.status(400).send({ 'message': 'Lists could not be generated' });
                    }
                    res.status(200).send({ 'lists': lists, 'allListItems': allListItems });
                    done();
                });
            });
        });
    });
});