const jwt = require('jsonwebtoken');

// CUSTOM MIDDLEWARE TO VERIFY THE JWT TOKEN AND AUTHORIZE THE USER
const verifyToken = (req, res, next) => {

    // Get the token from the cookie sent by the browser in the request
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).send({ 'message': 'Access denied' });
    }

    try {
        const payload = jwt.verify(token, process.env.TOKEN_SECRET);
        req.appUserId = payload.id;
        console.log("user verified");
        next();
    } catch (err) {
        res.status(400).send({ "message": "Invalid token" });
    } 
}

module.exports = verifyToken;