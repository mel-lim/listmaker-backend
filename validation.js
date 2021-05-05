const Joi = require('joi');

const signUpValidation = data => {
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

const loginValidation = data => {
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

const getTripsValidation = data => {
    const schema = Joi.object({
        appUserId: Joi.number()
            .required()
    });

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
            .required(), // this will be 'yes' or 'no' - the user will select whether they want to generate the lists with the template items or not
        appUserId: Joi.number()
            .required()
    });

    return schema.validate(data);
}

const editTripDetailsValidation = data => {
    const schema = Joi.object({
        tripId: Joi.number()
            .required(),
        editedTripName: Joi.string().required(),
    });

    return schema.validate(data);
}

const deleteTripValidation = data => {
    const schema = Joi.object({
        tripId: Joi.number()
            .required()
    });

    return schema.validate(data);
}

const saveListsValidation = data => {
    const schema = Joi.object({
        listTitles: Joi.array()
            .items(
                Joi.string()
                    .required()
            )
            .required(),
        tripId: Joi.number()
            .required(),
        listItemNames: Joi.array()
            .items(
                Joi.array()
                    .items(
                        Joi.string().required()
                    )
            ).required(),
        appUserId: Joi.number()
            .required()
    });

    return schema.validate(data);
}

const newListValidation = data => {
    const schema = Joi.object({
        tripId: Joi.number()
            .required(),
        appUserId: Joi.number()
            .required()
    });
    return schema.validate(data);
}

const editListTitleValidation = editedListTitle => {
    const schema = Joi.string().required();
    return schema.validate(editedListTitle);
}

const deleteListValidation = listId => {
    const schema = Joi.number().required();
    return schema.validate(listId);
}

const newListItemValidation = data => {
    const schema = Joi.object({
        newItemName: Joi.string()
            .required(),
        listId: Joi.number()
            .required()
    });
    return schema.validate(data);
}

const editListItemValidation = data => {
    const schema = Joi.object({
        editedItemName: Joi.string()
            .required(),
        itemId: Joi.number()
            .required()
    });
    return schema.validate(data);
}

const deleteListItemValidation = itemId => {
    const schema = Joi.number().required();
    return schema.validate(itemId);
}

const fetchListsValidation = data => {
    const schema = Joi.object({
        tripId: Joi.number()
            .required(),
        appUserId: Joi.number()
            .required()
    });

    return schema.validate(data);
}

module.exports = {
    signUpValidation,
    loginValidation,
    getTripsValidation,
    newTripValidation,
    editTripDetailsValidation,
    saveListsValidation,
    newListValidation,
    editListTitleValidation,
    deleteListValidation,
    newListItemValidation,
    editListItemValidation,
    deleteListItemValidation,
    fetchListsValidation,
    deleteTripValidation
}