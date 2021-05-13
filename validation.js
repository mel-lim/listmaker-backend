const Joi = require('joi');

const signUpValidation = data => {
    const schema = Joi.object({
        username: Joi.string()
            .alphanum()
            .min(2)
            .required(),
        email: Joi.string()
            .email({ minDomainSegments: 2 })
            .min(6)
            .required(),
        password: Joi.string()
            .min(8)
            .required()
    });

    return schema.validate(data);
}

const loginValidation = data => {
    const schema = Joi.object({
        username: Joi.string()
            .empty(''),
        email: Joi.string()
            .empty('')
            .email({ minDomainSegments: 2 }),
        password: Joi.string()
            .min(8)
            .required()
    })
        .xor('username', 'email');

    return schema.validate(data);
}

const newTripValidation = data => {
    const schema = Joi.object({
        tripName: Joi.string()
            .empty(''),
        tripCategory: Joi.string()
            .required(), // at the moment we only have one option - 'ski-tour'
        tripDuration: Joi.string()
            .required(), // this will be 'day' or 'overnight'
        requestTemplate: Joi.string()
            .required() // this will be 'yes' or 'no' - the user will select whether they want to generate the lists with the template items or not
    });

    return schema.validate(data);
}

const editTripDetailsValidation = data => {
    const schema = Joi.object({
        editedTripName: Joi.string().required()
    });

    return schema.validate(data);
}

const editListTitleValidation = data => {
    const schema = Joi.object({
        editedListTitle: Joi.string()
        .required()
    });
    return schema.validate(data);
}

const newListItemValidation = data => {
    const schema = Joi.object({
        newItemName: Joi.string()
            .required()
    });
    return schema.validate(data);
}

const editListItemValidation = data => {
    const schema = Joi.object({
        editedItemName: Joi.string()
            .required()
    });
    return schema.validate(data);
}

const findAppUserValidation = data => {
    const schema = Joi.object({
        username: Joi.string()
            .pattern(new RegExp("^[a-zA-Z0-9_]{2,}$"))
            .empty(''),
        email: Joi.string()
            .email({ minDomainSegments: 2 })
            .empty(''),
    })
        .xor('username', 'email');
    return schema.validate(data);
}

const deleteUserValidation = data => {
    const schema = Joi.object({
        appUserIdToDelete: Joi.number().required()
    });
    return schema.validate(data);
}

module.exports = {
    signUpValidation,
    loginValidation,
    newTripValidation,
    editTripDetailsValidation,
    editListTitleValidation,
    newListItemValidation,
    editListItemValidation,
    findAppUserValidation,
    deleteUserValidation
}