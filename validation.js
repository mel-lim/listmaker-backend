const Joi = require('joi');

const signUpValidation = (newAppUserData) => {
    const schema = Joi.object({
        username: Joi.string()
            .alphanum()
            .min(2)
            .required(),
        email: Joi.string()
            .email()
            .min(6)
            .required(),
        password: Joi.string()
            .min(8)
            .required()
    });

    return schema.validate(newAppUserData);
}

const loginValidation = (appUserData) => {
    const schema = Joi.object({
        username: Joi.string()
            .empty(''),
        email: Joi.string()
            .empty('')
            .email(),
        password: Joi.string()
            .min(8)
            .required()
    })
        .xor('username', 'email');

    return schema.validate(appUserData);
}

module.exports.signUpValidation = signUpValidation;
module.exports.loginValidation = loginValidation;