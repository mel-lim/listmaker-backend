const express = require('express');
const appUsersRouter = express.Router();
module.exports = appUsersRouter;

const Pool = require('pg').Pool
const pool = new Pool({
    user: 'me',
    host: 'localhost',
    database: 'listmaker-end-to-end',
    password: 'password',
    port: 5432,
});

// Middleware to check that all the required fields are provided in the request
const checkRequiredFields = (request, response, next) => {
    const receivedAppUser = request.body;

    if (!receivedAppUser.username || !receivedAppUser.email) {

        res.status(400).send("Invalid app user");

    } else {
        next();
    }
}

// Helper function to generate today's date in the correct format for PostgresSQL
const getTodaysDate = () => {
    let today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    const yyyy = today.getFullYear();
    today = `${yyyy}-${mm}-${dd}`;
    return today;
}

// Get all the app users
appUsersRouter.get('/', (request, response, next) => {
    pool.query('SELECT * FROM app_user ORDER BY id ASC', (error, results) => {
        if (error) {
            next(error);
        }
        response.status(200).json(results.rows);
    });
});

// Create new app user
appUsersRouter.post('/', checkRequiredFields, (request, response, next) => {
    const { username, email } = request.body;
    const date_created = getTodaysDate();

    pool.query('INSERT INTO app_user (username, date_created, email) VALUES ($1, $2, $3) RETURNING *', [username, date_created, email], (error, result) => {
        if (error) {
            next(error);
        }
        response.status(201).send(`User added with ID:${result.rows[0].id}`);
    });
});

// Validate app user id
appUsersRouter.param('id', (request, response, next, id) => {
    pool.query('SELECT * FROM app_user WHERE id = $1',
        [id],
        (error, row) => {
            if (error) {
                next(error);
            } else if (row) {
                request.appUser = row;
                next();
            } else {
                res.status(404).send('App user not found');
            }
        }
    );
});

// Get app user by id
appUsersRouter.get('/:id', (request, response) => {
    const id = parseInt(request.params.id);

    pool.query('SELECT * FROM app_user WHERE id = $1', [id], (error, results) => {
        if (error) {
            throw error;
        }
        response.status(200).json(results.rows);
    });
});

// Update app user by id
appUsersRouter.put('/:id', (request, response) => {
    const id = parseInt(request.params.id);
    const { username, email } = request.body;

    pool.query(
        'UPDATE app_user SET username = $1, email = $2 WHERE id = $3',
        [username, email, id],
        (error, results) => {
            if (error) {
                throw error;
            }
            response.status(200).send(`User modified with ID: ${id}`);
        }
    );
});

// Delete app user
appUsersRouter.delete('/:id', (request, response) => {
    const id = parseInt(request.params.id);
  
    pool.query('DELETE FROM app_user WHERE id = $1', [id], (error, results) => {
      if (error) {
        throw error;
      }
      response.status(200).send(`User deleted with ID: ${id}`);
    });
  });

