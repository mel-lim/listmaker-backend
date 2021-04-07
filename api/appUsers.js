const express = require('express');
const appUsersRouter = express.Router();
module.exports = appUsersRouter;

// Centralise our data access for reuseability per the node-postgres library guide
const db = require('../db');
const { signUpValidation, loginValidation } = require('../validation');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


// Middleware to check that all the required fields are provided in the request
const checkRequiredFields = (request, response, next) => {
    const receivedAppUser = request.body;
    if (!receivedAppUser.username || !receivedAppUser.email || !receivedAppUser.password || !receivedAppUser.username.length || !receivedAppUser.email.length || !receivedAppUser.password.length) {
        response.status(400).send({ 'message': 'Some values are missing' });
    } else {
        request.receivedAppUser = receivedAppUser;
        next();
    }
}

// Helper function to generate today's date in the correct format for PostgresSQL
const getTodaysDate = () => {
    let today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    const yyyy = today.getFullYear();
    today = `${yyyy}-${mm}-${dd}`;
    return today;
}

// Get all the app users
appUsersRouter.get('/', (request, response, next) => {
    db.query('SELECT * FROM app_user ORDER BY id ASC', (error, results) => {
        if (error) {
            next(error);
        }
        response.status(200).json(results.rows);
    });
});

/* // Get the app users by username and email
appUsersRouter.get('/', checkRequiredFields, (request, response, next) => {
    const { username, email } = request.receivedAppUser;
    db.query('SELECT * FROM app_user WHERE username = $1 AND email = $2', [username, email], (error, results) => {
        if (error) {
            next(error);
        }
        response.status(200).json(results.rows);
    });
}); */

// Validate app user id
appUsersRouter.param('appUserId', (request, response, next, id) => {
    db.query('SELECT * FROM app_user WHERE id = $1',
        [id],
        (error, result) => {
            if (error) {
                next(error);
            } else if (result.rows.length) {
                request.appUser = result.rows;
                next();
            } else {
                response.status(404).send('App user not found');
            }
        }
    );
});

// Get app user by id
appUsersRouter.get('/:appUserId', (request, response) => {
    response.status(200).json({ appUser: request.appUser });
});

// Update app user by id
appUsersRouter.put('/:appUserId', checkRequiredFields, (request, response) => {
    const id = request.params.appUserId;
    const { username, email } = request.receivedAppUser;

    db.query(
        'UPDATE app_user SET username = $1, email = $2 WHERE id = $3 RETURNING *',
        [username, email, id],
        (error, result) => {
            if (error) {
                throw error;
            }
            response.status(200).json({ appUser: result.rows });
        }
    );
});

// Delete app user
appUsersRouter.delete('/:appUserId', (request, response) => {
    const id = request.params.appUserId;
    db.query('DELETE FROM app_user WHERE id = $1', [id], (error, result) => {
        if (error) {
            throw error;
        }
        response.status(200).send(`App user with id ${id} has been deleted`);
    });
});

// Validate app user id
appUsersRouter.param('appUserId', (request, response, next, id) => {
    db.query('SELECT * FROM app_user WHERE id = $1',
        [id],
        (error, result) => {
            if (error) {
                next(error);
            } else if (result.rows.length) {
                request.appUser = result.rows;
                next();
            } else {
                response.status(404).send('App user not found');
            }
        }
    );
});

// Get app user by id
appUsersRouter.get('/:appUserId', (request, response) => {
    response.status(200).json({ appUser: request.appUser });
});


// Import appUsersTripsRouter and mount it
const appUsersTripsRouter = require('./appUsersTrips');
appUsersRouter.use('/:appUserId/appuserstrips', appUsersTripsRouter);