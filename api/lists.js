const express = require('express');
const listsRouter = express.Router();
module.exports = listsRouter;

// Centralise our data access for reuseability per the node-postgres library guide
const db = require('../db');

// Get all the trips
listsRouter.get('/', (request, response, next) => {
    db.query('SELECT * FROM list ORDER BY id ASC', (error, results) => {
        if (error) {
            next(error);
        }
        response.status(200).json(results.rows);
    });
});

// Middleware to check that all the required fields are provided in the request
const checkRequiredFields = (request, response, next) => {
    const receivedList = request.body;

    if (!receivedList.title || !receivedList.appUserId || !receivedList.tripId || !receivedList.title.length || !receivedList.appUserId.length || !receivedList.tripId.length) {
        response.status(400).send("Invalid list");
    } else {
        request.receivedList = receivedList;
        next();
    }
}

// Validate app user id
const validateAppUserId = (request, response, next) => {
    const { appUserId } = request.receivedList;
    db.query('SELECT * FROM app_user WHERE id = $1', [appUserId], (error, result) => {
        if (error) {
            next(error);
        } else if (result.rows.length) {
            next();
        } else {
            response.status(400).send('Invalid app user');
        }
    });
}

// Validate trip id
const validateTripId = (request, response, next) => {
    const { tripId } = request.receivedList;
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

// Create new list
listsRouter.post('/', checkRequiredFields, validateAppUserId, validateTripId, (request, response, next) => {
    const { title, appUserId, tripId } = request.receivedList;

    db.query('INSERT INTO list (title, app_user_id, trip_id) VALUES ($1, $2, $3) RETURNING *', [title, appUserId, tripId], (error, result) => {
        if (error) {
            next(error);
        }
        response.status(201).json({ list: result.rows });
    });
});

// Validate list id
listsRouter.param('listId', (request, response, next, id) => {
    db.query('SELECT * FROM list WHERE id = $1',
        [id],
        (error, result) => {
            if (error) {
                next(error);
            } else if (result.rows.length) {
                request.list = result.rows;
                next();
            } else {
                response.status(404).send('List not found');
            }
        }
    );
});

// Get list by id
listsRouter.get('/:listId', (request, response) => {
    response.status(200).json({ list: request.list });
});

// Update list by id
listsRouter.put('/:listId', checkRequiredFields, validateAppUserId, validateTripId, (request, response) => {
    const id = request.params.id;
    const { title, appUserId, tripId } = request.receivedList;

    db.query(
        'UPDATE list SET title = $1, app_user_id = $2, trip_id = $3 WHERE id = $4 RETURNING *',
        [title, appUserId, tripId, id],
        (error, result) => {
            if (error) {
                throw error;
            }
            response.status(200).json({ list: result.rows });
        }
    );
});

// Delete list
listsRouter.delete('/:listId', (request, response) => {
    const id = request.params.id;
    db.query('DELETE FROM list WHERE id = $1', [id], (error, result) => {
        if (error) {
            throw error;
        }
        response.status(200).send(`List with id ${id} has been deleted`);
    });
});

// Import listItemsRouter and mount it
const listItemsRouter = require('./listItems');
listsRouter.use('/:listId/listitems', listItemsRouter);

