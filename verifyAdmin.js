// IMPORT DB ACCESS DETAILS
const db = require('./db');

// CUSTOM MIDDLEWARE TO VERIFY THE JWT TOKEN AND AUTHORIZE THE USER
const verifyAdmin = async (req, res, next) => {

    try {
        // Get the app user id of the current user - set by verifyToken at req.appUserId
        const appUserId = req.appUserId;

        // Check whether the app user is marked as an admin in the app_user table
        const { rows } = await db.query("SELECT is_admin FROM app_user WHERE id = $1", [appUserId]);
        console.log(rows[0]);
        
        const isAdmin = rows[0].is_admin;
        if (isAdmin) { // If the user is marked as admin
            console.log("admin verified");
            next();
            
        } else {
            res.status(401).send({ "message": "User does not have admin privileges" });
        }

    } catch (err) {
        console.error(err);
        res.status(400).send({ "message": "Cannot verify admin privileges" });
    }
}

module.exports = verifyAdmin;