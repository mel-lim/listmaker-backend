const express = require('express');

// Import our data access code
const db = require('../db');

// Create a new express-promise-router (which has same API as the normal express router)
const adminRouter = express.Router();

// Export the router to be mounted by the parent application
module.exports = adminRouter;

// Import helper functions and custom middleware
const { findAppUserValidation, deleteUserValidation } = require('../validation');
const verifyToken = require('../verifyToken');
const verifyAdmin = require('../verifyAdmin');
const { deleteTrip } = require('../helperFunctions');

// MOUNT THE AUTHENTICATION AND AUTHORIZATION MIDDLEWARE - all routes in this router requires the user to be authenticated and authorized as ADMIN
adminRouter.use(verifyToken, verifyAdmin);

// MIDDLEWARE FUNCTION TO CHECK THAT USERNAME/EMAIL IN QUESTION EXISTS IN DB
const checkUsernameOrEmailExists = async (req, res, next) => {
    // Get the username and email from the request body
    const { username, email } = req.body;

    // Validate the username and email (we only want one or the other, not both)
    const { error } = findAppUserValidation({ username, email });
    if (error) {
        return res.status(400).send({ 'message': error.details[0].message });
    }

    // Detect whether the information provided is a username or email and set the text and variable for the SQL query accordingly
    let identifier;
    let value;

    if (username) {
        identifier = 'username';
        value = [username];
    } else if (email) {
        identifier = 'email';
        value = [email];
    }

    try {
        // Query the app user table
        const result = await db.query(`SELECT id, username, email, date_created, date_modified, is_guest FROM app_user WHERE ${identifier} = $1`, value);

        if (!result.rows.length) { // If there is no result, the app user does not exist
            return res.status(404).send({ "message": "App user by that username / email not found" });
        }

        // If the app user exists and call next
        req.appUser = result.rows[0]; // Attach the appUser details to the req 
        next();
    }

    catch (error) {
        console.error(error.stack);
        res.status(500).send({ "message": "Could not get app user details" });
    }
}

// GET APP USER ID BY USERNAME OR EMAIL
adminRouter.get('/findappuser', checkUsernameOrEmailExists, async (req, res) => {
    res.status(200).json({ appUser: req.appUser });
});

// ADD ADMIN
adminRouter.get('/grantadminstatus', checkUsernameOrEmailExists, async (req, res) => {
    // Get the appUser id from the checkUsernameOrEmailExists middleware
    const appUserId = req.appUser.id;

    try {
        const result = await db.query("UPDATE app_user SET is_admin = true WHERE id = $1", [appUserId]);
        console.log(result);
        res.status(200).send({ "message": "User granted admin privileges" });
    }

    catch (error) {
        console.error(error.stack);
        res.status(500).send({ "message": "Could not grant admin status" });
    }
});

// REMOVE ADMIN
adminRouter.get('/revokeadminstatus', checkUsernameOrEmailExists, async (req, res) => {
    // Get the appUser id from the checkUsernameOrEmailExists middleware
    const appUserId = req.appUser.id;

    try {
        const result = await db.query("UPDATE app_user SET is_admin = false WHERE id = $1", [appUserId]);
        console.log(result);
        res.status(200).send({ "message": "Admin privileges revoked" });
    }

    catch (error) {
        console.error(error.stack);
        res.status(500).send({ "message": "Could not revoke admin status" });
    }
});

// MIDDLEWARE FUNCTION TO CHECK THAT APP USER ID IN QUESTION EXISTS IN DB
const checkAppUserIdExists = async (req, res, next) => {
    // Get the app user id from the request body
    const { appUserIdToDelete } = req.body;

    // Validate the data
    const { error } = deleteUserValidation({ appUserIdToDelete });
    if (error) {
        return res.status(400).send({ 'message': error.details[0].message });
    }

    try {

        // Query the app user table
        const usernameResult = await db.query("SELECT username FROM app_user WHERE id = $1", [appUserIdToDelete]);

        if (!usernameResult.rows.length) { // If there is no result, the app user does not exist
            return res.status(404).send({ "message": "App user by that ID not found" });
        }

        // If the app user exists, attach the id to the request and move onto the next function
        req.appUserIdToDelete = appUserIdToDelete;
        next();
    }

    catch (error) {
        console.error(error.stack);
        res.status(500).send({ "message": "Could not verify app user exists" });
    }
}

