// IMPORT DB ACCESS DETAILS
const db = require('./db');

// CUSTOM MIDDLEWARE TO VERIFY THE JWT TOKEN AND AUTHORIZE THE USER
const verifyAdmin = async (req, res, next) => {

    try {
        // Get an array of the admin usernames from the admin table
        const adminUsernameResults = await db.query("SELECT username FROM admin");
        const adminUsernames = adminUsernameResults.rows.map(row => row.username);
        console.log(adminUsernames);

        // Get the app user id of the current user - set by verifyToken at req.appUserId
        const appUserId = req.appUserId;

        const { rows } = await db.query("SELECT username FROM app_user WHERE id = $1", [appUserId]);
        console.log(rows[0].username);

        if (adminUsernames.includes(rows[0].username)) {
            console.log("admin verified");
            next();
        }
        
        res.status(401).send({ "message": "User does not have admin privileges" });

    } catch (err) {
        console.error(err);
        res.status(400).send({ "message": "Cannot verify admin privileges" });
    }
}

module.exports = verifyAdmin;