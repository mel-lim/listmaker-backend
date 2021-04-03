const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const helper = {

    /* Hash password method
    @param {string} password
    @returns {string} returns hashed password */

    hashPassword(password) {
        return bcrypt.hashSync(password, bcrypt.genSaltSync(8));
    },

    /* Compare password method
    @param {string} hashpassword
    @param {string} password
    @returns {Boolean} True or False */

    comparePassword(hashPassword, password) {
        return bcrypt.compareSync(password, hashPassword);
    },

    /* Generate token method
    @param {string} id
    @returns {string} token
    */

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