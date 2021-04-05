const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const helper = {

    generateToken(id) {
        const token = jwt.sign({
            userId: id
        },
        process.env.SECRET, 
        { expiresIn: '7d' }
        );
        return token;
    }
}

module.exports = helper;