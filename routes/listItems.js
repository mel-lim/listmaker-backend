const express = require('express');
const listItemsRouter = express.Router();

// LIST ITEMS SROUTER IS MOUNTED ON LISTS ROUTER
// Complete route: 'api/trips/:tripId/lists/:listId/listitems'
module.exports = listItemsRouter;

// IMPORT DB ACCESS DETAILS
const db = require('../db');

// Import helper functions and custom middleware
const { newListItemValidation, editListItemValidation } = require('../validation');

// EVERYTHING COMING THROUGH LISTSROUTER WILL HAVE ALREADY BEEN AUTHENTICATED (using verifyToken function mounted on tripsRouter)

// TRIPID WILL HAVE ALREADY BEEN VALIDATED AND THE USER AUTHORISED (using the param method on /:tripId in trips.js)

// EVERYTHING COMING THROUGH LISTITEMSROUTER WILL ALREADY HAVE HAD THE LIST ID VALIDATED TO CONFIRM THE LIST BELONGS TO THE TRIP AND THE APP USER (using the param method on /:listId in lists.js)

// ADD NEW LIST ITEM
listItemsRouter.post('/addnew', async (req, res) => {

    // From the list id param validation
    const listId = req.validatedListId;

    // Get the edited list item from the request body sent by the client
    const { newItemName } = req.body;

    // Validate the data
    const { error } = newListItemValidation({ newItemName });
    if (error) {
        return res.status(400).send({ 'message': error.details[0].message });
    }

    try {
        // Insert the list item
        const result = await db.query(
            "INSERT INTO list_item (name, list_id) VALUES ($1, $2) RETURNING id",
            [newItemName, listId]
        );

        if (!result || !result.rowCount) {
            return res.status(500).send({ 'message': 'New list item could not be added E0' });
        }

        // Send the new id back to the front end
        return res.status(201).json(result.rows[0]);
    }

    catch (error) {
        console.error(error.stack);
        return res.status(500).send({ 'message': 'New list item could not be added E1' });
    }
});

// VALIDATE LIST ITEM ID PARAM
listItemsRouter.param('itemId', async (req, res, next, itemId) => {
    try {

        const itemIdResult = await db.query('SELECT list_id FROM list_item WHERE id = $1', [itemId]);

        // Make sure list exists
        if (!itemIdResult.rows.length) {
            return res.status(404).send({ 'message': 'List item not found' });
        }
        console.log("listItemId validated to exist in db");

        // Make sure the list item being queried is associated with the list
        // The list id is attached to the req by the listid param validation
        if (itemIdResult.rows[0].list_id !== req.validatedListId) {
            return res.status(403).send({ 'message': 'This request is not allowed' }); // Forbidden
        }

        req.validatedItemId = itemId;
        console.log("item id validated");
        next();
    }

    catch (error) {
        next(error);
    }
});

// EDIT LIST ITEM
listItemsRouter.put('/:itemId/edit', async (req, res) => {

    // Get the edited list item from the request body sent by the client
    const { editedItemName } = req.body;

    // From itemId param validation
    const itemId = req.validatedItemId;

    // Validate the data
    const { error } = editListItemValidation({ editedItemName });
    if (error) {
        return res.status(400).send({ 'message': error.details[0].message });
    }

    try {
        // Update the list item
        const result = await db.query(
            "UPDATE list_item SET name = $1 WHERE id = $2",
            [editedItemName, itemId]
        );

        if (!result || !result.rowCount) {
            return res.status(500).send({ 'message': 'Edited list item could not be updated E0' });
        }

        return res.status(200).send({ 'message': 'List item updated' });
    }

    catch (error) {
        console.error(error.stack);
        return res.status(500).send({ 'message': 'Edited list item could not be saved E1' });
    }
});

// 'DELETE' LIST ITEM
listItemsRouter.put('/:itemId/delete', async (req, res) => {

    // From itemId param validation
    const itemId = req.validatedItemId;

    try {
        // Update the list item
        const result = await db.query(
            "UPDATE list_item SET is_deleted = true WHERE id = $1",
            [itemId]
        );

        if (!result || !result.rowCount) {
            return res.status(500).send({ 'message': 'List item could not be deleted E0' });
        }

        return res.status(200).send({ 'message': 'List item deleted' });
    }

    catch (error) {
        console.error(error.stack);
        return res.status(500).send({ 'message': 'List item could not be deleted E1' });
    }
});

// UNDO 'DELETE' LIST ITEM
listItemsRouter.put('/:itemId/undodelete', async (req, res) => {

    // From itemId param validation
    const itemId = req.validatedItemId;

    try {
        // Update the list item
        const result = await db.query(
            "UPDATE list_item SET is_deleted = false WHERE id = $1",
            [itemId]
        );

        if (!result || !result.rowCount) {
            return res.status(500).send({ 'message': 'List item could not be un-deleted E0' });
        }

        return res.status(200).send({ 'message': 'List item un-deleted' });
    }

    catch (error) {
        console.error(error.stack);
        return res.status(500).send({ 'message': 'List item could not be un-deleted E1' });
    }
});