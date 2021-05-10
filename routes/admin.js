const express = require('express');

// Import our data access code
const db = require('../db');

// Create a new express-promise-router (which has same API as the normal express router)
const adminRouter = express.Router();

// Export the router to be mounted by the parent application
module.exports = adminRouter;

// Import helper functions and custom middleware
const {  } = require('../validation');
const verifyToken = require('../verifyToken');
const verifyAdmin = require('../verifyAdmin');

// MOUNT THE AUTHENTICATION MIDDLEWARE - all routes in this router requires the user to be authenticated
adminRouter.use(verifyToken);

// MOUNT THE AUTHORIZATION MIDDLEWARE - all routes in this router requires the user to be authorized as ADMIN
adminRouter.use(verifyAdmin);

// TEST ADMIN VERIFICATION OF LOGGED IN USER
adminRouter.get('/test', async (req, res, next) => {
    return res.status(200).send({ 'message': 'this is working' });
});