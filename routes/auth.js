const express = require('express');

// Import our data access code
const db = require('../db');

// Create a new express-promise-router (which has same API as the normal express router)
const authRouter = express.Router();

// Export the router to be mounted by the parent application
module.exports = authRouter;

// Import helper functions and custom middleware
const { signUpValidation, loginValidation } = require('../validation');
const verifyToken = require('../verifyToken');
const { jwtCookieOptionsDev, jwtCookieOptionsProduction, usernameCookieOptionsDev, usernameCookieOptionsProduction } = require('../cookieConfig');

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
    try {

        const { rows } = await db.query(
            'INSERT INTO app_user (username, email, hashed_password, date_created, date_modified) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, date_created, date_modified',
            [username, email, hashedPassword, dateCreated, dateModified]);

        res.status(201).json({ appUser: rows[0] });
    }

    catch (error) {
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
});

// LOGIN USER
authRouter.post('/login', async (req, res, next) => {

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

    try {

        // Query the db with the user details
        const { rows } = await db.query(queryText, values);

        // Send a client error message if the user cannot be found
        if (!rows[0]) {
            return res.status(400).send({ 'message': 'The credentials you provided are incorrect' });
        } else if (!rows[0].hashed_password) {
            return res.status(400).send({ 'message': 'Something else went wrong - please submit your issue using our contact form' });
        }

        // Compare user-inputted plain-text password with the hashed password stored in the db using bcrypt's async compare method
        const isValidPassword = await bcrypt.compare(password, rows[0].hashed_password);
        if (!isValidPassword) { // if the passwords don't match, send a client error message
            return res.status(400).send({ 'message': 'The credentials you provided are incorrect' });
        }

        // Create and assign a token to the user
        const token = jwt.sign({ id: rows[0].id }, process.env.TOKEN_SECRET, { expiresIn: '12h' });

        // Send the jwt in a http-only cookie
        res.cookie('token', token, process.env.NODE_ENV === "production" ? jwtCookieOptionsProduction : jwtCookieOptionsDev);

        // Send a non-http cookie so the browser can check whether the user is logged in or not
        res.cookie('username', rows[0].username, process.env.NODE_ENV === "production" ? usernameCookieOptionsProduction : usernameCookieOptionsDev);

        const cookieExpiry = dayjs().add(12, 'hour').toISOString(); // Tells the front-end when cookies / JWT will expire so it can prompt the user to refresh login credentials and get a new JWT and cookies
        //.add(2, 'minute'); // WE WERE USING 2 MINUTES HERE FOR TESTING PURPOSES

        // Return the 200 status code and send the username in the res body
        return res.status(200).send({ 'username': rows[0].username, 'cookieExpiry': cookieExpiry });
    }

    catch (error) {
        console.log(error);
        next(error);
    }
});

// LOGOUT USER
authRouter.get('/logout', (req, res, next) => {

    // Delete the cookies from the user's browser upon logout
    try {
        res.clearCookie('username', process.env.NODE_ENV === "production" ? usernameCookieOptionsProduction : usernameCookieOptionsDev);

        res.clearCookie('token', process.env.NODE_ENV === "production" ? jwtCookieOptionsProduction : jwtCookieOptionsDev);

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
authRouter.get('/accountdetails', verifyToken, async (req, res, next) => {

    try {
        // Query the db for the app user details
        const { rows } = await db.query(
            'SELECT username, email FROM app_user WHERE id = $1',
            [req.authorisedAppUserId]);

        // If the user details cannot be found, send a client-error message
        if (!rows[0]) {
            return res.status(404).send({ 'message': 'Your details could not be found' });

        } else {
            return res.status(200).json({
                'username': rows[0].username,
                'email': rows[0].email
            });
        }
    }

    catch (error) {
        next(error);
    }
});

// Generate random username
const generateGuestUserDetails = (usernameLength) => {
    const randomUsernameArray = [];
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < usernameLength; i++) {
        randomUsernameArray.push(characters.charAt(Math.floor(Math.random() * charactersLength)));
    }
    const username = randomUsernameArray.join('');
    const email = `${username}@kitcollabguest.com`;
    const password = username;
    return { username, email, password };
}

// Function to create guest user
const tryAsGuest = async (req, res, next) => {

    // Destructure new user details from the random user details generator - let's get a 5-letter username
    const { username, email, password } = generateGuestUserDetails(5);

    // Hash plain-text password using bcrypt's async hash technique
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Get today's date
    const dateCreated = new Date();
    const dateModified = dateCreated;
    
    try {
        // Insert guest user into db
        const { rows } = await db.query(
            'INSERT INTO app_user (username, email, hashed_password, date_created, date_modified, is_guest) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [username, email, hashedPassword, dateCreated, dateModified, true]);

        const appUserId = rows[0].id;

        // Create and assign a token to the user
        const token = jwt.sign({ id: appUserId }, process.env.TOKEN_SECRET, { expiresIn: 120 }); // 60 seconds to test

        // Send the jwt in a http-only cookie
        res.cookie('token', token, process.env.NODE_ENV === "production" ? jwtCookieOptionsProduction : jwtCookieOptionsDev);

        // Send a non-http cookie so the browser can check whether the user is logged in or not
        res.cookie('username', username, process.env.NODE_ENV === "production" ? usernameCookieOptionsProduction : usernameCookieOptionsDev);

        const guestCookieExpiry = dayjs().add(12, 'hour').toISOString(); // Tells the front-end when cookies / JWT will expire so it can prompt the user to refresh login credentials and get a new JWT and cookies
        //.add(2, 'minute'); // WE WERE USING 2 MINUTES HERE FOR TESTING PURPOSES

        // Return the 200 status code and send the username in the res body
        return res.status(200).send({ 'username': username, 'guestCookieExpiry': guestCookieExpiry });
    }

    catch (error) {
        console.log(error);
        // Send error details if user already in the database
        if (error.code === '23505' && error.constraint === 'app_user_username_key') {
            useAsGuest(req, res, next);
        }
    }
    next(error);
}

// GENERATE GUEST USER
authRouter.post('/tryasguest', tryAsGuest);