const jwt = require('jsonwebtoken');

module.exports = function (request, response, next) {
    const token = request.header('auth-token');
    if (!token) {
        return response.status(401).send({ 'message': 'Access denied' });
    }

    try {
        // This gives you access to the payload of the token
        const verified = jwt.verify(token, process.env.TOKEN_SECRET);
        request.user = verified;
        next();
    } catch (err) {
        response.status(400).send({ "message": "Invalid token" });
    }
}