const express = require('express');
const app = require('../server');
const apiRouter = express.Router();

module.exports = apiRouter;

apiRouter.get('', (request, response, next) => {
    response.json({ info: 'Node.js, Express, and Postgres API' });
});

const appUsersRouter = require('./appUsers');
apiRouter.use('/appusers', appUsersRouter);

const tripsRouter = require('./trips');
apiRouter.use('/trips', tripsRouter);

const listsRouter = require('./lists');
apiRouter.use('/lists', listsRouter);