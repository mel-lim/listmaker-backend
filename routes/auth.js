const express = require('express');
const authRouter = express.Router();
module.exports = authRouter;

// Centralise our data access for reuseability per the node-postgres library guide
const db = require('../db');

// Import helper functions and custom middleware
const { signUpValidation, loginValidation } = require('../validation');
const verifyToken = require('../verifyToken');

// Import node modules
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Import js libraries 
const dayjs = require('dayjs'); // For manipulating date/time
const localizedFormat = require('dayjs/plugin/localizedFormat'); // Import and use dayjs plugin
dayjs.extend(localizedFormat);

// CREATE NEW USER
authRouter.post('/signup', async (req, res, next) => {

    // Validate the data before we create a new user
    const { error } = signUpValidation(req.body);
    if (error) {
        return res.status(400).send({ 'message': error.details[0].message });
    }

    // Destructure new user details from the req body
    const { username, email, password } = req.body;

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
                    return res.status(400).send({ 'message': 'User with that username already exists' });
                } else if (error.constraint === 'app_user_email_key') {
                    return res.status(400).send({ 'message': 'User with that email already exists' });
                }
            }
            next(error);
        }
        res.status(201).json({ appUser: results.rows });
    });
});

// LOGIN USER
authRouter.post('/login', (req, res, next) => {

    // Validate the data before we send a req to the db
    const { error } = loginValidation(req.body);
    if (error) {
        return res.status(400).send({ 'message': error.details[0].message });
    }

    // Destructure user details from req body
    const { username, email, password } = req.body;

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
            console.error(error);
            next(error);
        }

        // Send an error message if the user cannot be found
        if (!results.rows[0]) {
            //return res.status(400).send({'message': 'The user could not be found'});
            return res.status(400).send({ 'message': 'The credentials you provided are incorrect' });
        } else if (!results.rows[0].hashed_password) {
            return res.status(400).send({ 'message': 'Something else went wrong - please submit your issue using our contact form' });
        }

        // Compare user-inputted plain-text password with the hashed password stored in the db using bcrypt's async compare method
        const isValidPassword = await bcrypt.compare(password, results.rows[0].hashed_password);
        if (!isValidPassword) {
            res.status(400).send({ 'message': 'The credentials you provided are incorrect' });
        }

        // Create and assign a token to the user
        const token = jwt.sign({ id: results.rows[0].id }, process.env.TOKEN_SECRET, { expiresIn: '12h' });

        // Send the jwt in a http-only cookie
        res.cookie('token', token, {
            maxAge: 60 * 60 * 1000 * 12, // 12 hours
            httpOnly: true,
            //secure: true, 
            sameSite: true,
            overwrite: true
        });

        // Send a non-http cookie so the client can check whether the user is logged in or not
        res.cookie('username', results.rows[0].username, {
            maxAge: 60 * 60 * 1000 * 12, // 12 hours
            sameSite: true, 
            overwrite: true
        });

        // Return the 200 status code and send the username in the res body
        const cookieExpiry = dayjs().add(12, 'hour').toISOString(); // Tells the front-end when cookies / JWT will expire so it can prompt the user to refresh login credentials and get a new JWT and cookies
        //.add(2, 'minute'); // WE WERE USING 2 MINUTES HERE FOR TESTING PURPOSES
        return res.status(200).send({ 'username': results.rows[0].username, 'cookieExpiry': cookieExpiry });
    });
});

// LOGOUT USER
authRouter.get('/logout', (req, res, next) => {

    // Delete the cookies from the user's browser upon logout
    try {
        res.clearCookie('username', {
            maxAge: 60 * 60 * 1000 * 12, // 12 hours
            sameSite: true
        });

        res.clearCookie('token', {
            maxAge: 60 * 60 * 1000 * 12, // 12 hours
            httpOnly: true,
            //secure: true, 
            sameSite: true
        });

        return res.status(200).send({
            'message': 'Log out successful',
            'isLoggedOut': true
        });

    } catch (err) {
        res.status(400).send({
            "message": "Unable to log out, try again",
            'isLoggedOut': false
        });
    }

});

// GET USER DETAILS
authRouter.get('/accountdetails', verifyToken, (req, res, next) => {

    // Query the db for the app user details
    db.query('SELECT username, email FROM app_user WHERE id = $1',
        [req.appUserId],
        (error, results) => {
            if (error) {
                next(error);
            } else if (results.rows.length) {
                res.status(200).json({
                    'username': results.rows[0].username,
                    'email': results.rows[0].email
                });
            } else {
                res.status(404).send({ 'message': 'Your details could not be found' });
            }
        });
});
