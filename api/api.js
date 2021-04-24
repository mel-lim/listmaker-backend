const express = require('express');
const app = require('../server');
const apiRouter = express.Router();

module.exports = apiRouter;

apiRouter.get('', (request, response, next) => {
    response.json({ info: 'Node.js, Express, and Postgres API' });
});

// Centralise our data access for reuseability per the node-postgres library guide
const db = require('../db');

apiRouter.get('/test', (request, response, next) => {
    db.query('SELECT * FROM trip', [], (error, results) => {

        if (error) {
            next(error);
        }

        response.status(200).json({ "trips": results.rows });

    });
});

const authRouter = require('../routes/auth');
apiRouter.use('/appusers', authRouter);

const tripsRouter = require('../routes/trips');
apiRouter.use('/trips', tripsRouter);

const contactRouter = require('../routes/contact');
apiRouter.use('/contact', contactRouter);