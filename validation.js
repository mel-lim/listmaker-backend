const Joi = require('joi');

const signUpValidation = (data) => {
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

    return schema.validate(data);
}

const loginValidation = (data) => {
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

    return schema.validate(data);
}

const newTripValidation = (data) => {
    const schema = Joi.object({
        tripName: Joi.string()
            .empty(''),
        tripCategory: Joi.string()
            .required(), // at the moment we only have one option - 'ski-tour'
        tripDuration: Joi.string()
            .required() // this will be 'day' or 'overnight'
    });

    return schema.validate(data);
}

module.exports.signUpValidation = signUpValidation;
module.exports.loginValidation = loginValidation;
module.exports.newTripValidation = newTripValidation;