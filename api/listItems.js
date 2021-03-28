const { request } = require('express');
const express = require('express');
const listItemsRouter = express.Router({ mergeParams: true });
module.exports = listItemsRouter;

// Centralise our data access for reuseability per the node-postgres library guide
const db = require('../db');
const { response } = require('../server');

// Get all the list items for that list
listItemsRouter.get('/', (request, response, next) => {
    const listId = request.params.listId;
    db.query('SELECT * FROM list_item WHERE list_id = $1 ORDER BY id ASC', [listId], (error, results) => {
        if (error) {
            next(error);
        }
        response.status(200).json(results.rows);
    });
});

// Middleware to check that all the required fields are provided in the request
const checkRequiredFields = (request, response, next) => {
    const receivedListItem = request.body;

    if (!receivedListItem.name || !receivedListItem.listId || !receivedListItem.name.length || !receivedListItem.listId.length) {
        response.status(400).send("Invalid list item");
    } else {
        request.receivedListItem = receivedListItem;
        next();
    }
}

// Validate list id
const validateListId = (request, response, next) => {
    const { listId } = request.receivedListItem;
    db.query('SELECT * FROM list WHERE id = $1', [listId], (error, result) => {
        if (error) {
            next(error);
        } else if (result.rows.length) {
            next();
        } else {
            response.status(400).send('Invalid list');
        }
    });
}

// Create new list item
listItemsRouter.post('/', checkRequiredFields, validateListId, (request, response, next) => {
    const { name, listId } = request.receivedListItem;
    const isChecked = false;

    db.query('INSERT INTO list_item (name, list_id, is_checked) VALUES ($1, $2, $3) RETURNING *', [name, listId, isChecked], (error, result) => {
        if (error) {
            next(error);
        }
        response.status(201).json({ listItem: result.rows });
    });
});

// Validate listItem id
listItemsRouter.param('listItemId', (request, response, next, id) => {
    db.query('SELECT * FROM list_item WHERE id = $1',
        [id],
        (error, result) => {
            if (error) {
                next(error);
            } else if (result.rows.length) {
                if (result.rows[0].list_id == request.params.listId) { // This makes sure the list_id provided in the params/route matches the list_id associated with the list item of this list item id.
                    request.listItem = result.rows;
                    next();
                } else {
                    response.status(400).send('The list item is not found in the list specified in the route');
                }
            } else {
                response.status(404).send('List item not found');
            }
        }
    );
});

// Get list item by id
listItemsRouter.get('/:listItemId', (request, response) => {
    response.status(200).json({ listItem: request.listItem });
});

// Update list item by id
listItemsRouter.put('/:listItemId', checkRequiredFields, validateListId, (request, response) => {
    const listItemId = request.params.listItemId;
    const { name, listId } = request.receivedListItem;
    const isChecked = request.receivedListItem.isChecked || false; // If isChecked is set to true, then return true. If it is not set (i.e. NULL), set it to false.

    db.query(
        'UPDATE list_item SET name = $1, list_id = $2, is_checked = $3 WHERE id = $4 RETURNING *',
        [name, listId, isChecked, listItemId],
        (error, result) => {
            if (error) {
                throw error;
            }
            response.status(200).json({ listItem: result.rows });
        }
    );
});

// Delete list item
listItemsRouter.delete('/:listItemId', (request, response) => {
    const id = request.params.listItemId;
    db.query('DELETE FROM list_item WHERE id = $1', [id], (error, result) => {
        if (error) {
            throw error;
        }
        response.status(200).send(`List item with id ${id} has been deleted`);
    });
});

