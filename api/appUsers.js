const express = require('express');
const appUsersRouter = express.Router();
module.exports = appUsersRouter;

// Centralise our data access for reuseability per the node-postgres library guide
const db = require('../db');

// Import modules
const bcrypt = require('bcrypt');
const Joi = require('joi');

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

// Sign up validation schema
const signUpSchema = Joi.object({
    username: Joi.string()
        .alphanum()
        .min(2)
        .required(),
    email: Joi.string()
        .email()
        .min(6)
        .required(),
    password: Joi.string()
        .min(8)
        .required()
});

// Create new app user
appUsersRouter.post('/signup', (request, response, next) => {

    // Validate the data before we create a new user
    const { error } = signUpSchema.validate(request.body);
    if (error) {
        return response.status(400).send({ 'message': error.details[0].message });
    }

    // Destructure new user details from the request body
    const { username, email, password } = request.body;

    const saltRounds = 10;
    const dateCreated = getTodaysDate();
    const dateModified = getTodaysDate();

    // Hash plain-text password using bcrypt's async hash technique
    bcrypt.hash(password, saltRounds, function (err, hashedPassword) {
        if (err) {
            next(err);
        }

        db.query('INSERT INTO app_user (username, email, hashed_password, date_created, date_modified) VALUES ($1, $2, $3, $4, $5) RETURNING username, email', [username, email, hashedPassword, dateCreated, dateModified], (error, results) => {
            if (error) {
                if (error.code === '23505') {
                    if (error.constraint === 'app_user_username_key') {
                        return response.status(400).send({ 'message': 'User with that username already exists' });
                    } else if (error.constraint === 'app_user_email_key') {
                        return response.status(400).send({ 'message': 'User with that email already exists' });
                    }
                }
                next(error);
            }
            console.log(results.rows);
            response.status(201).json({ appUser: results.rows });
        });
    });
});

// Login validation schema
const loginSchema = Joi.object({
    username: Joi.string()
        .empty(''),
    email: Joi.string()
        .empty('')
        .email(),
    password: Joi.string()
        .min(8)
        .required()
})
    .xor('username', 'email');

// Login app user
appUsersRouter.post('/login', (request, response, next) => {

    // Validate the data before we create a new user
    const { error } = loginSchema.validate(request.body);
    if (error) {
        return response.status(400).send({ 'message': error.details[0].message });
    }

    // Destructure user details from request body
    const { username, email, password } = request.body;

    let queryText;
    let values;

    // Detect whether the user identity provided is a username or email and set the text and variable for the SQL query accordingly
    if (username.length > 0) {
        queryText = 'SELECT * FROM app_user WHERE username = $1';
        values = [username];
    } else if (email.length > 0) {
        queryText = 'SELECT * FROM app_user WHERE email = $1';
        values = [email];
    }

    db.query(queryText, values, (error, results) => {
        if (error) {
            next(error);
        }

        if (!results.rows[0]) {
            //return response.status(400).send({'message': 'The user could not be found'});
            return response.status(400).send({ 'message': 'The credentials you provided are incorrect' });
        }

        // Compare user-inputted plain-text password with the hashed password stored in the db using bcrypt's async compare method
        bcrypt.compare(password, results.rows[0].hashed_password, function (err, result) {
            if (err) {
                next(err);
            }
            //return response.status(400).send({'message': 'The password is incorrect'});
            if (result === false) {
                response.status(400).send({ 'message': 'The credentials you provided are incorrect' });
            } else {
                /* const token = helper.generateToken(rows[0].id);
                return response.status(200).send({ token }); */
                results.rows[0].hashed_password = 'removed';
                response.status(200).json({ appUser: results.rows });
            }
        });
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