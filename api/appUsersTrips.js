const { request } = require('express');
const express = require('express');
const appUsersTripsRouter = express.Router({ mergeParams: true });
module.exports = appUsersTripsRouter;

// Centralise our data access for reuseability per the node-postgres library guide
const db = require('../db');
const { response } = require('../server');

// Get all the trip id relationships for a specific app user id
appUsersTripsRouter.get('/', (request, response, next) => {
    if (request.params.appUserId) {
        db.query('SELECT * FROM app_users_trips WHERE app_user_id = $1', [request.params.appUserId], (error, results) => {
            if (error) {
                next(error);
            }
            response.status(200).json(results.rows);
        });
    } else if (request.params.tripId) {
        db.query('SELECT * FROM app_users_trips WHERE trip_id = $1', [request.params.tripId], (error, results) => {
            if (error) {
                next(error);
            }
            response.status(200).json(results.rows);
        });
    }
});

// Middleware to check that all the required fields are provided in the request
const checkRequiredFields = (request, response, next) => {
    const receivedRelationship = request.body;

    if (!receivedRelationship.appUserId || !receivedRelationship.tripId || !receivedRelationship.appUserId.length || !receivedRelationship.tripId.length) {
        response.status(400).send("Invalid request");
    } else {
        request.receivedRelationship = receivedRelationship;
        next();
    }
}

// Validate the appUserId provided in the query
const validateAppUserId = (request, response, next) => {
    const { appUserId } = request.receivedRelationship;
    db.query('SELECT * FROM app_user WHERE id = $1', [appUserId], (error, result) => {
        if (error) {
            next(error);
        } else if (result.rows.length) {
            next();
        } else {
            response.status(400).send('Invalid app user in query');
        }
    });
}

// Validate the tripId provided in the query
const validateTripId = (request, response, next) => {
    const { tripId } = request.receivedRelationship;
    db.query('SELECT * FROM trip WHERE id = $1', [tripId], (error, result) => {
        if (error) {
            next(error);
        } else if (result.rows.length) {
            next();
        } else {
            response.status(400).send('Invalid trip');
        }
    });
}

// Create new relationship
appUsersTripsRouter.post('/', checkRequiredFields, validateAppUserId, validateTripId, (request, response, next) => {
    const { appUserId, tripId } = request.receivedRelationship;

    db.query('INSERT INTO app_users_trips (app_user_id, trip_id) VALUES ($1, $2) RETURNING *', [appUserId, tripId], (error, result) => {
        if (error) {
            next(error);
        }
        response.status(201).json({ relationship: result.rows });
    });
});

// Parse the primary key from the params
appUsersTripsRouter.param('otherId', (request, response, next, id) => {
    if (request.params.appUserId) {
        request.appUserId = request.params.appUserId;
        request.tripId = id;
        next();
    } else if (request.params.tripId) {
        request.tripId = request.params.tripId;
        request.appUserId = id;
        next();
    } else {
        response.status(400).send('Invalid request');
    }
});

// Attempt to get the row to the relationship exists
const attemptGet = (request, response, next) => {
    console.log(request.appUserId);
    console.log(request.tripId);
    db.query('SELECT * FROM app_users_trips WHERE app_user_id = $1 AND trip_id = $2',
        [request.appUserId, request.tripId],
        (error, result) => {
            if (error) {
                next(error);
            } else if (result.rows.length) { // This if block will be activated if the relationship id returns a row
                request.relationship = result.rows;
                next();
            } else { // This block will be activated if the relationship id does not return any rows
                response.status(404).send('Relationship not found');
            }
        }
    );
}

// Get relationship
appUsersTripsRouter.get('/:otherId', attemptGet, (request, response) => {
    response.status(200).json({ relationship: request.relationship });
});

// Delete list item
appUsersTripsRouter.delete('/:otherId', attemptGet, (request, response) => {
    db.query('DELETE FROM app_users_trips WHERE app_user_id = $1 AND trip_id = $2', [request.app_user_id, request.trip_id], (error, result) => {
        if (error) {
            throw error;
        }
        response.status(200).send(`Relationship deleted`);
    });
});