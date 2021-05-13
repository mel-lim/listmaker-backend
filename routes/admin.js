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
    const result = await db.query("UPDATE app_user SET is_admin = true WHERE id = $1", [appUserId]);
    console.log(result);

    res.status(200).send({ "message": "User granted admin privileges" });
});

// REMOVE ADMIN
adminRouter.get('/revokeadminstatus', checkUsernameOrEmailExists, async (req, res) => {
    // Get the appUser id from the checkUsernameOrEmailExists middleware
    const appUserId = req.appUser.id;
    const result = await db.query("UPDATE app_user SET is_admin = false WHERE id = $1", [appUserId]);
    console.log(result);

    res.status(200).send({ "message": "Admin privileges revoked" });
});


// MIDDLEWARE FUNCTION TO CHECK THAT USER IN QUESTION EXISTS IN DB
const checkAppUserIdExists = async (req, res, next) => {
    // Get the app user id from the request body
    const { appUserIdToDelete } = req.body;

    // Validate the data
    const { error } = deleteUserValidation({ appUserIdToDelete });
    if (error) {
        return res.status(400).send({ 'message': error.details[0].message });
    }

    // Query the app user table
    const usernameResult = await db.query("SELECT username FROM app_user WHERE id = $1", [appUserIdToDelete]);

    if (!usernameResult.rows.length) { // If there is no result, the app user does not exist
        return res.status(404).send({ "message": "App user by that ID not found" });
    }

    // If the app user exists, attach the id to the request and move onto the next function
    req.appUserIdToDelete = appUserIdToDelete;
    next();
}

// TEST ENDPOINT - GET A SPECIFIC USER
adminRouter.get('/getspecificuser', checkAppUserIdExists, async (req, res) => {
    res.status(200).json({ appUserIdToDelete: req.appUserIdToDelete });
});

// HELPER FUNCTION TO DELETE TRIP BY TRIP ID
const deleteTrip = async tripId => {
    return new Promise(async (resolve, reject) => {

        // Checkout/reserve a client for our transaction
        const client = await db.getClient();

        try {
            // Start the transaction on our checked out client 
            await client.query('BEGIN');

            // Query the list table to find the list ids associated with this trip
            const listIdResults = await client.query('SELECT id from list WHERE trip_id = $1', [tripId]);

            if (listIdResults.rows && listIdResults.rows.length) { // If there are lists for this trip

                // Create an array of list ids 
                const listIds = listIdResults.rows.map(item => item.id);

                // Iterate through the list ids and delete the list items associated with each list id
                await Promise.all(listIds.map(
                    async listId => {
                        const { rowCount } = await client.query("DELETE FROM list_item WHERE list_id = $1", [listId]);
                        console.log(`${rowCount} list items were deleted from list ${listId}`);
                    }
                ));

                // DELETE ALL LISTS ASSOCIATED WITH THIS TRIP
                await client.query("DELETE FROM list WHERE trip_id = $1", [tripId]);
                console.log("lists have been deleted")
            }

            // DELETE THE RELATIONSHIP BETWEEN TRIP AND APP_USER FROM THE APP_USERS_TRIPS TABLE
            await client.query("DELETE FROM app_users_trips WHERE trip_id = $1", [tripId]);
            console.log("app user / trip relationship has been deleted");

            // DELETE THE TRIP
            await client.query("DELETE FROM trip WHERE id = $1", [tripId]);
            console.log(`trip of id ${tripId} has been deleted`);

            // COMMIT THE TRANSACTION
            await client.query('COMMIT');

            // Send back tripId on success
            resolve(tripId);
        }

        catch (error) {
            await client.query('ROLLBACK');
            console.error(`Error committing transaction to delete trip of id ${tripId}`, error.stack);
            reject(error); // If unsuccessful, send back the error
        }

        finally {
            client.release();
        }

    });
}

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

// DELETE ALL EXPIRED GUEST USERS
adminRouter.delete('/deleteexpiredguestusers', async (req, res) => {
    try {
        // Get ids of guest users that were created more than 12 hours ago
        //const expiredGuestResults = await db.query("SELECT id FROM app_user WHERE is_guest = true AND date_created < now() - interval '12 hour'");

        const expiredGuestResults = await db.query("SELECT id FROM app_user WHERE is_guest = true");

        if (!expiredGuestResults.rows.length) { // If there are no expired guest users
            return res.status(200).send({ "message": "No expired guest users to delete" });
        }

        // Create array of guet user ids
        const expiredGuestIds = expiredGuestResults.rows.map(row => row.id);
        console.log("expiredGuestIds", expiredGuestIds);

        // Iterate through the guestId array
        const deletedGuestIds = await Promise.all(expiredGuestIds.map(async expiredGuestId => {
            return await deleteAppUser(expiredGuestId);
        }));

        return res.status(200).json({ deletedGuestIds });
    }

    catch (error) {
        console.error(error.stack);
        return res.status(500).json({ "message": "Could not delete all guestIds" });
    }
});