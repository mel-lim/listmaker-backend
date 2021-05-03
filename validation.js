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

const saveTripDetailsValidation = data => {
    const schema = Joi.object({
        tripId: Joi.number()
            .required(),
        tripName: Joi.string().required(),
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

const editListTitleValidation = data => {
    const schema = Joi.object({
        tripId: Joi.number()
            .required(),
        editedListDetails: Joi.object()
            .required(),
        appUserId: Joi.number()
            .required()
    });
    return schema.validate(data);
}

const newListValidation = data => {
    const schema = Joi.object({
        tripId: Joi.number()
            .required(),
        newList: Joi.object()
            .required(),
        appUserId: Joi.number()
            .required()
    });
    return schema.validate(data);
}

const saveEditedListItemValidation = data => {
    const schema = Joi.object({
        tripId: Joi.number()
            .required(),
        editedListItem: Joi.object()
            .required(),
        appUserId: Joi.number()
            .required()
    });
    return schema.validate(data);
}

const saveNewListItemValidation = data => {
    const schema = Joi.object({
        tripId: Joi.number()
            .required(),
        newListItem: Joi.object()
            .required(),
        appUserId: Joi.number()
            .required()
    });
    return schema.validate(data);
}

const deleteListItemValidation = data => {
    const schema = Joi.object({
        tripId: Joi.number()
            .required(),
        itemId: Joi.number()
            .required(),
        appUserId: Joi.number()
            .required()
    });
    return schema.validate(data);
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

module.exports = { signUpValidation, loginValidation, getTripsValidation, newTripValidation, saveListsValidation, editListTitleValidation, newListValidation, saveEditedListItemValidation, saveNewListItemValidation, deleteListItemValidation, fetchListsValidation, saveTripDetailsValidation, deleteTripValidation }