// TEST ENDPOINT - GET A SPECIFIC USER
adminRouter.get('/getspecificuser', checkAppUserIdExists, async (req, res) => {
    res.status(200).json({ appUserIdToDelete: req.appUserIdToDelete });
});

// HELPER FUNCTION TO DELETE USER BY ID
const deleteAppUser = async appUserIdToDelete => {

    console.log("deleteAppUser function called");

    return new Promise(async (resolve, reject) => {
        try {
            // Get all trips for the app user in question from app user / trip relationship table
            const tripIdResults = await db.query("SELECT trip_id FROM app_users_trips WHERE app_user_id = $1",
                [appUserIdToDelete]);

            if (tripIdResults.rows && tripIdResults.rows.length) { // If there are trips for this user

                // Create an array of tripIds from the results
                const tripIds = tripIdResults.rows.map(row => row.trip_id);
                console.log("tripIds = ", tripIds);

                // Iterate through the tripIds array and delete each trip (and all associated lists and list items)
                await Promise.all(tripIds.map(async tripId => {
                    const result = await deleteTrip(tripId);
                    console.log("deleteTrip result: ", result);
                })); // Returns the trip id if successful and error if the transaction fails
            }

            // Delete the appUser
            await db.query("DELETE FROM app_user WHERE id = $1", [appUserIdToDelete]);
            console.log(`appUser of id ${appUserIdToDelete} has been deleted`);
            resolve(appUserIdToDelete);
        }

        catch (error) {
            console.error(error.stack);
            reject(error);
        }
    });
}

// DELETE A USER BY ID (AND ALL THE ASSOCIATED TRIPS, LISTS, LIST ITEMS ETC)
adminRouter.delete('/deletespecificuser', checkAppUserIdExists, async (req, res) => {
    // Get the app user id from the request body (see the checkUserExists middleware)
    const appUserIdToDelete = req.appUserIdToDelete;

    try {
        const deletedAppUserId = await deleteAppUser(appUserIdToDelete);

        // If successful, should return the appUserIdToDelete, if not, there's a problem
        if (deletedAppUserId !== appUserIdToDelete) {
            return res.status(500).send({ 'message': 'App user could not be deleted' });
        }

        return res.sendStatus(204);

    } catch (error) {
        console.error(error.stack);
        return res.status(500).send({ 'message': 'App user could not be deleted' });
    }
});

// HELPER FUNCTION TO GET EXPIRED GUEST USERS
const getExpiredGuestUsers = async (req, res, next) => {
    try {
        // Get ids of guest users that were created more than 12 hours ago
        const expiredGuestResults = await db.query("SELECT id FROM app_user WHERE is_guest = true AND date_created < now() - interval '12 hour'");
        //const expiredGuestResults = await db.query("SELECT id FROM app_user WHERE is_guest = true"); 
        // Commented out line is for test purposes

        if (!expiredGuestResults.rows.length) { // If there are no expired guest users
            return res.status(404).send({ "message": "There are no expired guest users" });
        }

        // Create array of guest user ids
        const expiredGuestIds = expiredGuestResults.rows.map(row => row.id);
        console.log("expiredGuestIds", expiredGuestIds);

        // Attach to req and call next
        req.expiredGuestIds = expiredGuestIds;
        next();
    }

    catch (error) {
        console.error(error.stack);
        return res.status(500).json({ "message": "Could not get expired guest users" });
    }
}

adminRouter.get('/getexpiredguestusers', getExpiredGuestUsers, async (req, res) => {
    // Get the array of expired guest ids from the req (attached by getExpiredGuestUsers)
    const expiredGuestIds = req.expiredGuestIds;
    return res.status(200).json({ expiredGuestIds });
});

// DELETE ALL EXPIRED GUEST USERS
adminRouter.delete('/deleteexpiredguestusers', getExpiredGuestUsers, async (req, res) => {
    try {
        // Get the array of expired guest ids from the req (attached by getExpiredGuestUsers)
        const expiredGuestIds = req.expiredGuestIds;

        // Iterate through the guestId array and delete each one
        const deletedGuestIds = await Promise.all(
            expiredGuestIds.map(
                async expiredGuestId => {
                    return await deleteAppUser(expiredGuestId);
                }
            )
        );

        return res.status(200).json({ deletedGuestIds });
    }

    catch (error) {
        console.error(error.stack);
        return res.status(500).json({ "message": "Could not delete all guestIds" });
    }
});
