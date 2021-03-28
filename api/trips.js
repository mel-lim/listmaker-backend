const express = require('express');
const tripsRouter = express.Router();
module.exports = tripsRouter;

// Centralise our data access for reuseability per the node-postgres library guide
const db = require('../db');

// Middleware to check that all the required fields are provided in the request
const checkRequiredFields = (request, response, next) => {
    const receivedTrip = request.body;

    if (!receivedTrip.name || !receivedTrip.category || !receivedTrip.name.length || !receivedTrip.category.length) {
        response.status(400).send("Invalid trip");
    } else {
        request.receivedTrip = receivedTrip;
        next();
    }
}

// Get all the trips
tripsRouter.get('/', (request, response, next) => {
    db.query('SELECT * FROM trip ORDER BY id ASC', (error, results) => {
        if (error) {
            next(error);
        }
        response.status(200).json(results.rows);
    });
});

// Create new trip
tripsRouter.post('/', checkRequiredFields, (request, response, next) => {
    const { name, category, description } = request.receivedTrip;

    db.query('INSERT INTO trip (name, category, description) VALUES ($1, $2, $3) RETURNING *', [name, category, description], (error, result) => {
        if (error) {
            next(error);
        }
        response.status(201).json({ trip: result.rows });
    });
});

// Validate trip id
tripsRouter.param('tripId', (request, response, next, id) => {
    db.query('SELECT * FROM trip WHERE id = $1',
        [id],
        (error, result) => {
            if (error) {
                next(error);
            } else if (result.rows.length) {
                request.trip = result.rows;
                next();
            } else {
                response.status(404).send('Trip not found');
            }
        }
    );
});

// Get trip by id
tripsRouter.get('/:tripId', (request, response) => {
    response.status(200).json({ trip: request.trip });
});

// Update trip by id
tripsRouter.put('/:tripId', checkRequiredFields, (request, response) => {
    const tripId = request.params.tripId;
    const { name, category, description } = request.receivedTrip;

    db.query(
        'UPDATE trip SET name = $1, category = $2, description = $3 WHERE id = $4 RETURNING *',
        [name, category, description, tripId],
        (error, result) => {
            if (error) {
                throw error;
            }
            response.status(200).json({trip: result.rows});
        }
    );
});

// Delete trip
tripsRouter.delete('/:tripId', (request, response) => {
    const tripId = request.params.tripId;
    db.query('DELETE FROM trip WHERE id = $1', [id], (error, result) => {
        if (error) {
            throw error;
        }
        response.status(200).send(`Trip with id ${tripId} has been deleted`);
    });
});

// Import appUsersTripsRouter and mount it
const appUsersTripsRouter = require('./appUsersTrips');
tripsRouter.use('/:tripId/appuserstrips', appUsersTripsRouter);