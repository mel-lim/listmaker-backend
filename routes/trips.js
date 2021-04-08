const express = require('express');
const tripsRouter = require('../api/trips');
const authRouter = express.Router();
module.exports = tripsRouter;

// Centralise our data access for reuseability per the node-postgres library guide
const db = require('../db');

// Import helper functions and custom middleware
const { newTripValidation } = require('../validation');
const verifyToken = require('../verifyToken');

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
