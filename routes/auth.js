const express = require('express');
const authRouter = express.Router();
module.exports = authRouter;

// Centralise our data access for reuseability per the node-postgres library guide
const db = require('../db');

// Import validation functions
const { signUpValidation, loginValidation } = require('../validation');

// Import node modules
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// CREATE NEW USER
authRouter.post('/signup', async (request, response, next) => {

    // Validate the data before we create a new user
    const { error } = signUpValidation(request.body);
    if (error) {
        return response.status(400).send({ 'message': error.details[0].message });
    }

    // Destructure new user details from the request body
    const { username, email, password } = request.body;

    // Hash plain-text password using bcrypt's async hash technique
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Get today's date
    const dateCreated = new Date();
    const dateModified = dateCreated;

    // Create new user
    db.query('INSERT INTO app_user (username, email, hashed_password, date_created, date_modified) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, date_created, date_modified', [username, email, hashedPassword, dateCreated, dateModified], (error, results) => {

        if (error) {

            // Send error details if user already in the database
            if (error.code === '23505') {
                if (error.constraint === 'app_user_username_key') {
                    return response.status(400).send({ 'message': 'User with that username already exists' });
                } else if (error.constraint === 'app_user_email_key') {
                    return response.status(400).send({ 'message': 'User with that email already exists' });
                }
            }
            next(error);
        }
        response.status(201).json({ appUser: results.rows });
    });
});

// LOGIN USER
authRouter.post('/login', (request, response, next) => {

    // Validate the data before we send a request to the db
    const { error } = loginValidation(request.body);
    if (error) {
        return response.status(400).send({ 'message': error.details[0].message });
    }

    // Destructure user details from request body
    const { username, email, password } = request.body;

    // Detect whether the user identity provided is a username or email and set the text and variable for the SQL query accordingly
    let queryText;
    let values;

    if (username) {
        queryText = 'SELECT * FROM app_user WHERE username = $1';
        values = [username];
    } else if (email) {
        queryText = 'SELECT * FROM app_user WHERE email = $1';
        values = [email];
    }

    // Query the db with the user details
    db.query(queryText, values, async (error, results) => {
        if (error) {
            next(error);
        }

        // Send an error message if the user cannot be found
        if (!results.rows[0]) {
            //return response.status(400).send({'message': 'The user could not be found'});
            return response.status(400).send({ 'message': 'The credentials you provided are incorrect' });
        } else if (!results.rows[0].hashed_password) {
            return response.status(400).send({ 'message': 'Something else went wrong - please submit your issue using our contact form' });
        }

        // Compare user-inputted plain-text password with the hashed password stored in the db using bcrypt's async compare method
        const isValidPassword = await bcrypt.compare(password, results.rows[0].hashed_password);
        if (!isValidPassword) {
            response.status(400).send({ 'message': 'The credentials you provided are incorrect' });
        }

        // Create and assign a token to the user
        const token = jwt.sign({ id: results.rows[0].id }, process.env.TOKEN_SECRET, { expiresIn: '12h' });

        // Send the jwt in a http-only cookie
        response.cookie('token', token, {
            maxAge: 60 * 60 * 1000 * 12, // 12 hours
            httpOnly: true,
            //secure: true, 
            sameSite: true
        });

        // Send a non-http cookie so the client can check whether the user is logged in or not
        response.cookie('username', results.rows[0].username, {
            maxAge: 60 * 60 * 1000 * 12, // 12 hours
            sameSite: true
        });

        // Return the 200 status code and send the username in the response body
        return response.status(200).send({ 'username': results.rows[0].username });
    });
});

// LOGOUT USER
authRouter.get('/logout', (request, response, next) => {

    try {
        response.clearCookie('username', {
            maxAge: 60 * 60 * 1000 * 12, // 12 hours
            sameSite: true
        });
    
        response.clearCookie('token', {
            maxAge: 60 * 60 * 1000 * 12, // 12 hours
            httpOnly: true,
            //secure: true, 
            sameSite: true
        });
    
        return response.status(200).send({ 
            'message': 'Log out successful', 
            'isLoggedOut': true
        });

    } catch (err) {
        response.status(400).send({ 
            "message": "Unable to log out, try again",
            'isLoggedOut': false
        });
    }
    
});
